export type DeviceStatus = 'online' | 'offline' | 'degraded' | 'warning';

export type FirmwareStatus = 
  | 'Aktuell' 
  | 'Änderung erkannt' 
  | 'Prüfung nicht möglich' 
  | 'Unbekannt';

export interface SolarTelemetry {
  timestamp: string;
  // PV Erzeugung
  pvTotalWatts: number;
  pvHoymilesWatts: number;
  pvVictronMppt1Watts: number;
  pvVictronMppt2Watts: number;
  pvDailyYieldKwh: number;
  
  // Hoymiles Detail
  hoymilesLimitPercent: number;
  hoymilesLimitWatts: number;
  hoymilesChannels: {
    channel: number;
    voltage: number;
    current: number;
    power: number;
  }[];
  hoymilesTempC: number;

  // Netz (Shelly Pro 3EM)
  gridTotalWatts: number; // > 0 = Bezug, < 0 = Einspeisung
  gridMode: 'Bezug' | 'Einspeisung' | 'Ausgeglichen';
  gridPhases: {
    phase: 'L1' | 'L2' | 'L3';
    voltage: number;
    current: number;
    activePower: number;
    powerFactor: number;
    frequency: number;
  }[];
  gridDailyImportKwh: number;
  gridDailyExportKwh: number;

  // Batterie & Trucki (48V LiFePO4 + Sun2000)
  batterySocPercent: number;
  batteryVoltage: number;
  batteryCurrent: number; // >0 laden, <0 entladen
  batteryWatts: number;   // >0 geladen, <0 entladen ins Haus
  batteryTempC: number;
  batteryHealthPercent: number;
  batteryCycles: number;
  batteryCellVoltages: number[]; // e.g. 16 cells in series or 4S/16S
  batteryDailyChargedKwh: number;
  batteryDailyDischargedKwh: number;
  
  // Trucki AC Gateway
  truckiPowerLimitWatts: number;
  truckiActualOutputWatts: number;
  truckiZeroExportEnabled: boolean;
  truckiStatus: 'NORMAL' | 'STANDBY' | 'LIMITING' | 'FAULT';

  // Hausverbrauch
  houseTotalWatts: number;
  houseDailyKwh: number;

  // KPIs
  autarkyPercent: number;
  selfConsumptionPercent: number;
}

export interface EnergyNode {
  id: string;
  name: string;
  type: 'pv' | 'battery' | 'grid' | 'house' | 'inverter';
  watts: number;
  status: 'active' | 'idle' | 'standby';
  details: string;
}

export interface DeviceInventoryItem {
  id: string;
  name: string;
  category: 'Netz' | 'PV' | 'Batterie / AC-System' | 'MPPT' | 'Venus OS' | 'Infrastruktur';
  vendor: string;
  model: string;
  serialNumber?: string;
  ip: string;
  mac: string;
  hostname: string;
  status: DeviceStatus;
  firmwareVersion: string;
  firmwareStatus: FirmwareStatus;
  lastChecked: string;
  hardwareSpecs: string;
  services: string[];
  mqttTopics: string[];
  apiEndpoints: string[];
  location: string;
  operatingLimits: {
    parameter: string;
    value: string;
    unit: string;
    description: string;
  }[];
  isIstZustand: boolean;
  notes?: string;
}

export interface NetworkHost {
  ip: string;
  port?: number;
  name: string;
  deviceCategory: string;
  services: string[];
  status: 'Online' | 'Offline' | 'Prüfung';
  latencyMs: number;
  mac: string;
}

export interface DiscoveredDevice {
  ip: string;
  mac: string;
  hostname: string;
  services: string[];
  timestamp: string;
  suggestedName: string;
  suggestedCategory: 'Netz' | 'PV' | 'Batterie / AC-System' | 'MPPT' | 'Venus OS' | 'Infrastruktur';
}

export interface MqttTopicDoc {
  topic: string;
  dataType: string;
  source: string;
  frequency: string;
  lastSeen: string;
  consumers: string[];
  samplePayload: Record<string, any>;
  fields: {
    field: string;
    type: string;
    unit: string;
    example: string | number;
    description: string;
  }[];
}

export interface ApiDoc {
  endpoint: string;
  baseUrl: string;
  method: 'GET' | 'POST' | 'PUT';
  responseFormat: string;
  lastSuccessfulAccess: string;
  responseTimeMs: number;
  status: '200 OK' | 'Error' | 'Pending';
  description: string;
  usedFields: string[];
  exampleResponse: Record<string, any>;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  device: string;
  parameter: string;
  oldValue: string;
  newValue: string;
  source: 'MQTT' | 'API' | 'Web-UI' | 'Automatisch';
  detectionType: 'automatisch' | 'manuell';
  userNotes?: string;
}

export interface MaintenanceEntry {
  id: string;
  date: string;
  device: string;
  type: 'auto' | 'manual';
  task: string;
  description: string;
  result: 'Erfolgreich' | 'Warnung' | 'Behoben' | 'Fehlgeschlagen';
  technician: string;
  notes?: string;
}

export interface ValueProvenance {
  metricLabel: string;
  currentValue: string;
  path: {
    step: number;
    layer: 'Sensor / Messfühler' | 'Gerät / Hardware' | 'Protokoll / Bus' | 'MQTT Topic / API' | 'Datenbank' | 'Visualisierung';
    name: string;
    details: string;
    payloadSnippet?: string;
  }[];
  explanationWhy: {
    reason: string;
    checks: { check: string; status: 'ok' | 'warning' | 'info'; note: string }[];
  };
}

export interface AutomationRule {
  id: string;
  title: string;
  trigger: string;
  condition: string;
  action: string;
  isActive: boolean;
  lastTriggered?: string;
}
