import 'dotenv/config';
import express from 'express';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mqtt, { MqttClient } from 'mqtt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==============================================================================
// Anlagen-Konfiguration (reale Anlage, per ENV ueberschreibbar)
// ==============================================================================
const LAN_CONFIG = {
  shelly: { baseUrls: [process.env.SHELLY_URL || 'http://192.168.0.100'], endpoint: '/rpc/EM.GetStatus?id=0' },
  ahoy: { baseUrls: process.env.AHOY_URL ? [process.env.AHOY_URL] : ['http://ahoydtu.local', 'http://192.168.0.101'], inverterId: 0 },
  trucki: { baseUrls: process.env.TRUCKI_URL ? [process.env.TRUCKI_URL] : ['http://trucki.local', 'http://192.168.0.102'], endpoint: '/jsonlive' },
  venus: { vrmId: process.env.VRM_ID || 'b827eb79321c', instances: [288, 289] },
  // MQTT-Prefix = Geraetename im T2SG (Geraeteeinstellungen -> Device name)
  truckiTopicPrefix: process.env.TRUCKI_TOPIC_PREFIX || 'TRUCKI',
  // Lumentree SUN-2000G2-H: 2000 W max./kontinuierlich, 45-90 V DC
  sunMaxWatts: 2000,
  hoymilesMaxWatts: 1500,
};

const MQTT_CONFIG = {
  url: process.env.MQTT_URL || 'mqtts://192.168.0.201:8883',
  username: process.env.MQTT_USERNAME || 'mqttapp',
  password: process.env.MQTT_PASSWORD || '',
  caFile: process.env.MQTT_CA_FILE || '',
  rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false',
  enabled: process.env.MQTT_ENABLED !== 'false',
};

const STALE_MS = 15000;

// ==============================================================================
// In-Memory Telemetry State & Cache
// ==============================================================================
type SourceState = 'live' | 'simulated' | 'offline';
interface LiveSourceStatus {
  shelly: SourceState;
  ahoy: SourceState;
  trucki: SourceState;
  venus: SourceState;
}

