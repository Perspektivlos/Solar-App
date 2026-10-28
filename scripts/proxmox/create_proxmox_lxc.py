#!/usr/bin/env python3
"""
=============================================================================
Proxmox VE LXC Container Creator - Solar-Lokal Monitoring App
=============================================================================
Erstellt vollautomatisch eine optimierte Debian 12 (Bookworm) LXC-Instanz
auf Ihrem Proxmox VE Host zur Ausführung des Solar-Lokal Dashboards.

Verwendung auf der Proxmox Host-Shell:
    python3 create_proxmox_lxc.py
    python3 create_proxmox_lxc.py --vmid 150 --hostname solar-lokal --memory 1024

Voraussetzungen:
    - Direkt auf dem Proxmox VE Host (Root-Shell) ausführen.
    - Benötigt nur Python 3 Standard-Bibliotheken (kein pip/virtualenv nötig).
=============================================================================
"""

import os
import sys
import subprocess
import argparse
import time
import re
import shutil

# ANSI-Farben für Terminal-Ausgabe
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"


def print_banner():
    print(f"{C_CYAN}{C_BOLD}")
    print("┌─────────────────────────────────────────────────────────────┐")
    print("│         SOLAR-LOKAL // PROXMOX VE LXC CREATOR             │")
    print("│     Hoymiles HM-1500 • Victron MPPT • Sun-2000 Trucki       │")
    print("└─────────────────────────────────────────────────────────────┘")
    print(f"{C_RESET}")


def run_cmd(cmd, check=True, capture_output=True, text=True):
    """Führt einen Shell-Befehl aus und gibt das Ergebnis zurück."""
    try:
        res = subprocess.run(
            cmd,
            shell=True,
            check=check,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.PIPE if capture_output else None,
            text=text
        )
        return res
    except subprocess.CalledProcessError as e:
        if check:
            print(f"{C_RED}[FEHLER] Befehl fehlgeschlagen: {cmd}{C_RESET}")
            if e.stderr:
                print(f"{C_RED}{e.stderr.strip()}{C_RESET}")
            raise e
        return e


def check_proxmox_host():
    """Prüft, ob das Skript direkt auf Proxmox VE läuft."""
    if os.geteuid() != 0:
        print(f"{C_RED}[!] Dieses Skript muss als root auf dem Proxmox VE Host ausgeführt werden.{C_RESET}")
        sys.exit(1)

    if not shutil.which("pct"):
        print(f"{C_RED}[!] 'pct' (Proxmox Container Tool) wurde nicht gefunden.{C_RESET}")
        print(f"{C_YELLOW}Hinweis: Führen Sie dieses Skript direkt auf der Proxmox Shell (SSH oder Web-Konsole) aus.{C_RESET}")
        sys.exit(1)


def get_next_vmid():
    """Ermittelt die nächste freie VMID im Proxmox Cluster."""
    try:
        res = run_cmd("pvesh get /cluster/nextid")
        next_id = int(res.stdout.strip())
        return next_id
    except Exception:
        # Fallback auf 150
        return 150


def detect_storage_pools():
    """Erkennt verfügbare Container-Speicherpools auf Proxmox."""
    try:
        res = run_cmd("pvesm status -content rootdir")
        lines = res.stdout.strip().split("\n")
        pools = []
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 2 and parts[1] in ("dir", "lvmthin", "zfspool", "btrfs"):
                pools.append(parts[0])
        if pools:
            # Bevorzuge lvmthin oder zfspool oder local-lvm
            for pref in ["local-lvm", "local-zfs", "local"]:
                if pref in pools:
                    return pref, pools
            return pools[0], pools
    except Exception:
        pass
    return "local-lvm", ["local-lvm", "local"]


def get_template_storage():
    """Ermittelt den Speicherpool für LXC-Templates (vztmpl)."""
    try:
        res = run_cmd("pvesm status -content vztmpl")
        lines = res.stdout.strip().split("\n")
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 1:
                return parts[0]
    except Exception:
        pass
    return "local"


def ensure_debian_template(template_storage):
    """Prüft, ob das Debian 12 Template vorhanden ist, lädt es ggf. herunter."""
    print(f"{C_CYAN}[*] Prüfe verfügbare LXC-Templates auf '{template_storage}'...{C_RESET}")
    
    # Templates aktualisieren
    try:
        run_cmd("pveam update", check=False)
    except Exception:
        pass

    # Prüfen, ob bereits ein Debian 12 Template heruntergeladen ist
    res = run_cmd(f"pveam list {template_storage}", check=False)
    if res.returncode == 0 and res.stdout:
        for line in res.stdout.splitlines():
            if "debian-12-standard" in line:
                tmpl_file = line.split()[0]
                print(f"{C_GREEN}[✓] Vorhandenes Template gefunden: {tmpl_file}{C_RESET}")
                return tmpl_file

    # Template herunterladen
    print(f"{C_YELLOW}[*] Lade Debian 12 Standard-Template herunter...{C_RESET}")
    try:
        run_cmd(f"pveam download {template_storage} debian-12-standard_12.7-1_amd64.tar.zst", check=True, capture_output=False)
        return f"{template_storage}:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst"
    except Exception:
        # Alternativer Download-Name falls Version abweicht
        print(f"{C_YELLOW}[*] Suche alternative Debian 12 Vorlage...{C_RESET}")
        list_res = run_cmd("pveam available -section system")
        for line in list_res.stdout.splitlines():
            if "debian-12-standard" in line:
                target = line.split()[1] if len(line.split()) > 1 else line.split()[0]
                run_cmd(f"pveam download {template_storage} {target}", check=True, capture_output=False)
                return f"{template_storage}:vztmpl/{target}"
        raise RuntimeError("Konnte kein Debian 12 Template finden.")


