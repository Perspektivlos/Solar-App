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
  houseTotalWatts: 963, // 1420 PV + (-602 Bat) -> PV lädt 458W in Bat? Oder PV speist direkt + Bat Entladung.
  houseDailyKwh: 7.92,

  // KPIs
  autarkyPercent: 88.4,
  selfConsumptionPercent: 94.2,
};

export const INITIAL_DEVICES: DeviceInventoryItem[] = [
  {
    id: 'shelly-pro-3em',
    name: 'Shelly Pro 3EM (Haupteinspeisung)',
    category: 'Netz',
    vendor: 'Allterco / Shelly',
    model: 'Pro 3EM',
    serialNumber: '34945474D90C',
    ip: '192.168.0.100',
    mac: '34:94:54:74:d9:0c',
    hostname: 'shellypro3em-main.lan',
    status: 'online',
    firmwareVersion: 'v1.4.2',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:30:12',
    hardwareSpecs: 'DIN-Schiene, 3x 120A Wandlerklemmen, LAN + WLAN, Dual-Core ESP32',
    services: ['HTTP', 'MQTT', 'RPC WebSockets', 'mDNS'],
    mqttTopics: [
      'venus/grid/shellypro/status/em:0',
      'venus/grid/shellypro/status/emdata:0',
      'shellypro3em/events/rpc'
    ],
    apiEndpoints: [
      'http://192.168.0.100/rpc/EM.GetStatus?id=0',
      'http://192.168.0.100/rpc/Shelly.GetDeviceInfo'
    ],
    location: 'Hauptverteilung / Zählerschrank Feld 2',
    operatingLimits: [
      { parameter: 'Max. Dauerstrom', value: '120', unit: 'A', description: 'Messgrenze Stromwandler' },
      { parameter: 'Spannungsbereich', value: '110 - 240', unit: 'V AC', description: 'Toleranzbereich' },
      { parameter: 'Update-Intervall', value: '1.0', unit: 's', description: 'MQTT Push Rate' }
    ],
    isIstZustand: true,
    notes: 'Erfasst phasenbezogenen Netzbezug und Rückspeisung für dynamische Trucki-Nulleinspeisung.'
  },
  {
    id: 'hoymiles-ahoy',
    name: 'AhoyDTU & Hoymiles HM-1500',
    category: 'PV',
    vendor: 'Hoymiles / AhoyDTU OpenSource',
    model: 'HM-1500 (via ESP32 + NRF24L01+)',
    serialNumber: '116182104592',
    ip: '192.168.0.101',
    mac: '24:6f:28:90:31:ec',
    hostname: 'ahoy-dtu.lan',
    status: 'online',
    firmwareVersion: 'v0.8.83',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:00',
    hardwareSpecs: '4x MPPT Inputs (je 2 Strings parallel), 1500W AC Peak, Funk 2.4GHz RF',
    services: ['HTTP Web-UI', 'MQTT', 'REST API', 'Syslog'],
    mqttTopics: [
      'venus/pv/ahoydtu/HM1500/ch0/P_AC',
      'venus/pv/ahoydtu/HM1500/ch0/U_AC',
      'venus/pv/ahoydtu/HM1500/ch1/P_DC',
      'venus/pv/ahoydtu/HM1500/status'
    ],
    apiEndpoints: [
      'http://192.168.0.101/api/live',
      'http://192.168.0.101/api/ctrl'
    ],
    location: 'Garage Süddach / Unterverteilung PV',
    operatingLimits: [
      { parameter: 'Max AC Leistung', value: '1500', unit: 'W', description: 'Nennleistung des HM-1500' },
      { parameter: 'Aktuelles Limit', value: '100', unit: '%', description: 'Per AhoyDTU gedrosselt/freigegeben' },
      { parameter: 'Max DC Spannung', value: '60', unit: 'V', description: 'Leerlaufspannung Schutzgrenze' }
    ],
    isIstZustand: true,
    notes: 'Dachausrichtung Süd-West. 4 Module à 420Wp (Trina Solar Vertex S).'
  },
  {
    id: 'trucki-sun2000',
    name: 'Trucki2Shelly Gateway & Sun 2000',
    category: 'Batterie / AC-System',
    vendor: 'Trucki.eu / Lumentree',
    model: 'Trucki 2 Shelly v1.08b + Sun-2000GTIL2-WAL',
    serialNumber: 'TRK-582910-A',
    ip: '192.168.0.102',
    mac: 'a4:cf:12:87:66:b4',
    hostname: 'trucki-gateway.lan',
    status: 'online',
    firmwareVersion: 'v1.08b',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:31:45',
    hardwareSpecs: 'ESP8266 Steuerung, RS485 Interface zu Sun-2000 Inverter, 48V DC Input',
    services: ['HTTP', 'MQTT', 'JSON REST Live'],
    mqttTopics: [
      'Trucki/status/power_limit',
      'Trucki/status/actual_ac',
      'Trucki/cmd/power_limit',
      'Trucki/tele/LIVE'
    ],
    apiEndpoints: [
      'http://192.168.0.102/jsonlive',
      'http://192.168.0.102/setlimit?val=600'
    ],
    location: 'Technikraum Keller / Batteriewand',
    operatingLimits: [
      { parameter: 'Max Inverter Output', value: '1800', unit: 'W', description: 'Hard Limit Sun-2000' },
      { parameter: 'Aktuelles Regellimit', value: '600', unit: 'W', description: 'Regelung auf Nulleinspeisung' },
      { parameter: 'Cutoff Spannung', value: '46.0', unit: 'V', description: 'Tiefentladeschutz Not-Aus' }
    ],
    isIstZustand: true,
    notes: 'Speist dynamisch Strom aus dem 48V LiFePO4 Akku ein, um den Shelly-Netzbezug auf ~0W zu halten.'
  },
  {
    id: 'lifepo4-battery-bank',
    name: '48V LiFePO4 Speicher (6x Power Queen 100Ah)',
    category: 'Batterie / AC-System',
    vendor: 'Power Queen / JK-BMS',
    model: '6x 12.8V 100Ah (16S 48V 300Ah / 15.36 kWh)',
    serialNumber: 'PQ-2024-B16S',
    ip: '192.168.0.103',
    mac: 'cc:50:e3:19:4a:22',
    hostname: 'jkbms-lifepo4.lan',
    status: 'online',
    firmwareVersion: 'v15.30',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:10',
    hardwareSpecs: '16S LiFePO4, 300A Smart Active Balance BMS (2A Balancer), 15.36 kWh Gesamtkapazität',
    services: ['BLE', 'RS485', 'MQTT via ESPHome Bridge'],
    mqttTopics: [
      'venus/battery/lifepo4/soc',
      'venus/battery/lifepo4/voltage',
      'venus/battery/lifepo4/current',
      'venus/battery/lifepo4/cell_deltas'
    ],
    apiEndpoints: [
      'http://192.168.0.103/metrics'
    ],
    location: 'Technikraum Keller / Gestell A',
    operatingLimits: [
      { parameter: 'Nennspannung', value: '51.2', unit: 'V', description: '16x 3.2V' },
      { parameter: 'Ladeschluss', value: '56.8', unit: 'V', description: '3.55V / Zelle' },
      { parameter: 'Entladeschluss', value: '46.4', unit: 'V', description: '2.90V / Zelle' },
      { parameter: 'Max Entladestrom', value: '150', unit: 'A', description: 'Dauerbelastung' }
    ],
    isIstZustand: true,
    notes: 'Ausgezeichnete Zellbalance (< 5mV Zellendrift). Schutzschalter 200A DC verbaut.'
  },
  {
    id: 'victron-venusos',
    name: 'Venus OS auf Raspberry Pi 3B',
    category: 'Venus OS',
    vendor: 'Victron Energy / Raspberry Pi',
    model: 'Raspberry Pi 3 Model B Rev 1.2 (Venus OS v3.30)',
    serialNumber: 'RPi3B-00000000a22082',
    ip: '192.168.0.111',
    mac: 'b8:27:eb:d4:aa:81',
    hostname: 'venus.local',
    status: 'online',
    firmwareVersion: 'v3.30',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:40',
    hardwareSpecs: 'Quad-Core BCM2837, 1GB RAM, 2x VE.Direct USB-Kabel, D-Bus System',
    services: ['HTTP Remote Console', 'MQTT', 'SSH (Port 22)', 'Modbus-TCP (Port 502)'],
    mqttTopics: [
      'N/d4aa81/system/0/Dc/Battery/Soc',
      'N/d4aa81/solarcharger/288/Pv/V',
      'N/d4aa81/solarcharger/289/Pv/V'
    ],
    apiEndpoints: [
      'http://192.168.0.111/app/',
      'http://192.168.0.111:502'
    ],
    location: 'Technikraum Keller / Schaltschrank Kleinverteiler',
    operatingLimits: [
      { parameter: 'CPU Auslastung', value: '14', unit: '%', description: 'Ressourcenschonend' },
      { parameter: 'RAM Nutzung', value: '342', unit: 'MB', description: 'von 1024 MB' }
    ],
    isIstZustand: true,
    notes: 'Verbindet die beiden Victron SmartSolar MPPTs und publisht alle PV- & Batteriedaten auf MQTT.'
  },
  {
    id: 'victron-mppt-1',
    name: 'Victron SmartSolar MPPT 150/35 #1 (Ost)',
    category: 'MPPT',
    vendor: 'Victron Energy',
    model: 'SmartSolar MPPT 150/35',
    serialNumber: 'HQ2144ABCD1',
    ip: '192.168.0.111', // via VenusOS USB
    mac: '00:1B:C5:09:41:01',
    hostname: 'mppt-east.venus',
    status: 'online',
    firmwareVersion: 'v1.61',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:40',
    hardwareSpecs: '150V Max PV, 35A Max Laderate, VE.Direct Port',
    services: ['VE.Direct to USB', 'Bluetooth Smart'],
    mqttTopics: [
      'N/d4aa81/solarcharger/288/Yield/Power',
      'N/d4aa81/solarcharger/288/State',
      'N/d4aa81/solarcharger/288/Dc/0/Current'
    ],
    apiEndpoints: [],
    location: 'Technikraum Wandmontage',
    operatingLimits: [
      { parameter: 'Max PV Spannung', value: '150', unit: 'V', description: 'Voc Sicherheitsgrenze' },
      { parameter: 'Max Ladestrom', value: '35', unit: 'A', description: 'Batterieseitig' }
    ],
    isIstZustand: true,
    notes: 'Angeschlossen an Ost-Feld (2x 410Wp Module in Serie).'
  },
  {
    id: 'victron-mppt-2',
    name: 'Victron SmartSolar MPPT 150/35 #2 (West)',
    category: 'MPPT',
    vendor: 'Victron Energy',
    model: 'SmartSolar MPPT 150/35',
    serialNumber: 'HQ2144ABCD2',
    ip: '192.168.0.111',
    mac: '00:1B:C5:09:41:02',
    hostname: 'mppt-west.venus',
    status: 'online',
    firmwareVersion: 'v1.61',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:40',
    hardwareSpecs: '150V Max PV, 35A Max Laderate, VE.Direct Port',
    services: ['VE.Direct to USB', 'Bluetooth Smart'],
    mqttTopics: [
      'N/d4aa81/solarcharger/289/Yield/Power',
      'N/d4aa81/solarcharger/289/State',
      'N/d4aa81/solarcharger/289/Dc/0/Current'
    ],
    apiEndpoints: [],
    location: 'Technikraum Wandmontage',
    operatingLimits: [
      { parameter: 'Max PV Spannung', value: '150', unit: 'V', description: 'Voc Sicherheitsgrenze' },
      { parameter: 'Max Ladestrom', value: '35', unit: 'A', description: 'Batterieseitig' }
    ],
    isIstZustand: true,
    notes: 'Angeschlossen an West-Feld (2x 410Wp Module in Serie).'
  },
  {
    id: 'proxmox-host',
    name: 'Proxmox VE 8 Hypervisor Node (LXC Host)',
    category: 'Infrastruktur',
    vendor: 'Proxmox Server Solutions',
    model: 'Intel N100 Mini-PC (16GB DDR5, 512GB NVMe)',
    serialNumber: 'PVE-MINI-01',
    ip: '192.168.0.200',
    mac: 'e8:9c:25:31:aa:99',
    hostname: 'pve-solar-node.lan',
    status: 'online',
    firmwareVersion: 'pve-manager/8.2.4',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:00',
    hardwareSpecs: '4 Kerne @ 3.4GHz, 16GB RAM, 2.5 GbE LAN, 12W Idle Stromverbrauch',
    services: ['HTTPS Web-UI (Port 8006)', 'SSH (Port 22)', 'Proxmox VE API'],
    mqttTopics: [],
    apiEndpoints: [
      'https://192.168.0.200:8006/api2/json/nodes/pve/status'
    ],
    location: '10" Serverschrank Flur',
    operatingLimits: [
      { parameter: 'Max Host Load', value: '80', unit: '%', description: 'Überwachungsgrenze' },
      { parameter: 'RAM Auslastung', value: '4.2', unit: 'GB', description: 'von 16 GB belegt' }
    ],
    isIstZustand: true,
    notes: 'Hostet LXC Container für Mosquitto, InfluxDB, Grafana und die Solar-Lokal-App.'
  },
  {
    id: 'mosquitto-broker',
    name: 'Mosquitto MQTT Broker (ACL-Hardened)',
    category: 'Infrastruktur',
    vendor: 'Eclipse Mosquitto',
    model: 'Mosquitto 2.0.18 on Debian 12 LXC',
    serialNumber: 'CT-102-MQTT',
    ip: '192.168.0.201',
    mac: 'bc:24:11:80:44:01',
    hostname: 'mqtt.solar.lan',
    status: 'online',
    firmwareVersion: 'v2.0.18',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:45',
    hardwareSpecs: '1 Core, 512MB RAM, Alpine/Debian LXC (CT 102)',
    services: ['MQTT (Port 1883)', 'MQTT over WebSockets (Port 9001)'],
    mqttTopics: [
      '$SYS/broker/messages/received',
      '$SYS/broker/clients/connected'
    ],
    apiEndpoints: [],
    location: 'Proxmox CT 102',
    operatingLimits: [
      { parameter: 'Max Verbindungen', value: '100', unit: 'Clients', description: 'ACL gesichert' },
      { parameter: 'ACL Status', value: 'Enforced', unit: '', description: 'Keine anonymen Logins' }
    ],
    isIstZustand: true,
    notes: 'Dedizierte User für shelly, ahoy, trucki, venus und grafana mit strikten Topic-ACLs.'
  },
  {
    id: 'grafana-dashboard',
    name: 'Grafana Telemetrie Visualisierung',
    category: 'Infrastruktur',
    vendor: 'Grafana Labs',
    model: 'Grafana Enterprise v11.1.0',
    serialNumber: 'CT-103-GRAF',
    ip: '192.168.0.202',
    mac: 'bc:24:11:80:44:02',
    hostname: 'grafana.solar.lan',
    status: 'online',
    firmwareVersion: 'v11.1.0',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:45',
    hardwareSpecs: '2 Cores, 2GB RAM, Debian 12 LXC (CT 103)',
    services: ['HTTP (Port 3000)', 'Grafana Dashboard API'],
    mqttTopics: [],
    apiEndpoints: [
      'http://192.168.0.202:3000/api/health'
    ],
    location: 'Proxmox CT 103',
    operatingLimits: [],
    isIstZustand: true,
    notes: 'Beinhaltet Dashboards: "Solar Sci-Fi Master HUD", "Batterie-Zellendiagnose" und "Netz-Phasenschiefe".'
  },
  {
    id: 'influxdb-time-series',
    name: 'InfluxDB v2 Time-Series Engine',
    category: 'Infrastruktur',
    vendor: 'InfluxData',
    model: 'InfluxDB v2.7.6',
    serialNumber: 'CT-104-INFLUX',
    ip: '192.168.0.203',
    mac: 'bc:24:11:80:44:03',
    hostname: 'influxdb.solar.lan',
    status: 'online',
    firmwareVersion: 'v2.7.6',
    firmwareStatus: 'Aktuell',
    lastChecked: '2026-09-14 14:32:45',
    hardwareSpecs: '2 Cores, 4GB RAM, NVMe Storage für TSM-Engine, Bucket: "solar_home"',
    services: ['HTTP REST (Port 8086)', 'Flux Engine'],
    mqttTopics: [],
    apiEndpoints: [
      'http://192.168.0.203:8086/health'
    ],
    location: 'Proxmox CT 104',
    operatingLimits: [
      { parameter: 'Retention Policy', value: '365', unit: 'Tage', description: 'Hochauflösend (1s - 10s)' },
      { parameter: 'Downsampling Bucket', value: 'Infinite', unit: '', description: 'Stundenmittelwerte unbegrenzt' }
    ],
    isIstZustand: true,
    notes: 'Speichert alle Telemetriedaten sekündlich ab. Telegraf schreibt MQTT-Topics direkt in Influx.'
  }
];

