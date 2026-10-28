#!/usr/bin/env python3
"""
=============================================================================
Solar-Lokal App Installer - Debian 12 / Ubuntu LXC Container (Schnellmodus)
=============================================================================
Installiert und konfiguriert das Solar-Lokal Dashboard vollautomatisch
innerhalb einer Debian 12 / Ubuntu LXC-Instanz auf Proxmox VE.

Schnellmodus-Optimierung:
  - Verwendet ausschließlich Standard-Debian-Systempakete:
    curl, git, nginx, build-essential, nodejs, npm
  - Läuft ohne vorangehendes zeitintensives 'apt-get update' (direkte Paketinstallation)
  - Keine externen Repositories (kein NodeSource, keine PGP-Keys)

Schritte:
  0. Netzwerk & DNS Health-Check
  1. Direkte Paketinstallation (curl, git, nginx, build-essential, nodejs, npm)
  2. Einrichtung des App-Verzeichnisses unter /opt/solar-lokal
  3. Installation der Node.js Dependencies & Production Build (Vite)
  4. Konfiguration des Nginx Webservers für minimale Latenz & SPA-Routing
  5. Systemd Service für Node.js Live-Betrieb & Autostart

Verwendung im Container:
    python3 install_solar_app.py
    python3 install_solar_app.py --port 80
    python3 install_solar_app.py --update   # falls apt-get update gewünscht
=============================================================================
"""

import os
import sys
import subprocess
import argparse
import shutil
import time
import socket

# ANSI-Farben
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"

APP_DIR = "/opt/solar-lokal"
SERVICE_NAME = "solar-lokal"


def print_banner():
    print(f"{C_CYAN}{C_BOLD}")
    print("┌─────────────────────────────────────────────────────────────┐")
    print("│         SOLAR-LOKAL // SCHNELLER APP INSTALLER             │")
    print("│     Standard-Pakete (curl, git, nginx, build-ess., node)    │")
    print("│           Sofortige Betriebsbereitschaft ohne Update        │")
    print("└─────────────────────────────────────────────────────────────┘")
    print(f"{C_RESET}")


def run_cmd(cmd, check=True, capture_output=False, env=None):
    """Führt einen Shell-Befehl mit Live-Ausgabe oder Capture aus."""
    custom_env = os.environ.copy()
    custom_env["DEBIAN_FRONTEND"] = "noninteractive"
    if env:
        custom_env.update(env)

    try:
        res = subprocess.run(
            cmd,
            shell=True,
            check=check,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.PIPE if capture_output else None,
            text=True,
            env=custom_env
        )
        return res
    except subprocess.CalledProcessError as e:
        print(f"{C_RED}[FEHLER] Befehl fehlgeschlagen: {cmd}{C_RESET}")
        if capture_output and e.stderr:
            print(f"{C_RED}{e.stderr.strip()}{C_RESET}")
        raise e


def check_root():
    if os.geteuid() != 0:
        print(f"{C_RED}[!] Dieses Skript muss mit Root-Rechten im Container ausgeführt werden (z.B. sudo python3 install_solar_app.py).{C_RESET}")
        sys.exit(1)