def create_lxc(vmid, hostname, memory, cores, disk, storage, tmpl, bridge, ip_config, onboot, unprivileged, nameserver="192.168.0.1 8.8.8.8"):
    """Erstellt den LXC-Container via Proxmox pct Tool inklusive DNS Nameserver."""
    print(f"\n{C_CYAN}[*] Erstelle LXC-Container ID {vmid} ({hostname})...{C_RESET}")

    unprivileged_flag = "1" if unprivileged else "0"
    onboot_flag = "1" if onboot else "0"

    net_param = f"name=eth0,bridge={bridge},{ip_config},firewall=0"

    cmd = (
        f"pct create {vmid} {tmpl} "
        f"--hostname {hostname} "
        f"--memory {memory} "
        f"--swap 512 "
        f"--cores {cores} "
        f"--rootfs {storage}:{disk} "
        f"--net0 {net_param} "
        f"--nameserver \"{nameserver}\" "
        f"--ostype debian "
        f"--unprivileged {unprivileged_flag} "
        f"--features nesting=1 "
        f"--onboot {onboot_flag} "
        f"--start 0"
    )

    print(f"{C_YELLOW}[>] {cmd}{C_RESET}")
    run_cmd(cmd, check=True, capture_output=False)
    # Sicherstellen, dass der Nameserver explizit in der Container-Konfig hinterlegt ist
    run_cmd(f"pct set {vmid} -nameserver \"{nameserver}\"", check=False)
    print(f"{C_GREEN}[✓] LXC-Container {vmid} erfolgreich erstellt (DNS: {nameserver})!{C_RESET}")


def start_lxc_and_wait(vmid):
    """Startet den Container und wartet auf Netzwerk-Bereitschaft."""
    print(f"{C_CYAN}[*] Starte LXC-Container {vmid}...{C_RESET}")
    run_cmd(f"pct start {vmid}", check=True)

    print(f"{C_CYAN}[*] Warte auf Bootvorgang und IP-Zuweisung...{C_RESET}", end="", flush=True)
    ct_ip = None
    for _ in range(25):
        time.sleep(2)
        print(".", end="", flush=True)
        res = run_cmd(f"pct exec {vmid} -- ip -4 addr show eth0", check=False)
        if res.returncode == 0 and res.stdout:
            match = re.search(r"inet\s+(\d+\.\d+\.\d+\.\d+)", res.stdout)
            if match:
                ct_ip = match.group(1)
                break
    print("")

    if ct_ip:
        print(f"{C_GREEN}[✓] Container ist online mit IP: {C_BOLD}{ct_ip}{C_RESET}")
    else:
        print(f"{C_YELLOW}[!] Container läuft, IP konnte noch nicht automatisch ermittelt werden.{C_RESET}")
    
    return ct_ip


def copy_app_installer_to_ct(vmid):
    """Kopiert das App-Installationsskript in den Container."""
    installer_script_name = "install_solar_app.py"
    current_dir = os.path.dirname(os.path.abspath(__file__))
    installer_path = os.path.join(current_dir, installer_script_name)

    if os.path.exists(installer_path):
        print(f"{C_CYAN}[*] Kopiere '{installer_script_name}' in Container {vmid}:/root/...{C_RESET}")
        run_cmd(f"pct push {vmid} {installer_path} /root/{installer_script_name}", check=True)
        run_cmd(f"pct exec {vmid} -- chmod +x /root/{installer_script_name}", check=True)
        print(f"{C_GREEN}[✓] Installationsskript übertragen.{C_RESET}")
        return True
    else:
        print(f"{C_YELLOW}[!] '{installer_script_name}' liegt nicht im selben Verzeichnis.{C_RESET}")
        return False


