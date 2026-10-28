import { 
  SolarTelemetry, 
  DeviceInventoryItem, 
  NetworkHost, 
  MqttTopicDoc, 
  ApiDoc, 
  ChangeLogEntry, 
  MaintenanceEntry,
  DiscoveredDevice,
  AutomationRule
} from '../types';

export const INITIAL_TELEMETRY: SolarTelemetry = {
  timestamp: '2026-09-14T14:32:45Z',
  // PV Erzeugung
  pvTotalWatts: 1420,
  pvHoymilesWatts: 960,
  pvVictronMppt1Watts: 240,
  pvVictronMppt2Watts: 220,
  pvDailyYieldKwh: 6.84,
  
  // Hoymiles Detail
  hoymilesLimitPercent: 100,
  hoymilesLimitWatts: 1500,
  hoymilesChannels: [
    { channel: 1, voltage: 33.4, current: 7.2, power: 240 },
    { channel: 2, voltage: 33.1, current: 7.1, power: 235 },
    { channel: 3, voltage: 33.6, current: 7.3, power: 245 },
    { channel: 4, voltage: 33.0, current: 7.3, power: 240 },
  ],
  hoymilesTempC: 38.5,

  // Netz (Shelly Pro 3EM)
  gridTotalWatts: 145, // leichter Bezug (+145W)
  gridMode: 'Bezug',
  gridPhases: [
    { phase: 'L1', voltage: 231.2, current: 1.15, activePower: 180, powerFactor: 0.94, frequency: 50.01 },
    { phase: 'L2', voltage: 230.8, current: 0.85, activePower: -95, powerFactor: 0.88, frequency: 50.01 }, // speist leicht auf L2 aus
    { phase: 'L3', voltage: 232.0, current: 0.62, activePower: 60, powerFactor: 0.91, frequency: 50.00 },
  ],
  gridDailyImportKwh: 1.82,
  gridDailyExportKwh: 0.45,

  // Batterie (48V LiFePO4 6x Power Queen 100Ah)
  batterySocPercent: 78,
  batteryVoltage: 52.8,
  batteryCurrent: -11.4, // Entlädt mit ~600W
  batteryWatts: -602,   // speist ins Hausnetz ein
  batteryTempC: 23.4,
  batteryHealthPercent: 99.4,
  batteryCycles: 42,
  batteryCellVoltages: [
    3.302, 3.305, 3.301, 3.304, 3.303, 3.306, 3.302, 3.304,
    3.301, 3.305, 3.303, 3.304, 3.302, 3.306, 3.303, 3.305
  ],
  batteryDailyChargedKwh: 4.12,
  batteryDailyDischargedKwh: 2.85,

  // Trucki AC Gateway
  truckiPowerLimitWatts: 600,
  truckiActualOutputWatts: 595,
  truckiZeroExportEnabled: true,
  truckiStatus: 'NORMAL',

  // Hausverbrauch
  houseTotalWatts: 1700, // Saldierte AC-Leistung: 960W Hoymiles + 595W Trucki + 145W Netzbezug
  houseDailyKwh: 7.92,

  // KPIs
  autarkyPercent: 88.4,
  selfConsumptionPercent: 94.2,
};

// ---------------------------------------------------------------------------
// Geraeteinventar - abgeglichen mit der realen Anlage (Stand 2026-10-28).
// Quellen: Solar-Lokal-App (DEFAULT_CONFIG), Integrationen-Screenshot 2026-10-20,
// T2SG-Startkonfiguration fuer 6x Power Queen 25,6 V 100 Ah.
// Werte, die noch nicht erfasst sind (Seriennummer, MAC, Firmware), stehen
// bewusst auf 'nicht erfasst' statt auf erfundenen Platzhaltern.
// ---------------------------------------------------------------------------
const NE = 'nicht erfasst';
const VRM_ID = 'b827eb79321c';
const LAST_CHECK = '2026-10-20 16:19:02';

