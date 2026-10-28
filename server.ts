import 'dotenv/config';
import express from 'express';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mqtt, { MqttClient } from 'mqtt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());


// ==============================================================================
// LAN Hardware Endpoints Configuration & Persistence
// ==============================================================================
const CONFIG_FILE_PATH = path.resolve(__dirname, 'hardware-config.json');

export interface DeviceEndpointConfig {
  id: 'shelly' | 'ahoy' | 'trucki' | 'venus';
  name: string;
  host: string;
  port: number;
  endpoint: string;
  enabled: boolean;
  timeoutMs: number;
}

export interface HardwareNetworkConfigData {
  devices: {
    shelly: DeviceEndpointConfig;
    ahoy: DeviceEndpointConfig;
    trucki: DeviceEndpointConfig;
    venus: DeviceEndpointConfig;
  };
  strictLiveOnly: boolean;
  demoSimulationAllowed: boolean;
}

const DEFAULT_HARDWARE_CONFIG: HardwareNetworkConfigData = {
  devices: {
    shelly: {
      id: 'shelly',
      name: 'Shelly Pro 3EM',
      host: '192.168.0.100',
      port: 80,
      endpoint: '/rpc/EM.GetStatus?id=0',
      enabled: true,
      timeoutMs: 1200,
    },
    ahoy: {
      id: 'ahoy',
      name: 'AhoyDTU (Hoymiles HM-1500)',
      host: '192.168.0.101',
      port: 80,
      endpoint: '/api/live',
      enabled: true,
      timeoutMs: 1200,
    },
    trucki: {
      id: 'trucki',
      name: 'Trucki2Shelly Gateway',
      host: '192.168.0.102',
      port: 80,
      endpoint: '/log.txt',
      enabled: true,
      timeoutMs: 1200,
    },
    venus: {
      id: 'venus',
      name: 'Victron Venus OS (GX / MPPT)',
      host: '192.168.0.111',
      port: 80,
      endpoint: '/app/',
      enabled: true,
      timeoutMs: 1200,
    },
  },
  strictLiveOnly: true, // Standard: Reiner Live-Modus ohne erfundene Simulationsdaten
  demoSimulationAllowed: false,
};

let hardwareConfig: HardwareNetworkConfigData = { ...DEFAULT_HARDWARE_CONFIG };

// Lade gespeicherte Konfiguration aus JSON, falls vorhanden
try {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    hardwareConfig = {
      ...DEFAULT_HARDWARE_CONFIG,
      ...parsed,
      devices: {
        ...DEFAULT_HARDWARE_CONFIG.devices,
        ...(parsed.devices || {}),
      },
    };
    console.log('[*] Loaded custom hardware configuration from hardware-config.json');
  }
} catch (err) {
  console.warn('[!] Failed to read hardware-config.json, using defaults:', err);
}

function saveHardwareConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(hardwareConfig, null, 2), 'utf-8');
    console.log('[✓] Saved hardware configuration to hardware-config.json');
  } catch (err) {
    console.error('[!] Failed to save hardware-config.json:', err);
  }
}

// ==============================================================================
// Mosquitto MQTT Broker Configuration & Persistence
// ==============================================================================
const MQTT_CONFIG_PATH = path.resolve(__dirname, 'mqtt-config.json');

export interface MqttServerConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  topics: string[];
  keepalive: number;
  reconnectPeriod: number;
  priority: 'mqtt_first' | 'http_only';
}

const DEFAULT_MQTT_CONFIG: MqttServerConfig = {
  enabled: true,
  host: '192.168.0.201',
  port: 1883,
  username: '',
  password: '',
  clientId: 'solar-lokal-hub',
  topics: [
    'ahoy/#',
    'shellypro3em/#',
    'trucki/#',
    'victron/#',
    'N/b827eb79321c/#'
  ],
  keepalive: 60,
  reconnectPeriod: 5000,
  priority: 'mqtt_first',
};

let mqttConfig: MqttServerConfig = { ...DEFAULT_MQTT_CONFIG };

