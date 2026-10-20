import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Layers, 
  Check, 
  Zap, 
  BatteryCharging, 
  ShieldCheck, 
  Server, 
  Radio, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Save, 
  Clock, 
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Copy,
  AlertCircle
} from 'lucide-react';
import { SolarTelemetry } from '../types';

interface ControlAndScriptsProps {
  telemetry: SolarTelemetry;
  onUpdateLimit: (type: 'trucki' | 'hoymiles', value: number) => void;
  onToggleZeroExport: () => void;
  onNavigateToReport?: () => void;
}

export const ControlAndScripts: React.FC<ControlAndScriptsProps> = ({
  telemetry,
  onUpdateLimit,
  onToggleZeroExport,
  onNavigateToReport
}) => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'control' | 'mqtt_acl'>('integrations');
  
  // Regulation inputs
  const [truckiInput, setTruckiInput] = useState<number>(telemetry.truckiPowerLimitWatts);
  const [hoymilesInput, setHoymilesInput] = useState<number>(telemetry.hoymilesLimitPercent);

  // Integrations state (matching uploaded design)
  const [mqttEnabled, setMqttEnabled] = useState(true);
  const [mqttHost, setMqttHost] = useState('192.168.0.201');
  const [mqttPort, setMqttPort] = useState('1883');
  const [mqttUser, setMqttUser] = useState('mqttapp');
  const [mqttPass, setMqttPass] = useState('secureMqtt2026!');
  const [mqttTopicPrefix, setMqttTopicPrefix] = useState('trucki/#');
  const [showMqttPass, setShowMqttPass] = useState(false);

  // Victron VenusOS MQTT-Bridge state
  const [victronEnabled, setVictronEnabled] = useState(true);
  const [vrmPortalId, setVrmPortalId] = useState('b827eb79321c');
  const [deviceInstances, setDeviceInstances] = useState('288, 289');

  // InfluxDB 2.x state
  const [influxEnabled, setInfluxEnabled] = useState(true);
  const [influxUrl, setInfluxUrl] = useState('http://192.168.0.203:8086');
  const [influxOrg, setInfluxOrg] = useState('Solar Lokal');
  const [influxBucket, setInfluxBucket] = useState('solar');
  const [influxToken, setInfluxToken] = useState('tok_solar_live_influx2_7x9923849182348a');
  const [showInfluxToken, setShowInfluxToken] = useState(false);

  // Dynamic status counters & feedback
  const [pollerSnapshots, setPollerSnapshots] = useState(169);
  const [influxWrites, setInfluxWrites] = useState(169);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Timestamps for dynamic messages
  const [lastMqttShellyTime, setLastMqttShellyTime] = useState('2026-10-20T14:17:48.875077+00:00');
  const [lastMqttAhoyTime, setLastMqttAhoyTime] = useState('2026-10-20T13:33:23.260468+00:00');
  const [lastVictronTime, setLastVictronTime] = useState('2026-10-20T14:17:53.699750+00:00');

  // Realistic snapshot poll ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setPollerSnapshots(prev => prev + 1);
      setInfluxWrites(prev => prev + 1);
      const isoNow = new Date().toISOString();
      setLastVictronTime(isoNow);
      setLastMqttShellyTime(isoNow);
    }, 15000); // pro Snapshot (alle 15 s)

    return () => clearInterval(interval);
  }, []);

  const handleSaveAndConnect = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3500);
    }, 600);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const victronTotalWatts = telemetry.pvVictronMppt1Watts + telemetry.pvVictronMppt2Watts;

  const MOSQUITTO_ACL_CONFIG = `# /etc/mosquitto/conf.d/solar_hardened.conf
# ==============================================================================
# Mosquitto MQTT Broker Konfiguration mit striktem ACL-Hardening
# ==============================================================================
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

# 3. Trucki 2 Shelly Gateway (Liest Shelly Grid & schreibt Trucki Status)
user trucki_gateway
topic read venus/grid/shellypro/#
topic write Trucki/#
topic read Trucki/cmd/#

# 4. Venus OS (Victron MPPTs & JK-BMS)
user victron_venus
topic write N/d4aa81/#
topic write venus/battery/lifepo4/#
topic read R/d4aa81/#

# 5. Solar-Lokal-App Core (Lesezugriff auf alles, Schreibzugriff auf Steuerung)
user solar_app
topic read #
topic write Trucki/cmd/#
topic write venus/pv/ahoydtu/+/cmd/#
`;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Navigation Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Steuerung & Externe Integrationen
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verbindungsdaten für Mosquitto MQTT, InfluxDB 2.x, Victron VenusOS Bridge & Nulleinspeise-Regelung
            </p>
          </div>

          {/* Subnavigation Tabs */}
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-white/[0.08] text-xs font-medium overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'integrations' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Integrationen</span>
            </button>

            <button
              onClick={() => setActiveTab('control')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'control' 
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Live-Regelung</span>
            </button>

            <button
              onClick={() => setActiveTab('mqtt_acl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'mqtt_acl' 
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mosquitto ACL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Script migration banner info */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06] text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Proxmox Automatisierung:</strong> Die fertigen Python-Skripte (<code className="text-amber-300">create_proxmox_lxc.py</code> & <code className="text-emerald-300">install_solar_app.py</code>) befinden sich jetzt übersichtlich im <strong>Anlagenbericht</strong>.
          </span>
        </div>
        {onNavigateToReport && (
          <button 
            onClick={onNavigateToReport}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-medium ml-3 shrink-0"
          >
            <span>Zum Anlagenbericht</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ============================================================================== */}
      {/* TAB 1: INTEGRATIONEN (EXACT MATCH FOR USER SCREENSHOT & REQUIREMENTS) */}
      {/* ============================================================================== */}
      {activeTab === 'integrations' && (
        <div className="space-y-5">
          
          {/* Header Bar with Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Integrationen</span>
              <span className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-normal">
                SYSTEM-CONNECTORS
              </span>
            </h1>

            <button
              onClick={handleSaveAndConnect}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verbinde...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SPEICHERN & VERBINDEN</span>
                </>
              )}
            </button>
          </div>

          {/* Success Toast Banner */}
          {saveSuccessToast && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Konfiguration erfolgreich gespeichert:</strong> MQTT-Broker, VenusOS MQTT-Bridge und InfluxDB 2.x Writer sind aktiv und synchronisiert.
                </span>
              </div>
              <span className="text-[10px] font-mono-code text-emerald-400/80">SYNCHRONISIERT</span>
            </div>
          )}

          {/* Status Strip matching screenshot */}
          <div className="glass-panel rounded-xl border border-white/[0.08] px-4 py-3 flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-mono-code text-slate-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mqttEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${mqttEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              </span>
              <span className="text-slate-400">MQTT:</span>
              <span className={`font-bold ${mqttEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {mqttEnabled ? 'VERBUNDEN' : 'GETRENNT'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${influxEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${influxEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              </span>
              <span className="text-slate-400">INFLUXDB:</span>
              <span className={`font-bold ${influxEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {influxEnabled ? 'VERBUNDEN' : 'GETRENNT'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${victronEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${victronEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              </span>
              <span className="text-slate-400">VICTRON-MQTT:</span>
              <span className={`font-bold ${victronEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {victronEnabled ? 'VERBUNDEN' : 'GETRENNT'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400"></span>
              <span className="text-slate-400">POLLER:</span>
              <span className="font-bold text-sky-400">
                {pollerSnapshots} SNAPSHOTS
              </span>
            </div>
          </div>

          {/* ============================================================================== */}
          {/* CARD 1: MQTT - MOSQUITTO */}
          {/* ============================================================================== */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Radio className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-mono-code font-bold text-xs uppercase tracking-wider text-slate-200">
                  MQTT - MOSQUITTO
                </h3>
              </div>

              {/* iOS style toggle */}
              <button
                type="button"
                onClick={() => setMqttEnabled(!mqttEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mqttEnabled ? 'bg-sky-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    mqttEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  HOST
                </label>
                <input
                  type="text"
                  value={mqttHost}
                  onChange={(e) => setMqttHost(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="192.168.0.201"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  PORT
                </label>
                <input
                  type="text"
                  value={mqttPort}
                  onChange={(e) => setMqttPort(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="1883"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  BENUTZER
                </label>
                <input
                  type="text"
                  value={mqttUser}
                  onChange={(e) => setMqttUser(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="mqttapp"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold flex items-center justify-between">
                  <span>PASSWORT</span>
                  <button
                    type="button"
                    onClick={() => setShowMqttPass(!showMqttPass)}
                    className="text-slate-500 hover:text-slate-300 text-[10px] lowercase"
                  >
                    {showMqttPass ? 'verbergen' : 'anzeigen'}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showMqttPass ? 'text' : 'password'}
                    value={mqttPass}
                    onChange={(e) => setMqttPass(e.target.value)}
                    className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50 pr-8"
                    placeholder="••••••••"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  TOPIC-PREFIX
                </label>
                <input
                  type="text"
                  value={mqttTopicPrefix}
                  onChange={(e) => setMqttTopicPrefix(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="trucki/# oder solar/"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Zusätzlicher generischer Subscribe für benutzerdefinierte Topics (z. B. <code>solar/</code>)
                </p>
              </div>
            </div>

            {/* Sub-block: Weitere Geräte via MQTT */}
            <div className="pt-3 border-t border-white/[0.06] text-xs font-mono-code text-slate-400 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                WEITERE GERÄTE VIA MQTT
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]">
                <div>
                  <span className="text-slate-300">Shelly:</span>{' '}
                  <span className="text-emerald-400">{lastMqttShellyTime}</span>
                </div>
                <div>
                  <span className="text-slate-300">Ahoy DTU:</span>{' '}
                  <span className="text-emerald-400">{lastMqttAhoyTime}</span>
                </div>
                <div>
                  <span className="text-slate-300">Trucki:</span>{' '}
                  <span className="text-amber-400">- (8 Keys aktiv)</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Automatisch abonniert:{' '}
                <code className="text-slate-400 bg-black/40 px-1 py-0.5 rounded">venus/pv/ahoydtu/#</code>,{' '}
                <code className="text-slate-400 bg-black/40 px-1 py-0.5 rounded">venus/grid/shellypro/#</code>,{' '}
                <code className="text-slate-400 bg-black/40 px-1 py-0.5 rounded">Trucki/#</code>
              </div>
            </div>
          </div>

          {/* ============================================================================== */}
          {/* CARD 2: VICTRON VENUSOS - MQTT-BRIDGE */}
          {/* ============================================================================== */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="font-mono-code font-bold text-xs uppercase tracking-wider text-slate-200">
                    VICTRON VENUSOS - MQTT-BRIDGE
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono-code mt-1">
                  Liest die MPPT-Lader aus VenusOS via MQTT. Topics: <code className="text-sky-300">N/&lt;VRM-ID&gt;/solarcharger/&lt;Instance&gt;/#</code>. Keep-Alive automatisch alle 30 s.
                </p>
              </div>

              {/* iOS style toggle */}
              <button
                type="button"
                onClick={() => setVictronEnabled(!victronEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  victronEnabled ? 'bg-sky-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    victronEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  VRM PORTAL-ID
                </label>
                <input
                  type="text"
                  value={vrmPortalId}
                  onChange={(e) => setVrmPortalId(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="b827eb79321c"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Aus VenusOS unter <em>Settings → VRM online portal</em>
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  DEVICE-INSTANCES (KOMMAGETRENNT)
                </label>
                <input
                  type="text"
                  value={deviceInstances}
                  onChange={(e) => setDeviceInstances(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="288, 289"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  MPPT Lader Instanzen auf dem D-Bus (z. B. SmartSolar 150/35 & 100/20)
                </p>
              </div>
            </div>

            {/* Live Victron Telemetry Box matching screenshot */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] text-xs font-mono-code text-slate-300 space-y-1.5">
              <div>
                <span className="text-slate-400">Letzte Nachricht:</span>{' '}
                <span className="text-slate-200">{lastVictronTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">System PV-Power:</span>
                <span className="text-amber-400 font-bold text-sm">
                  {victronTotalWatts.toFixed(2)} W
                </span>
                <span className="text-[10px] text-slate-500">
                  (Hoymiles {telemetry.pvHoymilesWatts}W zusätzlich direkt am AC-Netz)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.05] space-y-0.5">
                <div>
                  <strong className="text-slate-300">Instance 288:</strong> 524 Felder • Yield/Power ={' '}
                  <span className="text-amber-300 font-bold">{telemetry.pvVictronMppt1Watts} W</span> • VBatt 53.45000076293945 V • State 3 (Bulk)
                </div>
                <div>
                  <strong className="text-slate-300">Instance 289:</strong> 524 Felder • Yield/Power ={' '}
                  <span className="text-amber-300 font-bold">{telemetry.pvVictronMppt2Watts} W</span> • VBatt 53.459999084472656 V • State 3 (Bulk)
                </div>
              </div>
              <div className="text-[10px] text-sky-400 pt-1">
                Abo aktiv: <code>N/{vrmPortalId}/#</code> • Backend sendet alle 30 s <code>R/{vrmPortalId}/keepalive</code>
              </div>
            </div>
          </div>

          {/* ============================================================================== */}
          {/* CARD 3: INFLUXDB 2.X */}
          {/* ============================================================================== */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Database className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-mono-code font-bold text-xs uppercase tracking-wider text-slate-200">
                  INFLUXDB 2.X
                </h3>
              </div>

              {/* iOS style toggle */}
              <button
                type="button"
                onClick={() => setInfluxEnabled(!influxEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  influxEnabled ? 'bg-sky-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    influxEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  URL
                </label>
                <input
                  type="text"
                  value={influxUrl}
                  onChange={(e) => setInfluxUrl(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="http://192.168.0.203:8086"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  ORGANISATION
                </label>
                <input
                  type="text"
                  value={influxOrg}
                  onChange={(e) => setInfluxOrg(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="Solar Lokal"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                  BUCKET
                </label>
                <input
                  type="text"
                  value={influxBucket}
                  onChange={(e) => setInfluxBucket(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50"
                  placeholder="solar"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold flex items-center justify-between">
                  <span>TOKEN</span>
                  <button
                    type="button"
                    onClick={() => setShowInfluxToken(!showInfluxToken)}
                    className="text-slate-500 hover:text-slate-300 text-[10px] lowercase"
                  >
                    {showInfluxToken ? 'verbergen' : 'anzeigen'}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showInfluxToken ? 'text' : 'password'}
                    value={influxToken}
                    onChange={(e) => setInfluxToken(e.target.value)}
                    className="w-full bg-[#050811] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500/50 pr-8"
                    placeholder="••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Influx writes status line matching screenshot */}
            <div className="pt-3 border-t border-white/[0.06] text-xs font-mono-code text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold">Writes:</span>
                <span className="text-sky-400 font-bold">{influxWrites}</span>
                <span className="text-[10px] text-slate-500">(Snapshot alle 15 s)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Backend schreibt parallel zu Telegraf pro Snapshot (alle 15 s) Felder: <code className="text-slate-300">pv_power={telemetry.pvTotalWatts}</code>, <code className="text-slate-300">grid_power={telemetry.gridTotalWatts}</code>, <code className="text-slate-300">battery_power={telemetry.batteryWatts}</code>, <code className="text-slate-300">house_power={telemetry.houseTotalWatts}</code>, <code className="text-slate-300">battery_soc={telemetry.batterySocPercent}</code> in Measurement <code>solar</code>.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 2: LIVE-REGELUNG (TRUCKI ZERO-EXPORT & LIMITS) */}
      {/* ============================================================================== */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          
          {/* Trucki Zero-Export Hardware Gateway */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Trucki 2 Shelly Gateway (RS485 Sun-2000)
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      AKTIV
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Moduliert den Sun-2000 Inverter in Echtzeit anhand des Shelly Pro 3EM Hausnetz-Saldowertes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleZeroExport}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                    telemetry.zeroExportActive
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  {telemetry.zeroExportActive ? 'Nulleinspeisung: AKTIV' : 'Nulleinspeisung: MANUELL'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block mb-1">
                  Aktuelle Inverterleistung:
                </span>
                <span className="text-xl font-bold font-mono-code text-sky-400">
                  {telemetry.truckiActualOutputWatts} W
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Aus Batterie eingespeist</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block mb-1">
                  Netz-Zielsaldo:
                </span>
                <span className="text-xl font-bold font-mono-code text-emerald-400">
                  {telemetry.truckiTargetGridWatts} W
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Soll-Bezug zur Vermeidung von Rückspeisung</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block mb-1">
                  Maximale Obergrenze:
                </span>
                <span className="text-xl font-bold font-mono-code text-amber-400">
                  {telemetry.truckiPowerLimitWatts} W
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Schutzgrenze Wechselrichter</span>
              </div>
            </div>

            {/* Slider Control */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Sun-2000 Power-Limit (0 - 1800W):</span>
                <span className="font-mono-code text-amber-400 font-bold text-sm">{truckiInput} W</span>
              </div>
              <input
                type="range"
                min="0"
                max="1800"
                step="50"
                value={truckiInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTruckiInput(val);
                  onUpdateLimit('trucki', val);
                }}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                <span>0 W (Aus)</span>
                <span>600 W (Balkonkraftwerk)</span>
                <span>1000 W</span>
                <span>1800 W (Max Dauerlast)</span>
              </div>
            </div>
          </div>

          {/* Hoymiles Inverter Limit Control */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Hoymiles HM-1500 Drosselung (AhoyDTU API)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Regelt die AC-Leistung der 4 Module über AhoyDTU nRF24 Funkverbindung
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Leistungsbegrenzung in Prozent:</span>
                <span className="font-mono-code text-sky-400 font-bold text-sm">{hoymilesInput} %</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={hoymilesInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHoymilesInput(val);
                  onUpdateLimit('hoymiles', val);
                }}
                className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                <span>10% (150W)</span>
                <span>50% (750W)</span>
                <span>80% (1200W)</span>
                <span>100% (1500W Peak)</span>
              </div>
            </div>
          </div>

          {/* 48V LiFePO4 Schutzschwellwerte */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BatteryCharging className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Batterie-Schutzschwellwerte (JK-BMS / VenusOS)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  15.36 kWh 48V Speicher (6x Power Queen 100Ah parallel)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono-code">Cut-off Unterspannung:</span>
                <span className="text-base font-bold text-amber-400 font-mono-code">48.0 V (15% SoC)</span>
                <span className="text-[10px] text-slate-500 block mt-1">Trucki stoppt Entladung</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono-code">Float / Erhaltungsspannung:</span>
                <span className="text-base font-bold text-emerald-400 font-mono-code">54.4 V (3.40V/Zelle)</span>
                <span className="text-[10px] text-slate-500 block mt-1">Victron MPPT Erhaltung</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono-code">Max. Entladestrom:</span>
                <span className="text-base font-bold text-sky-400 font-mono-code">40.0 A (~2100W)</span>
                <span className="text-[10px] text-slate-500 block mt-1">JK-BMS 100A Dauerlast</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 3: MOSQUITTO ACL HARDENING */}
      {/* ============================================================================== */}
      {activeTab === 'mqtt_acl' && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-white tracking-tight">
                  Mosquitto ACL Sicherheitskonfiguration (/etc/mosquitto/aclfile)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gewährleistet Least-Privilege Zugriff für Shelly, AhoyDTU, Trucki und VenusOS
              </p>
            </div>
            <button
              onClick={() => handleCopy('mosq_acl_ctrl', MOSQUITTO_ACL_CONFIG)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
            >
              {copiedScript === 'mosq_acl_ctrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copiedScript === 'mosq_acl_ctrl' ? 'Kopiert!' : 'ACL kopieren'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed">
            {MOSQUITTO_ACL_CONFIG}
          </pre>
        </div>
      )}

    </div>
  );
};