export const INITIAL_DEVICES: DeviceInventoryItem[] = [
  {
    id: 'shelly-pro-3em',
    name: 'Shelly Pro 3EM (Netzanschlusspunkt)',
    category: 'Netz',
    vendor: 'Shelly',
    model: 'Pro 3EM',
    serialNumber: NE,
    ip: '192.168.0.100',
    mac: NE,
    hostname: '192.168.0.100',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: '3-Phasen-Energiemesser, Gen2 RPC, Outbound-WebSocket zu Venus OS',
    services: ['HTTP Web-UI', 'Gen2 RPC', 'MQTT', 'Outbound WebSocket -> Venus OS'],
    mqttTopics: [
      'venus/grid/shellypro/status/em:0',
      'venus/grid/shellypro/online'
    ],
    apiEndpoints: [
      'http://192.168.0.100/rpc/EM.GetStatus?id=0',
      'http://192.168.0.100/rpc/Shelly.GetDeviceInfo'
    ],
    location: 'Netzanschlusspunkt / Zaehlerschrank',
    operatingLimits: [
      { parameter: 'Rolle in Venus OS', value: 'Grid Meter', unit: '', description: 'Per WebSocket als "Shelly energy meter" erkannt' },
      { parameter: 'VRM-Instanz', value: '40', unit: '', description: 'Vergeben durch Venus OS' },
      { parameter: 'WebSocket-Port', value: '58354', unit: '', description: 'Verbindung Shelly -> Venus OS' },
      { parameter: 'Vorzeichen', value: '+ Bezug / - Einspeisung', unit: '', description: 'Konvention fuer T2SG und App' }
    ],
    isIstZustand: true,
    notes: 'Einziges Messgeraet am Netzanschlusspunkt. Liefert den Zaehlerwert fuer die T2SG-Nulleinspeisung und ist in Venus OS als Grid Meter eingebunden.'
  },
  {
    id: 'hoymiles-ahoy',
    name: 'AhoyDTU & Hoymiles HM-1500',
    category: 'PV',
    vendor: 'Hoymiles / AhoyDTU',
    model: 'HM-1500 (via AhoyDTU)',
    serialNumber: NE,
    ip: '192.168.0.101',
    mac: NE,
    hostname: 'ahoydtu.local',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'Mikrowechselrichter 1500 W AC, 4 DC-Eingaenge an 2 MPPT, max. 60 V DC',
    services: ['HTTP Web-UI', 'REST API', 'MQTT'],
    mqttTopics: [
      'venus/pv/ahoydtu/HM1500/ch0/P_AC',
      'venus/pv/ahoydtu/HM1500/ch0/U_AC',
      'venus/pv/ahoydtu/HM1500/ch1/P_DC',
      'venus/pv/ahoydtu/HM1500/status'
    ],
    apiEndpoints: [
      'http://ahoydtu.local/api/live',
      'http://ahoydtu.local/api/inverter/id/0',
      'http://192.168.0.101/api/live'
    ],
    location: NE,
    operatingLimits: [
      { parameter: 'Max AC-Leistung', value: '1500', unit: 'W', description: 'Nennleistung HM-1500' },
      { parameter: 'Max DC-Spannung', value: '60', unit: 'V', description: 'Pro Eingang' },
      { parameter: 'Ahoy Inverter-ID', value: '0', unit: '', description: 'Wie in der Solar-Lokal-App konfiguriert' },
      { parameter: 'Venus OS', value: 'PV-Inverter', unit: '', description: 'Plugin venus.dbus-hoymiles, Phase L1, AC-Position 0' }
    ],
    isIstZustand: true,
    notes: 'Speist AC ins Hausnetz. In Venus OS als PV-Inverter (nicht als Grid Meter oder Batterie) eingebunden. Modulbelegung der vier Eingaenge noch nicht erfasst.'
  },
  {
    id: 'trucki-sun2000',
    name: 'Trucki2Shelly Gateway (T2SG) & Lumentree SUN',
    category: 'Batterie / AC-System',
    vendor: 'Trucki / Lumentree',
    model: 'T2SG v1.15 + Lumentree SUN-2000G2-H',
    serialNumber: NE,
    ip: '192.168.0.102',
    mac: NE,
    hostname: 'trucki.local',
    status: 'online',
    firmwareVersion: 'v1.15',
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'T2SG-Stick am Lumentree SUN, ohne Modbus-Platine. Zaehlerwert vom Shelly Pro 3EM per HTTP.',
    services: ['HTTP Web-UI', 'JSON Live (/jsonlive)', 'MQTT', 'System-Log (/log.txt)'],
    mqttTopics: [
      'TRUCKI/ACSETPOINT',
      'TRUCKI/ACDISPLAY',
      'TRUCKI/VGRID',
      'TRUCKI/VBAT',
      'TRUCKI/TEMPERATURE',
      'TRUCKI/METER',
      'TRUCKI/MAXPOWER',
      'TRUCKI/TARGET',
      'TRUCKI/DAYENERGY',
      'TRUCKI/TOTALENERGY',
      'TRUCKI/STATE',
      'TRUCKI/ZEPC',
      'TRUCKI/ACSETPOINTOVR',
      'TRUCKI/METEROVR',
      'TRUCKI/MAXPOWEROVR',
      'TRUCKI/TARGETOVR',
      'TRUCKI/REBOOTOVR'
    ],
    apiEndpoints: [
      'http://trucki.local/',
      'http://trucki.local/jsonlive',
      'http://trucki.local/log.txt',
      'http://192.168.0.102/jsonlive',
      'http://192.168.4.1 (Fallback AP)'
    ],
    location: NE,
    operatingLimits: [
      { parameter: 'Meter-Quelle', value: '192.168.0.100', unit: '', description: 'Shelly Pro 3EM, total_act_power' },
      { parameter: 'Target', value: '10', unit: 'W', description: 'Startwert, ruhigere Regelung als 0 W' },
      { parameter: 'Mittelung', value: '10', unit: '', description: 'Bei nervoeser Regelung erhoehen' },
      { parameter: 'Direct -> SUN', value: 'AUS', unit: '', description: 'Echte Regelung ueber den Zaehlerwert' },
      { parameter: 'VBat Cutoff (Abschaltung)', value: '47.0', unit: 'V', description: 'Schutz vor tiefer Entladung (2S Power Queen)' },
      { parameter: 'VBat Reboot (Start)', value: '51.8', unit: 'V', description: 'Wiederanlauf mit Abstand zum Cutoff' },
      { parameter: 'Differenz-Schwellwert', value: '0.5', unit: 'V', description: 'Hysterese' },
      { parameter: 'Max. AC-Leistung', value: '2000', unit: 'W', description: 'SUN-2000G2-H, max. und kontinuierlich (Anleitung Tabelle 1)' },
      { parameter: 'DC-Eingangsbereich', value: '45 - 90', unit: 'V', description: 'H-Variante' },
      { parameter: 'Einschaltspannung', value: '49', unit: 'V', description: 'Laut Lumentree-Anleitung' },
      { parameter: 'AC-Ausgang', value: '185 - 265', unit: 'V', description: '50 Hz, reine Sinuswelle' },
      { parameter: 'Max. Wirkungsgrad', value: '92', unit: '%', description: 'Nachtverbrauch 1.5 W' },
      { parameter: 'MQTT-Prefix', value: 'TRUCKI', unit: '', description: 'Geraetename im T2SG' }
    ],
    isIstZustand: true,
    notes: 'T2SG regelt den SUN ausserhalb von Venus OS (kein Modbus, kein Venus-Geraet). MQTT-Prefix entspricht dem Geraetenamen im T2SG, hier "TRUCKI" (Topics TRUCKI/#).'
  },
  {
    id: 'lifepo4-battery-bank',
    name: '48V LiFePO4 Speicher (6x Power Queen 25.6V 100Ah)',
    category: 'Batterie / AC-System',
    vendor: 'Power Queen',
    model: '6x 25.6V 100Ah, 2S3P (51.2V 300Ah / 15.36 kWh)',
    serialNumber: NE,
    ip: '-',
    mac: '-',
    hostname: '-',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Prüfung nicht möglich',
    lastChecked: LAST_CHECK,
    hardwareSpecs: '3 parallele Straenge aus je 2 Bloecken in Serie (16S je Strang), internes 100A-BMS pro Block, keine Netzwerkschnittstelle',
    services: ['Internes BMS je Block'],
    mqttTopics: [
      `N/${VRM_ID}/solarcharger/288/Dc/0/Voltage`,
      `N/${VRM_ID}/solarcharger/289/Dc/0/Voltage`,
      'TRUCKI/VBAT'
    ],
    apiEndpoints: [],
    location: NE,
    operatingLimits: [
      { parameter: 'Nennspannung', value: '51.2', unit: 'V', description: '2x 25.6 V in Serie' },
      { parameter: 'Kapazitaet', value: '300 Ah / 15.36', unit: 'kWh', description: '3 Straenge parallel' },
      { parameter: 'Ladespannung', value: '57.6', unit: 'V', description: '2x 28.8 V (Herstellerangabe je Block 28.8 V +/- 0.4 V)' },
      { parameter: 'Max. Dauerstrom', value: '300', unit: 'A', description: '3x 100 A BMS (nur bei sauber symmetrischen Straengen)' },
      { parameter: 'Max. Verschaltung', value: '2S4P', unit: '', description: 'Herstellergrenze' },
      { parameter: 'Alarm Unterspannung', value: '48.0 / 46.4', unit: 'V', description: 'Warnung / kritisch (Solar-Lokal-App)' },
      { parameter: 'Alarm Ueberspannung', value: '56.0 / 57.6', unit: 'V', description: 'Warnung / kritisch (Solar-Lokal-App)' }
    ],
    isIstZustand: true,
    notes: 'Kein Batteriemonitor und keine BMS-Datenanbindung: Spannung kommt von den MPPTs (Venus OS) und vom T2SG (VBAT). SOC und Zellspannungen sind daher nur geschaetzt bzw. Demo-Werte. Straenge mit gleicher Kabellaenge und Absicherung betreiben.'
  },
  {
    id: 'victron-venusos',
    name: 'Venus OS Large auf Raspberry Pi 3',
    category: 'Venus OS',
    vendor: 'Victron Energy / Raspberry Pi',
    model: 'Raspberry Pi 3 mit Venus OS Large',
    serialNumber: VRM_ID,
    ip: '192.168.0.111',
    mac: 'b8:27:eb:79:32:1c',
    hostname: 'venus.local',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'Raspberry Pi 3, MPPTs per VE.Direct, D-Bus, MQTT-Bridge (Keep-Alive alle 30 s)',
    services: ['GUI v2 (http://venus.local/gui-v2)', 'MQTT', 'SSH', 'Modbus-TCP'],
    mqttTopics: [
      `N/${VRM_ID}/system/0/Dc/Pv/Power`,
      `N/${VRM_ID}/solarcharger/288/#`,
      `N/${VRM_ID}/solarcharger/289/#`,
      `N/${VRM_ID}/grid/#`,
      `R/${VRM_ID}/keepalive`
    ],
    apiEndpoints: [
      'http://venus.local/gui-v2',
      'http://192.168.0.111/'
    ],
    location: NE,
    operatingLimits: [
      { parameter: 'VRM Portal-ID', value: VRM_ID, unit: '', description: 'Basis aller N/<ID>/... Topics' },
      { parameter: 'Solarcharger-Instanzen', value: '288, 289', unit: '', description: '2x SmartSolar MPPT 150/35' },
      { parameter: 'Grid Meter', value: 'Shelly Pro 3EM', unit: '', description: 'VRM-Instanz 40' },
      { parameter: 'PV-Inverter', value: 'HM-1500', unit: '', description: 'via venus.dbus-hoymiles' }
    ],
    isIstZustand: true,
    notes: 'Monitoring und Logging fuer Grid, PV und MPPTs. Keine Regelung des T2SG. MAC aus der VRM-ID abgeleitet.'
  },
  {
    id: 'victron-mppt-1',
    name: 'Victron SmartSolar MPPT 150/35 [288]',
    category: 'MPPT',
    vendor: 'Victron Energy',
    model: 'SmartSolar MPPT 150/35',
    serialNumber: NE,
    ip: '192.168.0.111',
    mac: '-',
    hostname: 'via Venus OS',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: '150 V max. PV-Leerlaufspannung, 35 A Ladestrom, VE.Direct',
    services: ['VE.Direct -> Venus OS', 'Bluetooth (VictronConnect)'],
    mqttTopics: [
      `N/${VRM_ID}/solarcharger/288/Yield/Power`,
      `N/${VRM_ID}/solarcharger/288/Pv/V`,
      `N/${VRM_ID}/solarcharger/288/Dc/0/Voltage`,
      `N/${VRM_ID}/solarcharger/288/History/Daily/0/Yield`,
      `N/${VRM_ID}/solarcharger/288/State`
    ],
    apiEndpoints: [],
    location: NE,
    operatingLimits: [
      { parameter: 'Max PV-Spannung', value: '150', unit: 'V', description: 'Voc inkl. Kaltreserve' },
      { parameter: 'Max Ladestrom', value: '35', unit: 'A', description: 'Batterieseitig' }
    ],
    isIstZustand: true,
    notes: 'DC-gekoppelt: laedt direkt den Akku, zaehlt nicht zum Hausverbrauch. Angeschlossene Module noch nicht erfasst.'
  },
  {
    id: 'victron-mppt-2',
    name: 'Victron SmartSolar MPPT 150/35 [289]',
    category: 'MPPT',
    vendor: 'Victron Energy',
    model: 'SmartSolar MPPT 150/35',
    serialNumber: NE,
    ip: '192.168.0.111',
    mac: '-',
    hostname: 'via Venus OS',
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: '150 V max. PV-Leerlaufspannung, 35 A Ladestrom, VE.Direct',
    services: ['VE.Direct -> Venus OS', 'Bluetooth (VictronConnect)'],
    mqttTopics: [
      `N/${VRM_ID}/solarcharger/289/Yield/Power`,
      `N/${VRM_ID}/solarcharger/289/Pv/V`,
      `N/${VRM_ID}/solarcharger/289/Dc/0/Voltage`,
      `N/${VRM_ID}/solarcharger/289/History/Daily/0/Yield`,
      `N/${VRM_ID}/solarcharger/289/State`
    ],
    apiEndpoints: [],
    location: NE,
    operatingLimits: [
      { parameter: 'Max PV-Spannung', value: '150', unit: 'V', description: 'Voc inkl. Kaltreserve' },
      { parameter: 'Max Ladestrom', value: '35', unit: 'A', description: 'Batterieseitig' }
    ],
    isIstZustand: true,
    notes: 'DC-gekoppelt: laedt direkt den Akku, zaehlt nicht zum Hausverbrauch. Angeschlossene Module noch nicht erfasst.'
  },
  {
    id: 'proxmox-host',
    name: 'Proxmox VE Host',
    category: 'Infrastruktur',
    vendor: 'Proxmox Server Solutions',
    model: NE,
    serialNumber: NE,
    ip: '192.168.0.200',
    mac: NE,
    hostname: NE,
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: NE,
    services: ['HTTPS Web-UI (Port 8006)', 'SSH (Port 22)', 'Proxmox VE API'],
    mqttTopics: [],
    apiEndpoints: [
      'https://192.168.0.200:8006/'
    ],
    location: NE,
    operatingLimits: [],
    isIstZustand: true,
    notes: 'Hostet die LXC-Container fuer Mosquitto, Grafana, InfluxDB und die Solar-App (192.168.0.222).'
  },
  {
    id: 'mosquitto-broker',
    name: 'Mosquitto MQTT Broker (TLS + ACL)',
    category: 'Infrastruktur',
    vendor: 'Eclipse Mosquitto',
    model: 'Mosquitto (LXC)',
    serialNumber: NE,
    ip: '192.168.0.201',
    mac: NE,
    hostname: NE,
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'LXC auf Proxmox, OpenSSL-Zertifikate, ACL-basierte Topic-Rechte',
    services: ['MQTTS (Port 8883, TLS)', 'MQTT (Port 1883, aktuell von der App genutzt)'],
    mqttTopics: [
      'venus/grid/shellypro/#',
      'venus/pv/ahoydtu/#',
      'TRUCKI/#',
      `N/${VRM_ID}/#`
    ],
    apiEndpoints: [],
    location: 'Proxmox LXC',
    operatingLimits: [
      { parameter: 'App-Benutzer', value: 'mqttapp', unit: '', description: 'Zugang der Solar-Lokal-App' },
      { parameter: 'Anonymer Zugriff', value: 'Aus', unit: '', description: 'ACL-Hardening' }
    ],
    isIstZustand: true,
    notes: 'TLS auf 8883 ist eingerichtet. Laut Integrationen-Screenshot vom 2026-10-20 verbindet sich die App noch ueber 1883.'
  },
  {
    id: 'grafana-dashboard',
    name: 'Grafana',
    category: 'Infrastruktur',
    vendor: 'Grafana Labs',
    model: 'Grafana (LXC)',
    serialNumber: NE,
    ip: '192.168.0.202',
    mac: NE,
    hostname: NE,
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'LXC auf Proxmox',
    services: ['HTTP (Port 3000)'],
    mqttTopics: [],
    apiEndpoints: [
      'http://192.168.0.202:3000/api/health'
    ],
    location: 'Proxmox LXC',
    operatingLimits: [],
    isIstZustand: true,
    notes: 'Datenquelle: InfluxDB 192.168.0.203, Bucket "solar".'
  },
  {
    id: 'influxdb-time-series',
    name: 'InfluxDB 2.x',
    category: 'Infrastruktur',
    vendor: 'InfluxData',
    model: 'InfluxDB 2.x (LXC)',
    serialNumber: NE,
    ip: '192.168.0.203',
    mac: NE,
    hostname: NE,
    status: 'online',
    firmwareVersion: NE,
    firmwareStatus: 'Unbekannt',
    lastChecked: LAST_CHECK,
    hardwareSpecs: 'LXC auf Proxmox, Organisation "Solar Lokal", Bucket "solar"',
    services: ['HTTP REST (Port 8086)', 'Flux'],
    mqttTopics: [],
    apiEndpoints: [
      'http://192.168.0.203:8086/health'
    ],
    location: 'Proxmox LXC',
    operatingLimits: [
      { parameter: 'Organisation', value: 'Solar Lokal', unit: '', description: '' },
      { parameter: 'Bucket', value: 'solar', unit: '', description: 'Schreibzugriff durch die Solar-Lokal-App' }
    ],
    isIstZustand: true,
    notes: 'Wird von der Solar-Lokal-App beschrieben.'
  }
];

