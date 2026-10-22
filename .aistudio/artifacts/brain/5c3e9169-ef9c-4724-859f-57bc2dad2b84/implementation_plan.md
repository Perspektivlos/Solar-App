# Implementierungsplan: Live MQTT-Sniffer & Diagnose-Terminal

Integration eines vollwertigen Diagnose-Terminals und Live-Sniffers direkt in den Tab **MQTT & APIs** als dritter Unterbereich neben dem Schema-Parser und den REST-APIs.

---

## 1. Übersicht & Zielsetzung
Das Diagnose-Terminal ermöglicht die Live-Überwachung und interaktive Steuerung des gesamten lokalen MQTT-Nachrichtenverkehrs (Mosquitto Port 1883) zwischen allen Komponenten:
- **Hoymiles HM-1500 (OpenDTU / AhoyDTU)** (`venus/pv/ahoydtu/#`)
- **Shelly Pro 3EM** (`venus/grid/shellypro/#`)
- **Trucki RS485 AC-Gateway** (`Trucki/#`)
- **Victron Venus OS D-Bus MQTT-Bridge** (`N/b827eb79321c/#`, `R/b827eb79321c/keepalive`)

---

## 2. Geplante Komponenten & Architektur

### 2.1 Neuer Unterbereich in `MqttApiDocs.tsx`
- Erweiterung des Sub-Tab-Headers von 2 auf 3 Reiter:
  1. `MQTT Schema Parser` (Vorhandene Dokumentation & Schema-Typisierung)
  2. `Lokale REST-APIs` (Vorhandene REST-Endpunkte & Swagger-like Tests)
  3. **`Live Sniffer & Terminal` (NEU: Echtzeit-Diagnose & Befehlskonsole)**

### 2.2 Live MQTT-Sniffer (Echtzeit-Monitor)
- **Nachrichten-Stream**:
  - Live einlaufende Nachrichten mit Timestamp (`HH:mm:ss.SSS`), Topic-Pfad, Payload, QoS (0, 1) und Retain-Flag.
  - Dynamischer Live-Ticker (1–2 Sekunden Takt), der reale Messwerte (Shelly Leistung je Phase, Hoymiles Kanalwerte, Trucki Regelsollwerte, Victron MPPT Yields) einspeist.
- **Steuerung & Ergonomie**:
  - `Pause / Fortsetzen`: Hält den Stream an, um spezifische Pakete in Ruhe zu untersuchen.
  - `Autoscroll-Toggle`: Automatisches Weiterscrollen an den neuesten Eintrag oder Halten der Position.
  - `Log leeren`: Setzt den aktuellen Puffer zurück.
  - `Durchsatz-Anzeige`: Live-Metriken zu Nachrichten/Sekunde und Datenrate (z. B. `4.8 msg/s`, `1.6 KB/s`).
- **Filter- & Suchleiste**:
  - Wildcard-Suche nach MQTT-Topic (unterstützt `#` und `+` Wildcards sowie Volltextsuche).
  - Quick-Filter-Chips:
    - `Alle Topics`
    - `Shelly Pro 3EM` (`venus/grid/#`)
    - `AhoyDTU / Hoymiles` (`venus/pv/#`)
    - `Trucki Gateway` (`Trucki/#`)
    - `Victron VenusOS` (`N/b827eb79321c/#`)
  - Payload-Suchfeld (z. B. nach Feldern wie `"P_AC"` oder `"soc"`).

### 2.3 Interaktives Publish-Terminal (Befehlssender)
- Direkte Eingabemaske zum Publishen von MQTT-Nachrichten an den lokalen Broker:
  - **Topic-Eingabe** mit Syntax-Highlighting.
  - **Payload-Editor** (JSON mit Syntaxprüfung oder Plain-String).
  - **QoS & Retain-Auswahl**.
- **Schnellbefehl-Presets (Quick-Actions)** für praxistypische Solar-Steuerungen:
  1. **Trucki Nulleinspeise-Sollwert**: `Trucki/RS485/rx/power_setpoint` mit Payload `{"setpoint_watts": 350}`
  2. **Hoymiles Leistungslimitierung (AhoyDTU)**: `venus/pv/ahoydtu/Hoymiles1500/cmd/limit_nonpersistent_relative` mit `{"limit": 75}`
  3. **VenusOS Keepalive-Ping**: `R/b827eb79321c/keepalive` mit Payload `""` (verlängert das Daten-Abo um 60 s)
  4. **Shelly Schaltausgang (Switch)**: `venus/grid/shellypro/rpc` mit `{"id": 1, "method": "Switch.Set", "params": {"id": 0, "on": true}}`
- **Feedback & Feedback-Historie**:
  - Visuelle Bestätigung ("Message ACK - Sent to 127.0.0.1:1883 in 4.2ms").
  - Gesendete Nachrichten erscheinen farblich hervorgehoben (Outbound / TX) direkt im Sniffer-Log.

### 2.4 Payload-Inspector Drawer / Detailansicht
- Beim Klick auf eine empfangene oder gesendete Nachricht öffnet sich der strukturierte Payload-Viewer:
  - Formatierte JSON-Baumansicht mit Copy-Button.
  - Raw String / Hex Ansicht.
  - Typ-Erkennung der Einheiten (W, V, A, %, kWh, °C).

---

## 3. Technische Umsetzungsschritte

1. **Typen in `src/types.ts` erweitern**:
   - `MqttLogMessage`: `id`, `timestamp`, `topic`, `payload`, `rawPayload`, `qos`, `retain`, `direction` ('in' | 'out'), `source`.
   - `MqttPublishPreset`: `name`, `topic`, `payload`, `description`.
2. **Neues Modul `src/components/MqttLiveSniffer.tsx` erstellen**:
   - Kompakte, hochmoderne Terminal-Optik passend zum Scifi-/Dark-Architectural-Design.
   - Pufferung von bis zu 100 Nachrichten mit Ring-Buffer-Verhalten.
   - Filter-Engine mit Wildcard-Unterstützung.
3. **Integration in `src/components/MqttApiDocs.tsx`**:
   - Einbindung des 3. Tabs ("Live Sniffer & Terminal").
   - Nahtlose Weitergabe von Beispieldaten und Vernetzung mit den dokumentierten Schemas.
4. **Verifikation & Test**:
   - TypeScript-Kompilierung (`compile_applet`) und Linting.
   - Überprüfung aller Presets, Filterfunktionen und Reaktionszeiten.