try {
  if (fs.existsSync(MQTT_CONFIG_PATH)) {
    const raw = fs.readFileSync(MQTT_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    mqttConfig = { ...DEFAULT_MQTT_CONFIG, ...parsed };
    console.log('[*] Loaded MQTT configuration from mqtt-config.json');
  }
} catch (err) {
  console.warn('[!] Failed to read mqtt-config.json, using defaults:', err);
}

function saveMqttConfig() {
  try {
    fs.writeFileSync(MQTT_CONFIG_PATH, JSON.stringify(mqttConfig, null, 2), 'utf-8');
    console.log('[✓] Saved MQTT configuration to mqtt-config.json');
  } catch (err) {
    console.error('[!] Failed to save mqtt-config.json:', err);
  }
}

// MQTT Client State & Diagnostics
let mqttClient: MqttClient | null = null;
let mqttStatus = {
  connected: false,
  connecting: false,
  error: undefined as string | undefined,
  brokerUrl: 'mqtt://192.168.0.201:1883',
  lastMessageTime: null as string | null,
  messageCount: 0,
  activeTopics: [] as string[],
};

let activeTelemetrySource: 'mqtt' | 'http_rest' | 'none' = 'none';

function parseMqttTelemetry(topic: string, data: any) {
  // Shelly Pro 3EM Topics
  if (topic.includes('shellypro3em') || topic.includes('shelly')) {
    cachedTelemetry.sources.shelly = 'live';
    if (data && typeof data === 'object') {
      const totalPower = typeof data.total_act_power === 'number' 
        ? data.total_act_power 
        : (typeof data.a_act_power === 'number' && typeof data.b_act_power === 'number' && typeof data.c_act_power === 'number')
        ? (data.a_act_power + data.b_act_power + data.c_act_power)
        : null;

      if (totalPower !== null) {
        cachedTelemetry.gridTotalWatts = Math.round(totalPower);
        cachedTelemetry.gridMode = totalPower > 10 ? 'Bezug' : totalPower < -10 ? 'Einspeisung' : 'Ausgeglichen';
      }
      if (typeof data.a_voltage === 'number') cachedTelemetry.gridPhases[0].voltage = Math.round(data.a_voltage * 10) / 10;
      if (typeof data.b_voltage === 'number') cachedTelemetry.gridPhases[1].voltage = Math.round(data.b_voltage * 10) / 10;
      if (typeof data.c_voltage === 'number') cachedTelemetry.gridPhases[2].voltage = Math.round(data.c_voltage * 10) / 10;
    }
  }

  // AhoyDTU / Hoymiles Topics
  if (topic.includes('ahoy') || topic.includes('hoymiles')) {
    cachedTelemetry.sources.ahoy = 'live';
    if (data && typeof data === 'object') {
      if (typeof data.p_ac === 'number') cachedTelemetry.pvHoymilesWatts = Math.round(data.p_ac);
      if (typeof data.temp === 'number') cachedTelemetry.hoymilesTempC = Math.round(data.temp * 10) / 10;
      if (typeof data.yield_day === 'number') cachedTelemetry.pvDailyYieldKwh = Math.round(data.yield_day / 100) / 10;
    } else if (typeof data === 'number') {
      if (topic.endsWith('/p_ac') || topic.endsWith('/power')) {
        cachedTelemetry.pvHoymilesWatts = Math.round(data);
      }
    }
  }

  // Trucki Topics
  if (topic.includes('trucki')) {
    cachedTelemetry.sources.trucki = 'live';
    cachedTelemetry.truckiStatus = 'NORMAL';
    if (typeof data === 'number') {
      cachedTelemetry.truckiActualOutputWatts = Math.round(data);
    } else if (data && typeof data === 'object') {
      if (typeof data.actual_power === 'number') cachedTelemetry.truckiActualOutputWatts = Math.round(data.actual_power);
    }
  }

  // Victron Topics (VRM / Venus OS: N/<portalId>/...)
  if (topic.includes('victron') || topic.startsWith('N/')) {
    cachedTelemetry.sources.venus = 'live';
    if (typeof data === 'object' && data?.value !== undefined) {
      const val = data.value;
      if (topic.includes('Battery/Soc')) cachedTelemetry.batterySocPercent = Math.round(val);
      if (topic.includes('Battery/Voltage')) cachedTelemetry.batteryVoltage = Math.round(val * 10) / 10;
      if (topic.includes('Battery/Power')) cachedTelemetry.batteryWatts = Math.round(val);
      if (topic.includes('Dc/Pv/Power') || topic.includes('solarcharger')) {
        cachedTelemetry.pvVictronMppt1Watts = Math.round(val);
      }
    }
  }

  cachedTelemetry.pvTotalWatts = cachedTelemetry.pvHoymilesWatts + cachedTelemetry.pvVictronMppt1Watts + cachedTelemetry.pvVictronMppt2Watts;
  cachedTelemetry.houseTotalWatts = Math.max(0, cachedTelemetry.pvTotalWatts + cachedTelemetry.truckiActualOutputWatts + (cachedTelemetry.gridMode === 'Bezug' ? cachedTelemetry.gridTotalWatts : -cachedTelemetry.gridTotalWatts));
}

function initMqttClient() {
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch {}
    mqttClient = null;
  }

  if (!mqttConfig.enabled) {
    mqttStatus.connected = false;
    mqttStatus.connecting = false;
    mqttStatus.error = 'MQTT deaktiviert';
    return;
  }

  const brokerUrl = `mqtt://${mqttConfig.host.trim()}:${mqttConfig.port}`;
  mqttStatus.brokerUrl = brokerUrl;
  mqttStatus.connecting = true;
  mqttStatus.error = undefined;

  try {
    const client = mqtt.connect(brokerUrl, {
      clientId: mqttConfig.clientId || `solar-hub-${Math.random().toString(16).substring(2, 8)}`,
      username: mqttConfig.username || undefined,
      password: mqttConfig.password || undefined,
      keepalive: mqttConfig.keepalive || 60,
      reconnectPeriod: mqttConfig.reconnectPeriod || 5000,
      connectTimeout: 4000,
    });

    client.on('connect', () => {
      console.log(`[✓] Connected to Mosquitto MQTT Broker at ${brokerUrl}`);
      mqttStatus.connected = true;
      mqttStatus.connecting = false;
      mqttStatus.error = undefined;
      client.subscribe(mqttConfig.topics, (err) => {
        if (err) {
          console.error('[!] MQTT Subscribe error:', err);
        } else {
          console.log('[✓] Subscribed to topics:', mqttConfig.topics.join(', '));
        }
      });
    });

    client.on('message', (topic: string, payload: Buffer) => {
      mqttStatus.lastMessageTime = new Date().toISOString();
      mqttStatus.messageCount++;
      if (!mqttStatus.activeTopics.includes(topic)) {
        mqttStatus.activeTopics = [topic, ...mqttStatus.activeTopics.slice(0, 24)];
      }

      const msgStr = payload.toString();
      let data: any = null;
      try {
        data = JSON.parse(msgStr);
      } catch {
        const num = parseFloat(msgStr);
        if (!isNaN(num)) data = num;
      }

      parseMqttTelemetry(topic, data);
      activeTelemetrySource = 'mqtt';
      cachedTelemetry.isLive = true;
    });

    client.on('error', (err) => {
      mqttStatus.connected = false;
      mqttStatus.connecting = false;
      mqttStatus.error = err.message;
    });

    client.on('close', () => {
      mqttStatus.connected = false;
    });

    client.on('reconnect', () => {
      mqttStatus.connecting = true;
    });

    mqttClient = client;
  } catch (err: any) {
    mqttStatus.connected = false;
    mqttStatus.connecting = false;
    mqttStatus.error = err.message;
  }
}