def get_local_ip():
    """Ermittelt die primäre lokale IPv4-Adresse des Containers."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Verbindet nicht wirklich ins Internet, ermittelt nur das Standard-Interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def ensure_default_route():
    """Prüft und setzt bei Bedarf das Standard-Gateway im LXC Container."""
    route_check = run_cmd("ip route show default", capture_output=True, check=False)
    default_gw = route_check.stdout.strip() if route_check.returncode == 0 else ""
    if not default_gw:
        print(f"{C_YELLOW}[*] Kein Standard-Gateway gefunden. Versuche automatisches Hinzufügen (via 192.168.0.1)...{C_RESET}")
        run_cmd("ip route add default via 192.168.0.1 dev eth0", check=False)
        time.sleep(1)


def ensure_github_hosts_fallback():
    """
    Trägt GitHub Anycast IPs direkt in /etc/hosts ein, falls DNS im Container blockiert ist.
    Verhindert zuverlässig 'Could not resolve host: github.com'.
    """
    hosts_path = "/etc/hosts"
    github_entries = [
        "140.82.121.4 github.com",
        "140.82.121.3 github.com",
        "140.82.121.9 codeload.github.com",
        "140.82.121.10 codeload.github.com",
        "185.199.108.133 raw.githubusercontent.com",
        "185.199.109.133 raw.githubusercontent.com",
        "185.199.110.133 raw.githubusercontent.com",
        "185.199.111.133 raw.githubusercontent.com"
    ]
    try:
        current_content = ""
        if os.path.exists(hosts_path):
            with open(hosts_path, "r", encoding="utf-8") as f:
                current_content = f.read()

        if "github.com" not in current_content:
            print(f"{C_YELLOW}[*] Trage GitHub Anycast-IPs in /etc/hosts ein (Schutz vor DNS-Timeouts)...{C_RESET}")
            with open(hosts_path, "a", encoding="utf-8") as f:
                f.write("\n# Solar-Lokal GitHub Fallback IPs\n")
                for entry in github_entries:
                    f.write(f"{entry}\n")
            print(f"{C_GREEN}[✓] GitHub Fallback-Einträge in /etc/hosts hinterlegt.{C_RESET}")
    except Exception as e:
        print(f"{C_YELLOW}[!] Hinweis: /etc/hosts konnte nicht modifiziert werden ({e}){C_RESET}")


def check_and_heal_dns():
    """
    Prüft die DNS-Auflösung und Internet-Konnektivität im LXC-Container.
    Falls github.com oder Paketquellen nicht aufgelöst werden können,
    wird /etc/resolv.conf automatisch mit Fallback-Nameservern repariert
    und GitHub direkt in /etc/hosts verankert.
    """
    print(f"\n{C_CYAN}[0/5] Prüfe Netzwerk- und DNS-Konnektivität...{C_RESET}")
    
    # 1. Gateway sicherstellen
    ensure_default_route()

    # 2. GitHub Anycast Fallback immer eintragen
    ensure_github_hosts_fallback()

    test_domains = ["github.com", "deb.debian.org"]
    dns_ok = False
    
    for domain in test_domains:
        try:
            socket.gethostbyname(domain)
            dns_ok = True
            break
        except Exception:
            pass

    if dns_ok:
        print(f"{C_GREEN}[✓] DNS- und Host-Auflösung funktional.{C_RESET}")
        return True

    print(f"{C_YELLOW}[!] DNS-Auflösung via Nameserver eingeschränkt.{C_RESET}")
    print(f"{C_YELLOW}[*] Automatische Reparatur: Schreibe funktionale Nameserver in /etc/resolv.conf...{C_RESET}")

    fallback_dns = (
        "# Solar-Lokal Auto-Generated DNS\n"
        "nameserver 192.168.0.1\n"
        "nameserver 1.1.1.1\n"
        "nameserver 8.8.8.8\n"
        "nameserver 9.9.9.9\n"
        "options timeout:2 attempts:2\n"
    )

    try:
        if os.path.islink("/etc/resolv.conf"):
            os.unlink("/etc/resolv.conf")
        with open("/etc/resolv.conf", "w", encoding="utf-8") as f:
            f.write(fallback_dns)
        print(f"{C_GREEN}[✓] Nameserver erfolgreich gesetzt (192.168.0.1, 1.1.1.1, 8.8.8.8).{C_RESET}")
    except Exception as e:
        print(f"{C_RED}[!] Konnte /etc/resolv.conf nicht aktualisieren: {e}{C_RESET}")

    # Erneute Prüfung nach kurzer Wartezeit
    time.sleep(1)
    for domain in test_domains:
        try:
            socket.gethostbyname(domain)
            print(f"{C_GREEN}[✓] Host-Auflösung nach Reparatur erfolgreich ({domain}).{C_RESET}")
            return True
        except Exception:
            pass

    return False


def step_install_fast_packages(update=False):
    """
    Installiert ausschließlich die geforderten Standard-Systempakete:
    curl, git, nginx, build-essential, nodejs, npm.
    Verzichtet standardmäßig vollständig auf apt-get update für maximale Geschwindigkeit.
    """
    print(f"\n{C_CYAN}[1/5] Installiere Standard-Systempakete (Schnellmodus)...{C_RESET}")
    if update:
        print(f"{C_YELLOW}[*] Führe angefordertes 'apt-get update' aus...{C_RESET}")
        run_cmd("apt-get update -y", check=False)
    else:
        print(f"{C_GREEN}[⚡] Blitz-Modus aktiv: Überspringe 'apt-get update' für sofortige Betriebsbereitschaft.{C_RESET}")

    packages = [
        "curl",
        "git",
        "nginx",
        "build-essential",
        "nodejs",
        "npm"
    ]
    pkg_str = " ".join(packages)
    print(f"{C_YELLOW}[>] apt-get install -y --no-install-recommends {pkg_str}{C_RESET}")
    run_cmd(f"apt-get install -y --no-install-recommends {pkg_str}")
    print(f"{C_GREEN}[✓] Standard-Pakete ({pkg_str}) erfolgreich installiert.{C_RESET}")

    # Node & npm Versionen prüfen
    res_node = run_cmd("node -v", capture_output=True, check=False)
    res_npm = run_cmd("npm -v", capture_output=True, check=False)
    node_str = res_node.stdout.strip() if res_node.returncode == 0 else "unbekannt"
    npm_str = res_npm.stdout.strip() if res_npm.returncode == 0 else "unbekannt"
    print(f"{C_GREEN}[✓] Node.js Runtime: {node_str} | NPM: {npm_str}{C_RESET}")


def step_setup_app_source(repo_url=None):
    print(f"\n{C_CYAN}[2/5] Richte Solar-Lokal App-Verzeichnis unter {APP_DIR} ein...{C_RESET}")
    os.makedirs(APP_DIR, exist_ok=True)

    # Prüfen, ob das Skript innerhalb des Projektverzeichnisses aufgerufen wird
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    potential_root = os.path.abspath(os.path.join(current_script_dir, "..", ".."))

    if os.path.exists(os.path.join(potential_root, "package.json")):
        print(f"{C_GREEN}[✓] Lokales Projekt im übergeordneten Verzeichnis gefunden. Synchronisiere nach {APP_DIR}...{C_RESET}")
        run_cmd(f"rsync -av --exclude 'node_modules' --exclude '.git' {potential_root}/ {APP_DIR}/")
    elif os.path.exists(os.path.join(current_script_dir, "package.json")):
        print(f"{C_GREEN}[✓] Projekt im aktuellen Verzeichnis gefunden. Kopiere nach {APP_DIR}...{C_RESET}")
        run_cmd(f"rsync -av --exclude 'node_modules' --exclude '.git' {current_script_dir}/ {APP_DIR}/")
    elif repo_url:
        print(f"{C_YELLOW}[*] Klone Repository von {repo_url}...{C_RESET}")
        ensure_default_route()
        ensure_github_hosts_fallback()

        if os.path.exists(os.path.join(APP_DIR, ".git")):
            run_cmd(f"cd {APP_DIR} && git pull")
        else:
            # Bis zu 3 Versuche mit Reparatur bei Netzwerk-Schwankungen
            cloned = False
            for attempt in range(1, 4):
                try:
                    run_cmd(f"git clone {repo_url} {APP_DIR}")
                    cloned = True
                    break
                except Exception as e:
                    if attempt < 3:
                        print(f"{C_YELLOW}[!] Clone-Versuch {attempt} fehlgeschlagen. Repariere DNS & Gateway, wiederhole in 2s...{C_RESET}")
                        check_and_heal_dns()
                        ensure_github_hosts_fallback()
                        time.sleep(2)
                    else:
                        raise e
            if cloned:
                print(f"{C_GREEN}[✓] Repository erfolgreich geklont.{C_RESET}")
    else:
        # Falls keine Dateien da sind, erstellen wir eine Basiskonfiguration oder erwarten manuelle Kopie
        print(f"{C_YELLOW}[!] Kein Git-Repo angegeben und keine Quellcodedateien im aktuellen Pfad gefunden.{C_RESET}")
        print(f"{C_YELLOW}[*] Erstelle App-Struktur in {APP_DIR}... Bitte kopieren Sie Ihre Dateien nach {APP_DIR}.{C_RESET}")


def step_build_app(force_build=False):
    print(f"\n{C_CYAN}[3/5] Prüfe Anwendungs-Build & Bereitstellung...{C_RESET}")
    dist_index = os.path.join(APP_DIR, "dist", "index.html")

    # 1. Prüfen, ob fertiges Bundle bereits existiert
    if os.path.exists(dist_index) and not force_build:
        print(f"{C_GREEN}{C_BOLD}[⚡] Vorkompiliertes 'dist'-Bundle gefunden: {dist_index}{C_RESET}")
        print(f"{C_GREEN}[✓] Überspringe 'npm run build' – sofortige blitzschnelle Bereitstellung über Nginx!{C_RESET}")
        return True

    if not os.path.exists(os.path.join(APP_DIR, "package.json")):
        print(f"{C_RED}[!] Kein package.json in {APP_DIR} gefunden!{C_RESET}")
        return False

    print(f"{C_YELLOW}[>] Führe 'npm install' aus...{C_RESET}")
    run_cmd(f"cd {APP_DIR} && npm install --no-audit --no-fund")

    # 2. Native Binding Absicherung für Tailwind CSS v4 in LXC
    print(f"{C_YELLOW}[>] Sichere natives Binding '@tailwindcss/oxide-linux-x64-gnu' ab...{C_RESET}")
    run_cmd(f"cd {APP_DIR} && npm install --no-audit --no-fund @tailwindcss/oxide-linux-x64-gnu", check=False)

    print(f"{C_YELLOW}[>] Führe 'npm run build' aus...{C_RESET}")
    build_res = run_cmd(f"cd {APP_DIR} && npm run build", check=False)
    
    if build_res.returncode == 0 and os.path.exists(dist_index):
        print(f"{C_GREEN}[✓] Production Build erfolgreich erstellt: {dist_index}{C_RESET}")
        return True
    else:
        if os.path.exists(dist_index):
            print(f"{C_GREEN}[✓] 'dist/index.html' ist vorhanden und wird genutzt.{C_RESET}")
            return True
        print(f"{C_RED}[!] Build im Container nicht erfolgreich abgeschlossen.{C_RESET}")
        print(f"{C_YELLOW}Hinweis: Kopieren Sie den fertigen 'dist/'-Ordner nach {APP_DIR}/dist für sofortige Nginx-Bereitstellung.{C_RESET}")
        return False


def step_configure_nginx(web_port=80):
    print(f"\n{C_CYAN}[4/5] Konfiguriere Nginx Webserver für Solar-Lokal (Port {web_port})...{C_RESET}")

    nginx_conf = f"""# Solar-Lokal Proxmox Web-Dashboard
