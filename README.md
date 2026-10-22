# Solar-Lokal-App ☀️🔋
### Intelligentes Energiemanagement, Nulleinspeisung & Hardware-Diagnose für Lumentree SUN & Trucki T2SG

Eine moderne, hochperformante Steuerungs- und Visualisierungsplattform für private Solarspeicher- und Nulleinspeisesysteme. Entwickelt für die nahtlose Anbindung von **Lumentree SUN-G2** Wechselrichtern, **Trucki T2SG** RS485-Stick-Gateways, **Shelly 3EM / Pro 3EM** Smart Metern und **LiFePO4 48V/24V** Batteriespeichern über MQTT und REST-APIs.

---

## 🚀 Hauptfunktionen & Module

### 1. 📊 Energie- & Leistungsfluss (Recharts-Integration)
- **Mehrkanalige Verlaufsdiagramme:** 
  - Umschaltbare Zeitfenster: **24 Stunden**, **12 Stunden**, **6 Stunden** und **3 Stunden**.
  - Synchronisierte Kurven für:
    - ☀️ **PV-Erzeugung (W)**
    - 🔋 **Akku-Laden & -Entladen (W)**
    - ⚡ **Netzbezug & Netzeinspeisung (W)**
    - 🏠 **Hausverbrauch (W)**
- **kWh-Energiebilanz:**
  - Berechnete Tageserträge und Verbräuche (PV Ertrag kWh, Netzeinspeisung kWh, Netzbezug kWh, Akku-Zyklen kWh, Direktverbrauch).
  - Autarkiegrad- und Eigenverbrauchsquote in Prozent mit Live-Indikatoren.

### 2. 📡 MQTT & Schnittstellen-Suite
- **Live MQTT-Sniffer & Diagnose-Terminal:**
  - Echtzeit-Stream aller ein- und ausgehenden MQTT-Nachrichten.
  - Leistungsfähige Topic-Filterung (`trucki/#`, `lumentree/#`, `shelly/#`, `homeassistant/#`).
  - Auto-Scroll, Log-Export (JSON/TXT), Pausenfunktion und Farbcodierung nach Payload-Typ.
- **Trucki T2SG Topic-Referenz:**
  - Vollständige Liste der genauen Steuerungs- und Statustopics (Leistungsvorgabe `setpower`, AC-Spannung, Wechselrichter-Temperatur, Fehlerbits).
- **REST & WebSocket API:**
  - Standardisierte Endpunkte für externe Dashboards (Home Assistant, ioBroker, Node-RED).

### 3. 🔧 Wartung, Handbücher & Hardware-Diagnose
- **PDF-Handbuch-Bibliothek:**
  - **Trucki T2SG v1.15 Handbuch:** Detaillierte Anleitung für das RS485-Gateways inklusive Pinbelegung, Konfiguration und MQTT-Setup.
  - **Lumentree SUN Series Anleitung:** Vollständiges Handbuch für Lumentree SUN-1000G2 / SUN-2000G2 (Grid-Tie Inverter mit Limiter).
  - Integrierter In-App PDF-Viewer mit Vollbild-Modus, Direktdownload und Schnellnavigation.
  - Erweiterungsmodul zum Hinzufügen weiterer Datenblätter (MPPT-Laderegler, Shelly Pro 3EM).
- **Interaktive Verkabelungspläne:**
  - **RS485-Bus:** Trucki T2SG Steckerleiste, A/B-Differenzialdatenleitung, Terminierungswiderstände (120Ω).
  - **DC 48V LiFePO4 Hochstrom:** Batteriehauptsicherung (Mega-Fuse 125A), Trennschalter, BMS-Kommunikation.
  - **AC-Netzeinspeisung & Shelly Pro 3EM:** Phasenrichtige Messung und Absicherung (B16A LSS).
  - Interaktives Anzeigemodul mit Zoom-, Pan- und Upload-Funktion für eigene Schaltpläne.
- **Lumentree SUN-G2 Display-Fehlercodekatalog:**
  - Aufschlüsselung der Display-Fehlermeldungen **E01 bis E06**:
    - **E01:** DC-Überspannung (DC Overvoltage)
    - **E02:** DC-Unterspannung (DC Undervoltage)
    - **E03:** Überhitzung Kühlkörper / Leistungsstufe
    - **E04:** AC-Netzspannung außerhalb der Toleranz
    - **E05:** AC-Netzfrequenz fehlerhaft
    - **E06:** Interner Relais- oder Messfehler
  - Klare Ursachenanalyse und konkrete Schritt-für-Schritt Behebungsanweisungen.
- **16S / 8S LiFePO4 Batterie-Spannungsrechner:**
  - Präzise SoC-Berechnung für LiFePO4-Zellen anhand der chemischen Ruhespannungskurve.
  - Schwellenwertprüfung für Bulk-, Float-, Cut-Off- und Warnspannungen.
  - Erkennung von Zellendrift und Warnungen bei Über-/Unterladung.

### 4. 🎛️ Nulleinspeisung & Speicherregelung
- Dynamische Sollwertvorgabe in Millisekunden an den Trucki T2SG Limiter.
- Konfigurierbare Entladegrenzen (DoD) zum Schutz der Batterielebensdauer.
- Umschaltung zwischen automatischer Nulleinspeisung, fixer Einspeiseleistung und Akku-Vorrangladung.

---

## 🛠️ Technische Architektur

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Build-Tooling:** Vite, Bun / Node.js 20 LTS.
- **Protokolle:** MQTT v3.1.1 / v5.0, WebSocket, HTTP REST JSON.
- **Hardware-Schnittstellen:** RS485 (Half-Duplex 9600 Baud), Modbus RTU / ASCII.

---

## 💻 Lokale Installation & Entwicklung

### Voraussetzungen
- Node.js >= 18 oder Bun >= 1.1

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/Perspektivlos/Solar-Lokal-App.git
cd Solar-Lokal-App
npm install
```

### 2. Entwicklungsserver starten
```bash
npm run dev
```
Die Anwendung ist anschließend unter `http://localhost:3000` im Browser erreichbar.

### 3. Produktions-Build erstellen
```bash
npm run build
```

---

## 📦 Proxmox LXC & Standalone Bereitstellung

Im Bereich **System-Report & Wartung** der App können automatisierte Setup-Skripte für Proxmox VE (LXC Debian 12 Bookworm) generiert werden, die Node.js, Mosquitto MQTT Broker und den systemd-Dienst automatisch installieren und konfigurieren:

```bash
# Service-Status prüfen
systemctl status solar-lokal.service

# Live-Logs ansehen
journalctl -u solar-lokal.service -f
```

---

## 📜 Lizenz & Urheberrecht

Entwickelt für die Open-Source Solar- und Heimautomations-Community.
Alle Produktnamen (Lumentree, Trucki, Shelly) sind eingetragene Warenzeichen der jeweiligen Hersteller.