let cachedTelemetry = {
  timestamp: new Date().toISOString(),
  isLive: false,
  isPartiallyLive: false,
  sources: {
    shelly: 'simulated' as LiveSourceStatus['shelly'],
    ahoy: 'simulated' as LiveSourceStatus['ahoy'],
    trucki: 'simulated' as LiveSourceStatus['trucki'],
    venus: 'simulated' as LiveSourceStatus['venus'],
  } as LiveSourceStatus,
  pvTotalWatts: 1420,
  pvHoymilesWatts: 960,
  pvVictronMppt1Watts: 240,
  pvVictronMppt2Watts: 220,
  pvDailyYieldKwh: 6.84,
  hoymilesLimitPercent: 100,
  hoymilesLimitWatts: 1500,
  hoymilesChannels: [
    { channel: 1, voltage: 33.4, current: 7.2, power: 240 },
    { channel: 2, voltage: 33.1, current: 7.1, power: 235 },
    { channel: 3, voltage: 33.6, current: 7.3, power: 245 },
    { channel: 4, voltage: 33.0, current: 7.3, power: 240 },
  ],
  hoymilesTempC: 38.5,
  gridTotalWatts: 145,
  gridMode: 'Bezug' as 'Bezug' | 'Einspeisung',
  gridPhases: [
    { phase: 'L1', voltage: 231.2, current: 1.15, activePower: 180, powerFactor: 0.94, frequency: 50.01 },
    { phase: 'L2', voltage: 230.8, current: 0.85, activePower: -95, powerFactor: 0.88, frequency: 50.01 },
    { phase: 'L3', voltage: 232.0, current: 0.62, activePower: 60, powerFactor: 0.91, frequency: 50.00 },
  ],
  gridDailyImportKwh: 1.82,
  gridDailyExportKwh: 0.45,
  batterySocPercent: 78,
  batteryVoltage: 52.8,
  batteryCurrent: -11.4,
  batteryWatts: -602,
  batteryTempC: 23.4,
  batteryHealthPercent: 99.4,
  batteryCycles: 42,
  batteryCellVoltages: [
    3.302, 3.305, 3.301, 3.304, 3.303, 3.306, 3.302, 3.304,
    3.301, 3.305, 3.303, 3.304, 3.302, 3.306, 3.303, 3.305,
  ],
  batteryDailyChargedKwh: 4.12,
  batteryDailyDischargedKwh: 2.85,
  truckiPowerLimitWatts: 600,
  truckiActualOutputWatts: 595,
  truckiZeroExportEnabled: true,
  truckiStatus: 'NORMAL' as string,
  houseTotalWatts: 1700,
  houseDailyKwh: 7.92,
  autarkyPercent: 88.4,
  selfConsumptionPercent: 94.2,
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
// HTTP-Poller
// ==============================================================================
async function fetchWithTimeout(url: string, timeoutMs: number = 1500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchJsonFirst(baseUrls: string[], endpoint: string): Promise<any | null> {
  for (const base of baseUrls) {
    try {
      const res = await fetchWithTimeout(`${base}${endpoint}`);
      if (res.ok) return await res.json();
    } catch {
      // naechste Adresse probieren
    }
  }
  return null;
}

async function pollShelly() {
  const d = await fetchJsonFirst(LAN_CONFIG.shelly.baseUrls, LAN_CONFIG.shelly.endpoint);
  const total = num(d?.total_act_power);
  if (total === undefined) return;
  cachedTelemetry.gridTotalWatts = Math.round(total);
  cachedTelemetry.gridMode = total >= 0 ? 'Bezug' : 'Einspeisung';
  const phases = (['a', 'b', 'c'] as const).map((p, i) => ({
    phase: `L${i + 1}`,
    voltage: num(d[`${p}_voltage`]) ?? 0,
    current: num(d[`${p}_current`]) ?? 0,
    activePower: Math.round(num(d[`${p}_act_power`]) ?? 0),
    powerFactor: num(d[`${p}_pf`]) ?? 0,
    frequency: num(d[`${p}_freq`]) ?? 50,
  }));
  cachedTelemetry.gridPhases = phases;
  lastSeen.shelly = Date.now();
}

// AhoyDTU liefert Werte als Arrays: ch[0] = AC, ch[1..4] = DC-Eingaenge.
// Feldnamen (falls vorhanden) bestimmen den Index, sonst Ahoy-Standardreihenfolge U, I, P.
function fieldIndex(names: unknown, field: string, fallback: number): number {
  if (Array.isArray(names)) {
    const i = names.indexOf(field);
    if (i >= 0) return i;
  }
  return fallback;
}

async function pollAhoy() {
  const inv = await fetchJsonFirst(LAN_CONFIG.ahoy.baseUrls, `/api/inverter/id/${LAN_CONFIG.ahoy.inverterId}`);
  if (!inv || !Array.isArray(inv.ch) || inv.ch.length === 0) return;
  const acNames = inv.fld_names ?? inv.ch0_fld_names;
  const dcNames = inv.fld_names_dc ?? inv.ch_fld_names;
  const ac = inv.ch[0] as number[];
  const pAc = num(ac[fieldIndex(acNames, 'P_AC', 2)]);
  if (pAc === undefined) return;
  cachedTelemetry.pvHoymilesWatts = Math.round(pAc);
  const temp = num(ac[fieldIndex(acNames, 'Temp', 5)]);
  if (temp !== undefined) cachedTelemetry.hoymilesTempC = Math.round(temp * 10) / 10;
  cachedTelemetry.hoymilesChannels = (inv.ch as number[][]).slice(1).map((ch, i) => ({
    channel: i + 1,
    voltage: num(ch[fieldIndex(dcNames, 'U_DC', 0)]) ?? 0,
    current: num(ch[fieldIndex(dcNames, 'I_DC', 1)]) ?? 0,
    power: Math.round(num(ch[fieldIndex(dcNames, 'P_DC', 2)]) ?? 0),
  }));
  const limit = num(inv.power_limit_read);
  if (limit !== undefined) {
    cachedTelemetry.hoymilesLimitPercent = limit;
    cachedTelemetry.hoymilesLimitWatts = Math.round(LAN_CONFIG.hoymilesMaxWatts * limit / 100);
  }
  lastSeen.ahoy = Date.now();
}

// T2SG /jsonlive (Feldnamen laut Lumentree-Portal)
async function pollTrucki() {
  const d = await fetchJsonFirst(LAN_CONFIG.trucki.baseUrls, LAN_CONFIG.trucki.endpoint);
  if (!d) return;
  applyTrucki({
    ACDISPLAY: d.MQTT_ACDISPLAY_VALUE ?? d.ACPOWER,
    VBAT: d.MQTT_VBAT_VALUE ?? d.VBAT,
    MAXPOWER: d.MQTT_MAXPOWER_VALUE ?? d.POWERLIMIT,
    TEMPERATURE: d.MQTT_TEMPERATURE_VALUE ?? d.TEMP,
    STATE: d.MQTT_STATE_VALUE,
    ZEPC: d.MQTT_ZEPC_VALUE,
    DAYENERGY: d.MQTT_DAYENERGY_VALUE ?? d.DAYENERGY,
  });
}

function applyTrucki(v: Record<string, unknown>) {
  let seen = false;
  const ac = num(v.ACDISPLAY);
  if (ac !== undefined) { cachedTelemetry.truckiActualOutputWatts = Math.round(ac); seen = true; }
  const vbat = num(v.VBAT);
  if (vbat !== undefined && vbat > 0) { cachedTelemetry.batteryVoltage = Math.round(vbat * 100) / 100; seen = true; }
  const max = num(v.MAXPOWER);
  if (max !== undefined) cachedTelemetry.truckiPowerLimitWatts = Math.round(max);
  const t = num(v.TEMPERATURE);
  if (t !== undefined) cachedTelemetry.batteryTempC = t;
  if (typeof v.STATE === 'string' && v.STATE) cachedTelemetry.truckiStatus = v.STATE;
  if (v.ZEPC !== undefined) {
    const z = String(v.ZEPC);
    cachedTelemetry.truckiZeroExportEnabled = !/disabled|^\s*0\s*$/i.test(z);
  }
  if (seen) lastSeen.trucki = Date.now();
}

// ==============================================================================
// MQTT: Venus OS (MPPTs 288/289) und T2SG (TRUCKI/#) ueber Mosquitto .201
// ==============================================================================
let mqttClient: MqttClient | null = null;
let mqttConnected = false;
const mppt: Record<number, { power?: number; voltage?: number; current?: number; yieldKwh?: number }> = {};

function startMqtt() {
  if (!MQTT_CONFIG.enabled) return;
  const { vrmId, instances } = LAN_CONFIG.venus;
  const prefix = LAN_CONFIG.truckiTopicPrefix;
  const ca = MQTT_CONFIG.caFile && fs.existsSync(MQTT_CONFIG.caFile) ? fs.readFileSync(MQTT_CONFIG.caFile) : undefined;
  mqttClient = mqtt.connect(MQTT_CONFIG.url, {
    username: MQTT_CONFIG.username || undefined,
    password: MQTT_CONFIG.password || undefined,
    ca,
    rejectUnauthorized: MQTT_CONFIG.rejectUnauthorized,
    reconnectPeriod: 10000,
    connectTimeout: 5000,
    clientId: `solar-app-${Math.random().toString(16).slice(2, 8)}`,
  });
  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log(`[mqtt] verbunden mit ${MQTT_CONFIG.url}`);
    const topics = [`${prefix}/#`];
    for (const i of instances) topics.push(`N/${vrmId}/solarcharger/${i}/#`);
    mqttClient!.subscribe(topics);
    mqttClient!.publish(`R/${vrmId}/keepalive`, '');
  });
  mqttClient.on('close', () => { mqttConnected = false; });
  mqttClient.on('error', (err) => console.warn('[mqtt]', err.message));
  mqttClient.on('message', (topic, payload) => {
    const raw = payload.toString();
    if (topic.startsWith(`${prefix}/`)) {
      const key = topic.slice(prefix.length + 1);
      applyTrucki({ [key]: raw });
      return;
    }
    const m = topic.match(/^N\/[^/]+\/solarcharger\/(\d+)\/(.+)$/);
    if (!m) return;
    let value: unknown;
    try { value = JSON.parse(raw)?.value; } catch { return; }
    const v = num(value);
    if (v === undefined) return;
    const inst = Number(m[1]);
    const slot = (mppt[inst] ??= {});
    switch (m[2]) {
      case 'Yield/Power': slot.power = v; break;
      case 'Dc/0/Voltage': slot.voltage = v; break;
      case 'Dc/0/Current': slot.current = v; break;
      case 'History/Daily/0/Yield': slot.yieldKwh = v; break;
      default: return;
    }
    lastSeen.venus = Date.now();
  });
  // Venus OS sendet nur mit Keep-Alive
  setInterval(() => {
    if (mqttConnected) mqttClient?.publish(`R/${vrmId}/keepalive`, '');
  }, 30000);
}