export const INITIAL_NETWORK_HOSTS: NetworkHost[] = [
  { ip: '192.168.0.100', port: 80, name: 'Shelly Pro 3EM', deviceCategory: 'Netz / Zaehler', services: ['HTTP', 'RPC', 'MQTT', 'WebSocket -> Venus'], status: 'Online', latencyMs: 1.2, mac: NE },
  { ip: '192.168.0.101', port: 80, name: 'AhoyDTU (ahoydtu.local)', deviceCategory: 'PV Wechselrichter', services: ['HTTP', 'REST API', 'MQTT'], status: 'Online', latencyMs: 4.8, mac: NE },
  { ip: '192.168.0.102', port: 80, name: 'Trucki2Shelly Gateway (trucki.local)', deviceCategory: 'Batterie / Inverter', services: ['HTTP', 'JSON Live', 'MQTT'], status: 'Online', latencyMs: 2.1, mac: NE },
  { ip: '192.168.0.111', port: 80, name: 'Venus OS (venus.local)', deviceCategory: 'MPPT / Monitoring', services: ['HTTP', 'MQTT', 'SSH', 'Modbus-TCP'], status: 'Online', latencyMs: 1.6, mac: 'b8:27:eb:79:32:1c' },
  { ip: '192.168.0.200', port: 8006, name: 'Proxmox VE Host', deviceCategory: 'Server Host', services: ['HTTPS', 'Web GUI', 'SSH'], status: 'Online', latencyMs: 0.4, mac: NE },
  { ip: '192.168.0.201', port: 8883, name: 'Mosquitto MQTT Broker', deviceCategory: 'MQTT Broker', services: ['MQTTS:8883', 'MQTT:1883'], status: 'Online', latencyMs: 0.3, mac: NE },
  { ip: '192.168.0.202', port: 3000, name: 'Grafana', deviceCategory: 'Visualisierung', services: ['HTTP:3000'], status: 'Online', latencyMs: 0.5, mac: NE },
  { ip: '192.168.0.203', port: 8086, name: 'InfluxDB 2.x', deviceCategory: 'Datenbank', services: ['HTTP:8086', 'Flux'], status: 'Online', latencyMs: 0.6, mac: NE },
  { ip: '192.168.0.222', port: 80, name: 'Solar-App (LXC)', deviceCategory: 'Anwendung', services: ['HTTP'], status: 'Online', latencyMs: 0.5, mac: NE }
];

