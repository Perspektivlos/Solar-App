import 'dotenv/config';
import express from 'express';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Prevent any unhandled network errors or background exceptions from terminating dev server process
process.on('uncaughtException', (err) => {
  console.error('[!] Caught unhandled exception in background thread:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[!] Caught unhandled rejection in background thread:', reason);
});

app.use(express.json());

// Echtdaten gelten als frisch, wenn sie juenger als STALE_MS sind
const STALE_MS = 15000;
// Lumentree SUN-2000G2-H: 2000 W max./kontinuierlich (Anleitung Tabelle 1)
const SUN_MAX_WATTS = 2000;
const HOYMILES_MAX_WATTS = 1500;
const SUN_EFFICIENCY = 0.92;

// ==============================================================================
// LAN Hardware Endpoints Configuration & Persistence (hardware-config.json)
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
      // Liefert ch-Arrays (ch[0] = AC, ch[1..4] = DC); /api/live enthaelt keine Messwerte
      endpoint: '/api/inverter/id/0',
      enabled: true,
      timeoutMs: 1200,
    },
    trucki: {
      id: 'trucki',
      name: 'Trucki2Shelly Gateway (SUN-2000G2-H)',
      host: '192.168.0.102',
      port: 80,
      endpoint: '/jsonlive',
      enabled: true,
      timeoutMs: 1200,
    },
    venus: {
      id: 'venus',
      name: 'Victron Venus OS (MPPT 288/289)',
      host: '192.168.0.111',
      port: 80,
      // Nur Erreichbarkeit; MPPT-Messwerte kommen per MQTT (N/<VRM-ID>/solarcharger/...)
      endpoint: '/gui-v2/',
      enabled: true,
      timeoutMs: 1200,
    },
  },
  strictLiveOnly: true, // Standard: Reiner Live-Modus ohne erfundene Werte
  demoSimulationAllowed: false,
};

// Alte, nicht funktionierende Endpunkte aus frueheren Versionen automatisch ersetzen
const LEGACY_ENDPOINTS: Record<string, string[]> = {
  ahoy: ['/api/live'],
  trucki: ['/log.txt'],
  venus: ['/app/', '/app'],
};

let hardwareConfig: HardwareNetworkConfigData = JSON.parse(JSON.stringify(DEFAULT_HARDWARE_CONFIG));