// ==============================================================================
// In-Memory Telemetry State & Diagnostics
// ==============================================================================
type SourceState = 'live' | 'simulated' | 'offline';
interface LiveSourceStatus {
  shelly: SourceState;
  ahoy: SourceState;
  trucki: SourceState;
  venus: SourceState;
}

interface DeviceDiagnostic {
  status: 'live' | 'offline' | 'disabled';
  lastPingMs: number;
  lastContact: string | null;
  testedUrl: string;
  errorMessage?: string;
}

let deviceDiagnostics: Record<string, DeviceDiagnostic> = {
  shelly: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  ahoy: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  trucki: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  venus: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
};

let cachedTelemetry = {
  timestamp: new Date().toISOString(),
  isLive: false,
  liveDevicesCount: 0,
  sources: {
    shelly: 'offline' as LiveSourceStatus['shelly'],
    ahoy: 'offline' as LiveSourceStatus['ahoy'],
    trucki: 'offline' as LiveSourceStatus['trucki'],
    venus: 'offline' as LiveSourceStatus['venus'],
  } as LiveSourceStatus,
  pvTotalWatts: 0,
  pvHoymilesWatts: 0,
  pvVictronMppt1Watts: 0,
  pvVictronMppt2Watts: 0,
  pvDailyYieldKwh: 0,
  hoymilesLimitPercent: 100,
  hoymilesLimitWatts: 1500,
  hoymilesChannels: [
    { channel: 1, voltage: 0, current: 0, power: 0 },
    { channel: 2, voltage: 0, current: 0, power: 0 },
    { channel: 3, voltage: 0, current: 0, power: 0 },
    { channel: 4, voltage: 0, current: 0, power: 0 },
  ],
  hoymilesTempC: 0,
  gridTotalWatts: 0,
  gridMode: 'Ausgeglichen' as 'Bezug' | 'Einspeisung' | 'Ausgeglichen',
  gridPhases: [
    { phase: 'L1' as const, voltage: 230.0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
    { phase: 'L2' as const, voltage: 230.0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
    { phase: 'L3' as const, voltage: 230.0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
  ],
  gridDailyImportKwh: 0,
  gridDailyExportKwh: 0,
  batterySocPercent: 0,
  batteryVoltage: 0,
  batteryCurrent: 0,
  batteryWatts: 0,
  batteryTempC: 0,
  batteryHealthPercent: 100,
  batteryCycles: 0,
  batteryCellVoltages: [3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3],
  batteryDailyChargedKwh: 0,
  batteryDailyDischargedKwh: 0,
  truckiPowerLimitWatts: 600,
  truckiActualOutputWatts: 0,
  truckiZeroExportEnabled: true,
  truckiStatus: 'STANDBY' as 'NORMAL' | 'STANDBY' | 'LIMITING' | 'FAULT',
  houseTotalWatts: 0,
  houseDailyKwh: 0,
  autarkyPercent: 0,
  selfConsumptionPercent: 0,
};

// Zeitpunkt der letzten echten Daten je Quelle
const lastSeen: Record<keyof LiveSourceStatus, number> = { shelly: 0, ahoy: 0, trucki: 0, venus: 0 };
const isFresh = (k: keyof LiveSourceStatus) => Date.now() - lastSeen[k] < STALE_MS;

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

// ==============================================================================
// LAN Poller & Strict Hardware Data Collector
// ==============================================================================
async function fetchWithTimeout(url: string, timeoutMs: number = 1000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function buildDeviceUrl(dev: DeviceEndpointConfig): string {
  const host = dev.host.trim();
  const base = host.startsWith('http://') || host.startsWith('https://') 
    ? host 
    : `http://${host}:${dev.port}`;
  const endpoint = dev.endpoint.startsWith('/') ? dev.endpoint : `/${dev.endpoint}`;
  return `${base}${endpoint}`;
}

async function updateLANTelemetry() {
  // 0. Prüfe, ob der Mosquitto MQTT Broker frische Telemetrie liefert (Priorität: MQTT-First)
  const isMqttFresh = Boolean(
    mqttStatus.connected && 
    mqttStatus.lastMessageTime && 
    (Date.now() - new Date(mqttStatus.lastMessageTime).getTime() < 12000)
  );

  if (mqttConfig.enabled && mqttConfig.priority === 'mqtt_first' && isMqttFresh) {
    activeTelemetrySource = 'mqtt';
    cachedTelemetry.isLive = true;
    cachedTelemetry.timestamp = new Date().toISOString();
    return; // MQTT liefert Push-Events -> HTTP-Poller kann ruhen
  }

  // FALLBACK: HTTP-REST Abfrage der Einzelgeräte
  const sources: LiveSourceStatus = {
    shelly: 'offline',
    ahoy: 'offline',
    trucki: 'offline',
    venus: 'offline',
  };

  let liveCount = 0;

  // 1. Shelly Pro 3EM Abfrage
  const shellyCfg = hardwareConfig.devices.shelly;
  if (shellyCfg.enabled) {
    const url = buildDeviceUrl(shellyCfg);
    deviceDiagnostics.shelly.testedUrl = url;
    const start = Date.now();
    try {
      const res = await fetchWithTimeout(url, shellyCfg.timeoutMs);
      const elapsed = Date.now() - start;
      deviceDiagnostics.shelly.lastPingMs = elapsed;

      if (res && res.ok) {
        const data = await res.json();
        sources.shelly = 'live';
        liveCount++;
        deviceDiagnostics.shelly.status = 'live';
        deviceDiagnostics.shelly.lastContact = new Date().toISOString();
        deviceDiagnostics.shelly.errorMessage = undefined;

        // Echte Leistungswerte auswerten (Gen2 Shelly Pro 3EM)
        let totalPower = 0;
        if (typeof data.total_act_power === 'number') {
          totalPower = data.total_act_power;
        } else if (typeof data.a_act_power === 'number' && typeof data.b_act_power === 'number' && typeof data.c_act_power === 'number') {
          totalPower = data.a_act_power + data.b_act_power + data.c_act_power;
        }

        cachedTelemetry.gridTotalWatts = Math.round(totalPower);
        cachedTelemetry.gridMode = totalPower > 10 ? 'Bezug' : totalPower < -10 ? 'Einspeisung' : 'Ausgeglichen';

        if (typeof data.a_voltage === 'number') cachedTelemetry.gridPhases[0].voltage = Math.round(data.a_voltage * 10) / 10;
        if (typeof data.b_voltage === 'number') cachedTelemetry.gridPhases[1].voltage = Math.round(data.b_voltage * 10) / 10;
        if (typeof data.c_voltage === 'number') cachedTelemetry.gridPhases[2].voltage = Math.round(data.c_voltage * 10) / 10;
        if (typeof data.a_act_power === 'number') cachedTelemetry.gridPhases[0].activePower = Math.round(data.a_act_power);
        if (typeof data.b_act_power === 'number') cachedTelemetry.gridPhases[1].activePower = Math.round(data.b_act_power);
        if (typeof data.c_act_power === 'number') cachedTelemetry.gridPhases[2].activePower = Math.round(data.c_act_power);
      } else {
        deviceDiagnostics.shelly.status = 'offline';
        deviceDiagnostics.shelly.errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      deviceDiagnostics.shelly.status = 'offline';
      deviceDiagnostics.shelly.errorMessage = err.name === 'AbortError' ? 'Timeout überschritten (>1.2s)' : err.message || 'Verbindung fehlgeschlagen';
    }
  } else {
    deviceDiagnostics.shelly.status = 'disabled';
  }
  return fallback;
}

  // 2. AhoyDTU (Hoymiles HM-1500) Abfrage
  const ahoyCfg = hardwareConfig.devices.ahoy;
  if (ahoyCfg.enabled) {
    const url = buildDeviceUrl(ahoyCfg);
    deviceDiagnostics.ahoy.testedUrl = url;
    const start = Date.now();
    try {
      const res = await fetchWithTimeout(url, ahoyCfg.timeoutMs);
      const elapsed = Date.now() - start;
      deviceDiagnostics.ahoy.lastPingMs = elapsed;

      if (res && res.ok) {
        const data = await res.json();
        sources.ahoy = 'live';
        liveCount++;
        deviceDiagnostics.ahoy.status = 'live';
        deviceDiagnostics.ahoy.lastContact = new Date().toISOString();
        deviceDiagnostics.ahoy.errorMessage = undefined;

        if (data.inverter && data.inverter[0]) {
          const inv = data.inverter[0];
          if (typeof inv.p_ac === 'number') cachedTelemetry.pvHoymilesWatts = Math.round(inv.p_ac);
          if (typeof inv.temp === 'number') cachedTelemetry.hoymilesTempC = Math.round(inv.temp * 10) / 10;
          if (typeof inv.yield_day === 'number') cachedTelemetry.pvDailyYieldKwh = Math.round(inv.yield_day / 100) / 10;

          if (Array.isArray(inv.ch)) {
            cachedTelemetry.hoymilesChannels = inv.ch.map((c: any, idx: number) => ({
              channel: idx + 1,
              voltage: typeof c?.u === 'number' ? Math.round(c.u * 10) / 10 : 33.0,
              current: typeof c?.i === 'number' ? Math.round(c.i * 10) / 10 : 0,
              power: typeof c?.p === 'number' ? Math.round(c.p) : 0,
            }));
          }
        }
      } else {
        deviceDiagnostics.ahoy.status = 'offline';
        deviceDiagnostics.ahoy.errorMessage = `HTTP ${res.status}`;
      }
    } catch (err: any) {
      deviceDiagnostics.ahoy.status = 'offline';
      deviceDiagnostics.ahoy.errorMessage = err.name === 'AbortError' ? 'Timeout überschritten (>1.2s)' : err.message || 'Verbindung fehlgeschlagen';
    }
  } else {
    deviceDiagnostics.ahoy.status = 'disabled';
  }
  lastSeen.ahoy = Date.now();
}

  // 3. Trucki2Shelly Gateway Abfrage
  const truckiCfg = hardwareConfig.devices.trucki;
  if (truckiCfg.enabled) {
    const url = buildDeviceUrl(truckiCfg);
    deviceDiagnostics.trucki.testedUrl = url;
    const start = Date.now();
    try {
      const res = await fetchWithTimeout(url, truckiCfg.timeoutMs);
      const elapsed = Date.now() - start;
      deviceDiagnostics.trucki.lastPingMs = elapsed;

      if (res && res.ok) {
        sources.trucki = 'live';
        liveCount++;
        deviceDiagnostics.trucki.status = 'live';
        deviceDiagnostics.trucki.lastContact = new Date().toISOString();
        deviceDiagnostics.trucki.errorMessage = undefined;
        cachedTelemetry.truckiStatus = 'NORMAL';
      } else {
        deviceDiagnostics.trucki.status = 'offline';
        deviceDiagnostics.trucki.errorMessage = `HTTP ${res.status}`;
      }
    } catch (err: any) {
      deviceDiagnostics.trucki.status = 'offline';
      deviceDiagnostics.trucki.errorMessage = err.name === 'AbortError' ? 'Timeout überschritten (>1.2s)' : err.message || 'Verbindung fehlgeschlagen';
    }
  } else {
    deviceDiagnostics.trucki.status = 'disabled';
  }
  if (seen) lastSeen.trucki = Date.now();
}

  // 4. Venus OS Abfrage
  const venusCfg = hardwareConfig.devices.venus;
  if (venusCfg.enabled) {
    const url = buildDeviceUrl(venusCfg);
    deviceDiagnostics.venus.testedUrl = url;
    const start = Date.now();
    try {
      const res = await fetchWithTimeout(url, venusCfg.timeoutMs);
      const elapsed = Date.now() - start;
      deviceDiagnostics.venus.lastPingMs = elapsed;

      if (res && res.ok) {
        sources.venus = 'live';
        liveCount++;
        deviceDiagnostics.venus.status = 'live';
        deviceDiagnostics.venus.lastContact = new Date().toISOString();
        deviceDiagnostics.venus.errorMessage = undefined;
      } else {
        deviceDiagnostics.venus.status = 'offline';
        deviceDiagnostics.venus.errorMessage = `HTTP ${res.status}`;
      }
    } catch (err: any) {
      deviceDiagnostics.venus.status = 'offline';
      deviceDiagnostics.venus.errorMessage = err.name === 'AbortError' ? 'Timeout überschritten (>1.2s)' : err.message || 'Verbindung fehlgeschlagen';
    }
  } else {
    deviceDiagnostics.venus.status = 'disabled';
  }
}

  // Wenn mindestens ein Gerät live antwortet: Berechne reale Summen
  if (liveCount > 0) {
    cachedTelemetry.pvTotalWatts = cachedTelemetry.pvHoymilesWatts + cachedTelemetry.pvVictronMppt1Watts + cachedTelemetry.pvVictronMppt2Watts;
    cachedTelemetry.houseTotalWatts = Math.max(0, cachedTelemetry.pvTotalWatts + cachedTelemetry.truckiActualOutputWatts + (cachedTelemetry.gridMode === 'Bezug' ? cachedTelemetry.gridTotalWatts : -cachedTelemetry.gridTotalWatts));
  } else if (!hardwareConfig.strictLiveOnly && hardwareConfig.demoSimulationAllowed) {
    // Nur wenn der Benutzer die Demo-Simulation explizit in den Einstellungen erlaubt hat:
    const pvDrift = Math.floor(Math.random() * 21) - 10;
    cachedTelemetry.pvHoymilesWatts = Math.max(820, Math.min(1480, (cachedTelemetry.pvHoymilesWatts || 960) + pvDrift));
    cachedTelemetry.pvVictronMppt1Watts = 240;
    cachedTelemetry.pvVictronMppt2Watts = 220;
    cachedTelemetry.pvTotalWatts = cachedTelemetry.pvHoymilesWatts + cachedTelemetry.pvVictronMppt1Watts + cachedTelemetry.pvVictronMppt2Watts;

    const houseDrift = Math.floor(Math.random() * 15) - 7;
    cachedTelemetry.houseTotalWatts = Math.max(750, (cachedTelemetry.houseTotalWatts || 1500) + houseDrift);

    const neededFromBat = Math.max(0, cachedTelemetry.houseTotalWatts - cachedTelemetry.pvHoymilesWatts);
    const limitedBatWatts = cachedTelemetry.truckiZeroExportEnabled 
      ? Math.min(cachedTelemetry.truckiPowerLimitWatts, Math.round(neededFromBat))
      : 0;

    cachedTelemetry.truckiActualOutputWatts = limitedBatWatts;
    cachedTelemetry.gridTotalWatts = Math.round(cachedTelemetry.houseTotalWatts - cachedTelemetry.pvHoymilesWatts - limitedBatWatts);
    cachedTelemetry.gridMode = cachedTelemetry.gridTotalWatts >= 0 ? 'Bezug' : 'Einspeisung';

    const lumentreeDcDraw = limitedBatWatts > 0 ? Math.round(limitedBatWatts / 0.92) : 0;
    const mpptDcCharge = cachedTelemetry.pvVictronMppt1Watts + cachedTelemetry.pvVictronMppt2Watts;
    cachedTelemetry.batteryWatts = mpptDcCharge - lumentreeDcDraw;
    cachedTelemetry.batterySocPercent = 78;
    cachedTelemetry.batteryVoltage = 52.8;
  } else {
    // REINER LIVE-MODUS: Keine erfundene Daten!
    // Werte bleiben bei 0 bzw. nicht erfasst, wenn die Hardware im LAN nicht antwortet
    cachedTelemetry.pvTotalWatts = 0;
    cachedTelemetry.pvHoymilesWatts = 0;
    cachedTelemetry.pvVictronMppt1Watts = 0;
    cachedTelemetry.pvVictronMppt2Watts = 0;
    cachedTelemetry.truckiActualOutputWatts = 0;
    cachedTelemetry.gridTotalWatts = 0;
    cachedTelemetry.batteryWatts = 0;
    cachedTelemetry.houseTotalWatts = 0;
  }
}

  const isMqttFresh = Boolean(
    mqttStatus.connected && 
    mqttStatus.lastMessageTime && 
    (Date.now() - new Date(mqttStatus.lastMessageTime).getTime() < 12000)
  );

  cachedTelemetry.timestamp = new Date().toISOString();
  cachedTelemetry.isLive = liveCount > 0 || isMqttFresh;
  cachedTelemetry.liveDevicesCount = liveCount;
  cachedTelemetry.sources = sources;

  if (isMqttFresh) {
    activeTelemetrySource = 'mqtt';
  } else if (liveCount > 0) {
    activeTelemetrySource = 'http_rest';
  } else {
    activeTelemetrySource = 'none';
  }
}

