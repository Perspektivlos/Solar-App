# Implementierungsplan: Recharts-Diagramme & kWh-Energiebilanz

Dieser Plan stellt die beiden Architektur- und Designoptionen für die Integration der **Recharts-Bibliothek** auf der Energie-Seite vor, inklusive interaktiver Zeitfenster (24h, 12h, 6h, 3h), Linien für **PV-Erzeugung**, **Akku-Nutzung**, **Netz** und **Hausverbrauch** sowie einer umfassenden **kWh-Energiebilanz**.

---

## Visuelle Vorschau: Option 1 vs. Option 2

### Option 1: Synchronisiertes Multilinien-Diagramm mit Kanal-Toggles (Empfohlen)

Ein großes, zentrales Dashboard-Diagramm, auf dem alle 4 Energieflüsse in einer gemeinsamen zeitlichen Achse liegen. Einzelne Kurven können per Klick in der Legende ein- oder ausgeblendet werden.

![Option 1 - Synchronisiertes Multilinien-Diagramm](/src/assets/images/preview_option1_unified_1792509784011.jpg)

**Vorteile von Option 1:**
- **Direkter Bezug auf einen Blick:** Man erkennt sofort das Zusammenspiel zwischen PV-Ertrag, Akku-Ladung/Entladung, Netzbezug und Hausverbrauch (z. B. wenn die Sonne sinkt und der Akku nahtlos übernimmt).
- **Kanalfilter:** Jede Kurve (PV, Akku, Netz, Haus) kann über einen Klickfilter isoliert oder verglichen werden.
- **Kompakt & übersichtlich:** Spart vertikalen Platz auf Tablets und Monitoren.

---

### Option 2: Vier getrennte Einzel-Diagramme im Grid

Vier separate, spezialisierte Diagramm-Kacheln für jeden Kanal, jeweils mit eigener Skalierung und Kurvenverlauf.

![Option 2 - Getrennte Einzeldiagramme](/src/assets/images/preview_option2_separated_1792509797668.jpg)

**Vorteile von Option 2:**
- **Keine Kurvenüberlagerung:** Jede Kennzahl hat ihre eigene Nulllinie und individuelle Y-Achsenskalierung (besonders nützlich bei stark unterschiedlichen Werten).
- **Fokus pro Gerät/Domäne:** Direkte Zuweisung zu PV (Hoymiles/Victron), Akku (Seplos BMS/Trucki), Netz (Shelly Pro 3EM) und Hausverbrauch.

---

## Kernfunktionen beider Varianten

### 1. Interaktiver Zeitbereichs-Wahlschalter
- **Zeitfenster:** `24h` · `12h` · `6h` · `3h`
- **Granularität:**
  - `24h`: 15-Minuten-Intervalle (96 Datenpunkte für den gesamten Tag)
  - `12h`: 10-Minuten-Intervalle
  - `6h`: 5-Minuten-Intervalle
  - `3h`: 2-Minuten-Intervalle für hochauflösende Echtzeit-Detailansicht
- Glatte, interpolierte Kurven mit dezentem Leuchtverlauf (Glow) passend zum ultra-modernen Design ohne grelles Neon.

### 2. Detaillierte kWh-Energiebilanz
Unter dem Diagrammbereich wird eine moderne Bilanzleiste implementiert:
- **Solar-Ertrag Heute (kWh):** Summe aus Hoymiles HM-1500 + Victron SmartSolar MPPTs
- **Netzbezug Heute (kWh):** Reale Zählerwerte des Shelly Pro 3EM
- **Netzeinspeisung Heute (kWh):** Eingespeiste Überschussenergie
- **Hausverbrauch Gesamt (kWh):** Berechnete Gesamtlast (`PV + Akku-Entladung + Netzbezug - Einspeisung - Akku-Ladung`)
- **Autarkiegrad (%):** Dynamischer Ring-/Kreisindikator: `(Eigenverbrauch / Gesamtverbrauch) * 100`

---

## Technische Umsetzungsschritte

1. **Paketinstallation:**
   - Installation von `recharts` via `install_applet_package`.
2. **Datenmodell & Historien-Generator (`src/utils/energyHistory.ts`):**
   - Berechnung realistischer Tageskurven für 24h/12h/6h/3h basierend auf den aktuellen Live-Telemetriewerten.
   - Synchronisierte Fortschreibung bei laufender Simulation.
3. **Komponenten-Erweiterung (`src/components/EnergyAnalytics.tsx`):**
   - Einbettung des Recharts `ResponsiveContainer`, `LineChart`, `AreaChart` (mit Gradienten), `Tooltip` mit individuellem Glasmorphismus-Styling und `Legend`.
   - Zeitbereichs-Umschalter (24h, 12h, 6h, 3h).
   - kWh-Energiebilanz-Kacheln mit sauberen Typografien und Tabellenziffern (`tabular-nums`).
4. **Verifikation & Qualitätssicherung:**
   - Build- & Typüberprüfung mit `compile_applet` und `lint_applet`.
   - Responsives Verhalten auf Desktop und mobilen Ansichten.