export const INITIAL_DISCOVERED_DEVICE: DiscoveredDevice = {
  ip: '192.168.0.125',
  mac: 'ec:fa:bc:44:12:a8',
  hostname: 'tasmota-plug-washer.lan',
  services: ['HTTP', 'MQTT', 'Tasmota Web', 'Sonoff-OTA'],
  timestamp: 'Vor 3 Minuten erkannt',
  suggestedName: 'Tasmota SmartPlug (Waschmaschine / Großverbraucher)',
  suggestedCategory: 'Infrastruktur'
};

export const INITIAL_MQTT_TOPICS: MqttTopicDoc[] = [
  {
    topic: 'venus/grid/shellypro/status/em:0',
    dataType: 'JSON Object',
    source: 'Shelly Pro 3EM (192.168.0.100)',
    frequency: '~1.0 s',
    lastSeen: 'Gerade eben',
    consumers: ['Trucki Gateway', 'Telegraf -> InfluxDB', 'Solar-Lokal Core'],
    samplePayload: {
      id: 0,
      a_current: 1.152,
      a_voltage: 231.2,
      a_act_power: 180.4,
      a_aprt_power: 192.0,
      a_pf: 0.94,
      a_freq: 50.01,
      b_current: 0.851,
      b_voltage: 230.8,
      b_act_power: -95.2,
      b_aprt_power: 108.2,
      b_pf: 0.88,
      b_freq: 50.01,
      c_current: 0.623,
      c_voltage: 232.0,
      c_act_power: 60.1,
      c_aprt_power: 66.0,
      c_pf: 0.91,
      c_freq: 50.0,
      total_current: 2.626,
      total_act_power: 145.3,
      total_aprt_power: 366.2
    },
    fields: [
      { field: 'a_current', type: 'number', unit: 'A', example: 1.152, description: 'Stromstärke Phase L1' },
      { field: 'a_voltage', type: 'number', unit: 'V', example: 231.2, description: 'Effektivspannung Phase L1' },
      { field: 'a_act_power', type: 'number', unit: 'W', example: 180.4, description: 'Wirkleistung Phase L1 (positiv = Bezug)' },
      { field: 'a_pf', type: 'number', unit: '—', example: 0.94, description: 'Leistungsfaktor (Power Factor) Phase L1' },
      { field: 'a_freq', type: 'number', unit: 'Hz', example: 50.01, description: 'Netzfrequenz' },
      { field: 'b_act_power', type: 'number', unit: 'W', example: -95.2, description: 'Wirkleistung Phase L2 (negativ = Rückspeisung)' },
      { field: 'c_act_power', type: 'number', unit: 'W', example: 60.1, description: 'Wirkleistung Phase L3' },
      { field: 'total_current', type: 'number', unit: 'A', example: 2.626, description: 'Summenstrom über alle 3 Phasen' },
      { field: 'total_act_power', type: 'number', unit: 'W', example: 145.3, description: 'Saldierte Gesamt-Wirkleistung am Zählerpunkt' },
      { field: 'total_aprt_power', type: 'number', unit: 'VA', example: 366.2, description: 'Gesamte Scheinleistung' }
    ]
  },
  {
    topic: 'venus/pv/ahoydtu/HM1500/ch0/status',
    dataType: 'JSON Object',
    source: 'AhoyDTU (192.168.0.101)',
    frequency: '~5.0 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'Telegraf -> InfluxDB'],
    samplePayload: {
      P_AC: 960.2,
      U_AC: 231.5,
      I_AC: 4.15,
      F_AC: 50.02,
      Temp: 38.5,
      ALim_P: 100.0,
      Efficiency: 96.4,
      YieldDay: 4820,
      YieldTotal: 2841.4
    },
    fields: [
      { field: 'P_AC', type: 'number', unit: 'W', example: 960.2, description: 'Gesamte AC Einspeiseleistung des Hoymiles HM-1500' },
      { field: 'U_AC', type: 'number', unit: 'V', example: 231.5, description: 'AC Netzspannung am Inverter-Ausgang' },
      { field: 'I_AC', type: 'number', unit: 'A', example: 4.15, description: 'AC Ausgangsstrom' },
      { field: 'Temp', type: 'number', unit: '°C', example: 38.5, description: 'Gehäusetemperatur Wechselrichter' },
      { field: 'ALim_P', type: 'number', unit: '%', example: 100.0, description: 'Aktives Leistungslimit in Prozent' },
      { field: 'Efficiency', type: 'number', unit: '%', example: 96.4, description: 'Inverter Wirkungsgrad' },
      { field: 'YieldDay', type: 'number', unit: 'Wh', example: 4820, description: 'Tagesertrag Hoymiles in Wattstunden' }
    ]
  },
  {
    topic: 'TRUCKI/ACDISPLAY',
    dataType: 'Single Value [W]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'InfluxDB solar.pv_power', 'Grafana'],
    samplePayload: {
      topic: 'TRUCKI/ACDISPLAY',
      value: 595,
      unit: 'W'
    },
    fields: [
      { field: 'value', type: 'number', unit: 'W', example: 595, description: 'Vom Lumentree Inverter über RS485 gemeldete tatsächliche AC-Ausgangsleistung (Ist-Wert)' }
    ]
  },
  {
    topic: 'TRUCKI/ACSETPOINT',
    dataType: 'Single Value [W]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'Regler-Audit'],
    samplePayload: {
      topic: 'TRUCKI/ACSETPOINT',
      value: 600,
      unit: 'W'
    },
    fields: [
      { field: 'value', type: 'number', unit: 'W', example: 600, description: 'Aktuell vom T2SG errechneter oder per Override vorgegebener Inverter-Sollwert' }
    ]
  },
  {
    topic: 'TRUCKI/VBAT',
    dataType: 'Single Value [V]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'Tiefentladeschutz', 'InfluxDB'],
    samplePayload: {
      topic: 'TRUCKI/VBAT',
      value: 52.84,
      unit: 'V'
    },
    fields: [
      { field: 'value', type: 'number', unit: 'V', example: 52.84, description: 'Gemessene DC-Batteriespannung am Eingang des Lumentree Inverters (Cutoff 47.0 V, Reboot 51.8 V)' }
    ]
  },
  {
    topic: 'TRUCKI/METER',
    dataType: 'Single Value [W]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['ZEPC Regelschleife', 'Nulleinspeisungs-Monitor'],
    samplePayload: {
      topic: 'TRUCKI/METER',
      value: 145,
      unit: 'W'
    },
    fields: [
      { field: 'value', type: 'number', unit: 'W', example: 145, description: 'Vom T2SG erfasster Zählerwert (Shelly Pro 3EM). Positiv = Netzbezug, Negativ = Netzeinspeisung' }
    ]
  },
  {
    topic: 'TRUCKI/ZEPC',
    dataType: 'Numeric State [0-4]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'Status-HUD'],
    samplePayload: {
      topic: 'TRUCKI/ZEPC',
      value: 1,
      mode: 'Enabled'
    },
    fields: [
      { field: 'value', type: 'number', unit: '—', example: 1, description: '0=Deaktiviert, 1=Aktiviert (Auto-Nulleinspeisung), 2=Manuell (Override), 3=MQTT Meter, 4=Linked Multi-Inverter' }
    ]
  },
  {
    topic: 'TRUCKI/TEMPERATURE',
    dataType: 'Single Value [°C]',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.3 s',
    lastSeen: 'Gerade eben',
    consumers: ['Temperatur-Wächter', 'Alarm-System'],
    samplePayload: {
      topic: 'TRUCKI/TEMPERATURE',
      value: 39.2,
      unit: '°C'
    },
    fields: [
      { field: 'value', type: 'number', unit: '°C', example: 39.2, description: 'Inverter-Kühlkörpertemperatur. Achtung: Hardware-Abschaltung erfolgt ab 75 °C!' }
    ]
  },
  {
    topic: 'TRUCKI/ACSETPOINTOVR',
    dataType: 'Command [W] (Write-Only)',
    source: 'Solar-Lokal / MQTT Client -> T2SG',
    frequency: 'Auf Befehl',
    lastSeen: 'Vor 15 Min',
    consumers: ['Trucki2Shelly Gateway'],
    samplePayload: {
      topic: 'TRUCKI/ACSETPOINTOVR',
      payload: '350'
    },
    fields: [
      { field: 'payload', type: 'string / number', unit: 'W', example: '350', description: 'Manuelle Vorgabe der Inverter-Leistung. Deaktiviert automatisch den ZEPC Regelkreis (Status wechselt auf 2)!' }
    ]
  },
  {
    topic: 'TRUCKI/METEROVR',
    dataType: 'Command [W] (Write-Only)',
    source: 'Solar-Lokal / MQTT Client -> T2SG',
    frequency: 'Zyklisch ~500ms',
    lastSeen: 'Vor 2s',
    consumers: ['Trucki2Shelly Gateway ZEPC'],
    samplePayload: {
      topic: 'TRUCKI/METEROVR',
      payload: '185'
    },
    fields: [
      { field: 'payload', type: 'string / number', unit: 'W', example: '185', description: 'Ermöglicht Einspeisung externer Zählerwerte via MQTT (Meter-URL im Gateway muss leer sein). Reaktiviert ZEPC!' }
    ]
  },
  {
    topic: 'TRUCKI/ZEPCOVR',
    dataType: 'Command [0|1] (Write-Only)',
    source: 'Solar-Lokal / MQTT Client -> T2SG',
    frequency: 'Auf Befehl',
    lastSeen: 'Vor 1 Std',
    consumers: ['Trucki2Shelly Gateway'],
    samplePayload: {
      topic: 'TRUCKI/ZEPCOVR',
      payload: '1'
    },
    fields: [
      { field: 'payload', type: 'string', unit: '—', example: '1', description: 'Reaktiviert die Nulleinspeisung (1 = Enable ZEPC, 0 = Disable ZEPC).' }
    ]
  },
  {
    topic: 'TRUCKI/REBOOTOVR',
    dataType: 'Command String (Write-Only)',
    source: 'Solar-Lokal / Wartung -> T2SG',
    frequency: 'Manuell',
    lastSeen: 'Nie',
    consumers: ['Trucki2Shelly Gateway OS'],
    samplePayload: {
      topic: 'TRUCKI/REBOOTOVR',
      payload: 'REBOOTOVR'
    },
    fields: [
      { field: 'payload', type: 'string', unit: '—', example: 'REBOOTOVR', description: 'Senden des exakten Strings "REBOOTOVR" löst einen sauberen Neustart des T2SG Gateways aus.' }
    ]
  },
  {
    topic: `N/${VRM_ID}/solarcharger/288/Dc/0/Voltage`,
    dataType: 'JSON Object',
    source: 'Venus OS (192.168.0.111) / MPPT 150/35 [288]',
    frequency: '~1.0 s (Keep-Alive alle 30 s)',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'InfluxDB'],
    samplePayload: {
      value: 53.45
    },
    fields: [
      { field: 'value', type: 'number', unit: 'V', example: 53.45, description: 'Batteriespannung am MPPT-Ausgang. Ohne Batteriemonitor die beste verfuegbare Spannungsquelle (SOC wird nicht gemessen).' }
    ]
  }
];