try {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    hardwareConfig = {
      ...hardwareConfig,
      ...parsed,
      devices: { ...hardwareConfig.devices, ...(parsed.devices || {}) },
    };
    for (const [id, legacy] of Object.entries(LEGACY_ENDPOINTS)) {
      const dev = hardwareConfig.devices[id as keyof HardwareNetworkConfigData['devices']];
      if (dev && legacy.includes(dev.endpoint)) {
        dev.endpoint = DEFAULT_HARDWARE_CONFIG.devices[id as keyof HardwareNetworkConfigData['devices']].endpoint;
        console.log(`[*] Migrated ${id} endpoint to ${dev.endpoint}`);
      }
    }
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
// Mosquitto MQTT Broker Configuration & Persistence (mqtt-config.json)
// ENV-Variablen (MQTT_PASSWORD, MQTT_CA_FILE, ...) haben Vorrang vor der Datei.
// ==============================================================================
const MQTT_CONFIG_PATH = path.resolve(__dirname, 'mqtt-config.json');

export interface MqttServerConfig {
  enabled: boolean;
  host: string;
  port: number;
  tls: boolean;
  caFile?: string;
  rejectUnauthorized: boolean;
  username?: string;
  password?: string;
  clientId: string;
  topics: string[];
  keepalive: number;
  reconnectPeriod: number;
  priority: 'mqtt_first' | 'http_only';
  vrmId: string;
  venusInstances: number[];
  // MQTT-Prefix = Geraetename im T2SG (Geraeteeinstellungen -> Device name)
  truckiTopicPrefix: string;
}

const VRM_ID_DEFAULT = process.env.VRM_ID || 'b827eb79321c';
const TRUCKI_PREFIX_DEFAULT = process.env.TRUCKI_TOPIC_PREFIX || 'TRUCKI';

const DEFAULT_MQTT_CONFIG: MqttServerConfig = {
  enabled: true,
  host: '192.168.0.201',
  // Broker .201 laeuft ohne TLS (Klartext im LAN, Login + ACL). TLS optional per mqtts:// / tls: true
  port: 1883,
  tls: false,
  caFile: '',
  rejectUnauthorized: true,
  username: 'mqttapp',
  password: '',
  clientId: 'solar-lokal-hub',
  topics: [
    `${TRUCKI_PREFIX_DEFAULT}/#`,
    `N/${VRM_ID_DEFAULT}/solarcharger/288/#`,
    `N/${VRM_ID_DEFAULT}/solarcharger/289/#`,
    'venus/grid/shellypro/#',
    'venus/pv/ahoydtu/#',
  ],
  keepalive: 60,
  reconnectPeriod: 5000,
  priority: 'mqtt_first',
  vrmId: VRM_ID_DEFAULT,
  venusInstances: [288, 289],
  truckiTopicPrefix: TRUCKI_PREFIX_DEFAULT,
};

let mqttConfig: MqttServerConfig = { ...DEFAULT_MQTT_CONFIG };

try {
  if (fs.existsSync(MQTT_CONFIG_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(MQTT_CONFIG_PATH, 'utf-8'));
    mqttConfig = { ...DEFAULT_MQTT_CONFIG, ...parsed };
    // Migration: alte Platzhalter-Topics durch die realen Topics ersetzen
    const legacyTopics = ['ahoy/#', 'shellypro3em/#', 'trucki/#', 'victron/#'];
    if (Array.isArray(parsed.topics) && parsed.topics.some((t: string) => legacyTopics.includes(t))) {
      mqttConfig.topics = [
        ...DEFAULT_MQTT_CONFIG.topics,
        ...parsed.topics.filter((t: string) => !legacyTopics.includes(t) && !DEFAULT_MQTT_CONFIG.topics.includes(t)),
      ];
      console.log('[*] Migrated legacy MQTT topics to', mqttConfig.topics.join(', '));
    }
    console.log('[*] Loaded MQTT configuration from mqtt-config.json');
  }
} catch (err) {
  console.warn('[!] Failed to read mqtt-config.json, using defaults:', err);
}

// ENV-Overrides (Secrets gehoeren in die .env, nicht in die JSON-Datei)
if (process.env.MQTT_URL) {
  try {
    const u = new URL(process.env.MQTT_URL);
    mqttConfig.host = u.hostname;
    mqttConfig.tls = u.protocol === 'mqtts:';
    mqttConfig.port = Number(u.port) || (mqttConfig.tls ? 8883 : 1883);
  } catch {
    console.warn('[!] MQTT_URL ungueltig, wird ignoriert');
  }
}
if (process.env.MQTT_ENABLED) mqttConfig.enabled = process.env.MQTT_ENABLED !== 'false';
if (process.env.MQTT_USERNAME) mqttConfig.username = process.env.MQTT_USERNAME;
if (process.env.MQTT_PASSWORD) mqttConfig.password = process.env.MQTT_PASSWORD;
if (process.env.MQTT_CA_FILE) mqttConfig.caFile = process.env.MQTT_CA_FILE;
if (process.env.MQTT_REJECT_UNAUTHORIZED) mqttConfig.rejectUnauthorized = process.env.MQTT_REJECT_UNAUTHORIZED !== 'false';

function saveMqttConfig() {
  try {
    // Passwort nur speichern, wenn es nicht aus der .env kommt
    const toSave = { ...mqttConfig, password: process.env.MQTT_PASSWORD ? '' : mqttConfig.password };
    fs.writeFileSync(MQTT_CONFIG_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
    console.log('[✓] Saved MQTT configuration to mqtt-config.json');
  } catch (err) {
    console.error('[!] Failed to save mqtt-config.json:', err);
  }
}

function brokerUrlFor(host: string, port: number, tls: boolean): string {
  return `${tls ? 'mqtts' : 'mqtt'}://${host.trim()}:${port}`;
}

function mqttTlsOptions(cfg: Pick<MqttServerConfig, 'tls' | 'caFile' | 'rejectUnauthorized'>): Partial<IClientOptions> {
  if (!cfg.tls) return {};
  const opts: Partial<IClientOptions> = { rejectUnauthorized: cfg.rejectUnauthorized };
  if (cfg.caFile) {
    try {
      opts.ca = fs.readFileSync(cfg.caFile);
    } catch (err: any) {
      console.warn(`[!] CA-Datei ${cfg.caFile} nicht lesbar: ${err.message}`);
    }
  }
  return opts;
}

// ==============================================================================
// In-Memory Telemetry State & Diagnostics
// ==============================================================================
type SourceKey = 'shelly' | 'ahoy' | 'trucki' | 'venus';
type SourceState = 'live' | 'simulated' | 'offline';
type LiveSourceStatus = Record<SourceKey, SourceState>;
const SOURCE_KEYS: SourceKey[] = ['shelly', 'ahoy', 'trucki', 'venus'];

interface DeviceDiagnostic {
  status: 'live' | 'offline' | 'disabled';
  lastPingMs: number;
  lastContact: string | null;
  testedUrl: string;
  errorMessage?: string;
  via?: 'http' | 'mqtt';
}

const deviceDiagnostics: Record<SourceKey, DeviceDiagnostic> = {
  shelly: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  ahoy: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  trucki: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
  venus: { status: 'offline', lastPingMs: 0, lastContact: null, testedUrl: '' },
};

const cachedTelemetry = {
  timestamp: new Date().toISOString(),
  isLive: false,
  isPartiallyLive: false,
  liveDevicesCount: 0,
  sources: { shelly: 'offline', ahoy: 'offline', trucki: 'offline', venus: 'offline' } as LiveSourceStatus,
  pvTotalWatts: 0,
  pvHoymilesWatts: 0,
  pvVictronMppt1Watts: 0,
  pvVictronMppt2Watts: 0,
  pvDailyYieldKwh: 0,
  hoymilesLimitPercent: 100,
  hoymilesLimitWatts: HOYMILES_MAX_WATTS,
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
    { phase: 'L1' as 'L1' | 'L2' | 'L3', voltage: 0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
    { phase: 'L2' as 'L1' | 'L2' | 'L3', voltage: 0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
    { phase: 'L3' as 'L1' | 'L2' | 'L3', voltage: 0, current: 0, activePower: 0, powerFactor: 1.0, frequency: 50.0 },
  ],
  gridDailyImportKwh: 0,
  gridDailyExportKwh: 0,
  // Kein Batteriemonitor: SOC wird nicht gemessen (0 = nicht erfasst)
  batterySocPercent: 0,
  batteryVoltage: 0,
  batteryCurrent: 0,
  batteryWatts: 0,
  batteryTempC: 0,
  batteryHealthPercent: 100,
  batteryCycles: 0,
  batteryCellVoltages: [] as number[],
  batteryDailyChargedKwh: 0,
  batteryDailyDischargedKwh: 0,
  truckiPowerLimitWatts: 600,
  truckiActualOutputWatts: 0,
  truckiZeroExportEnabled: true,
  truckiStatus: 'STANDBY' as 'NORMAL' | 'STANDBY' | 'LIMITING' | 'FAULT',
  truckiDailyEnergyKwh: 0,
  houseTotalWatts: 0,
  houseDailyKwh: 0,
  autarkyPercent: 0,
  selfConsumptionPercent: 0,
};

let activeTelemetrySource: 'mqtt' | 'http_rest' | 'none' = 'none';

// Zeitpunkt der letzten echten Daten je Quelle und Kanal
const lastSeen: Record<SourceKey, { http: number; mqtt: number }> = {
  shelly: { http: 0, mqtt: 0 },
  ahoy: { http: 0, mqtt: 0 },
  trucki: { http: 0, mqtt: 0 },
  venus: { http: 0, mqtt: 0 },
};
const freshVia = (k: SourceKey, ch: 'http' | 'mqtt') => Date.now() - lastSeen[k][ch] < STALE_MS;
const isFresh = (k: SourceKey) => freshVia(k, 'http') || freshVia(k, 'mqtt');

function markSeen(k: SourceKey, via: 'http' | 'mqtt') {
  lastSeen[k][via] = Date.now();
  deviceDiagnostics[k].lastContact = new Date().toISOString();
  deviceDiagnostics[k].via = via;
}

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

// ==============================================================================
// Geraete-Parser (HTTP und MQTT nutzen dieselben Funktionen)
// ==============================================================================
function applyShelly(d: any): boolean {
  if (!d || typeof d !== 'object') return false;
  let total = num(d.total_act_power);
  if (total === undefined) {
    const a = num(d.a_act_power), b = num(d.b_act_power), c = num(d.c_act_power);
    if (a !== undefined && b !== undefined && c !== undefined) total = a + b + c;
  }
  if (total === undefined) return false;
  const t = cachedTelemetry;
  t.gridTotalWatts = Math.round(total);
  t.gridMode = total > 10 ? 'Bezug' : total < -10 ? 'Einspeisung' : 'Ausgeglichen';
  (['a', 'b', 'c'] as const).forEach((p, i) => {
    const ph = t.gridPhases[i];
    const v = num(d[`${p}_voltage`]); if (v !== undefined) ph.voltage = Math.round(v * 10) / 10;
    const c = num(d[`${p}_current`]); if (c !== undefined) ph.current = Math.round(c * 100) / 100;
    const w = num(d[`${p}_act_power`]); if (w !== undefined) ph.activePower = Math.round(w);
    const pf = num(d[`${p}_pf`]); if (pf !== undefined) ph.powerFactor = pf;
    const f = num(d[`${p}_freq`]); if (f !== undefined) ph.frequency = f;
  });
  return true;
}

// AhoyDTU: Feldnamen bestimmen den Index, sonst Ahoy-Standardreihenfolge U, I, P
function fieldIndex(names: unknown, field: string, fallback: number): number {
  if (Array.isArray(names)) {
    const i = names.indexOf(field);
    if (i >= 0) return i;
  }
  return fallback;
}

function applyAhoyInverter(inv: any): boolean {
  if (!inv || !Array.isArray(inv.ch) || inv.ch.length === 0) return false;
  const acNames = inv.fld_names ?? inv.ch0_fld_names;
  const dcNames = inv.fld_names_dc ?? inv.ch_fld_names;
  const ac = inv.ch[0] as unknown[];
  const pAc = num(ac[fieldIndex(acNames, 'P_AC', 2)]);
  if (pAc === undefined) return false;
  const t = cachedTelemetry;
  t.pvHoymilesWatts = Math.round(pAc);
  const temp = num(ac[fieldIndex(acNames, 'Temp', 5)]);
  if (temp !== undefined) t.hoymilesTempC = Math.round(temp * 10) / 10;
  const yd = num(ac[fieldIndex(acNames, 'YieldDay', 7)]);
  if (yd !== undefined) t.pvDailyYieldKwh = Math.round(yd / 100) / 10; // Wh -> kWh
  t.hoymilesChannels = (inv.ch as unknown[][]).slice(1).map((ch, i) => ({
    channel: i + 1,
    voltage: num(ch[fieldIndex(dcNames, 'U_DC', 0)]) ?? 0,
    current: num(ch[fieldIndex(dcNames, 'I_DC', 1)]) ?? 0,
    power: Math.round(num(ch[fieldIndex(dcNames, 'P_DC', 2)]) ?? 0),
  }));
  const limit = num(inv.power_limit_read);
  if (limit !== undefined) {
    t.hoymilesLimitPercent = limit;
    t.hoymilesLimitWatts = Math.round((HOYMILES_MAX_WATTS * limit) / 100);
  }
  return true;
}

// AhoyDTU MQTT: <prefix>/<inverter>/ch0/P_AC usw. (Rohwerte)
function applyAhoyMqtt(sub: string, raw: string): boolean {
  const v = num(raw);
  if (v === undefined) return false;
  const t = cachedTelemetry;
  if (/\/ch0\/P_AC$/.test(sub)) { t.pvHoymilesWatts = Math.round(v); return true; }
  if (/\/ch0\/Temp$/.test(sub)) { t.hoymilesTempC = Math.round(v * 10) / 10; return false; }
  if (/\/ch0\/YieldDay$/.test(sub)) { t.pvDailyYieldKwh = Math.round(v / 100) / 10; return false; }
  const m = sub.match(/\/ch([1-4])\/(U_DC|I_DC|P_DC)$/);
  if (m) {
    const ch = t.hoymilesChannels[Number(m[1]) - 1];
    if (ch) {
      if (m[2] === 'U_DC') ch.voltage = v;
      else if (m[2] === 'I_DC') ch.current = v;
      else ch.power = Math.round(v);
    }
  }
  return false;
}

const T2SG_STATE_MAP: Record<string, typeof cachedTelemetry.truckiStatus> = {
  ON: 'NORMAL',
  OFF: 'STANDBY',
  LOW: 'STANDBY', // Akku unter VBat Cutoff
  HIGH: 'LIMITING',
};

// T2SG: /jsonlive-Felder und MQTT-Topics (<Prefix>/ACDISPLAY, /VBAT, ...)
function applyTrucki(v: Record<string, unknown>): boolean {
  const t = cachedTelemetry;
  let seen = false;
  const ac = num(v.ACDISPLAY);
  if (ac !== undefined) { t.truckiActualOutputWatts = Math.max(0, Math.round(ac)); seen = true; }
  const vbat = num(v.VBAT);
  if (vbat !== undefined && vbat > 0) { t.batteryVoltage = Math.round(vbat * 100) / 100; seen = true; }
  const max = num(v.MAXPOWER);
  if (max !== undefined) t.truckiPowerLimitWatts = Math.min(SUN_MAX_WATTS, Math.round(max));
  const temp = num(v.TEMPERATURE);
  if (temp !== undefined) t.batteryTempC = temp;
  const de = num(v.DAYENERGY);
  if (de !== undefined) t.truckiDailyEnergyKwh = de;
  if (typeof v.STATE === 'string' && v.STATE) {
    t.truckiStatus = T2SG_STATE_MAP[v.STATE.trim().toUpperCase()] ?? t.truckiStatus;
  }
  if (v.ZEPC !== undefined) {
    t.truckiZeroExportEnabled = !/disabled|^\s*0\s*$/i.test(String(v.ZEPC));
  }
  return seen;
}

function truckiFromJsonlive(d: any): boolean {
  if (!d || typeof d !== 'object') return false;
  return applyTrucki({
    ACDISPLAY: d.MQTT_ACDISPLAY_VALUE ?? d.ACPOWER,
    VBAT: d.MQTT_VBAT_VALUE ?? d.VBAT,
    MAXPOWER: d.MQTT_MAXPOWER_VALUE ?? d.POWERLIMIT,
    TEMPERATURE: d.MQTT_TEMPERATURE_VALUE ?? d.TEMP,
    STATE: d.MQTT_STATE_VALUE,
    ZEPC: d.MQTT_ZEPC_VALUE,
    DAYENERGY: d.MQTT_DAYENERGY_VALUE ?? d.DAYENERGY,
  });
}

// Venus OS MPPTs (N/<VRM-ID>/solarcharger/<Instanz>/...)
const mppt: Record<number, { power?: number; voltage?: number; current?: number; yieldKwh?: number }> = {};

function applyVenusMqtt(instance: number, field: string, raw: string): boolean {
  let value: unknown;
  try { value = JSON.parse(raw)?.value; } catch { return false; }
  const v = num(value);
  if (v === undefined) return false;
  const slot = (mppt[instance] ??= {});
  switch (field) {
    case 'Yield/Power': slot.power = v; return true;
    case 'Dc/0/Voltage': slot.voltage = v; return true;
    case 'Dc/0/Current': slot.current = v; return true;
    case 'History/Daily/0/Yield': slot.yieldKwh = v; return true;
    default: return false;
  }
}

// ==============================================================================
// MQTT-Client (Mosquitto .201, Port 1883 ohne TLS; TLS optional)
// ==============================================================================
let mqttClient: MqttClient | null = null;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
const mqttStatus = {
  connected: false,
  connecting: false,
  error: undefined as string | undefined,
  brokerUrl: brokerUrlFor(mqttConfig.host, mqttConfig.port, mqttConfig.tls),
  lastMessageTime: null as string | null,
  messageCount: 0,
  activeTopics: [] as string[],
};

function handleMqttMessage(topic: string, payload: Buffer) {
  mqttStatus.lastMessageTime = new Date().toISOString();
  mqttStatus.messageCount++;
  if (!mqttStatus.activeTopics.includes(topic)) {
    mqttStatus.activeTopics = [topic, ...mqttStatus.activeTopics.slice(0, 24)];
  }
  const raw = payload.toString();
  const prefix = mqttConfig.truckiTopicPrefix;

  if (topic.startsWith(`${prefix}/`)) {
    const key = topic.slice(prefix.length + 1);
    if (!key.endsWith('OVR') && applyTrucki({ [key]: raw })) markSeen('trucki', 'mqtt');
    return;
  }
  const vm = topic.match(/^N\/[^/]+\/solarcharger\/(\d+)\/(.+)$/);
  if (vm) {
    if (applyVenusMqtt(Number(vm[1]), vm[2], raw)) markSeen('venus', 'mqtt');
    return;
  }
  if (topic.startsWith('venus/grid/shellypro/')) {
    try {
      if (applyShelly(JSON.parse(raw))) markSeen('shelly', 'mqtt');
    } catch { /* kein JSON (z. B. online-Topic) */ }
    return;
  }
  if (topic.startsWith('venus/pv/ahoydtu/')) {
    if (applyAhoyMqtt(topic, raw)) markSeen('ahoy', 'mqtt');
  }
}

function initMqttClient() {
  if (mqttClient) {
    try { mqttClient.end(true); } catch { /* ignore */ }
    mqttClient = null;
  }
  if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }

  if (!mqttConfig.enabled) {
    mqttStatus.connected = false;
    mqttStatus.connecting = false;
    mqttStatus.error = 'MQTT deaktiviert';
    return;
  }

  const brokerUrl = brokerUrlFor(mqttConfig.host, mqttConfig.port, mqttConfig.tls);
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
      ...mqttTlsOptions(mqttConfig),
    });

    client.on('connect', () => {
      console.log(`[✓] Connected to Mosquitto MQTT Broker at ${brokerUrl}`);
      mqttStatus.connected = true;
      mqttStatus.connecting = false;
      mqttStatus.error = undefined;
      client.subscribe(mqttConfig.topics, (err) => {
        if (err) console.error('[!] MQTT Subscribe error:', err);
        else console.log('[✓] Subscribed to topics:', mqttConfig.topics.join(', '));
      });
      // Venus OS veroeffentlicht N/... nur mit regelmaessigem Keep-Alive
      client.publish(`R/${mqttConfig.vrmId}/keepalive`, '');
    });
    client.on('message', handleMqttMessage);
    client.on('error', (err) => {
      mqttStatus.connected = false;
      mqttStatus.connecting = false;
      mqttStatus.error = err.message;
    });
    client.on('close', () => { mqttStatus.connected = false; });
    client.on('reconnect', () => { mqttStatus.connecting = true; });

    mqttClient = client;
    keepaliveTimer = setInterval(() => {
      if (mqttStatus.connected) mqttClient?.publish(`R/${mqttConfig.vrmId}/keepalive`, '');
    }, 30000);
  } catch (err: any) {
    mqttStatus.connected = false;
    mqttStatus.connecting = false;
    mqttStatus.error = err.message;
  }
}

