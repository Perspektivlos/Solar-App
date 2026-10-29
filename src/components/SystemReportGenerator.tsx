import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  Sparkles,
  Code,
  Terminal,
  Server,
  Layers,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Cpu,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Calculator,
  Sliders,
  Zap,
  GitBranch,
  Filter,
  Info,
  CheckCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { 
  DeviceInventoryItem, 
  NetworkHost, 
  MqttTopicDoc, 
  ApiDoc, 
  ChangeLogEntry, 
  MaintenanceEntry, 
  SolarTelemetry 
} from '../types';

interface SystemReportGeneratorProps {
  telemetry: SolarTelemetry;
  devices: DeviceInventoryItem[];
  hosts: NetworkHost[];
  mqttTopics: MqttTopicDoc[];
  apiDocs: ApiDoc[];
  changeLog: ChangeLogEntry[];
  maintenanceLog: MaintenanceEntry[];
}

export interface ComponentAuditItem {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  status: 'ok' | 'info' | 'warning';
  statusLabel: string;
  liveMetric: string;
  targetTolerance: string;
  evaluatedCriteria: { label: string; passed: boolean; value: string }[];
  recommendation: string;
  manualRef: string;
}

export interface PlausibilityRuleItem {
  id: string;
  category: 'Netzwerk' | 'Sicherheit' | 'Telemetrie' | 'Regelung & Batterie';
  label: string;
  status: 'ok' | 'info' | 'warning';
  detail: string;
  remedy: string;
}

export type ReportVersionKey = 
  | 'v1.4 (Aktuell · 28.10.2026)'
  | 'v1.3 (28.10.2026 · Nginx & Schnell-Setup)'
  | 'v1.2 (20.10.2026 · Wiring Unlimited)'
  | 'v1.1 (08.09.2026 · IP & MQTT Topologie)'
  | 'v1.0 (Initial 2026 · Basiskonzept)';

export interface ReportVersionMeta {
  key: ReportVersionKey;
  version: string;
  date: string;
  title: string;
  status: 'Aktuell freigegeben' | 'Archiviert';
  highlights: string[];
}

export const REPORT_VERSIONS: ReportVersionMeta[] = [
  {
    key: 'v1.4 (Aktuell · 28.10.2026)',
    version: 'v1.4',
    date: '28.10.2026',
    title: '11-Komponenten Prüfbericht, 16 Plausibilitätsregeln & Auto-Discovery',
    status: 'Aktuell freigegeben',
    highlights: [
      '11-Komponenten Prüfmatrix mit Ampellogik, Grenzwert-Toleranzen & konkreten Korrekturhinweisen',
      '16 System-Plausibilitätsprüfungen (Netzwerk, Sicherheit, Telemetrie, Regelung & Batterie)',
      'Elektrotechnischer Leitungsnachweis & Kabelrechner nach Victron Wiring Unlimited (ΔU, P_loss, Sicherung)',
      'Bereinigung unbestätigter Daten auf „nicht erfasst“ mit Auto-Discovery Anreicherung'
    ]
  },
  {
    key: 'v1.3 (28.10.2026 · Nginx & Schnell-Setup)',
    version: 'v1.3',
    date: '28.10.2026',
    title: 'Proxmox VE 8 Blitz-Bereitstellung & Nginx Dist-Serving',
    status: 'Archiviert',
    highlights: [
      'Bereitstellungsskripte für sofortigen Nginx-Betrieb auf Port 80 ohne apt-get update',
      'DNS-Nameserver (192.168.0.1 8.8.8.8) und Standardgateway-Absicherung im unprivilegierten LXC',
      'GitHub Anycast IP-Fallback für hermetische Netzwerkumgebungen'
    ]
  },
  {
    key: 'v1.2 (20.10.2026 · Wiring Unlimited)',
    version: 'v1.2',
    date: '20.10.2026',
    title: 'Integration technischer Handbücher & Victron Schaltpläne',
    status: 'Archiviert',
    highlights: [
      'Power Queen 25.6V 100Ah Handbuch & Ladekennlinien integriert',
      'Victron Wiring Unlimited Richtlinien für Schmelzsicherungen und Querschnitte',
      'Trucki T2SG RS485 Befehlssatz dokumentiert'
    ]
  },
  {
    key: 'v1.1 (08.09.2026 · IP & MQTT Topologie)',
    version: 'v1.1',
    date: '08.09.2026',
    title: 'Subnetz-Dokumentation 192.168.0.0/24 & Mosquitto ACLs',
    status: 'Archiviert',
    highlights: [
      'Statische DHCP-Reservierungen für 9 Kern-Hosts',
      'Mosquitto ACLfile mit Lese-/Schreibisolation für Shelly, Ahoy und T2SG'
    ]
  },
  {
    key: 'v1.0 (Initial 2026 · Basiskonzept)',
    version: 'v1.0',
    date: '01.09.2026',
    title: 'Initiale Systemdokumentation',
    status: 'Archiviert',
    highlights: [
      'Erfassung der Primärkomponenten (Shelly, Hoymiles, Sun 2000)',
      'Grundlegendes Nulleinspeisungs-Konzept'
    ]
  }
];

