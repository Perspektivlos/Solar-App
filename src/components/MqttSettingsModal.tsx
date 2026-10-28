import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Server, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Info,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Clock
} from 'lucide-react';
import { MqttBrokerConfig, MqttConnectionStatus } from '../types';

interface MqttSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

const DEFAULT_CONFIG: MqttBrokerConfig = {
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

const SUGGESTED_TOPICS = [
  { topic: 'ahoy/#', label: 'AhoyDTU / Hoymiles HM-1500 (PV-Erzeugung)' },
  { topic: 'shellypro3em/#', label: 'Shelly Pro 3EM (Netz- & Phasenmessung)' },
  { topic: 'trucki/#', label: 'Trucki2Shelly Gateway (Nulleinspeisung)' },
  { topic: 'victron/#', label: 'Victron Venus OS & SmartSolar MPPTs' },
  { topic: 'N/b827eb79321c/#', label: 'Victron VRM D-Bus Publish (Live)' },
  { topic: 'solar/#', label: 'Gemeinsames Solar-Präfix (Wildcard)' },
];

export const MqttSettingsModal: React.FC<MqttSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<MqttBrokerConfig>(DEFAULT_CONFIG);
  const [connectionStatus, setConnectionStatus] = useState<MqttConnectionStatus>({
    connected: false,
    connecting: false,
    brokerUrl: 'mqtt://192.168.0.201:1883',
    lastMessageTime: null,
    messageCount: 0,
    activeTopics: [],
  });
  const [activeSource, setActiveSource] = useState<'mqtt' | 'http_rest' | 'none'>('none');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
  } | null>(null);

  // Load configuration from backend API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMqttConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/system/mqtt/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config && isMounted) {
            setConfig({
              ...DEFAULT_CONFIG,
              ...data.rawConfig,
            });
            if (data.connectionStatus) {
              setConnectionStatus(data.connectionStatus);
            }
            if (data.activeSource) {
              setActiveSource(data.activeSource);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load MQTT config, using defaults:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMqttConfig();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/system/mqtt/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving MQTT config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/mqtt/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setTestResult(json);
      } else {
        setTestResult({
          success: false,
          error: `HTTP Fehler: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Verbindungstest fehlgeschlagen',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (trimmed && !config.topics.includes(trimmed)) {
      setConfig(prev => ({
        ...prev,
        topics: [...prev.topics, trimmed],
      }));
      setNewTopicInput('');
    }
  };

  const handleRemoveTopic = (t: string) => {
    setConfig(prev => ({
      ...prev,
      topics: prev.topics.filter(item => item !== t),
    }));
  };

  const handleAddPreset = (t: string) => {
    if (!config.topics.includes(t)) {
      setConfig(prev => ({
        ...prev,
        topics: [...prev.topics, t],
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-white/[0.1] bg-[#090d16] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#070a11]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Mosquitto MQTT Broker Konfiguration
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  connectionStatus.connected 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                    : activeSource === 'http_rest'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  {connectionStatus.connected 
                    ? 'MQTT Online' 
                    : activeSource === 'http_rest'
                    ? 'HTTP-REST Fallback Aktiv'
                    : 'Getrennt'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                LXC 201 • Port 1883 • Automatische Umschaltung zwischen MQTT-Push und REST-Poll
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">

          {/* Redundancy & Priority Banner */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Redundanz-Architektur (MQTT-First mit HTTP-Fallback)
              </span>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Der Hub bezieht Live-Telemetrie primär in Echtzeit über den Mosquitto Broker. 
                Sollte der Broker nicht erreichbar sein, <strong>fällt die App verzögerungsfrei auf die HTTP-REST-Schnittstellen</strong> (Shelly, Ahoy, Trucki, Venus) zurück.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, priority: 'mqtt_first', enabled: true }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  config.priority === 'mqtt_first' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-800/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                ● MQTT-First (Empfohlen)
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, priority: 'http_only' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  config.priority === 'http_only' 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                Nur HTTP-REST
              </button>
            </div>
          </div>

          {/* Connection Parameters Form */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                Verbindungseinstellungen (Mosquitto LXC 201)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                <input 
                  type="checkbox" 
                  checked={config.enabled} 
                  onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-800"
                />
                <span>MQTT-Dienst aktivieren</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Host / IP */}
              <div className="sm:col-span-8">
                <label className="block text-slate-400 mb-1 text-[11px]">Broker Hostname oder IP-Adresse</label>
                <input
                  type="text"
                  value={config.host}
                  onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.0.201"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Port */}
              <div className="sm:col-span-4">
                <label className="block text-slate-400 mb-1 text-[11px]">Port (Standard: 1883)</label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 1883 }))}
                  placeholder="1883"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Client ID */}
              <div className="sm:col-span-12">
                <label className="block text-slate-400 mb-1 text-[11px]">Client-ID</label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="solar-lokal-hub"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-slate-300 font-mono focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Username */}
              <div className="sm:col-span-6">
                <label className="block text-slate-400 mb-1 text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Benutzername (Optional)
                </label>
                <input
                  type="text"
                  value={config.username || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="leer lassen falls unauthentifiziert"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Password */}
              <div className="sm:col-span-6">
                <label className="block text-slate-400 mb-1 text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Passwort (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Verbergen' : 'Anzeigen'}</span>
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Passwort eingeben..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            {/* Test Connection Action */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-slate-400">
                {testResult ? (
                  <span className={testResult.success ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.success 
                      ? `✓ ${testResult.message} (${testResult.latencyMs} ms)` 
                      : `✖ ${testResult.error}`}
                  </span>
                ) : (
                  <span>Prüft Handshake und Zugangsdaten direkt gegen {config.host}:{config.port}</span>
                )}
              </div>

              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 text-xs font-mono transition-all disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Verbinde...' : 'Verbindung testen'}</span>
              </button>
            </div>
          </div>

          {/* Subscribed Topics Management */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Abonnierte MQTT-Topics ({config.topics.length})
              </span>
            </div>

            {/* Quick add suggestions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-500">Vorlagen hinzufügen:</span>
              {SUGGESTED_TOPICS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(s.topic)}
                  disabled={config.topics.includes(s.topic)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                    config.topics.includes(s.topic)
                      ? 'border-white/[0.04] text-slate-600 cursor-not-allowed bg-slate-950/40'
                      : 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15'
                  }`}
                  title={s.label}
                >
                  + {s.topic}
                </button>
              ))}
            </div>

            {/* Active Topics List */}
            <div className="flex flex-wrap gap-2 pt-2">
              {config.topics.map((t, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                    title="Topic entfernen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Topic Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                placeholder="Eigenes Topic hinzufügen (z. B. inverter/live oder solar/#)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-sky-500 text-xs"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-white/[0.08]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Hinzufügen</span>
              </button>
            </div>
          </div>

          {/* Live Telemetry Stream Telemetry Stats */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Aktive Quelle</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {activeSource === 'mqtt' ? 'Mosquitto MQTT' : activeSource === 'http_rest' ? 'HTTP-REST Fallback' : 'Keine (Offline)'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Empfangene Pakete</div>
              <div className="text-xs font-bold text-sky-400 mt-0.5">{connectionStatus.messageCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Letzte Nachricht</div>
              <div className="text-xs font-bold text-slate-300 mt-0.5">
                {connectionStatus.lastMessageTime 
                  ? new Date(connectionStatus.lastMessageTime).toLocaleTimeString('de-DE') 
                  : 'Ausstehend'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Verbindungs-URL</div>
              <div className="text-xs font-bold text-slate-300 mt-0.5 truncate">{connectionStatus.brokerUrl}</div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.08] bg-[#070a11]/90">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Auf Standard-Broker (192.168.0.201:1883) zurücksetzen?')) {
                setConfig(DEFAULT_CONFIG);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Standardwerte laden</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                In mqtt-config.json gespeichert!
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
            >
              Schließen
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Speichere...' : 'Im LXC speichern & neu verbinden'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