// ==============================================================================
// HTTP-Poller
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
  const base = host.startsWith('http://') || host.startsWith('https://') ? host : `http://${host}:${dev.port}`;
  const endpoint = dev.endpoint.startsWith('/') ? dev.endpoint : `/${dev.endpoint}`;
  return `${base}${endpoint}`;
}

const HTTP_PARSERS: Record<SourceKey, ((body: any) => boolean) | null> = {
  shelly: applyShelly,
  ahoy: applyAhoyInverter,
  trucki: truckiFromJsonlive,
  venus: null, // nur Erreichbarkeit, Daten via MQTT
};

async function pollDevice(key: SourceKey) {
  const cfg = hardwareConfig.devices[key];
  const diag = deviceDiagnostics[key];
  if (!cfg.enabled) {
    diag.status = 'disabled';
    return;
  }
  // MQTT-First: frische MQTT-Daten machen den HTTP-Abruf ueberfluessig
  if (mqttConfig.enabled && mqttConfig.priority === 'mqtt_first' && freshVia(key, 'mqtt')) {
    diag.status = 'live';
    diag.errorMessage = undefined;
    return;
  }
  const url = buildDeviceUrl(cfg);
  diag.testedUrl = url;
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, cfg.timeoutMs);
    diag.lastPingMs = Date.now() - start;
    if (!res.ok) {
      diag.status = freshVia(key, 'mqtt') ? 'live' : 'offline';
      diag.errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      return;
    }
    const parser = HTTP_PARSERS[key];
    if (!parser) {
      // Venus OS erreichbar, aber ohne MQTT-Daten keine Messwerte
      diag.status = freshVia(key, 'mqtt') ? 'live' : 'offline';
      diag.errorMessage = freshVia(key, 'mqtt') ? undefined : 'Erreichbar, aber keine MQTT-Daten (Keep-Alive / Bridge pruefen)';
      return;
    }
    const body = await res.json().catch(() => null);
    if (parser(body)) {
      markSeen(key, 'http');
      diag.status = 'live';
      diag.errorMessage = undefined;
    } else {
      diag.status = freshVia(key, 'mqtt') ? 'live' : 'offline';
      diag.errorMessage = 'Antwort enthaelt keine erwarteten Messwerte';
    }
  } catch (err: any) {
    diag.lastPingMs = Date.now() - start;
    diag.status = freshVia(key, 'mqtt') ? 'live' : 'offline';
    diag.errorMessage = err.name === 'AbortError' ? `Timeout ueberschritten (>${cfg.timeoutMs} ms)` : err.message || 'Verbindung fehlgeschlagen';
  }
}