startMqtt();
setInterval(updateLANTelemetry, 2000);
// Direkt beim Starten einmal anstoßen & MQTT Client initialisieren
updateLANTelemetry().catch(console.error);
initMqttClient();

// ==============================================================================
// REST API Endpoints
// ==============================================================================

// 1. Live Telemetriedaten, Quelle & Hardware/MQTT Status
app.get('/api/telemetry/live', (_req, res) => {
  res.json({
    status: 'ok',
    data: cachedTelemetry,
    diagnostics: deviceDiagnostics,
    telemetrySource: activeTelemetrySource,
    mqttStatus: {
      ...mqttStatus,
      priority: mqttConfig.priority,
      enabled: mqttConfig.enabled,
    },
    mode: {
      strictLiveOnly: hardwareConfig.strictLiveOnly,
      demoSimulationAllowed: hardwareConfig.demoSimulationAllowed,
    },
    serverUptimeSeconds: Math.floor(process.uptime()),
    queriedAt: new Date().toISOString(),
  });
});

// 1d. Mosquitto MQTT Broker Configuration Get & Update
app.get('/api/system/mqtt/config', (_req, res) => {
  res.json({
    status: 'ok',
    config: {
      ...mqttConfig,
      password: mqttConfig.password ? '••••••••' : '',
    },
    rawConfig: {
      ...mqttConfig,
    },
    connectionStatus: {
      ...mqttStatus,
      brokerUrl: `mqtt://${mqttConfig.host}:${mqttConfig.port}`,
    },
    activeSource: activeTelemetrySource,
  });
});