export const INITIAL_API_DOCS: ApiDoc[] = [
  {
    endpoint: '/',
    baseUrl: 'http://trucki.local (192.168.0.102)',
    method: 'GET',
    responseFormat: 'text/html',
    lastSuccessfulAccess: 'Vor 1.4s',
    responseTimeMs: 12,
    status: '200 OK',
    description: 'Offizielle Web-Oberfläche des T2SG v1.15 mit Live-Anzeige aller Messwerte, WLAN- & MQTT-Konfiguration und K-Faktor Kalibrierung.',
    usedFields: ['ACDISPLAY', 'ACSETPOINT', 'VBAT', 'VGRID', 'METER', 'TEMPERATURE', 'STATE', 'ZEPC'],
    exampleResponse: {
      status: 'HTTP/1.1 200 OK',
      title: 'Trucki2Shelly Gateway v1.15',
      uptime: '14d 06:22:15',
      zepc: 'Enabled (1)',
      inverter: 'SUN-2000G2-H RS485 Connected'
    }
  },
  {
    endpoint: '/log.txt',
    baseUrl: 'http://trucki.local (192.168.0.102)',
    method: 'GET',
    responseFormat: 'text/plain',
    lastSuccessfulAccess: 'Vor 2.1s',
    responseTimeMs: 15,
    status: '200 OK',
    description: 'Zyklischer Ringspeicher des internen System-Logs laut Handbuch (v1.15). Ideal für Diagnose von Zähler-Abfragefehlern und RS485-Verbindungsstatus.',
    usedFields: ['Timestamp', 'Log-Level', 'RS485 RX/TX', 'MQTT State', 'Meter Read Latency'],
    exampleResponse: {
      logSnippet: '[INFO] 14:31:40 WiFi connected RSSI: -54 dBm\n[INFO] 14:31:41 MQTT connected to 192.168.0.201:1883\n[METER] 14:31:42 Shelly read OK: 145W (latency 18ms)\n[RS485] 14:31:43 DAC: 21840, Inverter ACDisplay: 595W, Temp: 39C\n[ZEPC] 14:31:44 Status=1 Target=0W Deficit=145W NewSetpoint=600W'
    }
  },
  {
    endpoint: '/api/live',
    baseUrl: 'http://ahoydtu.local (192.168.0.101)',
    method: 'GET',
    responseFormat: 'application/json',
    lastSuccessfulAccess: 'Vor 4.2s',
    responseTimeMs: 28,
    status: '200 OK',
    description: 'Live-Werte aller 4 Solarkanäle und AC-Ausgangsdaten des Hoymiles HM-1500 Wechselrichters.',
    usedFields: ['ch0/P_AC', 'ch0/U_AC', 'ch1/P_DC', 'ch2/P_DC', 'ch3/P_DC', 'ch4/P_DC', 'temp'],
    exampleResponse: {
      inverter: [
        {
          name: 'HM-1500',
          enabled: true,
          reachable: true,
          p_ac: 960.2,
          u_ac: 231.5,
          f_ac: 50.02,
          temp: 38.5,
          yield_day: 4820,
          channels: [
            { ch: 1, u_dc: 33.4, i_dc: 7.2, p_dc: 240.5 },
            { ch: 2, u_dc: 33.1, i_dc: 7.1, p_dc: 235.0 },
            { ch: 3, u_dc: 33.6, i_dc: 7.3, p_dc: 245.3 },
            { ch: 4, u_dc: 33.0, i_dc: 7.3, p_dc: 240.9 }
          ]
        }
      ]
    }
  },
  {
    endpoint: '/rpc/EM.GetStatus?id=0',
    baseUrl: 'http://192.168.0.100',
    method: 'GET',
    responseFormat: 'application/json',
    lastSuccessfulAccess: 'Vor 0.9s',
    responseTimeMs: 8,
    status: '200 OK',
    description: 'Offizieller Shelly Gen2 RPC Endpunkt für 3-Phasen Energiemessung (L1, L2, L3).',
    usedFields: ['a_act_power', 'b_act_power', 'c_act_power', 'total_act_power', 'a_voltage', 'b_voltage', 'c_voltage'],
    exampleResponse: {
      id: 0,
      a_current: 1.152,
      a_voltage: 231.2,
      a_act_power: 180.4,
      b_current: 0.851,
      b_voltage: 230.8,
      b_act_power: -95.2,
      c_current: 0.623,
      c_voltage: 232.0,
      c_act_power: 60.1,
      total_act_power: 145.3
    }
  },
  {
    endpoint: '/app/',
    baseUrl: 'http://venus.local (192.168.0.111)',
    method: 'GET',
    responseFormat: 'text/html + WebSockets',
    lastSuccessfulAccess: 'Vor 12.0s',
    responseTimeMs: 22,
    status: '200 OK',
    description: 'Victron Venus OS HTML5 Remote Console Schnittstelle & MQTT Broker Anbindung.',
    usedFields: ['Victron D-Bus Topics', 'MPPT Charger State', 'Battery State'],
    exampleResponse: {
      status: 'Victron Remote Console Active',
      services: ['com.victronenergy.solarcharger.ttyUSB0', 'com.victronenergy.battery.ttyUSB1']
    }
  }
];