// ==============================================================================
// Demo-Simulation (nur wenn ausdruecklich erlaubt) bzw. Nullwerte im Live-Modus
// ==============================================================================
function fillMissing(sources: LiveSourceStatus) {
  const t = cachedTelemetry;
  const simulate = !hardwareConfig.strictLiveOnly && hardwareConfig.demoSimulationAllowed;

  for (const k of SOURCE_KEYS) {
    if (sources[k] === 'live') continue;
    sources[k] = simulate ? 'simulated' : 'offline';
    if (simulate) continue;
    // Reiner Live-Modus: keine erfundenen Werte
    if (k === 'shelly') { t.gridTotalWatts = 0; t.gridMode = 'Ausgeglichen'; }
    if (k === 'ahoy') { t.pvHoymilesWatts = 0; }
    if (k === 'trucki') { t.truckiActualOutputWatts = 0; }
    if (k === 'venus') { t.pvVictronMppt1Watts = 0; t.pvVictronMppt2Watts = 0; }
  }
  if (!simulate) return;

  if (sources.ahoy === 'simulated') {
    const drift = Math.floor(Math.random() * 21) - 10;
    t.pvHoymilesWatts = Math.max(820, Math.min(1480, (t.pvHoymilesWatts || 960) + drift));
  }
  if (sources.venus === 'simulated') {
    t.pvVictronMppt1Watts = 240;
    t.pvVictronMppt2Watts = 220;
    if (sources.trucki !== 'live') t.batteryVoltage = t.batteryVoltage || 52.8;
  }
  if (sources.trucki === 'simulated' || sources.shelly === 'simulated') {
    const house = Math.max(750, (t.houseTotalWatts || 1500) + Math.floor(Math.random() * 15) - 7);
    if (sources.trucki === 'simulated') {
      const needed = Math.max(0, house - t.pvHoymilesWatts);
      t.truckiActualOutputWatts = t.truckiZeroExportEnabled ? Math.min(t.truckiPowerLimitWatts, Math.round(needed)) : 0;
    }
    if (sources.shelly === 'simulated') {
      const g = Math.round(house - t.pvHoymilesWatts - t.truckiActualOutputWatts);
      t.gridTotalWatts = g;
      t.gridMode = g > 10 ? 'Bezug' : g < -10 ? 'Einspeisung' : 'Ausgeglichen';
    }
  }
}