def main():
    print_banner()
    check_proxmox_host()

    default_vmid = get_next_vmid()
    default_storage, available_pools = detect_storage_pools()
    tmpl_storage = get_template_storage()

    parser = argparse.ArgumentParser(description="Proxmox LXC Container Creator für Solar-Lokal Monitoring")
    parser.add_argument("--vmid", type=int, default=default_vmid, help=f"Container ID (Standard: {default_vmid})")
    parser.add_argument("--hostname", type=str, default="solar-lokal", help="Hostname des LXC (Standard: solar-lokal)")
    parser.add_argument("--memory", type=int, default=1024, help="RAM in MB (Standard: 1024)")
    parser.add_argument("--cores", type=int, default=2, help="CPU Kerne (Standard: 2)")
    parser.add_argument("--disk", type=int, default=10, help="Festplattengröße in GB (Standard: 10)")
    parser.add_argument("--storage", type=str, default=default_storage, help=f"Storage Pool (Standard: {default_storage})")
    parser.add_argument("--bridge", type=str, default="vmbr0", help="Netzwerkbrücke (Standard: vmbr0)")
    parser.add_argument("--ip", type=str, default="dhcp", help="IP-Adresse (z.B. dhcp oder 192.168.0.150/24)")
    parser.add_argument("--gw", type=str, default=None, help="Gateway IP bei statischer IP (z.B. 192.168.0.1)")
    parser.add_argument("--nameserver", type=str, default="192.168.0.1 8.8.8.8", help="DNS-Nameserver (Standard: '192.168.0.1 8.8.8.8')")
    parser.add_argument("--auto-install", action="store_true", help="Startet die App-Installation direkt nach der Erstellung")
    parser.add_argument("--privileged", action="store_true", help="Erstellt einen privilegierten Container (Standard: unprivilegiert)")

    args = parser.parse_args()

    # IP-Konfigurationsstring aufbauen
    if args.ip.lower() == "dhcp":
        ip_config = "ip=dhcp"
    else:
        ip_config = f"ip={args.ip}"
        if args.gw:
            ip_config += f",gw={args.gw}"

    # Zusammenfassung anzeigen
    print(f"{C_BOLD}Geplante Container-Konfiguration:{C_RESET}")
    print(f"  • Container ID : {C_CYAN}{args.vmid}{C_RESET}")
    print(f"  • Hostname     : {C_CYAN}{args.hostname}{C_RESET}")
    print(f"  • CPU / RAM    : {C_CYAN}{args.cores} Kerne / {args.memory} MB{C_RESET}")
    print(f"  • Festplatte   : {C_CYAN}{args.disk} GB auf Pool '{args.storage}'{C_RESET}")
    print(f"  • Netzwerk     : {C_CYAN}{args.bridge} ({ip_config}){C_RESET}")
    print(f"  • DNS Server   : {C_CYAN}{args.nameserver}{C_RESET}")
    print(f"  • Modus        : {C_CYAN}{'Privilegiert' if args.privileged else 'Unprivilegiert (Sicher)'}{C_RESET}")
    print("-" * 60)

    # 1. Template bereitstellen
    tmpl = ensure_debian_template(tmpl_storage)

    # 2. Container erstellen
    create_lxc(
        vmid=args.vmid,
        hostname=args.hostname,
        memory=args.memory,
        cores=args.cores,
        disk=args.disk,
        storage=args.storage,
        tmpl=tmpl,
        bridge=args.bridge,
        ip_config=ip_config,
        onboot=True,
        unprivileged=not args.privileged,
        nameserver=args.nameserver
    )

    # 3. Container starten & IP ermitteln
    ct_ip = start_lxc_and_wait(args.vmid)

    # 4. App-Installationsskript kopieren
    installer_copied = copy_app_installer_to_ct(args.vmid)

    # 5. Abschluss und nächste Schritte
    print(f"\n{C_GREEN}{C_BOLD}============================================================={C_RESET}")
    print(f"{C_GREEN}{C_BOLD}✓ LXC-Instanz {args.vmid} ({args.hostname}) ist betriebsbereit!{C_RESET}")
    print(f"{C_GREEN}{C_BOLD}============================================================={C_RESET}\n")

    ip_display = ct_ip if ct_ip else "<CONTAINER_IP>"

    if args.auto_install and installer_copied:
        print(f"{C_CYAN}[*] Starte automatische Installation der Solar-Lokal App im Container...{C_RESET}")
        run_cmd(f"pct exec {args.vmid} -- python3 /root/install_solar_app.py", check=False, capture_output=False)
    else:
        print(f"{C_BOLD}Nächste Schritte zur Installation der Solar-Lokal App:{C_RESET}\n")
        if installer_copied:
            print(f"1) Führen Sie direkt auf der Proxmox-Shell folgenden Befehl aus:")
            print(f"   {C_CYAN}{C_BOLD}pct exec {args.vmid} -- python3 /root/install_solar_app.py{C_RESET}\n")
        else:
            print(f"1) Wechseln Sie in den Container:")
            print(f"   {C_CYAN}{C_BOLD}pct enter {args.vmid}{C_RESET}\n")
            print(f"2) Führen Sie dort das Installationsskript 'install_solar_app.py' aus.")

        print(f"Nach Abschluss ist Ihr Solar-Lokal Dashboard erreichbar unter:")
        print(f"   {C_GREEN}{C_BOLD}http://{ip_display}{C_RESET} oder {C_GREEN}{C_BOLD}http://{ip_display}:3000{C_RESET}\n")


if __name__ == "__main__":
    main()