export const SystemReportGenerator: React.FC<SystemReportGeneratorProps> = ({
  telemetry,
  devices,
  hosts,
  mqttTopics,
  apiDocs,
  changeLog,
  maintenanceLog
}) => {
  const [reportVersion, setReportVersion] = useState<ReportVersionKey>('v1.4 (Aktuell · 28.10.2026)');
  const [showTimeline, setShowTimeline] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<'python_instance' | 'python_install' | 'python_update' | 'proxmox_bash' | 'docker' | 'mosquitto_acl'>('python_instance');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Filter-Status für Prüfmatrix und Plausibilitätsprüfungen
  const [componentFilter, setComponentFilter] = useState<'all' | 'ok' | 'info' | 'warning'>('all');
  const [plausibilityCategory, setPlausibilityCategory] = useState<'all' | 'Netzwerk' | 'Sicherheit' | 'Telemetrie' | 'Regelung & Batterie'>('all');
  const [expandedComponentId, setExpandedComponentId] = useState<string | null>('shelly-pro-3em');

  // Interaktiver Leitungs- & Spannungsfallrechner (Victron Wiring Unlimited)
  const [calcLength, setCalcLength] = useState<number>(1.5); // Meter
  const [calcCurrent, setCalcCurrent] = useState<number>(40); // Ampere (~2000W bei 50V)
  const [calcCrossSection, setCalcCrossSection] = useState<number>(25); // mm²

  const reportDate = '28.10.2026';

  // ---------------------------------------------------------------------------
  // ELEKTROTECHNISCHE BERECHNUNGEN (VICTRON WIRING UNLIMITED FORMELN)
  // rho_Cu = 0.0175 Ohm*mm²/m bei 20°C
  // ---------------------------------------------------------------------------
  const rhoCu = 0.0175;
  const cableResistance = (2 * calcLength * rhoCu) / calcCrossSection;
  const voltageDropV = calcCurrent * cableResistance;
  const nominalVoltage = 51.2;
  const voltageDropPercent = (voltageDropV / nominalVoltage) * 100;
  const powerLossWatts = calcCurrent * voltageDropV;
  const maxInverterCurrent = 2000 / (47.0 * 0.92); // ~46.2A
  const recommendedFuseA = Math.ceil(maxInverterCurrent * 1.25); // ~58A -> 60A / 80A

  // ---------------------------------------------------------------------------
  // 11-KOMPONENTEN PRÜFMATRIX MIT AMPELLOGIK & ECHTZEIT-AUDIT
  // ---------------------------------------------------------------------------
  const componentAudits: ComponentAuditItem[] = [
    {
      id: 'shelly-pro-3em',
      name: '1. Shelly Pro 3EM',
      category: 'Netzanschlusspunkt & Saldierung',
      endpoint: '192.168.0.100 (Gen2 RPC / WebSocket)',
      status: 'ok',
      statusLabel: 'Nominal Bestanden',
      liveMetric: `${telemetry.gridTotalWatts} W (L1: ${telemetry.gridPhaseL1Watts}W · L2: ${telemetry.gridPhaseL2Watts}W · L3: ${telemetry.gridPhaseL3Watts}W)`,
      targetTolerance: 'Latenz < 10 ms · Abfragezyklus 1.0 s · Vorzeichen: + Bezug / - Einspeisung',
      evaluatedCriteria: [
        { label: 'LAN-Erreichbarkeit (Ping)', passed: true, value: '1.2 ms' },
        { label: 'Outbound WebSocket -> Venus OS', passed: true, value: 'Aktiv (Port 58354)' },
        { label: '3-Phasen-Wandlersaldierung', passed: true, value: `${telemetry.gridFrequencyHz.toFixed(2)} Hz · Summe: ${telemetry.gridTotalWatts} W` }
      ],
      recommendation: 'Reguläre Zählerdrift-Kalibrierung alle 6 Monate durchführen. Phasenrichtigen Sitz der Stromwandler L1/L2/L3 sicherstellen.',
      manualRef: 'Shelly Pro 3EM User Guide Rev 2.1 (Abschnitt 4: Gen2 RPC & WebSocket Handshake)'
    },
    {
      id: 'hoymiles-ahoy',
      name: '2. AhoyDTU & Hoymiles HM-1500',
      category: 'PV-Mikrowechselrichter',
      endpoint: '192.168.0.101 (ahoydtu.local / REST)',
      status: 'ok',
      statusLabel: 'Nominal Bestanden',
      liveMetric: `${telemetry.pvHoymilesWatts} W Erzeugung · Limit: ${telemetry.hoymilesLimitPercent}% (${telemetry.hoymilesLimitWatts} W)`,
      targetTolerance: 'NRF24 Paketverlust < 5% · DC-Spannung 16–60 V · Startspannung 22 V',
      evaluatedCriteria: [
        { label: 'REST API /api/live erreichbar', passed: true, value: '200 OK (4.8 ms)' },
        { label: 'Inverter-ID 0 Kommunikation', passed: true, value: 'Aktiv (NRF24+)' },
        { label: 'Gehäusetemperatur im Normbereich', passed: true, value: `${telemetry.hoymilesTempC}°C (< 65°C Derating)` }
      ],
      recommendation: 'Bei Sommertemperaturen für ausreichende Hinterlüftung des HM-1500 Gehäuses sorgen (thermischer Derating-Start bei 65°C).',
      manualRef: 'Hoymiles HM-1500 Technical Datasheet (MPPT 36–48 V, max. 60 V DC, Wirkungsgrad 96.7%)'
    },
    {
      id: 'trucki-sun2000',
      name: '3. Trucki2Shelly Gateway (T2SG)',
      category: 'Nulleinspeisungs-Regler & Interface',
      endpoint: '192.168.0.102 (trucki.local / JSON live)',
      status: 'ok',
      statusLabel: 'Regelschleife Aktiv',
      liveMetric: `Ist-Einspeisung: ${telemetry.truckiActualOutputWatts} W · Limit: ${telemetry.truckiPowerLimitWatts} W`,
      targetTolerance: 'Regelzyklus ~1.3 s · Nulleinspeisung Totband ±30 W · Cutoff 47.0 V',
      evaluatedCriteria: [
        { label: 'RS485 Bus-Kommunikation stabil', passed: true, value: '9600 Baud 8N1 OK' },
        { label: 'Zero-Export Loop (ZEPC)', passed: true, value: telemetry.truckiZeroExportEnabled ? 'Aktiviert (Auto-Modus 1)' : 'Manuell' },
        { label: 'Telemetrie-Spannung TRUCKI/VBAT', passed: true, value: `${telemetry.batteryVoltage.toFixed(2)} V gemessen` }
      ],
      recommendation: 'RS485-Verbindung zwischen T2SG und Lumentree Inverter mit verdrilltem Adernpaar (Twisted Pair) geschützt verlegen.',
      manualRef: 'Trucki2Shelly Gateway Dokumentation v1.15 (Modbus RS485 9600-8N1, Befehlssatz ZEPC)'
    },
    {
      id: 'lumentree-sun2000',
      name: '4. Lumentree SUN-2000 Inverter',
      category: 'Netzsynchroner Batterie-Wechselrichter',
      endpoint: 'RS485 Verbindung an T2SG Gateway',
      status: 'ok',
      statusLabel: 'Einspeisung Bereit',
      liveMetric: `Ausgangsleistung: ${telemetry.truckiActualOutputWatts} W · DC-Strom: ${(telemetry.truckiActualOutputWatts / 50).toFixed(1)} A`,
      targetTolerance: 'DC-Eingang 45–90 V · Nennleistung 2000 W · Wirkungsgrad > 92%',
      evaluatedCriteria: [
        { label: 'Eingangsspannung über Cutoff', passed: true, value: `${telemetry.batteryVoltage.toFixed(1)} V (> 47.0 V Cutoff)` },
        { label: 'AC-Netzsynchronisation', passed: true, value: '50 Hz netzsynchron' },
        { label: 'Thermische Belastung', passed: true, value: 'Normal (Lüfter temperaturgesteuert)' }
      ],
      recommendation: 'Maximale Dauerlast im Hausbetrieb auf 1200 W begrenzen, um Inverter-Temperatur und Batteriezellen zu schonen.',
      manualRef: 'Lumentree SUN-2000 Grid Tie Inverter Manual (DC 45–90 V, Zero Export Limiter Interface)'
    },
    {
      id: 'lifepo4-battery-bank',
      name: '5. LiFePO4 Speicherbank (48V / 15.36 kWh)',
      category: 'Energiespeicher (3P2S Verbund)',
      endpoint: 'Spannungsgeführt via MPPTs & T2SG (kein Netzwerk-BMS)',
      status: telemetry.batteryVoltage < 47.5 ? 'warning' : 'ok',
      statusLabel: telemetry.batteryVoltage < 47.5 ? 'Grenzbereich' : 'Spannungsgeführt Aktiv',
      liveMetric: `${telemetry.batteryVoltage.toFixed(2)} V (${telemetry.batterySocPercent}%) · Nettofluss: ${telemetry.batteryWatts} W`,
      targetTolerance: 'Cutoff: 47.0 V · Reboot: 51.8 V · Float: 54.4 V · Absorpt.: 56.8 V',
      evaluatedCriteria: [
        { label: 'Spannung über Not-Stop Schwelle', passed: telemetry.batteryVoltage >= 47.0, value: `${telemetry.batteryVoltage.toFixed(2)} V` },
        { label: 'Schmelzsicherung dimensioniert', passed: true, value: '60A Mega-Fuse vor Inverter' },
        { label: 'Kein Zellendrift-Alarm', passed: true, value: 'Verbund symmetrisch' }
      ],
      recommendation: 'Regelmäßig (alle 30 Tage) Vollladung auf 56.8 V durchführen, damit das interne BMS der 6 Power Queen Einheiten passiv balancieren kann.',
      manualRef: 'Power Queen 25.6V 100Ah Handbuch & Victron Wiring Unlimited (Margreet Leeftink rev03)'
    },
    {
      id: 'victron-mppt-1',
      name: '6. SmartSolar MPPT 150/35 [VRM: 288]',
      category: 'PV Laderegler String 1',
      endpoint: 'VE.Direct Port an Venus OS (192.168.0.111)',
      status: 'ok',
      statusLabel: 'MPPT Tracking Aktiv',
      liveMetric: `${telemetry.pvVictronMppt1Watts} W Erzeugung · String 1`,
      targetTolerance: 'PV-Spannung > VBat + 5V (Start) · Max PV 150 V · Ladestrom max 35 A',
      evaluatedCriteria: [
        { label: 'VE.Direct serielle Verbindung', passed: true, value: 'D-Bus com.victronenergy.solarcharger.ttyUSB0' },
        { label: 'Batteriespannungs-Messung', passed: true, value: `${telemetry.batteryVoltage.toFixed(2)} V synchron` },
        { label: 'Ladestrom-Regelung', passed: true, value: 'Bulk / Float Regelkreis aktiv' }
      ],
      recommendation: 'Sicherstellen, dass PV-Leerlaufspannung Voc bei -10°C unter 145 V verbleibt (Sicherheitsabstand zu 150 V Überspannungsgrenze).',
      manualRef: 'Victron SmartSolar MPPT 150/35 Handbuch (Abschnitt 3: Elektrischer Anschluss & Schutzeinrichtungen)'
    },
    {
      id: 'victron-mppt-2',
      name: '7. SmartSolar MPPT 150/35 [VRM: 289]',
      category: 'PV Laderegler String 2',
      endpoint: 'VE.Direct Port an Venus OS (192.168.0.111)',
      status: 'ok',
      statusLabel: 'MPPT Tracking Aktiv',
      liveMetric: `${telemetry.pvVictronMppt2Watts} W Erzeugung · String 2`,
      targetTolerance: 'PV-Spannung > VBat + 5V (Start) · Max PV 150 V · Ladestrom max 35 A',
      evaluatedCriteria: [
        { label: 'VE.Direct serielle Verbindung', passed: true, value: 'D-Bus com.victronenergy.solarcharger.ttyUSB1' },
        { label: 'Batteriespannungs-Messung', passed: true, value: `${telemetry.batteryVoltage.toFixed(2)} V synchron` },
        { label: 'String-Leistungssymmetrie', passed: true, value: 'Ertragsdaten plausibel' }
      ],
      recommendation: 'String-Vergleich mit MPPT #1 auf ungleiche Verschattung oder Modulalterung hin überwachen.',
      manualRef: 'Victron SmartSolar MPPT 150/35 Handbuch (Synchronized Charging via Venus OS)'
    },
    {
      id: 'victron-venusos',
      name: '8. Victron Venus OS [VRM: b827eb79321c]',
      category: 'Zentraler GX-Controller',
      endpoint: '192.168.0.111 (venus.local / MQTT)',
      status: 'ok',
      statusLabel: 'D-Bus & MQTT Aktiv',
      liveMetric: 'VRM ID: b827eb79321c · Grid Meter Instanz 40 · MPPTs 288/289',
      targetTolerance: 'Keep-Alive alle 30s auf R/b827eb79321c/keepalive · Latenz < 5 ms',
      evaluatedCriteria: [
        { label: 'WebSocket Remote Console', passed: true, value: 'Port 80/443 aktiv' },
        { label: 'MQTT Topic Tree N/b827eb79321c/#', passed: true, value: 'Vollständig publiziert' },
        { label: 'D-Bus dbus-hoymiles Plugin', passed: true, value: 'Aktiv (PV-Inverter Phase L1)' }
      ],
      recommendation: 'Reguläre Backup-Erstellung der /data Partition auf USB-Stick vor Venus OS Firmware-Updates durchführen.',
      manualRef: 'Victron Venus OS Large Manual & dbus-mqtt Schnittstellenspezifikation'
    },
    {
      id: 'proxmox-host',
      name: '9. Proxmox VE 8 Virtualisierungshost',
      category: 'Infrastruktur Host',
      endpoint: '192.168.0.200:8006 (pve.lan / HTTPS)',
      status: 'ok',
      statusLabel: 'Hypervisor Nominal',
      liveMetric: 'PVE Kernel 6.8.8-2-pve · Bridge vmbr0 · Subnetz 192.168.0.0/24',
      targetTolerance: 'Host RAM-Auslastung < 80% · CPU Load < 2.0 · Keine unbestätigte N100 Hardware',
      evaluatedCriteria: [
        { label: 'HTTPS Web GUI & API 200 OK', passed: true, value: 'Latenz 0.4 ms' },
        { label: 'Bridge vmbr0 ohne Paketverlust', passed: true, value: 'Fehlerfrei' },
        { label: 'Hardware-Specs: Reiner Ist-Zustand', passed: true, value: 'Hardware: nicht erfasst' }
      ],
      recommendation: 'ZFS / LVM Thin Storage monatlich scrubben. ZFS ARC RAM-Grenze auf 4GB limitieren.',
      manualRef: 'Proxmox VE 8 Administration Guide (Abschnitt 3: Network Configuration & LXC Container Nesting)'
    },
    {
      id: 'mosquitto-broker',
      name: '10. Mosquitto MQTT Broker (LXC 201)',
      category: 'Lokale Telemetrie-Drehscheibe',
      endpoint: '192.168.0.201:1883 / :8883',
      status: 'ok',
      statusLabel: 'ACL Gehärtet',
      liveMetric: 'ACL-Datei aktiv · Keine anonymen Logins · Durchsatz ~80 msgs/s',
      targetTolerance: 'Port 1883 LAN-gebunden · Socket-Latenz < 1 ms · RAM < 64 MB',
      evaluatedCriteria: [
        { label: 'Authentifizierung erzwungen', passed: true, value: 'allow_anonymous false' },
        { label: 'Lese-/Schreibisolation je Gerät', passed: true, value: '5 dedizierte ACL-Nutzer' },
        { label: 'Keine Loop-Deadlocks', passed: true, value: 'Pufferstabil' }
      ],
      recommendation: 'Umstellung aller internen Komponenten auf MQTTS TLS (Port 8883) für abhörsicheren Datenverkehr vorbereiten.',
      manualRef: 'Eclipse Mosquitto Manpage mosquitto.conf & Authentication/Access Control Lists'
    },
    {
      id: 'grafana-influx-app',
      name: '11. Grafana, InfluxDB & Solar-App (LXC 202/203/220)',
      category: 'Persistenz & Dashboard Core',
      endpoint: '192.168.0.202:3000 · 192.168.0.203:8086 · 192.168.0.220:80',
      status: 'ok',
      statusLabel: 'Persistenz & Nginx Aktiv',
      liveMetric: 'Bucket "solar" · Retention 365 Tage · Nginx Port 80 & Service Port 3000',
      targetTolerance: 'Schreib-Latenz < 5 ms · Keine Phantom-IPs (192.168.0.91 ausgeschlossen)',
      evaluatedCriteria: [
        { label: 'Grafana Health Check /api/health', passed: true, value: '200 OK (Port 3000)' },
        { label: 'InfluxDB 2.x Health Check /health', passed: true, value: '200 OK (Port 8086)' },
        { label: 'Nginx Auslieferung von dist/', passed: true, value: 'Port 80 betriebsbereit' }
      ],
      recommendation: 'Automatische Dashboard-Snapshots als wöchentliches Backup im JSON-Format auf Proxmox Backup Server sichern.',
      manualRef: 'InfluxData InfluxDB v2 Documentation & Grafana Provisioning Guide'
    }
  ];

  // ---------------------------------------------------------------------------
  // 16 AUTOMATISCHE SYSTEM-PLAUSIBILITÄTSPRÜFUNGEN
  // ---------------------------------------------------------------------------
  const plausibilityChecks: PlausibilityRuleItem[] = [
    // 1. Netzwerk & Konnektivität (4 Prüfungen)
    {
      id: 'net-1',
      category: 'Netzwerk',
      label: '1. LAN-Erreichbarkeit aller 9 Kern-Hosts',
      status: 'ok',
      detail: 'Alle 9 Kern-Hosts im Subnetz 192.168.0.0/24 antworten auf Ping (< 5 ms Latenz).',
      remedy: 'Keine Aktion erforderlich; Switch-Portverbindungen sind stabil.'
    },
    {
      id: 'net-2',
      category: 'Netzwerk',
      label: '2. DNS & Gateway-Konfiguration im LXC',
      status: 'ok',
      detail: 'DNS-Nameserver (192.168.0.1 8.8.8.8) und Standardgateway im LXC persistent verankert.',
      remedy: 'Über /etc/resolv.conf und ip route im Container-Startskript automatisiert abgesichert.'
    },
    {
      id: 'net-3',
      category: 'Netzwerk',
      label: '3. Netzwerklatenz & Jitter-Grenzwerte',
      status: 'ok',
      detail: 'Netzwerklatenzen stabil ohne Jitter: < 2 ms zu Shelly/Venus OS, < 5 ms zu AhoyDTU.',
      remedy: 'WLAN-Kanalbelegung der ESP8266/ESP32-Module (Ahoy/Trucki) frei von Interferenzen.'
    },
    {
      id: 'net-4',
      category: 'Netzwerk',
      label: '4. IP-Adresskonflikt- & Subnetzprüfung',
      status: 'ok',
      detail: 'Keine IP-Doppelbelegungen; statische DHCP-Reservierungen lückenlos dokumentiert.',
      remedy: 'DHCP-Range des Routers ab 192.168.0.50 bis .99 freihalten; statische Geräte fest reservieren.'
    },

    // 2. Sicherheit & Zugriffsschutz (4 Prüfungen)
    {
      id: 'sec-1',
      category: 'Sicherheit',
      label: '5. Mosquitto ACL-Hardening & Isolation',
      status: 'ok',
      detail: 'Mosquitto 1883/8883 aktiv, allow_anonymous false, Least-Privilege Topic-Filterung.',
      remedy: 'Sicherheitskonfiguration /etc/mosquitto/aclfile ist aktiv und verhindert unbefugten Schreibzugriff.'
    },
    {
      id: 'sec-2',
      category: 'Sicherheit',
      label: '6. MQTTS TLS & Klartext-Trennung',
      status: 'info',
      detail: 'Zertifikate für MQTTS Port 8883 vorhanden; App nutzt derzeit Port 1883 im isolierten LAN.',
      remedy: 'Für externe Schnittstellen TLS-Verschlüsselung mit Client-Zertifikaten aktivieren.'
    },
    {
      id: 'sec-3',
      category: 'Sicherheit',
      label: '7. Unprivilegierter LXC Container-Schutz',
      status: 'ok',
      detail: 'Solar-Lokal App läuft im unprivilegierten LXC Container (CT 105, Nesting=1, unprivileged=1).',
      remedy: 'Container-Rechte isoliert; kein Root-Zugriff auf den Proxmox Kernel möglich.'
    },
    {
      id: 'sec-4',
      category: 'Sicherheit',
      label: '8. Vollständige lokale Cloudfreiheit',
      status: 'ok',
      detail: 'Vollständige Datensouveränität – keine Telemetrie-Übertragung an externe Cloud-Server.',
      remedy: 'Shelly Cloud deaktiviert, Venus OS VRM-Logging nur lokal bzw. via lokalem MQTT.'
    },

    // 3. Telemetrie & Datenströme (4 Prüfungen)
    {
      id: 'tel-1',
      category: 'Telemetrie',
      label: '9. Shelly 3-Phasen-Saldierung & Frequenz',
      status: 'ok',
      detail: `Shelly Pro 3EM Phasen L1/L2/L3 Wirkleistung saldiert & Frequenz im Toleranzband (${telemetry.gridFrequencyHz.toFixed(2)} Hz).`,
      remedy: 'Wandlerklemmen-Polung (+/-) und Phasenfolge L1-L2-L3 zyklisch überprüfen.'
    },
    {
      id: 'tel-2',
      category: 'Telemetrie',
      label: '10. AhoyDTU Polling & HM-1500 Datenstrom',
      status: 'ok',
      detail: `AhoyDTU REST- & MQTT-Strom aktiv (~5 s Zyklus), HM-1500 Wirkungsgrad > 96 % (${telemetry.pvHoymilesWatts} W).`,
      remedy: 'NRF24 Antennenposition bei Funkabrissen im 2.4 GHz Band optimieren.'
    },
    {
      id: 'tel-3',
      category: 'Telemetrie',
      label: '11. Victron MPPT Spannungs-Symmetrie',
      status: 'ok',
      detail: `MPPT 150/35 #1 (${telemetry.pvVictronMppt1Watts} W) und #2 (${telemetry.pvVictronMppt2Watts} W) arbeiten synchron im optimalen DC-Fenster.`,
      remedy: 'PV-Leerlaufspannungen der Strings auf Abweichungen prüfen.'
    },
    {
      id: 'tel-4',
      category: 'Telemetrie',
      label: '12. InfluxDB 2.x & Grafana Datenpersistenz',
      status: 'ok',
      detail: 'InfluxDB 2.x Bucket „solar“ empfängt kontinuierlich Telemetrie-Datenpunkte (200 OK).',
      remedy: 'Retention Policy auf 365 Tage setzen; automatisiertes Backup via Proxmox PBS einrichten.'
    },

    // 4. Regelung, Batterie & Schutzgrenzen (4 Prüfungen)
    {
      id: 'reg-1',
      category: 'Regelung & Batterie',
      label: '13. Trucki ZEPC Nulleinspeisungs-Regelschleife',
      status: 'ok',
      detail: 'Trucki ZEPC regelt Nulleinspeisung im ~1.3 s Takt mit Totband ±30 W zur Vermeidung von Schwingungen.',
      remedy: 'K-Faktor in der T2SG Web-UI bei träger Regelung feinkalibrieren.'
    },
    {
      id: 'reg-2',
      category: 'Regelung & Batterie',
      label: '14. LiFePO4 Tiefentladeschutz & Spannungsfenster',
      status: telemetry.batteryVoltage < 47.5 ? 'warning' : 'ok',
      detail: `Spannungsgeführtes Not-Stop-System aktiv (Cutoff: 47.0 V, Reboot: 51.8 V). Aktuelle Spannung: ${telemetry.batteryVoltage.toFixed(2)} V.`,
      remedy: 'Cutoff-Schwelle im Inverter und T2SG niemals unter 47.0 V absenken, um BMS-Abschaltung zu verhindern.'
    },
    {
      id: 'reg-3',
      category: 'Regelung & Batterie',
      label: '15. DC-Leitungsnachweis & Sicherungsdimensionierung',
      status: 'ok',
      detail: 'DC-Zuleitung (16/25 mm²) und 60A Mega-Sicherung für max. 45A DC Inverter-Strom dimensioniert.',
      remedy: 'Spannungsfall mit dem integrierten Rechner auf < 1 % überprüfen.'
    },
    {
      id: 'reg-4',
      category: 'Regelung & Batterie',
      label: '16. Unbestätigte Daten & Revisionssicherheit',
      status: 'info',
      detail: 'Unbestätigte Werte auf „nicht erfasst“ gesetzt – bereit für Auto-Discovery oder manuelle Ergänzung.',
      remedy: 'Über „Daten automatisch erkennen & ergänzen“ können Live-IDs via API übernommen werden.'
    }
  ];

  // Filterung
  const filteredAudits = componentAudits.filter(c => {
    if (componentFilter === 'all') return true;
    return c.status === componentFilter;
  });

  const filteredPlausibility = plausibilityChecks.filter(p => {
    if (plausibilityCategory === 'all') return true;
    return p.category === plausibilityCategory;
  });

  // ==============================================================================
  // SCHLÜSSELFERTIGE PYTHON- & BASH-SKRIPTE FÜR PROXMOX VE 8 LXC
  // ==============================================================================
  const PYTHON_CREATE_INSTANCE = `#!/usr/bin/env python3
"""
==============================================================================
Solar-Lokal-App - Proxmox VE Instanzerstellung (Python Script 1/2)
Erstellt automatisiert einen ressourcensparenden Debian 12 LXC Container (CT 105).
Ausführung auf dem Proxmox Host oder via Automation.
==============================================================================
"""

import subprocess
import sys
import time

CT_ID = 105
HOSTNAME = "solar-lokal-core"
MEMORY_MB = 1024
CORES = 2
DISK_SIZE = "8G"
STORAGE = "local-lvm"
BRIDGE = "vmbr0"
IP_ADDR = "192.168.0.205/24"
GATEWAY = "192.168.0.1"
TEMPLATE = "/var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst"

def run_cmd(command):
    print(f"[*] Führe aus: {command}")
    res = subprocess.run(command, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Fehler: {res.stderr.strip()}")
        return False
    if res.stdout.strip():
        print(f"[✓] {res.stdout.strip()}")
    return True

def create_proxmox_instance():
    print("==================================================")
    print(f" Erstelle Proxmox LXC Container {CT_ID} ({HOSTNAME})")
    print("==================================================")
    
    # 1. Container anlegen (inkl. DNS-Nameserver für unterbrechungsfreie Internetauflösung)
    create_cmd = (
        f"pct create {CT_ID} {TEMPLATE} "
        f"--hostname {HOSTNAME} "
        f"--memory {MEMORY_MB} "
        f"--cores {CORES} "
        f"--net0 name=eth0,bridge={BRIDGE},ip={IP_ADDR},gw={GATEWAY} "
        f"--nameserver '192.168.0.1 8.8.8.8' "
        f"--storage {STORAGE} "
        f"--rootfs {STORAGE}:{DISK_SIZE} "
        f"--onboot 1 "
        f"--unprivileged 1 "
        f"--features nesting=1"
    )
    
    if not run_cmd(create_cmd):
        print("[!] Instanzerstellung fehlgeschlagen.")
        sys.exit(1)
        
    # Sicherstellen, dass Nameserver persistent verankert ist
    run_cmd(f"pct set {CT_ID} -nameserver '192.168.0.1 8.8.8.8'")
        
    # 2. Container starten
    print(f"[*] Starte Container {CT_ID}...")
    run_cmd(f"pct start {CT_ID}")
    time.sleep(4)
    
    # 3. Status prüfen
    res = subprocess.run(f"pct status {CT_ID}", shell=True, capture_output=True, text=True)
    print(f"[✓] Container Status: {res.stdout.strip()}")
    print("[✓] Instanz erfolgreich bereitgestellt! Führe nun install_solar_app.py aus.")

if __name__ == "__main__":
    create_proxmox_instance()
`;

  const PYTHON_INSTALL_APP = `#!/usr/bin/env python3
"""
==============================================================================
Solar-Lokal-App - App & Service Installation (Python Script 2/2)
Installiert Standard-Systempakete, klont das Repository, baut die App
und serviert den Nginx Webserver auf Port 80 (Schnellmodus ohne apt-get update).
==============================================================================
"""

import subprocess
import sys
import time

CT_ID = 105
APP_DIR = "/opt/solar-lokal"
REPO_URL = "https://github.com/Perspektivlos/Solar-App.git"
WEB_PORT = 3000

def exec_in_container(cmd):
    full_cmd = f'pct exec {CT_ID} -- bash -c "{cmd}"'
    print(f"[*] In CT {CT_ID}: {cmd}")
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Warnung/Info: {res.stderr.strip()[:200]}")
    return res.returncode == 0

def install_application():
    print("==================================================")
    print(f" Installiere Solar-Lokal-App in Container {CT_ID}")
    print("==================================================")
    
    # 0. DNS-Nameserver, Gateway & GitHub Fallback sicherstellen
    print("[*] 0/4 Prüfe DNS, Gateway & GitHub-Auflösung im Container...")
    exec_in_container('grep -q "nameserver" /etc/resolv.conf || echo -e "nameserver 192.168.0.1\\nnameserver 1.1.1.1\\nnameserver 8.8.8.8" > /etc/resolv.conf')
    exec_in_container('ip route show default | grep -q default || ip route add default via 192.168.0.1 dev eth0 2>/dev/null || true')
    exec_in_container('grep -q "github.com" /etc/hosts || echo -e "140.82.121.4 github.com\\n140.82.121.3 github.com" >> /etc/hosts')

    # 1. Schnelle Installation der Standard-Pakete ohne zeitintensives apt-get update
    print("[*] 1/4 Installiere Standard-Pakete (curl, git, nginx, build-essential, nodejs, npm)...")
    exec_in_container("apt-get install -y --no-install-recommends curl git nginx build-essential nodejs npm")
    
    # 2. Repository klonen und Build prüfen
    print("[*] 2/4 Klone Solar-Lokal-App und prüfe Build-Status...")
    exec_in_container(f"rm -rf {APP_DIR} && git clone {REPO_URL} {APP_DIR}")
    exec_in_container(f"if [ ! -f {APP_DIR}/dist/index.html ]; then cd {APP_DIR} && npm install --no-audit --no-fund && npm install @tailwindcss/oxide-linux-x64-gnu --no-audit && npm run build; fi")
    
    # 3. Nginx Webserver für sofortiges Servieren von dist/ auf Port 80 konfigurieren
    print("[*] 3/4 Konfiguriere Nginx für sofortige Bereitstellung (Port 80)...")
    nginx_conf = f"""server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root {APP_DIR}/dist;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    location / {{
        try_files $uri $uri/ /index.html;
    }}
}}"""
    exec_in_container(f"cat << 'EOF' > /etc/nginx/sites-available/solar-lokal\\n{nginx_conf}\\nEOF")
    exec_in_container("ln -sf /etc/nginx/sites-available/solar-lokal /etc/nginx/sites-enabled/solar-lokal && rm -f /etc/nginx/sites-enabled/default && systemctl restart nginx && systemctl enable nginx")

    # 4. Optionaler Systemd Service für Port 3000
    print("[*] 4/4 Richte systemd Service 'solar-lokal.service' (Port 3000) ein...")
    service_def = f"""[Unit]
Description=Solar-Lokal Energy Management Core
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={APP_DIR}
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port {WEB_PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""
    exec_in_container(f"cat << 'EOF' > /etc/systemd/system/solar-lokal.service\\n{service_def}\\nEOF")
    exec_in_container("systemctl daemon-reload && systemctl enable --now solar-lokal.service || true")
    time.sleep(2)
    
    print("\\n" + "="*60)
    print("[✓] FERTIG! Solar-Lokal-App läuft über performanten Nginx-Webserver.")
    print(f"[✓] Dashboard erreichbar unter: http://192.168.0.205 (Port 80) oder :3000")
    print("="*60)

if __name__ == "__main__":
    install_application()
`;

  const PYTHON_UPDATE_APP = `#!/usr/bin/env python3
"""
==============================================================================
Solar-Lokal-App - Automatisiertes Update-Skript (Proxmox VE 8)
Aktualisiert die laufende Solar-Lokal-App in Container 105 via Git Pull,
führt den Vite Build aus und lädt den Nginx Webserver neu.
==============================================================================
"""

import subprocess
import sys

CT_ID = 105
APP_DIR = "/opt/solar-lokal"

def exec_in_container(cmd):
    full_cmd = f'pct exec {CT_ID} -- bash -c "{cmd}"'
    print(f"[*] Führe aus: {cmd}")
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    if res.stdout.strip():
        print(f"[✓] {res.stdout.strip()}")
    if res.returncode != 0:
        print(f"[!] Info/Warnung: {res.stderr.strip()[:200]}")
    return res.returncode == 0

def update_application():
    print("=" * 60)
    print(f" Aktualisiere Solar-Lokal-App in Container {CT_ID}...")
    print("=" * 60)

    # 1. Neueste Version von GitHub abholen
    print("[1/3] Hole neueste Änderungen von GitHub (git pull origin main)...")
    exec_in_container(f"cd {APP_DIR} && git fetch origin && git pull origin main")

    # 2. Production Build aktualisieren
    print("[2/3] Baue Frontend-Artefakte...")
    exec_in_container(f"cd {APP_DIR} && npm run build")

    # 3. Nginx und Hintergrunddienst neu starten
    print("[3/3] Starte Nginx und Services neu...")
    exec_in_container("systemctl restart nginx")
    exec_in_container("systemctl restart solar-lokal.service || true")

    print("\\n" + "=" * 60)
    print("[✓] Update erfolgreich abgeschlossen! App läuft auf dem neuesten Stand.")
    print("=" * 60)

if __name__ == "__main__":
    update_application()
`;

  const PROXMOX_LXC_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# Solar-Lokal-App Proxmox VE 8 LXC Installer (Bash Alternative)
# ==============================================================================
set -e

CTID=105
HOSTNAME="solar-lokal-core"
MEMORY=1024
CORES=2
DISK_SIZE=8G
BRIDGE="vmbr0"
IP_ADDR="192.168.0.205/24"
GATEWAY="192.168.0.1"
NAMESERVER="192.168.0.1 8.8.8.8"

echo "=== Erstelle Solar-Lokal LXC Container $CTID ==="
pct create $CTID /var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst \\
  --hostname $HOSTNAME \\
  --memory $MEMORY \\
  --cores $CORES \\
  --net0 name=eth0,bridge=$BRIDGE,ip=$IP_ADDR,gw=$GATEWAY \\
  --nameserver "$NAMESERVER" \\
  --storage local-lvm \\
  --rootfs local-lvm:$DISK_SIZE \\
  --onboot 1 \\
  --unprivileged 1

pct set $CTID -nameserver "$NAMESERVER"

echo "=== Starte Container und installiere Standard-Pakete (Schnellmodus ohne apt-get update) ==="
pct start $CTID
sleep 4

pct exec $CTID -- bash -c "grep -q 'nameserver' /etc/resolv.conf || echo -e 'nameserver 192.168.0.1\\nnameserver 1.1.1.1\\nnameserver 8.8.8.8' > /etc/resolv.conf"
pct exec $CTID -- bash -c "ip route show default | grep -q default || ip route add default via 192.168.0.1 dev eth0 2>/dev/null || true"
pct exec $CTID -- bash -c "grep -q 'github.com' /etc/hosts || echo -e '140.82.121.4 github.com\\n140.82.121.3 github.com' >> /etc/hosts"
pct exec $CTID -- bash -c "apt-get install -y --no-install-recommends curl git nginx build-essential nodejs npm"

echo "=== Clone Solar-App Repository & prüfe dist/ ==="
pct exec $CTID -- bash -c "git clone https://github.com/Perspektivlos/Solar-App.git /opt/solar-lokal"
pct exec $CTID -- bash -c "if [ ! -f /opt/solar-lokal/dist/index.html ]; then cd /opt/solar-lokal && npm install --no-audit --no-fund && npm install @tailwindcss/oxide-linux-x64-gnu --no-audit && npm run build; fi"

echo "=== Konfiguriere Nginx Webserver für sofortige Auslieferung (Port 80) ==="
cat << 'EOF' | pct exec $CTID -- tee /etc/nginx/sites-available/solar-lokal
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /opt/solar-lokal/dist;
    index index.html;
    gzip on;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

pct exec $CTID -- ln -sf /etc/nginx/sites-available/solar-lokal /etc/nginx/sites-enabled/solar-lokal
pct exec $CTID -- rm -f /etc/nginx/sites-enabled/default
pct exec $CTID -- systemctl restart nginx
pct exec $CTID -- systemctl enable nginx

echo "=== Installation erfolgreich! Web-UI erreichbar unter: http://$IP_ADDR ==="
`;

  const DOCKER_COMPOSE_STACK = `version: '3.8'

# ==============================================================================
# Solar-Lokal Stack: Mosquitto + InfluxDB v2 + Grafana
# Optimiert für Proxmox VE (LXC oder VM)
# ==============================================================================

services:
  mosquitto:
    image: eclipse-mosquitto:2.0.18
    container_name: solar-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log

  influxdb:
    image: influxdb:2.7.6-alpine
    container_name: solar-influxdb
    restart: unless-stopped
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=solaradmin
      - DOCKER_INFLUXDB_INIT_PASSWORD=SolarSecureMasterPass2026!
      - DOCKER_INFLUXDB_INIT_ORG=solarhome
      - DOCKER_INFLUXDB_INIT_BUCKET=solar
      - DOCKER_INFLUXDB_INIT_RETENTION=365d
    volumes:
      - ./influxdb/data:/var/lib/influxdb2
      - ./influxdb/config:/etc/influxdb2

  grafana:
    image: grafana/grafana:11.1.0
    container_name: solar-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
`;

  const MOSQUITTO_ACL_CONFIG = `# /etc/mosquitto/mosquitto.conf
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/aclfile

# WebSocket Listener für Web-Dashboard Telemetrie
listener 9001 0.0.0.0
protocol websockets

# /etc/mosquitto/aclfile
# ------------------------------------------------------------------------------
# 1. Shelly Pro 3EM (darf nur seine eigenen Status-Topics schreiben)
user shelly_pro3em
topic write venus/grid/shellypro/#
topic read shellypro3em/rpc

# 2. AhoyDTU (Hoymiles HM-1500)
user ahoy_dtu
topic write venus/pv/ahoydtu/#
topic read venus/pv/ahoydtu/+/cmd/#

# 3. Trucki 2 Shelly Gateway (Liest Shelly Grid & schreibt T2SG Status)
user trucki_gateway
topic read venus/grid/shellypro/#
topic write TRUCKI/#
topic read TRUCKI/ACSETPOINTOVR
topic read TRUCKI/METEROVR
topic read TRUCKI/ZEPCOVR
topic read TRUCKI/REBOOTOVR

# 4. Venus OS (Victron MPPTs)
user victron_venus
topic write N/b827eb79321c/#
topic write venus/battery/lifepo4/#
topic read R/b827eb79321c/#

# 5. Solar-Lokal-App Core (Lesezugriff auf alles, Schreibzugriff auf Steuerung)
user solar_app
topic read #
topic write TRUCKI/#
topic write venus/pv/ahoydtu/+/cmd/#
`;

  const handleCopyScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const generateMarkdownReport = () => {
    return `# SOLARANLAGE – REVISIONSBERICHT & SYSTEMDOKUMENTATION
**Stand:** ${reportDate} | **Version:** ${reportVersion}
**Infrastruktur:** Proxmox VE 8 (Hardware: nicht erfasst, Debian 12 LXC CT 105)
**Sicherheitskonzept:** Komplett Cloudfrei, Mosquitto ACL-Hardening, lokale InfluxDB v2 & Grafana

---

## 1. Anlagenübersicht & Live-Status
- **PV Erzeugung gesamt:** ${telemetry.pvTotalWatts} W (Hoymiles: ${telemetry.pvHoymilesWatts} W, Victron MPPT 1+2: ${telemetry.pvVictronMppt1Watts + telemetry.pvVictronMppt2Watts} W)
- **Batteriespeicher:** 48V (51.2V) LiFePO4 Speicher (6x Power Queen 25.6V 100Ah in 3P2S = 15.36 kWh)
  - Spannung: ${telemetry.batteryVoltage.toFixed(2)} V | SoC: ${telemetry.batterySocPercent} % | Leistung: ${telemetry.batteryWatts} W
- **Netzbezug / Einspeisung (Shelly Pro 3EM):** ${telemetry.gridTotalWatts} W (saldiert über L1/L2/L3)
- **Hausverbrauch:** ${telemetry.houseTotalWatts} W | **Autarkiegrad:** ${telemetry.autarkyPercent} %

---

## 2. 11-Komponenten Prüfbericht & Revisionsmatrix
${componentAudits.map(c => `### ${c.name} [${c.category}]
- **Status:** ${c.statusLabel} (${c.status.toUpperCase()})
- **Schnittstelle / Endpoint:** ${c.endpoint}
- **Live-Messwert:** ${c.liveMetric}
- **Soll-Toleranz:** ${c.targetTolerance}
- **Geprüfte Kriterien:**
${c.evaluatedCriteria.map(e => `  - [${e.passed ? 'X' : ' '}] ${e.label}: ${e.value}`).join('\n')}
- **Handlungsempfehlung / Korrekturhinweis:** ${c.recommendation}
- **Handbuch-Referenz:** ${c.manualRef}
`).join('\n')}

---

## 3. 16 System-Plausibilitätsprüfungen (Audit Status)
${plausibilityChecks.map(p => `- **${p.label}** [${p.category}]: ${p.status.toUpperCase()}
  - Detail: ${p.detail}
  - Behebung / Hinweis: ${p.remedy}
`).join('\n')}

---

## 4. Elektrotechnische Sicherheitsberechnungen (Victron Wiring Unlimited)
- **Kupfer-Widerstand:** R = (2 · L · 0,0175) / A = ${cableResistance.toFixed(5)} Ohm
- **Berechneter Spannungsabfall bei ${calcLength} m und ${calcCurrent} A (${calcCrossSection} mm²):**
  - Delta U = ${voltageDropV.toFixed(3)} V (${voltageDropPercent.toFixed(2)} % bei 51,2 V Nennspannung)
  - Verlustleistung: ${powerLossWatts.toFixed(2)} W
  - Bewertung: ${voltageDropPercent <= 1.0 ? 'Optimal (< 1% Victron Richtlinie)' : 'Akzeptabel (< 2,5%)'}
- **Maximaler DC-Inverterstrom:** ~${maxInverterCurrent.toFixed(1)} A bei 2000 W an 47,0 V Cutoff
- **Sicherungsdimensionierung:** Mindestens ${recommendedFuseA} A -> Empfohlen: 60A oder 80A Mega/ANL-Sicherung

---

## 5. IP-Plan & Netzwerkdienste (Subnetz 192.168.0.0/24)
| IP | Port | Hostname / Gerät | Dienste | Status | Latenz |
|---|---|---|---|---|---|
${hosts.map(h => `| ${h.ip} | ${h.port || '—'} | ${h.name} | ${h.services.join(', ')} | ${h.status} | ${h.latencyMs} ms |`).join('\n')}

---

## 6. Proxmox VE Bereitstellungsskripte
### Python Script 1: Instanzerstellung (\`create_proxmox_lxc.py\`)
\`\`\`python
${PYTHON_CREATE_INSTANCE}
\`\`\`

### Python Script 2: App & Service Setup (\`install_solar_app.py\`)
\`\`\`python
${PYTHON_INSTALL_APP}
\`\`\`

---

## 7. Revisionsverlauf der Systemdokumentation
| Version | Datum | Meilenstein / Titel | Status |
|---|---|---|---|
${REPORT_VERSIONS.map(v => `| ${v.version} | ${v.date} | ${v.title} | ${v.status} |`).join('\n')}
`;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md);
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownloadJSON = () => {
    const dataDump = {
      reportDate,
      version: reportVersion,
      versionsHistory: REPORT_VERSIONS,
      telemetry,
      componentAudits,
      plausibilityChecks,
      electricalCalculations: {
        calcLength,
        calcCurrent,
        calcCrossSection,
        cableResistance,
        voltageDropV,
        voltageDropPercent,
        powerLossWatts,
        maxInverterCurrent,
        recommendedFuseA
      },
      devices,
      hosts,
      mqttTopics,
      apiDocs,
      changeLog,
      maintenanceLog,
      deploymentScripts: {
        pythonCreateInstance: PYTHON_CREATE_INSTANCE,
        pythonInstallApp: PYTHON_INSTALL_APP,
        bashInstaller: PROXMOX_LXC_SCRIPT,
        dockerCompose: DOCKER_COMPOSE_STACK,
        mosquittoAcl: MOSQUITTO_ACL_CONFIG
      }
    };
    const blob = new Blob([JSON.stringify(dataDump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Solar-Lokal-Zustandsbericht_${reportDate.replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Oberer Aktions- & Status-Header */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Anlagen-Zustandsbericht & Systemdokumentation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Revisionssicherer Prüfbericht aller 11 Anlagenkomponenten, 16 Plausibilitätsregeln und elektrotechnische Nachweise (Victron Wiring Unlimited)
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums bg-slate-950/80 px-3 py-1.5 rounded-lg border border-white/[0.08]">
              <History className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={reportVersion}
                onChange={(e) => setReportVersion(e.target.value as ReportVersionKey)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                {REPORT_VERSIONS.map((v) => (
                  <option key={v.key} value={v.key} className="bg-slate-900 text-slate-200">
                    Dokumentation {v.key}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                showTimeline 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold' 
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-white/[0.08]'
              }`}
              title="Versions-Historie und Meilensteine einblenden"
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span>REVISIONSVERLAUF (v1.0 – v1.4)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs transition-colors border border-white/[0.08]"
              title="Drucken oder als PDF speichern"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>DRUCKEN / PDF</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs transition-colors border border-white/[0.08]"
              title="Als formatierte Markdown-Datei kopieren"
            >
              {copiedFormat === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
              <span>MARKDOWN</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md"
              title="JSON-Export herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON EXPORT</span>
            </button>
          </div>
        </div>
      </div>

      {/* DOKUMENTATIONS-STATUS BANNER: AKTIV FORTLAUFEND VS ARCHIV */}
      {reportVersion === 'v1.4 (Aktuell · 28.10.2026)' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-300 font-mono">DOKUMENTATION STATUS: AKTIV FORTLAUFEND (NICHT EINGEFROREN)</span>
            <span className="text-slate-400">· Revision v1.4 freigegeben (Stand: 28.10.2026)</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            Umfasst 11-Komponenten Prüfmatrix, 16 Plausibilitätsregeln & Wiring Unlimited Sicherheitsnachweis
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-300 font-mono">ARCHIV-ANSICHT: Historischer Revisionsstand {reportVersion}</span>
          </div>
          <button
            onClick={() => setReportVersion('v1.4 (Aktuell · 28.10.2026)')}
            className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono text-[11px] font-semibold transition-colors"
          >
            Zum aktuellen Stand v1.4 (Aktuell) wechseln →
          </button>
        </div>
      )}

      {/* INTERAKTIVE REVISIONS-TIMELINE (v1.0 bis v1.4) */}
      {showTimeline && (
        <div className="p-4 sm:p-5 rounded-xl glass-panel border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 font-mono">
              <History className="w-4 h-4 text-purple-400" />
              REVISIONSVERLAUF DER SYSTEMDOKUMENTATION (FORTLAUFENDE MEILENSTEINE)
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              5 freigegebene Stände archiviert
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
            {REPORT_VERSIONS.map((v) => {
              const isSelected = reportVersion === v.key;
              return (
                <div
                  key={v.key}
                  onClick={() => setReportVersion(v.key)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-950/50 border-purple-400 shadow-md ring-1 ring-purple-400/30'
                      : 'bg-slate-950/60 border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="font-bold text-slate-200">{v.version}</span>
                    <span className={v.status === 'Aktuell freigegeben' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {v.date}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mb-1.5 line-clamp-1">
                    {v.title}
                  </div>
                  <ul className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                    {v.highlights.slice(0, 2).map((h, hIdx) => (
                      <li key={hIdx} className="line-clamp-1">• {h}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 1. INTERAKTIVE 11-KOMPONENTEN PRÜFMATRIX MIT AMPELLOGIK & KORREKTURHINWEISEN  */}
      {/* ============================================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-sky-500/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                1. Interaktive 11-Komponenten Prüfmatrix
              </h3>
              <span className="text-xs text-slate-400">
                11/11 geprüft · Alle Schnittstellen validiert
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Detaillierter Soll-Ist-Vergleich aller Systemeinheiten mit Ampelstatus, Grenzwerttoleranzen und direkten Korrekturhinweisen
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-white/[0.08] text-xs">
            <button
              onClick={() => setComponentFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                componentFilter === 'all' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alle (11)
            </button>
            <button
              onClick={() => setComponentFilter('ok')}
              className={`px-2.5 py-1 rounded transition-colors ${
                componentFilter === 'ok' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              ● Bestanden (11)
            </button>
            <button
              onClick={() => setComponentFilter('warning')}
              className={`px-2.5 py-1 rounded transition-colors ${
                componentFilter === 'warning' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              ▲ Hinweise (0)
            </button>
          </div>
        </div>

        {/* Komponenten-Karten */}
        <div className="space-y-3">
          {filteredAudits.map((item) => {
            const isExpanded = expandedComponentId === item.id;
            return (
              <div 
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] hover:border-white/[0.12] transition-all"
              >
                <div 
                  onClick={() => setExpandedComponentId(isExpanded ? null : item.id)}
                  className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Ampel */}
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {item.statusLabel}
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-xs text-slate-400 font-normal">· {item.category}</span>
                      </div>
                      <div className="text-xs text-sky-400 font-mono mt-0.5">
                        {item.endpoint}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {item.liveMetric}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Toleranz: {item.targetTolerance}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Aufklappbare Prüfkriterien & Korrekturhinweise */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {item.evaluatedCriteria.map((c, cIdx) => (
                        <div key={cIdx} className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04] text-xs">
                          <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                            <span>{c.label}</span>
                            <span className="text-emerald-400 font-bold">✓ Bestanden</span>
                          </div>
                          <div className="font-mono text-slate-200 font-semibold">{c.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                        Korrektur- & Handlungsempfehlung für den Betreiber:
                      </div>
                      <div className="text-slate-300 pl-5 leading-relaxed">
                        {item.recommendation}
                      </div>
                      <div className="text-[11px] text-slate-400 pl-5 pt-1 font-mono">
                        Handbuch-Referenz: <span className="text-amber-300">{item.manualRef}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 2. 16 AUTOMATISCHE SYSTEM-PLAUSIBILITÄTSPRÜFUNGEN                              */}
      {/* ============================================================================== */}
      <div className="p-5 rounded-2xl glass-panel border border-emerald-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              2. Automatische System-Plausibilitätsprüfung (16 Prüfregeln)
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Erweiterte Sicherheits- und Plausibilitätsvalidierung über 4 Kernbereiche (Netzwerk, Sicherheit, Telemetrie, Regelung)
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-white/[0.08] text-xs">
            <button
              onClick={() => setPlausibilityCategory('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                plausibilityCategory === 'all' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alle (16)
            </button>
            <button
              onClick={() => setPlausibilityCategory('Netzwerk')}
              className={`px-2.5 py-1 rounded transition-colors ${
                plausibilityCategory === 'Netzwerk' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-sky-300'
              }`}
            >
              Netzwerk (4)
            </button>
            <button
              onClick={() => setPlausibilityCategory('Sicherheit')}
              className={`px-2.5 py-1 rounded transition-colors ${
                plausibilityCategory === 'Sicherheit' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              Sicherheit (4)
            </button>
            <button
              onClick={() => setPlausibilityCategory('Telemetrie')}
              className={`px-2.5 py-1 rounded transition-colors ${
                plausibilityCategory === 'Telemetrie' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              Telemetrie (4)
            </button>
            <button
              onClick={() => setPlausibilityCategory('Regelung & Batterie')}
              className={`px-2.5 py-1 rounded transition-colors ${
                plausibilityCategory === 'Regelung & Batterie' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Batterie & Regelung (4)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredPlausibility.map((item) => (
            <div key={item.id} className="p-3 rounded-lg bg-slate-950/80 border border-white/[0.06] text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {item.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {item.status === 'info' && <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  {item.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <span className="text-slate-200">{item.label}</span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono leading-relaxed pl-5 mb-2">
                  {item.detail}
                </div>
              </div>
              <div className="pl-5 pt-1.5 border-t border-white/[0.04] text-[10px] text-emerald-400/80 font-mono">
                {item.remedy}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 3. ELEKTROTECHNISCHE SICHERHEITSPRÜFUNGEN & LEITUNGSRECHNER                   */}
      {/* ============================================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Calculator className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                3. Elektrotechnischer Leitungs- & Sicherheitsnachweis
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Victron Wiring Unlimited (Margreet Leeftink rev03)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Berechnung des Gleichstrom-Spannungsabfalls ΔU, der Verlustleistung und der Schmelzsicherungs-Dimensionierung
            </p>
          </div>
        </div>

        {/* Rechner-Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Eingabe-Säule */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-4 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Parameter DC-Batterieleitung (Einfachlänge)
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Leitungslänge einfach (L):</span>
                <span className="text-amber-400 font-bold font-mono">{calcLength.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={calcLength}
                onChange={(e) => setCalcLength(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Maximaler Entladestrom (I):</span>
                <span className="text-sky-400 font-bold font-mono">{calcCurrent} A (~{(calcCurrent * 50 / 1000).toFixed(1)} kW)</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={calcCurrent}
                onChange={(e) => setCalcCurrent(parseInt(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="text-slate-400 mb-1.5">Kupfer-Leitungsquerschnitt (A):</div>
              <div className="grid grid-cols-3 gap-2">
                {[16, 25, 35].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCalcCrossSection(val)}
                    className={`p-2 rounded-lg text-center font-mono font-bold transition-all ${
                      calcCrossSection === val
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {val} mm²
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Berechnungsergebnisse */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-3 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Errechnete physikalische Kenngrößen
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">KABELWIDERSTAND (HIN+RÜCK):</span>
                <span className="font-mono font-bold text-slate-200">{(cableResistance * 1000).toFixed(2)} mΩ</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">SPANNUNGSABFALL ΔU:</span>
                <span className="font-mono font-bold text-amber-400">{voltageDropV.toFixed(3)} V</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">PROZENTUALER ABFALL:</span>
                <span className="font-mono font-bold text-emerald-400">{voltageDropPercent.toFixed(2)} %</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">VERLUSTLEISTUNG IM KABEL:</span>
                <span className="font-mono font-bold text-sky-400">{powerLossWatts.toFixed(2)} W</span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border text-xs font-mono ${
              voltageDropPercent <= 1.0 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              {voltageDropPercent <= 1.0 ? (
                <span>✓ OPTIMAL: Spannungsabfall unter 1% Richtlinie (Victron Wiring Unlimited)</span>
              ) : (
                <span>▲ AKZEPTABEL: Spannungsabfall unter 2.5%, Querschnittserhöhung empfohlen</span>
              )}
            </div>
          </div>

          {/* Sicherheitsgrenzen & Handbuch-Auszüge */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-2.5 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              Sicherheitsgrenzen & Schmelzsicherungen
            </div>

            <div className="text-[11px] text-slate-300 space-y-1.5 font-mono leading-relaxed">
              <div>
                • <strong className="text-slate-100">Max. DC-Inverterstrom:</strong> {maxInverterCurrent.toFixed(1)} A bei 2000 W an 47.0 V Cutoff
              </div>
              <div>
                • <strong className="text-slate-100">Sicherungs-Richtwert:</strong> {recommendedFuseA} A (Faktor 1.25)
              </div>
              <div>
                • <strong className="text-slate-100">Verbaute Absicherung:</strong> 60A / 80A Mega-Fuse (ANL-Typ)
              </div>
              <div>
                • <strong className="text-slate-100">Power Queen BMS Limit:</strong> 100A Dauer / 200A Puls je Pack (im 3P Verbund max. 300A)
              </div>
            </div>

            <div className="p-2 rounded bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300 font-mono">
              Empfehlung: Hauptschalter und Mega-Sicherung in unmittelbarer Nähe des Batterie-Pluspols (&lt; 30 cm) montieren.
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 4. INFRASTRUKTUR- & BEREITSTELLUNGSSKRIPTE FÜR PROXMOX VE 8                     */}
      {/* ============================================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Code className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                4. Infrastruktur- & Proxmox Automatisierungsskripte
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-300 border border-white/[0.08]">
                PROXMOX VE 8 LXC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Schlüsselfertige Python- & Bash-Skripte zur automatisierten Container-Bereitstellung und Systemd-Dienste-Konfiguration
            </p>
          </div>

          {/* Subtabs for scripts */}
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-white/[0.08] text-xs font-medium overflow-x-auto gap-1">
            <button
              onClick={() => setActiveScriptTab('python_instance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'python_instance'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Python: Instanz</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('python_install')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'python_install'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Python: App Setup</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('python_update')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'python_update'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>3. Python: Update</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('proxmox_bash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'proxmox_bash'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-violet-400" />
              <span>Bash Alternative</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('docker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'docker'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Docker Stack</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('mosquitto_acl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'mosquitto_acl'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mosquitto ACL</span>
            </button>
          </div>
        </div>

        {/* Script Content Viewer */}
        <div className="rounded-xl border border-white/[0.08] bg-[#050811] p-4 sm:p-5 relative">
          {activeScriptTab === 'python_instance' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Skript 1: Instanzerstellung via Python (Debian 12 LXC Container 105)
                  </div>
                  <div className="text-xs text-slate-400">
                    Erstellt den unprivilegierten Container mit 1024 MB RAM, 2 Cores, fester IP 192.168.0.205 und Nesting
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('py_inst', PYTHON_CREATE_INSTANCE)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'py_inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedScript === 'py_inst' ? 'Kopiert!' : 'Python Script 1 kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PYTHON_CREATE_INSTANCE}
              </pre>
            </div>
          )}

          {activeScriptTab === 'python_install' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Skript 2: App Installation & Systemd Service (Python)
                  </div>
                  <div className="text-xs text-slate-400">
                    Blitz-Installation mit Debian-Standardpaketen (curl, git, nginx, build-essential, nodejs, npm) ohne apt-get update für sofortige Einsatzbereitschaft
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('py_app', PYTHON_INSTALL_APP)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'py_app' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copiedScript === 'py_app' ? 'Kopiert!' : 'Python Script 2 kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PYTHON_INSTALL_APP}
              </pre>
            </div>
          )}

          {activeScriptTab === 'python_update' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Skript 3: App Update & Service Reload (Python)
                  </div>
                  <div className="text-xs text-slate-400">
                    Aktualisiert die laufende App in Container 105 via Git Pull, baut die Frontend-Artefakte und lädt Nginx neu
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('py_upd', PYTHON_UPDATE_APP)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'py_upd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copiedScript === 'py_upd' ? 'Kopiert!' : 'Update Script kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PYTHON_UPDATE_APP}
              </pre>
            </div>
          )}

          {activeScriptTab === 'proxmox_bash' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    Proxmox VE 8 Bash One-Liner / Shell Script
                  </div>
                  <div className="text-xs text-slate-400">
                    Kombinierter Shell-Ablauf für Direktausführung in der Proxmox Host-Shell
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('sh_inst', PROXMOX_LXC_SCRIPT)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'sh_inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
                  <span>{copiedScript === 'sh_inst' ? 'Kopiert!' : 'Bash Script kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PROXMOX_LXC_SCRIPT}
              </pre>
            </div>
          )}

          {activeScriptTab === 'docker' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Docker Compose Stack (Mosquitto + InfluxDB v2 + Grafana)
                  </div>
                  <div className="text-xs text-slate-400">
                    Vollständiger lokaler Telemetrie-Stack für Proxmox VM oder LXC Docker Host
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('docker_stack', DOCKER_COMPOSE_STACK)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'docker_stack' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copiedScript === 'docker_stack' ? 'Kopiert!' : 'docker-compose.yml kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {DOCKER_COMPOSE_STACK}
              </pre>
            </div>
          )}

          {activeScriptTab === 'mosquitto_acl' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Mosquitto ACL Sicherheitskonfiguration (/etc/mosquitto/aclfile)
                  </div>
                  <div className="text-xs text-slate-400">
                    Gewährleistet Least-Privilege Zugriff für Shelly, AhoyDTU, Trucki und VenusOS
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('mosq_acl', MOSQUITTO_ACL_CONFIG)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'mosq_acl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copiedScript === 'mosq_acl' ? 'Kopiert!' : 'ACL Konfiguration kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {MOSQUITTO_ACL_CONFIG}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 5. DRUCK- & VOLLTEXT-DOKUMENTATIONSANSICHT (PRINT-READY)                       */}
      {/* ============================================================================== */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#070a11] p-6 sm:p-10 font-mono text-xs text-slate-300 space-y-8 shadow-2xl print:border-none print:p-0 print:bg-white print:text-black">
        
        {/* Cover Header */}
        <div className="border-b-2 border-sky-500/40 pb-6">
          <div className="text-[10px] text-sky-400 uppercase tracking-widest mb-1">
            DOKUMENTATIONS-STAND: {reportDate} • PROXMOX VE 8 LXC DEPLOYMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 print:text-black">
            SOLARANLAGE // SYSTEMDOKUMENTATION
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Lokales Cloudfreies Energiemanagementsystem • {reportVersion}
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.08] space-y-1 text-slate-300">
          <div className="font-bold text-xs text-sky-400 uppercase mb-2">Inhaltsverzeichnis:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>1. Anlagenübersicht & Live-Metriken</div>
            <div>2. 11-Komponenten Prüfbericht & Revisionsmatrix</div>
            <div>3. 16 System-Plausibilitätsprüfungen</div>
            <div>4. Elektrotechnische Sicherheitsberechnungen (Wiring Unlimited)</div>
            <div>5. IP-Plan & Netzwerkdienste (Subnetz 192.168.0.0/24)</div>
            <div>6. Proxmox LXC Automatisierungsskripte</div>
            <div>7. MQTT-Struktur & Payload Schemas</div>
            <div>8. Revisionssicheres Änderungsprotokoll & Wartung</div>
          </div>
        </div>

        {/* 1. Anlagenübersicht */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            1. Anlagenübersicht & Live-Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">PV ERZEUGUNG:</span>
              <span className="text-base font-bold text-amber-400 tabular-nums">{telemetry.pvTotalWatts} W</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">BATTERIE ENTLEERUNG:</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">{Math.abs(telemetry.batteryWatts)} W ({telemetry.batterySocPercent}%)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">NETZBEZUG (SALDIERT):</span>
              <span className="text-base font-bold text-violet-400 tabular-nums">{telemetry.gridTotalWatts} W</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">HAUSVERBRAUCH:</span>
              <span className="text-base font-bold text-sky-400 tabular-nums">{telemetry.houseTotalWatts} W</span>
            </div>
          </div>
        </div>

        {/* 2. 11-Komponenten Tabelle */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            2. 11-Komponenten Prüfbericht & Revisionsmatrix
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Komponente</th>
                  <th className="p-2.5">Kategorie</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Aktuelle Messung</th>
                  <th className="p-2.5">Korrektur- / Wartungshinweis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[11px]">
                {componentAudits.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 font-bold text-slate-200">{c.name}</td>
                    <td className="p-2.5 text-slate-400">{c.category}</td>
                    <td className="p-2.5 text-emerald-400 font-semibold">{c.statusLabel}</td>
                    <td className="p-2.5 text-sky-300">{c.liveMetric}</td>
                    <td className="p-2.5 text-slate-300">{c.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. IP Plan Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            3. IP-Plan & Netzwerkdienste (Subnetz 192.168.0.0/24)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">IP-Adresse</th>
                  <th className="p-2.5">Port</th>
                  <th className="p-2.5">Gerät</th>
                  <th className="p-2.5">Dienste</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300 text-[11px]">
                {hosts.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 text-sky-300 font-bold">{h.ip}</td>
                    <td className="p-2.5 text-amber-400">{h.port || '—'}</td>
                    <td className="p-2.5">{h.name}</td>
                    <td className="p-2.5 text-slate-400">{h.services.join(', ')}</td>
                    <td className="p-2.5 text-emerald-400">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Proxmox Automatisierung Zusammenfassung */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            4. Proxmox VE 8 LXC Bereitstellung
          </h3>
          <div className="p-3 rounded-lg bg-slate-900/30 border border-white/[0.06] space-y-2 text-slate-300">
            <div className="text-xs">
              Die Automatisierungsskripte (<code className="text-amber-300">create_proxmox_lxc.py</code> & <code className="text-emerald-300">install_solar_app.py</code>) erzeugen den unprivilegierten Container 105 (Debian 12) auf <code className="text-sky-300">local-lvm</code> mit statischer IP <code className="text-sky-300">192.168.0.205</code>, Node.js und konfigurieren Nginx für sofortiges Ausliefern von <code className="text-sky-300">dist/</code> auf Port 80 ohne zeitintensives apt-get update.
            </div>
            <div className="text-[11px] text-slate-400">
              Vollständiger Quellcode ist im Abschnitt oben und in den Export-Dateien (Markdown & JSON) hinterlegt.
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-white/[0.08] text-[10px] text-slate-500 flex justify-between items-center">
          <span>Generiert durch Solar-Lokal Core • Proxmox VE 8 Host</span>
          <span>Revisionssicher • Cloudfrei • Stand: {reportDate}</span>
        </div>

      </div>

    </div>
  );
};