export const INITIAL_NETWORK_HOSTS: NetworkHost[] = [
  { ip: '192.168.0.100', port: 80, name: 'Shelly Pro 3EM', deviceCategory: 'Netz / Zähler', services: ['HTTP', 'MQTT', 'RPC'], status: 'Online', latencyMs: 1.2, mac: '34:94:54:74:d9:0c' },
  { ip: '192.168.0.101', port: 80, name: 'AhoyDTU (Hoymiles HM-1500)', deviceCategory: 'PV Wechselrichter', services: ['HTTP', 'MQTT', 'REST API'], status: 'Online', latencyMs: 4.8, mac: '24:6f:28:90:31:ec' },
  { ip: '192.168.0.102', port: 80, name: 'Trucki 2 Shelly Gateway', deviceCategory: 'Batterie / Inverter', services: ['HTTP', 'MQTT', 'JSON Live'], status: 'Online', latencyMs: 2.1, mac: 'a4:cf:12:87:66:b4' },
  { ip: '192.168.0.103', port: 80, name: 'JK-BMS LiFePO4 Bridge', deviceCategory: 'Batteriemanagement', services: ['HTTP', 'MQTT'], status: 'Online', latencyMs: 3.4, mac: 'cc:50:e3:19:4a:22' },
  { ip: '192.168.0.111', port: 80, name: 'Venus OS (Victron RPi 3B)', deviceCategory: 'MPPT Steuerung', services: ['HTTP', 'MQTT', 'SSH:22', 'Modbus:502'], status: 'Online', latencyMs: 1.6, mac: 'b8:27:eb:d4:aa:81' },
  { ip: '192.168.0.200', port: 8006, name: 'Proxmox VE 8 Hypervisor', deviceCategory: 'Server Host', services: ['HTTPS', 'Web GUI', 'SSH:22'], status: 'Online', latencyMs: 0.4, mac: 'e8:9c:25:31:aa:99' },
  { ip: '192.168.0.201', port: 1883, name: 'Mosquitto MQTT Broker', deviceCategory: 'MQTT Broker', services: ['MQTT:1883', 'WS:9001'], status: 'Online', latencyMs: 0.3, mac: 'bc:24:11:80:44:01' },
  { ip: '192.168.0.202', port: 3000, name: 'Grafana Dashboard Node', deviceCategory: 'Visualisierung', services: ['HTTP:3000', 'API'], status: 'Online', latencyMs: 0.5, mac: 'bc:24:11:80:44:02' },
  { ip: '192.168.0.203', port: 8086, name: 'InfluxDB v2 Zeitreihen-DB', deviceCategory: 'Datenbank', services: ['HTTP:8086', 'Flux API'], status: 'Online', latencyMs: 0.6, mac: 'bc:24:11:80:44:03' }
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
    topic: 'Trucki/status/LIVE',
    dataType: 'JSON Object',
    source: 'Trucki2Shelly Gateway (192.168.0.102)',
    frequency: '~1.0 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'InfluxDB'],
    samplePayload: {
      power_limit: 600,
      actual_power: 595,
      target_shelly_p: 0,
      mode: 'DYNAMIC_ZERO_EXPORT',
      v_bat: 52.8,
      status: 'OK',
      throttle_reason: 'NONE'
    },
    fields: [
      { field: 'power_limit', type: 'number', unit: 'W', example: 600, description: 'Aktuell eingestelltes Maximum des Inverters' },
      { field: 'actual_power', type: 'number', unit: 'W', example: 595, description: 'Reale gemessene AC-Ausgangsleistung Sun-2000' },
      { field: 'target_shelly_p', type: 'number', unit: 'W', example: 0, description: 'Sollwert für den Netzbezug (0W = Nullausgleich)' },
      { field: 'mode', type: 'string', unit: '—', example: 'DYNAMIC_ZERO_EXPORT', description: 'Aktiver Regelmodus' },
      { field: 'v_bat', type: 'number', unit: 'V', example: 52.8, description: 'Eingangsspannung von der 48V Batterie' }
    ]
  },
  {
    topic: 'venus/battery/lifepo4/soc',
    dataType: 'JSON Object',
    source: 'JK-BMS ESP Bridge via VenusOS',
    frequency: '~2.0 s',
    lastSeen: 'Gerade eben',
    consumers: ['Solar-Lokal Core', 'Trucki Gateway', 'InfluxDB'],
    samplePayload: {
      soc: 78,
      voltage: 52.81,
      current: -11.4,
      power: -602.0,
      delta_cell_v: 0.005,
      min_cell_v: 3.301,
      max_cell_v: 3.306,
      temp_bms: 23.4,
      health: 99.4
    },
    fields: [
      { field: 'soc', type: 'number', unit: '%', example: 78, description: 'State of Charge der LiFePO4 Batterie' },
      { field: 'voltage', type: 'number', unit: 'V', example: 52.81, description: 'Gesamtspannung der 16 Zellen' },
      { field: 'current', type: 'number', unit: 'A', example: -11.4, description: 'Batteriestrom (>0 laden, <0 entladen)' },
      { field: 'delta_cell_v', type: 'number', unit: 'V', example: 0.005, description: 'Maximale Spannungsdifferenz zwischen den Zellen (Drift)' },
      { field: 'temp_bms', type: 'number', unit: '°C', example: 23.4, description: 'Temperatur des BMS & Sensorpacks' }
    ]
  }
];

export const INITIAL_API_DOCS: ApiDoc[] = [
  {
    endpoint: '/jsonlive',
    baseUrl: 'http://trucki.local (192.168.0.102)',
    method: 'GET',
    responseFormat: 'application/json',
    lastSuccessfulAccess: 'Vor 1.4s',
    responseTimeMs: 14,
    status: '200 OK',
    description: 'Echtzeit-Telemetrie und Reglerstatus des Trucki2Shelly Gateways für den Sun-2000 Inverter.',
    usedFields: ['power_limit', 'actual_power', 'v_bat', 'mode', 'status'],
    exampleResponse: {
      power_limit: 600,
      actual_power: 595,
      v_bat: 52.8,
      mode: 'ZERO_EXPORT',
      target: 0,
      status: 'OK',
      uptime_s: 483920
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
    baseUrl: 'http://shellypro3em.local (192.168.0.100)',
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