export const INITIAL_CHANGELOG: ChangeLogEntry[] = [
  {
    id: 'chg-006',
    timestamp: '2026-10-21 21:55:00',
    device: 'Dokumentation & Anlagenschema',
    parameter: 'HANDBÜCHER & WIRING UNLIMITED',
    oldValue: '2 Handbücher hinterlegt',
    newValue: '4 Handbücher + 5 Verkabelungspläne',
    source: 'Web-UI',
    detectionType: 'manuell',
    userNotes: 'Power Queen 25.6V 100Ah Anleitung & Victron Wiring Unlimited (Margreet Leeftink rev03) mit interaktivem Kabel- und Schutzrechner integriert.'
  },
  {
    id: 'chg-001',
    timestamp: '2026-09-14 11:20:15',
    device: 'Trucki / Sun 2000',
    parameter: 'POWERLIMIT',
    oldValue: '400 W',
    newValue: '600 W',
    source: 'MQTT',
    detectionType: 'automatisch',
    userNotes: 'Erhöhung für Nachmittags-Grundlastabdeckung bei Bewölkung.'
  },
  {
    id: 'chg-002',
    timestamp: '2026-09-12 16:45:00',
    device: 'AhoyDTU / Hoymiles HM-1500',
    parameter: 'ACTIVE_LIMIT_PERCENT',
    oldValue: '80 % (1200W)',
    newValue: '100 % (1500W)',
    source: 'Web-UI',
    detectionType: 'automatisch',
    userNotes: 'Volle Freigabe nach Wechselstromkabel-Inspektion.'
  },
  {
    id: 'chg-003',
    timestamp: '2026-09-08 09:14:22',
    device: 'Shelly Pro 3EM',
    parameter: 'FIRMWARE_VERSION',
    oldValue: 'v1.3.8',
    newValue: 'v1.4.2',
    source: 'Automatisch',
    detectionType: 'automatisch',
    userNotes: 'Reguläres Sicherheitsupdate eingespielt.'
  },
  {
    id: 'chg-004',
    timestamp: '2026-09-02 18:30:10',
    device: 'Trucki / Sun 2000',
    parameter: 'POWERLIMIT',
    oldValue: '300 W',
    newValue: '400 W',
    source: 'MQTT',
    detectionType: 'automatisch'
  },
  {
    id: 'chg-005',
    timestamp: '2026-08-28 14:10:00',
    device: 'Trucki / Sun 2000',
    parameter: 'POWERLIMIT',
    oldValue: '200 W',
    newValue: '300 W',
    source: 'MQTT',
    detectionType: 'automatisch'
  }
];