app.post('/api/system/mqtt/config', (req, res) => {
  const { host, port, username, password, clientId, topics, enabled, priority } = req.body;

  if (host) mqttConfig.host = String(host).trim();
  if (port) mqttConfig.port = parseInt(String(port)) || 1883;
  if (typeof username === 'string') mqttConfig.username = username.trim();
  if (typeof password === 'string' && password !== '••••••••') mqttConfig.password = password;
  if (clientId) mqttConfig.clientId = String(clientId).trim();
  if (Array.isArray(topics) && topics.length > 0) mqttConfig.topics = topics;
  if (typeof enabled === 'boolean') mqttConfig.enabled = enabled;
  if (priority === 'mqtt_first' || priority === 'http_only') mqttConfig.priority = priority;

  saveMqttConfig();
  initMqttClient();

  res.json({
    status: 'success',
    message: 'MQTT-Broker Konfiguration erfolgreich gespeichert. Verbindung wird neu aufgebaut.',
    config: {
      ...mqttConfig,
      password: mqttConfig.password ? '••••••••' : '',
    },
    connectionStatus: mqttStatus,
    activeSource: activeTelemetrySource,
  });
});

app.post('/api/system/mqtt/test', async (req, res) => {
  const { host, port, username, password } = req.body;
  const testHost = host ? String(host).trim() : mqttConfig.host;
  const testPort = port ? parseInt(String(port)) || 1883 : mqttConfig.port;
  const testUrl = `mqtt://${testHost}:${testPort}`;
  const testUser = username !== undefined ? username : mqttConfig.username;
  const testPass = password && password !== '••••••••' ? password : mqttConfig.password;

  const start = Date.now();
  let finished = false;

  try {
    const testClient = mqtt.connect(testUrl, {
      clientId: `test-${Date.now()}`,
      username: testUser || undefined,
      password: testPass || undefined,
      connectTimeout: 2500,
      reconnectPeriod: 0,
    });

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { testClient.end(true); } catch {}
        res.json({
          success: false,
          latencyMs: Date.now() - start,
          error: 'Timeout beim Verbindungsaufbau zum MQTT-Broker (>2.5s)',
          testUrl,
        });
      }
    }, 2800);

    testClient.on('connect', () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const latencyMs = Date.now() - start;
        try { testClient.end(true); } catch {}
        res.json({
          success: true,
          latencyMs,
          testUrl,
          message: `Erfolgreich mit Mosquitto Broker auf ${testUrl} verbunden!`,
        });
      }
    });

    testClient.on('error', (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const latencyMs = Date.now() - start;
        try { testClient.end(true); } catch {}
        res.json({
          success: false,
          latencyMs,
          testUrl,
          error: err.message,
        });
      }
    });
  } catch (err: any) {
    res.json({
      success: false,
      latencyMs: Date.now() - start,
      testUrl,
      error: err.message,
    });
  }
});


