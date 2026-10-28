import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Wifi, 
  Activity, 
  ShieldCheck, 
  RotateCcw, 
  Save, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Radio,
  Zap,
  Info
} from 'lucide-react';
import { HardwareNetworkConfig, HardwareDeviceConfig, HardwarePingResult } from '../types';

interface HardwareConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

const DEFAULT_CONFIG: HardwareNetworkConfig = {
  devices: {
    shelly: {
      id: 'shelly',
      name: 'Shelly Pro 3EM (Smart Meter)',
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
      name: 'Trucki2Shelly Gateway (T2SG)',
      host: '192.168.0.102',
      port: 80,
      endpoint: '/log.txt',
      enabled: true,
      timeoutMs: 1200,
    },
    venus: {
      id: 'venus',
      name: 'Victron Venus OS (Cerbo GX / MPPTs)',
      host: '192.168.0.111',
      port: 80,
      endpoint: '/app/',
      enabled: true,
      timeoutMs: 1200,
    },
  },
  strictLiveOnly: true,
  demoSimulationAllowed: false,
};

export const HardwareConfigModal: React.FC<HardwareConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<HardwareNetworkConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [pingResults, setPingResults] = useState<Record<string, HardwarePingResult>>({});
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [expandedPayload, setExpandedPayload] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'endpoints' | 'diagnostic' | 'help'>('endpoints');

  // Load configuration from API on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/system/network/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config && isMounted) {
            setConfig({
              devices: {
                shelly: { ...DEFAULT_CONFIG.devices.shelly, ...(data.config.devices?.shelly || {}) },
                ahoy: { ...DEFAULT_CONFIG.devices.ahoy, ...(data.config.devices?.ahoy || {}) },
                trucki: { ...DEFAULT_CONFIG.devices.trucki, ...(data.config.devices?.trucki || {}) },
                venus: { ...DEFAULT_CONFIG.devices.venus, ...(data.config.devices?.venus || {}) },
              },
              strictLiveOnly: typeof data.config.strictLiveOnly === 'boolean' ? data.config.strictLiveOnly : true,
              demoSimulationAllowed: typeof data.config.demoSimulationAllowed === 'boolean' ? data.config.demoSimulationAllowed : false,
            });
          }
        }
      } catch (err) {
        console.warn('Could not load hardware config from server, using local defaults', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeviceChange = (
    devKey: keyof HardwareNetworkConfig['devices'],
    field: keyof HardwareDeviceConfig,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      devices: {
        ...prev.devices,
        [devKey]: {
          ...prev.devices[devKey],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/system/network/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          strictLiveOnly: config.strictLiveOnly,
          demoSimulationAllowed: config.demoSimulationAllowed,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving hardware config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Möchten Sie alle IP-Adressen und Ports auf die Standard-Werte des Netzwerkplans (192.168.0.100-111) zurücksetzen?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  const handlePing = async (devKey: keyof HardwareNetworkConfig['devices']) => {
    setPinging(prev => ({ ...prev, [devKey]: true }));
    const dev = config.devices[devKey];

    try {
      const res = await fetch('/api/system/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: devKey,
          host: dev.host,
          port: dev.port,
          endpoint: dev.endpoint,
          timeoutMs: dev.timeoutMs,
        }),
      });

      if (res.ok) {
        const result = (await res.json()) as HardwarePingResult;
        setPingResults(prev => ({ ...prev, [devKey]: result }));
      }
    } catch (err: any) {
      setPingResults(prev => ({
        ...prev,
        [devKey]: {
          deviceId: devKey,
          success: false,
          latencyMs: 0,
          statusCode: null,
          rawSnippet: '',
          error: err?.message || 'Verbindung fehlgeschlagen',
          testedUrl: `http://${dev.host}:${dev.port}${dev.endpoint}`,
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setPinging(prev => ({ ...prev, [devKey]: false }));
    }
  };

  const handlePingAll = async () => {
    const keys: (keyof HardwareNetworkConfig['devices'])[] = ['shelly', 'ahoy', 'trucki', 'venus'];
    for (const key of keys) {
      if (config.devices[key].enabled) {
        await handlePing(key);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-white/[0.1] bg-[#090d16] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#070a11]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Hardware-Schnittstellen & Live-Daten Manager
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  config.strictLiveOnly 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}>
                  {config.strictLiveOnly ? 'Strikter Live-Modus' : 'Demo-Modus aktiv'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direkte IP- und Port-Verwaltung für Shelly, AhoyDTU, Trucki Gateway und Venus OS im lokalen LAN.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.06] bg-slate-900/40 text-xs">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'endpoints'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>LAN-Geräte & Endpunkte (4)</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'diagnostic'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live-Ping & Payload-Diagnose</span>
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'help'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Proxmox LXC Leitfaden</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">

          {/* Mode Switcher Banner */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Telemetrie-Modus nach Installation
              </span>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Im reinen Live-Modus werden <strong>keine künstlichen Watt-Werte</strong> generiert. 
                Sollte ein Gerät offline sein, zeigt das Dashboard ehrlich <code>Offline / Nicht erfasst</code> statt Fantasiezahlen.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, strictLiveOnly: true, demoSimulationAllowed: false }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  config.strictLiveOnly 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' 
                    : 'bg-slate-800/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                ● Reiner Live-Modus (Empfohlen)
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, strictLiveOnly: false, demoSimulationAllowed: true }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  !config.strictLiveOnly 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' 
                    : 'bg-slate-800/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                Demo-Simulation
              </button>
            </div>
          </div>

          {/* Tab: Endpoints Configuration */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Physische Hardware-Gegenstellen im Subnetz 192.168.0.0/24
                </span>
                <button
                  onClick={handlePingAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all font-mono"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Alle 4 Geräte anpingen</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(config.devices) as (keyof HardwareNetworkConfig['devices'])[]).map((key) => {
                  const dev = config.devices[key];
                  const ping = pingResults[key];
                  const isPinging = pinging[key];

                  return (
                    <div 
                      key={key}
                      className="p-4 rounded-xl border border-white/[0.08] bg-slate-900/40 space-y-3 hover:border-white/[0.12] transition-colors"
                    >
                      {/* Device Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            ping?.success 
                              ? 'bg-emerald-400 animate-pulse' 
                              : ping ? 'bg-rose-500' : 'bg-slate-600'
                          }`} />
                          <span className="font-semibold text-slate-100">{dev.name}</span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={dev.enabled} 
                            onChange={(e) => handleDeviceChange(key, 'enabled', e.target.checked)}
                            className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-800"
                          />
                          <span>Aktiv</span>
                        </label>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-12 gap-2 text-[11px]">
                        <div className="col-span-8">
                          <label className="block text-slate-400 mb-1">IP-Adresse / Hostname</label>
                          <input
                            type="text"
                            value={dev.host}
                            onChange={(e) => handleDeviceChange(key, 'host', e.target.value)}
                            placeholder="z.B. 192.168.0.100"
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-4">
                          <label className="block text-slate-400 mb-1">Port</label>
                          <input
                            type="number"
                            value={dev.port}
                            onChange={(e) => handleDeviceChange(key, 'port', parseInt(e.target.value) || 80)}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-12">
                          <label className="block text-slate-400 mb-1">API-Endpunkt-Pfad</label>
                          <input
                            type="text"
                            value={dev.endpoint}
                            onChange={(e) => handleDeviceChange(key, 'endpoint', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950/80 border border-white/[0.08] text-slate-300 font-mono text-[10px] focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Live Ping Action & Status Indicator */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                        <div className="font-mono text-[10px]">
                          {ping ? (
                            <span className={ping.success ? 'text-emerald-400' : 'text-rose-400'}>
                              {ping.success 
                                ? `✓ Online (${ping.latencyMs} ms, HTTP ${ping.statusCode})` 
                                : `✖ ${ping.error || 'Nicht erreichbar'}`}
                            </span>
                          ) : (
                            <span className="text-slate-500">Noch nicht getestet</span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isPinging || !dev.enabled}
                          onClick={() => handlePing(key)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                            isPinging 
                              ? 'bg-slate-800 text-slate-500 border-white/[0.04]' 
                              : 'bg-slate-800/80 text-sky-300 border-sky-500/30 hover:bg-sky-500/10'
                          }`}
                        >
                          <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                          <span>{isPinging ? 'Pinge...' : 'Test-Ping'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Detailed Diagnostic & Raw Responses */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 text-slate-300 text-xs">
                Hier können Sie die unveränderten Rohdaten (JSON oder Plain-Text) einsehen, die das Container-Backend direkt von den Hardware-Endgeräten empfängt.
              </div>

              <div className="space-y-3">
                {(Object.keys(config.devices) as (keyof HardwareNetworkConfig['devices'])[]).map((key) => {
                  const dev = config.devices[key];
                  const ping = pingResults[key];
                  const isExpanded = expandedPayload[key];

                  return (
                    <div key={key} className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{dev.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            http://{dev.host}:{dev.port}{dev.endpoint}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePing(key)}
                            className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-white/[0.06] hover:bg-slate-700 text-[11px] font-mono"
                          >
                            Abfragen
                          </button>
                          {ping?.rawSnippet && (
                            <button
                              type="button"
                              onClick={() => setExpandedPayload(prev => ({ ...prev, [key]: !prev[key] }))}
                              className="text-slate-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {ping && (
                        <div className="font-mono text-[11px] flex items-center gap-3 text-slate-400">
                          <span>Status: <strong className={ping.success ? 'text-emerald-400' : 'text-rose-400'}>{ping.statusCode || 'Fehlgeschlagen'}</strong></span>
                          <span>Latenz: <strong className="text-sky-300">{ping.latencyMs} ms</strong></span>
                          <span>Zeitpunkt: {new Date(ping.timestamp).toLocaleTimeString('de-DE')}</span>
                        </div>
                      )}

                      {ping?.error && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[11px]">
                          Fehler: {ping.error} (Im lokalen LXC prüfen, ob das Gerät eingeschaltet und Ping-Antwort im LAN möglich ist).
                        </div>
                      )}

                      {ping?.rawSnippet && (
                        <div className="mt-2">
                          <div className="text-[10px] text-slate-400 mb-1 font-mono">Roh-Payload Ausschnitt:</div>
                          <pre className="p-2.5 rounded bg-slate-950 border border-white/[0.05] font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-36">
                            {ping.rawSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Proxmox LXC Help Guide */}
          {activeTab === 'help' && (
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2">
                <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Wie gelangen die echten Live-Daten in die App?
                </h3>
                <p>
                  In der Entwicklungs-Vorschau (Cloud Sandbox) können private IP-Adressen wie <code>192.168.0.100</code> aus Sicherheitsgründen nicht vom Google Cloud Server erreicht werden.
                </p>
                <p>
                  <strong>Sobald die App in Ihrem Proxmox LXC-Container (z.B. Container ID 220, IP 192.168.0.220) installiert ist:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                  <li>Das integrierte Node.js Express-Backend läuft direkt in Ihrem Heimnetzwerk.</li>
                  <li>Alle 2 Sekunden pollt das Backend via HTTP die REST-Schnittstellen von Shelly, AhoyDTU, Trucki und Venus OS.</li>
                  <li>Es gibt keinen Cloud-Umweg und kein Internet-Tracking – alles bleibt 100% lokal in Ihrem LAN.</li>
                  <li>Sie sehen exakt die ungeschönten Live-Wattzahlen Ihrer physischen PV-Module und des Zählers.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-slate-900/40 space-y-2">
                <h4 className="font-semibold text-slate-200">Häufige Ursachen für "Offline"-Meldungen im Heimnetz:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="p-2.5 rounded bg-slate-950/60 border border-white/[0.04]">
                    <strong className="text-amber-300 block mb-1">Hoymiles HM-1500 / AhoyDTU:</strong>
                    Nachts schalten Hoymiles-Wechselrichter mangels DC-Spannung ab. Die AhoyDTU meldet dann 0W oder Standby. Das ist normal!
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-white/[0.04]">
                    <strong className="text-sky-300 block mb-1">Proxmox LXC Netzwerk-Bridge:</strong>
                    Stellen Sie sicher, dass der LXC-Container an der Bridge <code>vmbr0</code> hängt und eine IP im selben Subnetz wie die Geräte besitzt (z.B. 192.168.0.220/24).
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.08] bg-[#070a11]/90">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Standard-IPs wiederherstellen</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Gespeichert!
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
            >
              Abbrechen
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Speichere...' : 'Konfiguration im LXC speichern'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