async function updateLANTelemetry() {
  await Promise.allSettled(SOURCE_KEYS.map(pollDevice));

  const t = cachedTelemetry;
  const [i1, i2] = mqttConfig.venusInstances;
  if (freshVia('venus', 'mqtt')) {
    t.pvVictronMppt1Watts = Math.round(mppt[i1]?.power ?? 0);
    t.pvVictronMppt2Watts = Math.round(mppt[i2]?.power ?? 0);
    // Batteriespannung vom MPPT-Ausgang, falls der T2SG keine liefert
    if (!isFresh('trucki')) {
      const vb = mppt[i1]?.voltage ?? mppt[i2]?.voltage;
      if (vb !== undefined) t.batteryVoltage = Math.round(vb * 100) / 100;
    }
  }

  const sources = {} as LiveSourceStatus;
  for (const k of SOURCE_KEYS) {
    sources[k] = hardwareConfig.devices[k].enabled && isFresh(k) ? 'live' : 'offline';
  }
  fillMissing(sources);

  // DC-gekoppelt: MPPT-Ladung geht direkt in den Akku und zaehlt NICHT zum Hausverbrauch.
  // Hausverbrauch = HM-1500 AC + SUN-Entladung AC + Netz (Bezug positiv, Einspeisung negativ)
  t.pvTotalWatts = t.pvHoymilesWatts + t.pvVictronMppt1Watts + t.pvVictronMppt2Watts;
  t.houseTotalWatts = Math.max(0, Math.round(t.pvHoymilesWatts + t.truckiActualOutputWatts + t.gridTotalWatts));
  const sunDcDraw = t.truckiActualOutputWatts > 0 ? Math.round(t.truckiActualOutputWatts / SUN_EFFICIENCY) : 0;
  t.batteryWatts = t.pvVictronMppt1Watts + t.pvVictronMppt2Watts - sunDcDraw;
  t.batteryCurrent = t.batteryVoltage > 0 ? Math.round((t.batteryWatts / t.batteryVoltage) * 10) / 10 : 0;

  const liveCount = SOURCE_KEYS.filter((k) => sources[k] === 'live').length;
  const mqttLive = SOURCE_KEYS.some((k) => freshVia(k, 'mqtt'));
  const httpLive = SOURCE_KEYS.some((k) => freshVia(k, 'http'));

  t.sources = sources;
  t.liveDevicesCount = liveCount;
  t.isLive = liveCount > 0;
  t.isPartiallyLive = liveCount > 0 && liveCount < SOURCE_KEYS.length;
  t.timestamp = new Date().toISOString();
  activeTelemetrySource = mqttLive ? 'mqtt' : httpLive ? 'http_rest' : 'none';
}

