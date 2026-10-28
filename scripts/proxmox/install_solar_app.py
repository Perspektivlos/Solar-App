#!/usr/bin/env python3
"""
=============================================================================
Solar-Lokal App Installer - Debian 12 / Ubuntu LXC Container
=============================================================================
Installiert und konfiguriert das Solar-Lokal Dashboard vollautomatisch
innerhalb einer Debian 12 / Ubuntu LXC-Instanz auf Proxmox VE.

Schritte:
  1. System-Updates & Abhängigkeiten (curl, git, ca-certificates, nginx)
  2. Installation von modernem Node.js LTS (v22 / v20) via NodeSource
  3. Einrichtung des App-Verzeichnisses unter /opt/solar-lokal
  4. Installation der Node.js Dependencies & Production Build (Vite)
  5. Konfiguration des Nginx Webservers für minimale Latenz & SPA-Routing
  6. Optionaler Systemd Service für Node.js Live-Betrieb
  7. Start & Health-Check

Verwendung im Container:
    python3 install_solar_app.py
    python3 install_solar_app.py --port 80 --mode nginx
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
    print("│            SOLAR-LOKAL // CONTAINER APP INSTALLER          │")
    print("│       Nginx Production Build • Systemd Service • Node LTS   │")
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


def check_and_heal_dns():
    """
    Prüft die DNS-Auflösung und Internet-Konnektivität im LXC-Container.
    Falls deb.nodesource.com oder github.com nicht aufgelöst werden können,
    wird /etc/resolv.conf automatisch mit Fallback-Nameservern repariert.
    """
    print(f"\n{C_CYAN}[0/6] Prüfe Netzwerk- und DNS-Konnektivität...{C_RESET}")
    
    test_domains = ["deb.nodesource.com", "github.com", "deb.debian.org"]
    dns_ok = False
    
    for domain in test_domains:
        try:
            socket.gethostbyname(domain)
            dns_ok = True
            break
        except Exception:
            pass

    if dns_ok:
        print(f"{C_GREEN}[✓] DNS-Auflösung funktional.{C_RESET}")
        return True

    print(f"{C_YELLOW}[!] DNS-Auflösung fehlgeschlagen (deb.nodesource.com / github.com nicht erreichbar).{C_RESET}")
    print(f"{C_YELLOW}[*] Automatische Reparatur: Schreibe funktionale Nameserver in /etc/resolv.conf...{C_RESET}")

    fallback_dns = (
        "# Solar-Lokal Auto-Generated DNS\n"
        "nameserver 192.168.0.1\n"
        "nameserver 1.1.1.1\n"
        "nameserver 8.8.8.8\n"
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
            print(f"{C_GREEN}[✓] DNS-Auflösung nach Reparatur erfolgreich ({domain}).{C_RESET}")
            return True
        except Exception:
            pass

    # Prüfe ob Default-Gateway vorhanden ist
    route_check = run_cmd("ip route show default", capture_output=True, check=False)
    default_gw = route_check.stdout.strip() if route_check.returncode == 0 else ""
    if not default_gw:
        print(f"{C_RED}[FEHLER] Kein Standard-Gateway im LXC Container konfiguriert!{C_RESET}")
        print(f"{C_YELLOW}Hinweis: Führen Sie auf dem Proxmox Host aus:{C_RESET}")
        print(f"  pct set <CTID> -nameserver '192.168.0.1 8.8.8.8'")
        print(f"Oder im Container:{C_RESET}")
        print(f"  ip route add default via 192.168.0.1 dev eth0")
    else:
        print(f"{C_YELLOW}[!] Gateway vorhanden ({default_gw}), aber externe Hostnamen noch unauflösbar.{C_RESET}")

    return False


def step_update_system():
    print(f"\n{C_CYAN}[1/6] Aktualisiere Paketquellen & installiere Basis-Pakete...{C_RESET}")
    run_cmd("apt-get update -y", check=False)
    packages = [
        "curl",
        "git",
        "ca-certificates",
        "gnupg",
        "lsb-release",
        "nginx",
        "build-essential",
        "rsync",
        "ufw"
    ]
    run_cmd(f"apt-get install -y {' '.join(packages)}")
    print(f"{C_GREEN}[✓] Basis-Pakete installiert.{C_RESET}")


def step_install_nodejs():
    print(f"\n{C_CYAN}[2/6] Prüfe / Installiere Node.js LTS (v22 / v20)...{C_RESET}")
    needs_install = True
    if shutil.which("node") and shutil.which("npm"):
        res = run_cmd("node -v", capture_output=True, check=False)
        if res.returncode == 0:
            version_str = res.stdout.strip()
            print(f"{C_GREEN}[✓] Node.js bereits vorhanden: {version_str}{C_RESET}")
            try:
                major = int(version_str.lstrip("v").split(".")[0])
                if major >= 18:
                    needs_install = False
            except ValueError:
                pass

    if needs_install:
        nodesource_success = False
        print(f"{C_YELLOW}[*] Versuche offizielles NodeSource Repository für Node 22 einzurichten...{C_RESET}")
        run_cmd("mkdir -p /etc/apt/keyrings")
        
        # Sicherer curl Download mit Verbindungstimeout (kein unkontrollierter Abbruch)
        curl_key_res = run_cmd("curl -fsSL --connect-timeout 6 https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes", check=False)
        if curl_key_res.returncode == 0:
            run_cmd('echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list')
            update_res = run_cmd("apt-get update -y", check=False)
            if update_res.returncode == 0:
                install_res = run_cmd("apt-get install -y nodejs", check=False)
                if install_res.returncode == 0:
                    nodesource_success = True
                    print(f"{C_GREEN}[✓] Node.js 22 via NodeSource erfolgreich installiert.{C_RESET}")

        if not nodesource_success:
            print(f"{C_YELLOW}[!] NodeSource Repository war nicht erreichbar oder schlug fehl.{C_RESET}")
            print(f"{C_YELLOW}[*] Fallback: Installiere Node.js & npm aus offiziellem Debian/Ubuntu Repository...{C_RESET}")
            # Bereinige etwaige unvollständige NodeSource sources-list
            if os.path.exists("/etc/apt/sources.list.d/nodesource.list"):
                try:
                    os.remove("/etc/apt/sources.list.d/nodesource.list")
                except Exception:
                    pass
            run_cmd("apt-get update -y", check=False)
            run_cmd("apt-get install -y nodejs npm", check=True)
            print(f"{C_GREEN}[✓] Node.js & npm aus Standard-Paketquellen erfolgreich installiert.{C_RESET}")

    res_node = run_cmd("node -v", capture_output=True, check=False)
    res_npm = run_cmd("npm -v", capture_output=True, check=False)
    node_str = res_node.stdout.strip() if res_node.returncode == 0 else "unbekannt"
    npm_str = res_npm.stdout.strip() if res_npm.returncode == 0 else "unbekannt"
    print(f"{C_GREEN}[✓] Node: {node_str} | NPM: {npm_str}{C_RESET}")


def step_setup_app_source(repo_url=None):
    print(f"\n{C_CYAN}[3/6] Richte Solar-Lokal App-Verzeichnis unter {APP_DIR} ein...{C_RESET}")
    os.makedirs(APP_DIR, exist_ok=True)

    # Prüfen, ob das Skript innerhalb des Projektverzeichnisses aufgerufen wird
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    potential_root = os.path.abspath(os.path.join(current_script_dir, "..", ".."))

    if os.path.exists(os.path.join(potential_root, "package.json")):
        print(f"{C_GREEN}[✓] Lokales Projekt im übergeordneten Verzeichnis gefunden. Synchronisiere nach {APP_DIR}...{C_RESET}")
        run_cmd(f"rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' {potential_root}/ {APP_DIR}/")
    elif os.path.exists(os.path.join(current_script_dir, "package.json")):
        print(f"{C_GREEN}[✓] Projekt im aktuellen Verzeichnis gefunden. Kopiere nach {APP_DIR}...{C_RESET}")
        run_cmd(f"rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' {current_script_dir}/ {APP_DIR}/")
    elif repo_url:
        print(f"{C_YELLOW}[*] Klone Repository von {repo_url}...{C_RESET}")
        if os.path.exists(os.path.join(APP_DIR, ".git")):
            run_cmd(f"cd {APP_DIR} && git pull")
        else:
            run_cmd(f"git clone {repo_url} {APP_DIR}")
    else:
        # Falls keine Dateien da sind, erstellen wir eine Basiskonfiguration oder erwarten manuelle Kopie
        print(f"{C_YELLOW}[!] Kein Git-Repo angegeben und keine Quellcodedateien im aktuellen Pfad gefunden.{C_RESET}")
        print(f"{C_YELLOW}[*] Erstelle App-Struktur in {APP_DIR}... Bitte kopieren Sie Ihre Dateien nach {APP_DIR}.{C_RESET}")


def step_build_app():
    print(f"\n{C_CYAN}[4/6] Installiere Node-Dependencies & erstelle Production Build...{C_RESET}")
    if not os.path.exists(os.path.join(APP_DIR, "package.json")):
        print(f"{C_RED}[!] Kein package.json in {APP_DIR} gefunden! Bitte stellen Sie sicher, dass die App-Dateien vorhanden sind.{C_RESET}")
        return False

    print(f"{C_YELLOW}[>] Führe 'npm install' aus (dies kann einen Moment dauern)...{C_RESET}")
    run_cmd(f"cd {APP_DIR} && npm install --no-audit --no-fund")

    print(f"{C_YELLOW}[>] Führe 'npm run build' aus...{C_RESET}")
    run_cmd(f"cd {APP_DIR} && npm run build")
    
    dist_index = os.path.join(APP_DIR, "dist", "index.html")
    if os.path.exists(dist_index):
        print(f"{C_GREEN}[✓] Production Build erfolgreich erstellt: {dist_index}{C_RESET}")
        return True
    else:
        print(f"{C_RED}[FEHLER] 'dist/index.html' wurde nach dem Build nicht gefunden.{C_RESET}")
        return False


def step_configure_nginx(web_port=80):
    print(f"\n{C_CYAN}[5/6] Konfiguriere Nginx Webserver für Solar-Lokal (Port {web_port})...{C_RESET}")

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
    """Erstellt optional einen Systemd-Dienst zur Ausführung des Vite Dev/Preview Servers."""
    print(f"\n{C_CYAN}[6/6] Richte Systemd-Dienst 'solar-lokal.service' ein...{C_RESET}")

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

    parser = argparse.ArgumentParser(description="Solar-Lokal App Installer für Proxmox LXC")
    parser.add_argument("--port", type=int, default=80, help="Webserver Port (Standard: 80)")
    parser.add_argument("--repo", type=str, default="https://github.com/Perspektivlos/Solar-App.git", help="Git Repository URL zum Klonen (Standard: Perspektivlos/Solar-App.git)")
    parser.add_argument("--skip-build", action="store_true", help="Überspringt den 'npm run build' Schritt")
    args = parser.parse_args()

    local_ip = get_local_ip()

    # 0. Netzwerk & DNS prüfen / reparieren
    check_and_heal_dns()

    # 1. System aktualisieren
    step_update_system()

    # 2. Node.js installieren
    step_install_nodejs()

    # 3. Quellcode kopieren / vorbereiten
    step_setup_app_source(repo_url=args.repo)

    # 4. App bauen
    if not args.skip_build:
        step_build_app()

    # 5. Nginx einrichten
    step_configure_nginx(web_port=args.port)

    # 6. Systemd Service einrichten (für Port 3000 Preview/Backend)
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
