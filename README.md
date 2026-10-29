# Solar-Lokal-App ☀️🔋
### Autarkes Energiemanagement, Nulleinspeisung & Hardware-Diagnose für Hoymiles, Victron, Trucki & LiFePO4

Eine moderne, hochperformante Steuerungs- und Visualisierungsplattform für private Solarspeicher- und Nulleinspeisesysteme. Entwickelt als 100% lokales, cloudfreies Gesamtsystem mit vier ausgewogenen Säulen: **Hoymiles HM-1500** Mikrowechselrichter (via AhoyDTU), **Victron SmartSolar MPPT** Laderegler (via Venus OS), **Trucki2Shelly (T2SG)** RS485-Gateway mit Lumentree SUN-Inverter und **48V LiFePO4** Batteriespeicher.

---

## 🏛️ Das Gesamtsystem im Überblick

Die Anlage kombiniert AC- und DC-gekoppelte Solarkomponenten für maximale Autarkie und Ausfallsicherheit:

| Komponente | Rolle & Funktion | Schnittstelle / Hostname | Protokoll |
| :--- | :--- | :--- | :--- |
| **Hoymiles HM-1500** | 1500W AC-Direkterzeugung (4 Modul-Eingänge) | `http://ahoydtu.local` (192.168.0.101) | AhoyDTU REST API / MQTT |
| **Victron SmartSolar MPPT (2x)** | DC-Ladung der 48V Batterie (VRM 288 / 289) | `http://venus.local` (192.168.0.111) | Venus OS D-Bus / MQTT |
| **Trucki2Shelly Gateway (T2SG) + Lumentree SUN-2000G2-H** | Dynamische Nulleinspeisung (ZEPC), max. 2000 W AC | `http://trucki.local` (192.168.0.102) | REST `/jsonlive` / MQTT (`TRUCKI/*`) |
| **48V LiFePO4 Speicher (15.4 kWh)** | 6x Power Queen 25.6V 100Ah (2S3P, 51.2 V 300 Ah) | Venus OS (MPPT) & Trucki Gateway | MQTT / VBAT |
| **Shelly Pro 3EM** | 3-Phasen Phasenbezug- & Einspeisemessung | `http://192.168.0.100` | Gen2 RPC / MQTT |
| **Proxmox VE Node** | LXC Host für MQTT, InfluxDB, Grafana (.202) & App | `192.168.0.200` (Port 8006) | HTTPS / Systemd |

---

## 🚀 Hauptfunktionen & Module

### 1. 📊 Ganzheitlicher Leistungsfluss & Dashboard
- **Paritätische Energiebilanz:**
  - ☀️ **PV-Erzeugung:** Getrennte und summierte Visualisierung von **Hoymiles HM-1500** (AC-Dachfeld) und den beiden **Victron SmartSolar MPPTs** (VRM ID 288 / 289).
  - 🔋 **Akkumanagement:** Echtzeit-Ladeleistung (Victron MPPTs), Entladeleistung (Trucki SUN-Inverter ins Hausnetz), Batteriespannung und SoC via Venus OS und Trucki Gateway.
  - ⚡ **Netz (Shelly Pro 3EM):** Saldierter Netzbezug / Netzeinspeisung über alle 3 Phasen (L1, L2, L3) mit Leistungsfaktoren.
  - 🏠 **Hausverbrauch:** Exakte Saldierung des Gesamtverbrauchs in Echtzeit.
- **Recharts Verlaufsdiagramme:** Umschaltbare Zeitfenster (24h, 12h, 6h, 3h) für PV, Akku, Netz und Last.

### 2. ⚡ Full-Stack Express Backend & LAN-Telemetrie
- Integrierter Node.js/Express-Dienst auf Port 3000 (`server.ts`).
- **Hybride Datenerfassung:**
  - Pollt per HTTP Shelly (`192.168.0.100/rpc/EM.GetStatus`), AhoyDTU (`ahoydtu.local/api/inverter/id/0`) und Trucki (`trucki.local/jsonlive`); Victron MPPTs (288/289) und `TRUCKI/#` kommen per MQTT ueber Mosquitto `192.168.0.201:1883` (ohne TLS) inkl. Venus-Keep-Alive.
  - Timeout-Absicherung (1,5 s je Abfrage) verhindert Blockaden bei schlechter WLAN-Verbindung oder Nachtabschaltung der DTU.
  - Failover je Quelle: Nur Quellen ohne frische Daten (< 15 s) werden simuliert. Statusanzeige `LAN Live` / `LAN teilweise` / `Backend REST`.