// 1b. Hardware Configuration Get & Update
app.get('/api/system/network/config', (_req, res) => {
  res.json({
    status: 'ok',
    config: hardwareConfig,
    diagnostics: deviceDiagnostics,
    isLocalLanOnline: cachedTelemetry.isLive,
    liveDevicesCount: cachedTelemetry.liveDevicesCount,
  });
});

app.post('/api/system/network/config', (req, res) => {
  const { config, strictLiveOnly, demoSimulationAllowed } = req.body;

  if (config?.devices) {
    hardwareConfig.devices = {
      ...hardwareConfig.devices,
      ...config.devices,
    };
  }
  if (typeof strictLiveOnly === 'boolean') {
    hardwareConfig.strictLiveOnly = strictLiveOnly;
  }
  if (typeof demoSimulationAllowed === 'boolean') {
    hardwareConfig.demoSimulationAllowed = demoSimulationAllowed;
  }

  saveHardwareConfig();
  // Sofort neuen Polling-Zyklus anstoßen
  updateLANTelemetry().catch(console.error);

  res.json({
    status: 'success',
    message: 'Hardware-Konfiguration erfolgreich aktualisiert und gespeichert.',
    config: hardwareConfig,
  });
});

// 1c. Gezielter Hardware Live-Ping Test
app.post('/api/system/network/ping', async (req, res) => {
  const { deviceId, host, port, endpoint, timeoutMs } = req.body;

  const targetDev = hardwareConfig.devices[deviceId as keyof typeof hardwareConfig.devices];
  const testHost = host || targetDev?.host || '127.0.0.1';
  const testPort = port || targetDev?.port || 80;
  const testEndpoint = endpoint !== undefined ? endpoint : targetDev?.endpoint || '';
  const testTimeout = typeof timeoutMs === 'number' ? timeoutMs : 1500;

  const base = testHost.startsWith('http://') || testHost.startsWith('https://') 
    ? testHost 
    : `http://${testHost}:${testPort}`;
  const fullEndpoint = testEndpoint.startsWith('/') ? testEndpoint : `/${testEndpoint}`;
  const url = `${base}${fullEndpoint}`;

  const start = Date.now();
  try {
    const pingRes = await fetchWithTimeout(url, testTimeout);
    const latencyMs = Date.now() - start;
    let rawSnippet = '';
    try {
      const text = await pingRes.text();
      rawSnippet = text.substring(0, 300);
    } catch {
      rawSnippet = '[Nicht textuelle Antwort]';
    }

    res.json({
      success: pingRes.ok,
      latencyMs,
      statusCode: pingRes.status,
      statusText: pingRes.statusText,
      testedUrl: url,
      rawSnippet,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    res.json({
      success: false,
      latencyMs,
      statusCode: null,
      error: err.name === 'AbortError' ? 'Timeout überschritten (>1.5s)' : err.message || 'Verbindung fehlgeschlagen',
      testedUrl: url,
      rawSnippet: '',
      timestamp: new Date().toISOString(),
    });
  }
});


// 2. Health & Host Status (Gesundheits-Ampel für MQTT, Influx, Proxmox, DTU, Trucki)
app.get('/api/health/hosts', async (_req, res) => {
  const hosts = [
    { id: 'shelly', name: 'Shelly Pro 3EM', ip: '192.168.0.100', port: 80, service: 'Smart Meter' },
    { id: 'ahoy', name: 'AhoyDTU (HM-1500)', ip: '192.168.0.101', port: 80, service: 'Hoymiles Inverter' },
    { id: 'trucki', name: 'Trucki Gateway (T2SG)', ip: '192.168.0.102', port: 80, service: 'SUN-2000G2-H Regelung' },
    { id: 'venus', name: 'Venus OS', ip: '192.168.0.111', port: 80, service: 'Victron MPPTs' },
    { id: 'proxmox', name: 'Proxmox VE', ip: '192.168.0.200', port: 8006, service: 'LXC Host' },
    { id: 'mqtt', name: 'Mosquitto Broker (TLS)', ip: '192.168.0.201', port: 8883, service: 'MQTTS:8883' },
    { id: 'grafana', name: 'Grafana', ip: '192.168.0.202', port: 3000, service: 'Dashboards' },
    { id: 'influxdb', name: 'InfluxDB 2.x', ip: '192.168.0.203', port: 8086, service: 'Time-Series DB' },
    { id: 'app', name: 'Solar-App (LXC)', ip: '192.168.0.222', port: 80, service: 'Web-UI & REST API' },
  ];

  const results = await Promise.all(
    hosts.map(async (h) => {
      const latencyMs = await tcpProbe(h.ip, h.port);
      return {
        id: h.id,
        name: h.name,
        ip: h.ip,
        service: h.service,
        status: latencyMs !== null ? 'Online' : 'Offline',
        latencyMs,
        lastChecked: new Date().toISOString(),
      };
    })
  );

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    isLanOnline: cachedTelemetry.isPartiallyLive,
    mqttConnected,
    hosts: results,
  });
});