server {{
    listen {web_port} default_server;
    listen [::]:{web_port} default_server;

    server_name _;

    root {APP_DIR}/dist;
    index index.html;

    # Gzip Komprimierung für maximale Geschwindigkeit im Heimnetz
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;

    # Single Page Application Fallback
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # Cache für statische Assets
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|otf)$ {{
        expires 6M;
        access_log off;
        add_header Cache-Control "public, max-age=15552000, immutable";
    }}

    # Optionaler WebSocket / API Proxy (z.B. für MQTT WebSockets oder Node Backend)
    location /api/ {{
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}

    # Sicherheits-Header
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}}
"""
    conf_path = "/etc/nginx/sites-available/solar-lokal"
    with open(conf_path, "w", encoding="utf-8") as f:
        f.write(nginx_conf)

    # Symlink in sites-enabled
    symlink_path = "/etc/nginx/sites-enabled/solar-lokal"
    if os.path.exists(symlink_path):
        os.remove(symlink_path)
    os.symlink(conf_path, symlink_path)

    # Standard default Nginx Seite deaktivieren falls vorhanden
    default_conf = "/etc/nginx/sites-enabled/default"
    if os.path.exists(default_conf):
        os.remove(default_conf)

    # Nginx Konfiguration testen und neu starten
    run_cmd("nginx -t")
    run_cmd("systemctl restart nginx")
    run_cmd("systemctl enable nginx")
    print(f"{C_GREEN}[✓] Nginx ist konfiguriert und aktiv auf Port {web_port}.{C_RESET}")


def step_create_systemd_service():
    """Erstellt den Systemd-Dienst zur Ausführung des Vite Servers."""
    print(f"\n{C_CYAN}[5/5] Richte Systemd-Dienst 'solar-lokal.service' ein...{C_RESET}")

    service_content = f"""[Unit]