- **REST-Endpunkte:**
  - `GET /api/telemetry/live`: Aggregierte Telemetrie aller 4 Systemteile.
  - `GET /api/health/hosts`: Echte TCP-Pruefung (Proxmox, MQTT 1883, Grafana, InfluxDB, AhoyDTU, Shelly, Trucki, Venus OS), keine Zufallslatenzen.
  - `POST /api/control/limit`: Leistungsgrenze 0-2000 W, wird als `TRUCKI/MAXPOWEROVR` an den T2SG gesendet.

### 3. 📡 MQTT & Schnittstellen-Suite
- **Live MQTT-Sniffer & Diagnose-Terminal:**
  - Schnelle Filterung nach `ahoy/#`, `venus/#`, `TRUCKI/#`, `shellypro3em/#`.
  - Auto-Scroll, Log-Export (JSON/TXT) und Farbcodierung nach Payload-Typ.
- **Vollständige Topic-Referenz:**
  - AhoyDTU Kanaldaten (`ch0/P_AC`, `ch1/P_DC` bis `ch4/P_DC`).
  - Venus OS D-Bus Werte (`solarcharger/Yield/Power`, `Dc/0/Voltage`).
  - Trucki T2SG Topics (`TRUCKI/ACDISPLAY`, `TRUCKI/ACSETPOINT`, `TRUCKI/VBAT`, `TRUCKI/ZEPC`; Prefix = Geraetename im T2SG).

### 4. 🔧 Wartung, Handbücher & Hardware-Diagnose
- **Integrierte Handbuch-Bibliothek:**
  - **Trucki T2SG v1.15 Handbuch:** RS485-Pinbelegung, DAC-Kalibrierung & Setup.
  - **Lumentree SUN Series Anleitung:** SUN-1000G2 / SUN-2000G2 Grid-Tie Inverter mit Limiter.
  - **Power Queen 25.6V 100Ah LiFePO4 Handbuch:** Ladeschwellen, Drehmomente und Serien-/Parallelschaltung.
  - **Victron Wiring Unlimited (Rev 03):** Richtlinien für sichere Leitungsquerschnitte, Absicherungen und Erdung.
- **Verkabelungspläne & Rechner:**
  - Interaktive Pläne für RS485-Bus, 48V-DC-Hochstrom, AC-Einspeisung und Hauptabsicherung.
  - 16S LiFePO4 Ruhespannungsrechner mit Schwellenwert-Audits.
- **Display-Fehlercodekatalog:** Aufschlüsselung der Inverter-Fehlercodes (E01 bis E06) mit Behebungsanweisungen.

### 5. 📱 PWA & Multi-Device Erkennung
- Automatische Anpassung an Desktop PCs (Tastatur-Hotkeys 1–8), Tablets (Wand-Dashboard) und Smartphones (Bottom-Bar & haptische Buttons).
- Intelligenter Energiesparmodus (2s Takt im Vordergrund, 8s im Hintergrund).
- Offline-Caching via Service Worker.

---

## 💻 Lokale Installation & Entwicklung

### Voraussetzungen
- Node.js >= 18 oder Bun >= 1.1

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/Perspektivlos/Solar-App.git
cd Solar-App
npm install
```

### 2. Entwicklungsserver starten (Full-Stack Backend + Vite)
```bash
npm run dev
```
Die Anwendung und das API-Backend starten gemeinsam unter `http://localhost:3000`.

### 3. Produktions-Build erstellen
```bash
npm run build
npm start
```

---

## 🚀 Sicheres GitHub-Deployment

Zum Übertragen eigener Anpassungen in das Repository `Perspektivlos/Solar-App` steht das Hilfsskript `scripts/github-push.sh` bereit:

```bash
# Push mit automatischer gh-CLI oder SSH-Key Authentifizierung
./scripts/github-push.sh
```

*Sicherheitshinweis:* Das Skript verzichtet vollständig auf die unsichere Übergabe von Tokens in Git-URLs und nutzt stattdessen den lokalen SSH-Schlüsselbund oder die GitHub CLI (`gh`).

---

## 📦 Proxmox LXC Bereitstellung

Im Bereich **Anlagenbericht & Wartung** der App können automatisierte Setup-Skripte für Proxmox VE (Debian 12 Bookworm LXC) generiert werden:

```bash
# Service-Status des Backends prüfen
systemctl status solar-lokal.service

# Live-Logs der Telemetrie ansehen
journalctl -u solar-lokal.service -f
```

---

## 📜 Lizenz & Urheberrecht

Entwickelt für die Open-Source Solar- und Heimautomations-Community.
Alle Produktnamen (Hoymiles, Victron Energy, Trucki, Lumentree, Shelly, Power Queen) sind eingetragene Warenzeichen der jeweiligen Hersteller.