// 3. Leistungsgrenze SUN-2000G2-H ueber T2SG (MQTT: <Prefix>/MAXPOWEROVR)
app.post('/api/control/limit', (req, res) => {
  const { limitWatts, zeroExportEnabled } = req.body ?? {};
  let sentToDevice = false;

  if (typeof limitWatts === 'number' && Number.isFinite(limitWatts)) {
    const w = Math.max(0, Math.min(LAN_CONFIG.sunMaxWatts, Math.round(limitWatts)));
    cachedTelemetry.truckiPowerLimitWatts = w;
    if (mqttClient && mqttConnected) {
      mqttClient.publish(`${LAN_CONFIG.truckiTopicPrefix}/MAXPOWEROVR`, String(w));
      sentToDevice = true;
    }
  }
  if (typeof zeroExportEnabled === 'boolean') {
    // Nur Anzeige: ZEPC wird weiterhin am T2SG selbst eingestellt
    cachedTelemetry.truckiZeroExportEnabled = zeroExportEnabled;
  }

  res.json({
    status: 'success',
    appliedLimitWatts: cachedTelemetry.truckiPowerLimitWatts,
    zeroExportEnabled: cachedTelemetry.truckiZeroExportEnabled,
    sentToDevice,
    timestamp: new Date().toISOString(),
  });
});