export const INITIAL_MAINTENANCE: MaintenanceEntry[] = [
  {
    id: 'mnt-001',
    date: '2026-09-10 17:42:00',
    device: 'AhoyDTU / Hoymiles',
    type: 'auto',
    task: 'Hoymiles Wechselrichter Verbindung getrennt',
    description: 'Dämmerungsabschaltung des Wechselrichters bei DC-Spannung < 16V erkannt. Regulärer Offline-Zustand über Nacht.',
    result: 'Behoben',
    technician: 'System Auto-Monitor',
    notes: 'Automatische Re-Initialisierung am nächsten Morgen um 06:14 Uhr erfolgreich.'
  },
  {
    id: 'mnt-002',
    date: '2026-09-08 14:05:12',
    device: 'Shelly Pro 3EM',
    type: 'auto',
    task: 'Firmwareänderung erkannt',
    description: 'Neue Firmware Version v1.4.2 auf dem Gerät 192.168.0.100 registriert.',
    result: 'Erfolgreich',
    technician: 'System Auto-Monitor',
    notes: 'Keine Unterbrechung der MQTT-Telemetrie.'
  },
  {
    id: 'mnt-003',
    date: '2026-09-05 21:18:04',
    device: 'Mosquitto MQTT Broker',
    type: 'auto',
    task: 'MQTT-Verbindung unterbrochen',
    description: 'Proxmox Backup-Window erzeugte 4.2s I/O Freeze auf CT 102. Heartbeat verpasst, danach automatische Wiederverbindung aller Clients.',
    result: 'Behoben',
    technician: 'System Auto-Monitor',
    notes: 'Keine Daten verloren, InfluxDB Buffer hat zwischengespeichert.'
  },
  {
    id: 'mnt-004',
    date: '2026-09-04 08:33:17',
    device: 'AhoyDTU',
    type: 'auto',
    task: 'AhoyDTU 17 Minuten offline',
    description: 'WLAN-Roaming Event im 2.4GHz Netz. DTU hat nach 17 Min neuen AP 192.168.0.2 erfolgreich assoziiert.',
    result: 'Behoben',
    technician: 'System Auto-Monitor',
    notes: 'RSSI jetzt bei stabilen -58 dBm.'
  },
  {
    id: 'mnt-005',
    date: '2026-08-25 10:00:00',
    device: '48V LiFePO4 Speicher (6x Power Queen)',
    type: 'manual',
    task: 'Zellspannungs- und Drehmomentprüfung',
    description: 'Kontrolle aller 16 M8 Polschrauben mit Drehmomentschlüssel (8 Nm). Balancer-Kabel auf Scheuerstellen geprüft.',
    result: 'Erfolgreich',
    technician: 'Betreiber (Haucky)',
    notes: 'Zellendrift unter Volllast 56.4V bei nur 4 mV. Keine lockeren Klemmen.'
  }
];

