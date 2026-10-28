# Proxmox VE Bereitstellung & Installations-Skripte für Solar-Lokal

Diese Sammlung enthält zwei betriebsfertige, autonome Python-Skripte zur unkomplizierten Bereitstellung des **Solar-Lokal Energiemanagements** auf einem **Proxmox VE (PVE)** Server.

---

## Übersicht der Skripte

| Skript | Ausführungsort | Aufgabe |
| :--- | :--- | :--- |
| **`create_proxmox_lxc.py`** | **Proxmox Host** (Root Shell) | Lädt Debian 12 Template, erstellt LXC-Container mit optimalen Ressourcen, Netzwerk & Autostart. |
| **`install_solar_app.py`** | **LXC-Container** (Root Shell) | Installiert Node.js LTS, Nginx, baut das React Dashboard und richtet Systemd-Services ein. |

---

## 🚀 Schnellstart: Schritt-für-Schritt

### 1. Dateien auf den Proxmox Host übertragen
Kopieren Sie den Ordner `scripts/proxmox/` oder die beiden `.py` Dateien auf Ihren Proxmox VE Host (z. B. nach `/root/solar-installer/`):

```bash
# Auf Ihrem Proxmox Host:
mkdir -p /root/solar-installer
cd /root/solar-installer
```

### 2. LXC-Container erstellen (`create_proxmox_lxc.py`)
Führen Sie das Erstellungs-Skript direkt auf der Proxmox Shell aus:

```bash
# Standard-Erstellung (DHCP, 2 Kerne, 1024 MB RAM, 10 GB Speicher):
python3 create_proxmox_lxc.py

# Oder mit individuellen Parametern und direkter Auto-Installation:
python3 create_proxmox_lxc.py --vmid 150 --hostname solar-lokal --memory 1024 --cores 2 --auto-install
```

**Verfügbare Optionen:**
- `--vmid <id>`: Freie Container ID (Standard: nächste freie ID, z.B. `150`)
- `--hostname <name>`: Hostname des Containers (Standard: `solar-lokal`)
- `--memory <mb>`: RAM in Megabyte (Standard: `1024`)
- `--cores <n>`: CPU-Kerne (Standard: `2`)
- `--disk <gb>`: Festplattengröße in GB (Standard: `10`)
- `--storage <pool>`: Proxmox Storage Pool (z.B. `local-lvm`, `local-zfs`)
- `--bridge <name>`: Netzwerk-Bridge (Standard: `vmbr0`)
- `--ip <ip>`: Netzwerk (z.B. `dhcp` oder statisch `192.168.178.50/24`)
- `--gw <gateway>`: Gateway bei statischer IP (z.B. `192.168.178.1`)
- `--auto-install`: Startet direkt nach Container-Boot die App-Installation!

---

### 3. App im Container installieren (`install_solar_app.py`)
Falls Sie `--auto-install` nicht genutzt haben, können Sie die Installation jederzeit mit einem einzigen Befehl vom Proxmox Host ausführen:

```bash
# Vom Proxmox Host ausführen (z. B. für VMID 150):
pct exec 150 -- python3 /root/install_solar_app.py
```

Oder Sie loggen sich in den Container ein:
```bash
pct enter 150
python3 install_solar_app.py
```

Das Skript erledigt automatisch:
1. Schnelle Installation der Standard-Systempakete (`curl`, `git`, `nginx`, `build-essential`, `nodejs`, `npm`) ohne zeitintensives `apt-get update`
2. Sofortige Nutzung der Debian-eigenen Node.js & npm Pakete (keine externen Repositories / kein NodeSource)
3. Kopieren oder Klonen des Quellcodes (`https://github.com/Perspektivlos/Solar-App.git`) nach `/opt/solar-lokal`
4. Sofortige Bereitstellung des fertigen `dist`-Bundles via Nginx (oder nativer Build mit `@tailwindcss/oxide-linux-x64-gnu`)
5. Konfiguration des **Nginx** Webservers (Port 80 mit Gzip & SPA Fallback)
6. Optionaler **Systemd Service** (`solar-lokal.service` auf Port 3000)

---

## 🌐 Zugriff auf das Dashboard

Nach erfolgreicher Installation ist das Solar-Lokal Dashboard sofort im gesamten Heimnetzwerk erreichbar unter:

```text
http://<CONTAINER-IP>/
```

---

## ⚙️ Wichtige Steuerungsbefehle im Container

```bash
# Webserver Status prüfen:
systemctl status nginx

# App Service Status & Logs:
systemctl status solar-lokal
journalctl -u solar-lokal -f

# App neu starten:
systemctl restart solar-lokal

# App aktualisieren:
cd /opt/solar-lokal
npm run build
systemctl restart nginx
```

## Update einer bestehenden Installation

Im Container (als root):

```bash
bash /opt/solar-lokal/scripts/proxmox/update_solar_app.sh
```

Das Skript sichert `.env`, `hardware-config.json` und `mqtt-config.json` nach `/root/solar-lokal-backup-*`,
zieht `main` per Fast-Forward, baut neu und korrigiert alte Installationen:

- systemd startet das Backend (`npm start`) statt `vite preview`
- Nginx leitet `/api/` ohne Pfadkuerzung an `127.0.0.1:3000` weiter

Zum Schluss prueft es Backend, Nginx, MQTT-Verbindung und die vier Datenquellen.