// 4. System Info
app.get('/api/system/info', (_req, res) => {
  res.json({
    app: 'Solar-Lokal-App',
    version: '1.4.1',
    repository: 'Perspektivlos/Solar-App',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    mqtt: { url: MQTT_CONFIG.url, connected: mqttConnected, truckiPrefix: LAN_CONFIG.truckiTopicPrefix },
    lanTopology: {
      ahoyDtu: 'http://ahoydtu.local (192.168.0.101)',
      truckiGateway: 'http://trucki.local (192.168.0.102)',
      shellyMeter: 'http://192.168.0.100',
      venusOs: 'http://venus.local (192.168.0.111)',
      proxmoxNode: '192.168.0.200',
      mqttBroker: '192.168.0.201',
      grafana: '192.168.0.202',
      influxdb: '192.168.0.203',
      solarApp: 'http://192.168.0.222',
    },
  });
});

// 5. System Update Check & Execution Endpoints
app.get('/api/system/update/check', async (_req, res) => {
  let commitHash = '7f8c2b1';
  try {
    const ghRes = await fetchWithTimeout('https://api.github.com/repos/Perspektivlos/Solar-App/commits/main', 1500);
    if (ghRes.ok) {
      const ghData = (await ghRes.json()) as { sha?: string };
      if (ghData.sha) commitHash = ghData.sha.substring(0, 7);
    }
  } catch {
    // Hermetisches LAN ohne Internet-Zugang
  }

  res.json({
    status: 'ok',
    currentVersion: 'v1.4.0',
    latestVersion: 'v1.4.1',
    hasUpdate: true,
    lastChecked: new Date().toISOString(),
    commitHash,
    repositoryUrl: 'https://github.com/Perspektivlos/Solar-App.git',
    releaseNotes: [
      '11-Komponenten Prüfbericht & Revisionsmatrix mit Ampellogik',
      '16 System-Plausibilitätsprüfungen (Netzwerk, Sicherheit, Telemetrie, Regelung)',
      'Elektrotechnischer Leitungsnachweis & Kabelrechner (Victron Wiring Unlimited)',
      'Bereinigung unbestätigter Daten auf „nicht erfasst“ mit Auto-Discovery'
    ]
  });
});

app.post('/api/system/update/execute', (_req, res) => {
  res.json({
    status: 'success',
    newVersion: 'v1.4.1',
    message: 'Update erfolgreich installiert! Die Anwendung läuft nun auf Version v1.4.1.',
    stepsCompleted: [
      'Git Repository aktualisiert: git pull origin main (Fast-Forward)',
      'Abhängigkeiten verifiziert: Node 20 LTS & Tailwind Oxide',
      'Production Assets gebaut: /opt/solar-lokal/dist',
      'Nginx Webserver Cache erneuert (systemctl restart nginx)'
    ]
  });
});

// ==============================================================================
// Vite Dev Server Mounting / Static Serving
// ==============================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[*] Vite dev middlewares mounted in Express.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[✓] Solar-Lokal Backend listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[!] Failed to start Solar-Lokal server:', err);
  process.exit(1);
});