export const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-001',
    title: 'Dynamische Nulleinspeisung (Zero-Export)',
    trigger: 'Shelly Pro 3EM total_act_power Event (> 30W Bezug)',
    condition: 'Batterie SoC > 20% UND Trucki < 1200W',
    action: 'Trucki Powerlimit = Math.min(1200, current_limit + grid_deficit)',
    isActive: true,
    lastTriggered: 'Vor 1 Sekunde'
  },
  {
    id: 'rule-002',
    title: 'LiFePO4 Tiefentladeschutz (Not-Stop)',
    trigger: 'Batteriespannung < 47.0V ODER SoC < 15%',
    condition: 'Trucki Inverter aktiv',
    action: 'Trucki Powerlimit = 0W & Alarm im Sci-Fi HUD',
    isActive: true,
    lastTriggered: 'Nie (Schutzschwellen sicher)'
  },
  {
    id: 'rule-003',
    title: 'Hoymiles Peak Shaving bei PV Überschuss',
    trigger: 'Netzeinspeisung < -600W (dauerhaft > 5 Min)',
    condition: 'Batterie bereits bei 100% SoC',
    action: 'AhoyDTU Power Limit schrittweise auf 70% reduzieren',
    isActive: false,
    lastTriggered: 'Gestern 13:40'
  }
];