initMqttClient();
setInterval(() => { updateLANTelemetry().catch(console.error); }, 2000);
updateLANTelemetry().catch(console.error);

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
    mqttConnected: mqttStatus.connected,
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
      password: mqttConfig.password ? '••••••••' : '',
    },
    connectionStatus: {
      ...mqttStatus,
      brokerUrl: brokerUrlFor(mqttConfig.host, mqttConfig.port, mqttConfig.tls),
    },
    activeSource: activeTelemetrySource,
  });
});

app.post('/api/system/mqtt/config', (req, res) => {
  const { host, port, username, password, clientId, topics, enabled, priority, tls, caFile, rejectUnauthorized, truckiTopicPrefix, vrmId } = req.body;

  if (host) mqttConfig.host = String(host).trim();
  if (typeof tls === 'boolean') mqttConfig.tls = tls;
  if (port) mqttConfig.port = parseInt(String(port)) || (mqttConfig.tls ? 8883 : 1883);
  if (typeof caFile === 'string') mqttConfig.caFile = caFile.trim();
  if (typeof rejectUnauthorized === 'boolean') mqttConfig.rejectUnauthorized = rejectUnauthorized;
  if (typeof truckiTopicPrefix === 'string' && truckiTopicPrefix.trim()) mqttConfig.truckiTopicPrefix = truckiTopicPrefix.trim().replace(/\/#?$/, '');
  if (typeof vrmId === 'string' && vrmId.trim()) mqttConfig.vrmId = vrmId.trim();
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
  const { host, port, username, password, tls } = req.body;
  const testHost = host ? String(host).trim() : mqttConfig.host;
  const testTls = typeof tls === 'boolean' ? tls : mqttConfig.tls;
  const testPort = port ? parseInt(String(port)) || (testTls ? 8883 : 1883) : mqttConfig.port;
  const testUrl = brokerUrlFor(testHost, testPort, testTls);
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
      ...mqttTlsOptions({ ...mqttConfig, tls: testTls }),
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


// 2. Health & Host Status: echte TCP-Pruefung, keine Zufallswerte
function tcpProbe(host: string, port: number, timeoutMs = 800): Promise<number | null> {
  return new Promise((resolve) => {
    let finished = false;
    const start = Date.now();
    const sock = net.connect({ host, port });
    const done = (ok: boolean) => {
      if (finished) return;
      finished = true;
      try {
        sock.destroy();
      } catch {}
      resolve(ok ? Date.now() - start : null);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.on('connect', () => done(true));
    sock.on('error', () => done(false));
    sock.on('close', () => done(false));
  });
}

app.get('/api/health/hosts', async (_req, res) => {
  const d = hardwareConfig.devices;
  const hosts = [
    { id: 'shelly', name: 'Shelly Pro 3EM', ip: d.shelly.host, port: d.shelly.port, service: 'Smart Meter' },
    { id: 'ahoy', name: 'AhoyDTU (HM-1500)', ip: d.ahoy.host, port: d.ahoy.port, service: 'Hoymiles Inverter' },
    { id: 'trucki', name: 'Trucki Gateway (T2SG)', ip: d.trucki.host, port: d.trucki.port, service: 'SUN-2000G2-H Regelung' },
    { id: 'venus', name: 'Venus OS', ip: d.venus.host, port: d.venus.port, service: 'Victron MPPTs' },
    { id: 'proxmox', name: 'Proxmox VE', ip: '192.168.0.200', port: 8006, service: 'LXC Host' },
    { id: 'mqtt', name: `Mosquitto Broker${mqttConfig.tls ? ' (TLS)' : ''}`, ip: mqttConfig.host, port: mqttConfig.port, service: `${mqttConfig.tls ? 'MQTTS' : 'MQTT'}:${mqttConfig.port}` },
    { id: 'grafana', name: 'Grafana', ip: '192.168.0.202', port: 3000, service: 'Dashboards' },
    { id: 'influxdb', name: 'InfluxDB 2.x', ip: '192.168.0.203', port: 8086, service: 'Time-Series DB' },
    { id: 'app', name: 'Solar-App (LXC)', ip: '192.168.0.222', port: 80, service: 'Web-UI & REST API' },
  ].map((h) => ({ ...h, ip: h.ip.replace(/^https?:\/\//, '').replace(/[:/].*$/, '') }));

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
    isLanOnline: cachedTelemetry.isLive,
    mqttConnected: mqttStatus.connected,
    hosts: results,
  });
});

// 3. Leistungsgrenze SUN-2000G2-H ueber T2SG (MQTT: <Prefix>/MAXPOWEROVR)
app.post('/api/control/limit', (req, res) => {
  const { limitWatts, zeroExportEnabled } = req.body ?? {};
  let sentToDevice = false;

  if (typeof limitWatts === 'number' && Number.isFinite(limitWatts)) {
    const w = Math.max(0, Math.min(SUN_MAX_WATTS, Math.round(limitWatts)));
    cachedTelemetry.truckiPowerLimitWatts = w;
    if (mqttClient && mqttStatus.connected) {
      mqttClient.publish(`${mqttConfig.truckiTopicPrefix}/MAXPOWEROVR`, String(w));
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
const APP_VERSION = '1.5.0';
app.get('/api/system/info', (_req, res) => {
  res.json({
    app: 'Solar-Lokal-App',
    version: APP_VERSION,
    repository: 'Perspektivlos/Solar-App',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    mqtt: {
      url: brokerUrlFor(mqttConfig.host, mqttConfig.port, mqttConfig.tls),
      connected: mqttStatus.connected,
      truckiPrefix: mqttConfig.truckiTopicPrefix,
      vrmId: mqttConfig.vrmId,
    },
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

// 5. Update-Pruefung: vergleicht den lokalen Git-Stand mit GitHub main
function localCommit(): string | null {
  try {
    const head = fs.readFileSync(path.resolve(__dirname, '.git/HEAD'), 'utf-8').trim();
    if (!head.startsWith('ref:')) return head.substring(0, 7);
    const ref = head.slice(5).trim();
    const refFile = path.resolve(__dirname, '.git', ref);
    if (fs.existsSync(refFile)) return fs.readFileSync(refFile, 'utf-8').trim().substring(0, 7);
    const packed = fs.readFileSync(path.resolve(__dirname, '.git/packed-refs'), 'utf-8');
    const line = packed.split('\n').find((l) => l.endsWith(` ${ref}`));
    return line ? line.substring(0, 7) : null;
  } catch {
    return null;
  }
}

app.get('/api/system/update/check', async (_req, res) => {
  const current = localCommit();
  let latest: string | null = null;
  try {
    const ghRes = await fetchWithTimeout('https://api.github.com/repos/Perspektivlos/Solar-App/commits/main', 2500);
    if (ghRes.ok) {
      const ghData = (await ghRes.json()) as { sha?: string };
      if (ghData.sha) latest = ghData.sha.substring(0, 7);
    }
  } catch {
    // LAN ohne Internet-Zugang
  }

  res.json({
    status: 'ok',
    currentVersion: current ?? APP_VERSION,
    latestVersion: latest ?? 'unbekannt',
    hasUpdate: Boolean(current && latest && current !== latest),
    lastChecked: new Date().toISOString(),
    commitHash: latest ?? current ?? 'unbekannt',
    repositoryUrl: 'https://github.com/Perspektivlos/Solar-App.git',
    releaseNotes: [],
  });
});

// Kein Fern-Update aus der Web-UI: bewusst nur manuell im Container
app.post('/api/system/update/execute', (_req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Update aus der Web-UI ist nicht aktiviert. Im Container ausfuehren: bash scripts/proxmox/update_solar_app.sh',
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