function applyVenus() {
  const [i1, i2] = LAN_CONFIG.venus.instances;
  const m1 = mppt[i1] ?? {};
  const m2 = mppt[i2] ?? {};
  cachedTelemetry.pvVictronMppt1Watts = Math.round(m1.power ?? 0);
  cachedTelemetry.pvVictronMppt2Watts = Math.round(m2.power ?? 0);
  // Batteriespannung: MPPT-Ausgang, falls der T2SG keine liefert
  if (!isFresh('trucki')) {
    const vb = m1.voltage ?? m2.voltage;
    if (vb !== undefined) cachedTelemetry.batteryVoltage = Math.round(vb * 100) / 100;
  }
}

// ==============================================================================
// Simulation fuer alle Quellen ohne frische Echtdaten
// ==============================================================================
function simulate(sources: LiveSourceStatus) {
  if (sources.ahoy !== 'live') {
    const pvDrift = Math.floor(Math.random() * 21) - 10;
    cachedTelemetry.pvHoymilesWatts = Math.max(820, Math.min(1480, cachedTelemetry.pvHoymilesWatts + pvDrift));
  }
  if (sources.trucki !== 'live' || sources.shelly !== 'live') {
    // Nur ohne echte Messung: Hausverbrauch frei driften lassen und Regelung nachbilden
    const houseDrift = Math.floor(Math.random() * 15) - 7;
    const house = Math.max(750, cachedTelemetry.houseTotalWatts + houseDrift);
    if (sources.trucki !== 'live') {
      const needed = Math.max(0, house - cachedTelemetry.pvHoymilesWatts);
      cachedTelemetry.truckiActualOutputWatts = cachedTelemetry.truckiZeroExportEnabled
        ? Math.min(cachedTelemetry.truckiPowerLimitWatts, Math.round(needed))
        : 0;
    }
    if (sources.shelly !== 'live') {
      const g = Math.round(house - cachedTelemetry.pvHoymilesWatts - cachedTelemetry.truckiActualOutputWatts);
      cachedTelemetry.gridTotalWatts = g;
      cachedTelemetry.gridMode = g >= 0 ? 'Bezug' : 'Einspeisung';
    }
  }
}