Description=Solar-Lokal Web Dashboard Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={APP_DIR}
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""
    service_file = f"/etc/systemd/system/{SERVICE_NAME}.service"
    with open(service_file, "w", encoding="utf-8") as f:
        f.write(service_content)

    run_cmd("systemctl daemon-reload")
    run_cmd(f"systemctl enable {SERVICE_NAME}.service")
    run_cmd(f"systemctl restart {SERVICE_NAME}.service")
    print(f"{C_GREEN}[✓] Systemd-Dienst '{SERVICE_NAME}' eingerichtet und gestartet.{C_RESET}")


def main():
    print_banner()
    check_root()

    parser = argparse.ArgumentParser(description="Solar-Lokal App Installer für Proxmox LXC (Schnellmodus)")
    parser.add_argument("--port", type=int, default=80, help="Webserver Port (Standard: 80)")
    parser.add_argument("--repo", type=str, default="https://github.com/Perspektivlos/Solar-App.git", help="Git Repository URL zum Klonen (Standard: Perspektivlos/Solar-App.git)")
    parser.add_argument("--skip-build", action="store_true", help="Überspringt den 'npm run build' Schritt")
    parser.add_argument("--force-build", action="store_true", help="Erzwingt npm run build auch wenn dist/ bereits existiert")
    parser.add_argument("--update", action="store_true", help="Führt vorab apt-get update aus (Standard: deaktiviert für Schnellinstallation)")
    args = parser.parse_args()

    local_ip = get_local_ip()

    # 0. Netzwerk & DNS prüfen / reparieren
    check_and_heal_dns()

    # 1. Standard-Pakete installieren (ohne apt-get update)
    step_install_fast_packages(update=args.update)

    # 2. Quellcode kopieren / vorbereiten
    step_setup_app_source(repo_url=args.repo)

    # 3. App prüfen & ggf. bauen (nutzt vorrangig existierendes dist/ Bundle)
    if not args.skip_build:
        step_build_app(force_build=args.force_build)

    # 4. Nginx einrichten
    step_configure_nginx(web_port=args.port)

    # 5. Systemd Service einrichten (für Port 3000 Preview/Backend)
    step_create_systemd_service()

    # Abschlussbericht
    print(f"\n{C_GREEN}{C_BOLD}============================================================={C_RESET}")
    print(f"{C_GREEN}{C_BOLD}✓ SOLAR-LOKAL APP ERFOLGREICH INSTALLIERT & GESTARTET!{C_RESET}")
    print(f"{C_GREEN}{C_BOLD}============================================================={C_RESET}\n")

    print(f"Das Dashboard ist ab sofort in Ihrem Heimnetzwerk erreichbar:")
    print(f"  • Primärer Zugriff (Nginx) : {C_CYAN}{C_BOLD}http://{local_ip}:{args.port}{C_RESET} oder {C_CYAN}http://{local_ip}{C_RESET}")
    print(f"  • Preview Server (Node.js) : {C_CYAN}http://{local_ip}:3000{C_RESET}\n")

    print(f"{C_BOLD}Nützliche Befehle zur Verwaltung:{C_RESET}")
    print(f"  • Nginx Status         : systemctl status nginx")
    print(f"  • App Service Status   : systemctl status {SERVICE_NAME}")
    print(f"  • Live-Logs anzeigen   : journalctl -u {SERVICE_NAME} -f")
    print(f"  • App neu starten      : systemctl restart {SERVICE_NAME}")
    print(f"  • App-Verzeichnis      : cd {APP_DIR}\n")


if __name__ == "__main__":
    main()