async function updateLANTelemetry() {
  await Promise.allSettled([pollShelly(), pollAhoy(), pollTrucki()]);
  applyVenus();

  const sources: LiveSourceStatus = {
    shelly: isFresh('shelly') ? 'live' : 'simulated',
    ahoy: isFresh('ahoy') ? 'live' : 'simulated',
    trucki: isFresh('trucki') ? 'live' : 'simulated',
    venus: isFresh('venus') ? 'live' : 'simulated',
  };
  simulate(sources);

  // DC-gekoppelt: MPPT-Ladung geht direkt in den Akku und zaehlt NICHT zum Hausverbrauch.
  // Hausverbrauch = HM-1500 AC + SUN-Entladung AC + Netzbezug (Einspeisung negativ)
  const t = cachedTelemetry;
  t.pvTotalWatts = t.pvHoymilesWatts + t.pvVictronMppt1Watts + t.pvVictronMppt2Watts;
  t.houseTotalWatts = Math.max(0, Math.round(t.pvHoymilesWatts + t.truckiActualOutputWatts + t.gridTotalWatts));
  const sunDcDraw = t.truckiActualOutputWatts > 0 ? Math.round(t.truckiActualOutputWatts / 0.92) : 0;
  t.batteryWatts = t.pvVictronMppt1Watts + t.pvVictronMppt2Watts - sunDcDraw;
  t.batteryCurrent = t.batteryVoltage > 0 ? Math.round((t.batteryWatts / t.batteryVoltage) * 10) / 10 : 0;

  t.timestamp = new Date().toISOString();
  t.sources = sources;
  t.isLive = Object.values(sources).every((s) => s === 'live');
  t.isPartiallyLive = Object.values(sources).some((s) => s === 'live');
}

startMqtt();
setInterval(updateLANTelemetry, 2000);

// ==============================================================================
// REST API Endpoints
// ==============================================================================

// 1. Live Telemetriedaten
app.get('/api/telemetry/live', (_req, res) => {
  res.json({
    status: 'ok',
    data: cachedTelemetry,
    mqttConnected,
    serverUptimeSeconds: Math.floor(process.uptime()),
    queriedAt: new Date().toISOString(),
  });
});

// 2. Health & Host Status: echte TCP-Pruefung, keine Zufallswerte
function tcpProbe(host: string, port: number, timeoutMs = 800): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = net.connect({ host, port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok ? Date.now() - start : null);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

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
    },
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
      server: { middlewareMode: true },
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
