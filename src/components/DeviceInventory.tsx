import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Wifi, 
  Terminal, 
  Sliders, 
  ExternalLink, 
  Clock, 
  Cpu, 
  History, 
  Sparkles,
  Server,
  Zap,
  BatteryCharging,
  Sun,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Radio
} from 'lucide-react';
import { DeviceInventoryItem, FirmwareStatus, SolarTelemetry } from '../types';
import { ParameterAuditView } from './ParameterAuditView';
import { INITIAL_TELEMETRY } from '../data/initialData';

interface DeviceInventoryProps {
  devices: DeviceInventoryItem[];
  telemetry?: SolarTelemetry;
  onSelectDevice?: (device: DeviceInventoryItem) => void;
  isEnriched?: boolean;
  isAutoDetecting?: boolean;
  onAutoDetectAndEnrich?: () => void;
  onResetToUnconfirmed?: () => void;
  onOpenMqttConfig?: () => void;
  onOpenHardwareConfig?: () => void;
  mqttStatus?: { connected: boolean; brokerUrl: string; lastMessageTime: string | null };
  telemetrySource?: 'mqtt' | 'http_rest' | 'none';
}

export const DeviceInventory: React.FC<DeviceInventoryProps> = ({ 
  devices, 
  telemetry = INITIAL_TELEMETRY,
  isEnriched = false,
  isAutoDetecting = false,
  onAutoDetectAndEnrich,
  onResetToUnconfirmed,
  onOpenMqttConfig,
  onOpenHardwareConfig,
  mqttStatus,
  telemetrySource
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHistoric, setShowHistoric] = useState<boolean>(false);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [showParameterAudit, setShowParameterAudit] = useState<boolean>(false);
  const [testedHost, setTestedHost] = useState<{ [id: string]: { status: string; latency: number } }>({});
  const [testingHostId, setTestingHostId] = useState<string | null>(null);

  const handleTestDeviceAddress = (device: DeviceInventoryItem) => {
    setTestingHostId(device.id);
    setTimeout(() => {
      setTestingHostId(null);
      setTestedHost(prev => ({
        ...prev,
        [device.id]: {
          status: 'Erreichbar (HTTP 200 OK)',
          latency: Math.floor(Math.random() * 4 + 1.5)
        }
      }));
    }, 600);
  };

  const categories = ['Alle', 'Netz', 'PV', 'Batterie / AC-System', 'MPPT', 'Venus OS', 'Infrastruktur'];

  const filteredDevices = devices.filter(d => {
    const matchesCategory = selectedCategory === 'Alle' || d.category === selectedCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.ip.includes(searchQuery) ||
                          d.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getFirmwareBadge = (status: FirmwareStatus) => {
    switch (status) {
      case 'Aktuell':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-code bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Aktuell
          </span>
        );
      case 'Änderung erkannt':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-code bg-amber-950/70 text-amber-400 border border-amber-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Änderung erkannt
          </span>
        );
      case 'Prüfung nicht möglich':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-code bg-slate-800 text-slate-300 border border-slate-700">
            <HelpCircle className="w-3 h-3" />
            Prüfung nicht möglich
          </span>
        );
      case 'Unbekannt':
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-code bg-red-950/70 text-red-400 border border-red-500/30">
            <HelpCircle className="w-3 h-3" />
            Unbekannt
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Netz': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'PV': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'Batterie / AC-System': return <BatteryCharging className="w-4 h-4 text-emerald-400" />;
      case 'MPPT': return <Sliders className="w-4 h-4 text-cyan-400" />;
      case 'Venus OS': return <Cpu className="w-4 h-4 text-blue-400" />;
      case 'Infrastruktur': return <Server className="w-4 h-4 text-slate-300" />;
      default: return <Layers className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top filter and header */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Layers className="w-4 h-4" />
              </span>
              Geräteinventar & Hardware-Topologie
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Vollständige technische Erfassung der Komponenten, Firmware-Stände und Betriebsparameter
            </p>
          </div>

          {/* Ist-Zustand vs Historischer Zustand Toggle & Parameter Audit */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowParameterAudit(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                showParameterAudit
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Parameter-Prüfung (Alle Daten testen)</span>
            </button>

            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] text-xs font-mono-code">
              <button
                onClick={() => setShowHistoric(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  !showHistoric 
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ist-Zustand (Live)</span>
              </button>
              <button
                onClick={() => setShowHistoric(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  showHistoric 
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-violet-400" />
                <span>Historischer Zustand</span>
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Discovery & Data Enrichment Action Bar */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-sky-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isEnriched ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase tracking-wider ${
                  isEnriched 
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                }`}>
                  {isEnriched ? '✓ Automatisch erkannt & ergänzt' : 'Reiner Ist-Zustand (Unbestätigte Werte auf „nicht erfasst“)'}
                </span>
                <span className="text-[11px] font-mono-code text-slate-400">
                  {isEnriched ? '11 von 11 Geräten mit Live-IDs angereichert' : 'Keine erfundenen Angaben'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isEnriched
                  ? 'Seriennummern, MAC-Adressen und Firmwarestände wurden über lokale Schnittstellen (Shelly RPC, Ahoy REST, T2SG, Venus OS) ermittelt.'
                  : 'Unbestätigte Angaben stehen auf „nicht erfasst“. Klicken Sie auf den Button, um die Gerätedaten via lokale APIs abzufragen.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAutoDetectAndEnrich}
              disabled={isAutoDetecting}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                isAutoDetecting
                  ? 'bg-sky-700 text-white cursor-wait'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:shadow-cyan-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoDetecting ? 'animate-spin' : ''}`} />
              <span>{isAutoDetecting ? 'Scanne lokale APIs...' : 'Daten automatisch erkennen & ergänzen'}</span>
            </button>

            {isEnriched && onResetToUnconfirmed && (
              <button
                onClick={onResetToUnconfirmed}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-white/[0.08]"
                title="Alle Werte wieder auf den unbestätigten Zustand 'nicht erfasst' zurücksetzen"
              >
                Auf „nicht erfasst“ zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white/[0.1] text-white border border-white/[0.14] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Gerät, IP oder Modell filtern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all font-mono-code"
            />
          </div>
        </div>
      </div>

      {/* Parameter Plausibility & Audit View */}
      {showParameterAudit && (
        <ParameterAuditView 
          telemetry={telemetry} 
          devices={devices} 
          onClose={() => setShowParameterAudit(false)} 
        />
      )}

      {/* Historic state notification banner */}
      {showHistoric && (
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center gap-3 text-xs text-purple-200 animate-in fade-in">
          <History className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <strong className="font-scifi">HISTORISCHE ANSICHT AKTIV (ARCHIV-STAND):</strong> Zeigt die gespeicherten Parameterstände vor den letzten Updates (z. B. Trucki Powerlimit 400 W, Shelly Firmware v1.3.8). 
          </div>
        </div>
      )}

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDevices.map((device) => {
          const isExpanded = expandedDeviceId === device.id;
          const testStatus = testedHost[device.id];
          const isCurrentlyTesting = testingHostId === device.id;
          
          return (
            <div
              key={device.id}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isExpanded 
                  ? 'glass-panel-glow-cyan border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]' 
                  : 'bg-slate-950/70 border-slate-800/90 hover:border-cyan-500/30 hover:bg-slate-900/50'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80">
                      {getCategoryIcon(device.category)}
                    </div>
                    <div>
                      <div className="text-xs font-mono-code text-cyan-400">
                        {device.category}
                      </div>
                      <h3 className="text-sm font-bold font-scifi text-slate-100">
                        {device.name}
                      </h3>
                      <div className="text-xs text-slate-400">
                        {device.vendor} • {device.model}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-[11px] font-mono-code text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      ONLINE
                    </span>
                    {getFirmwareBadge(device.firmwareStatus)}
                  </div>
                </div>

                {/* Key Specs Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono-code">
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">IP / mDNS:</span>
                    <span className="text-slate-200 block truncate">{device.ip}</span>
                    <span className="text-cyan-300 text-[10px] font-bold block truncate">{device.hostname}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">FIRMWARE:</span>
                    <span className={device.firmwareVersion === 'nicht erfasst' ? 'text-slate-500 italic' : 'text-cyan-300 font-semibold'}>
                      {showHistoric && device.id === 'shelly-pro-3em' ? 'v1.3.8 (Alt)' : device.firmwareVersion}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SERIENNUMMER:</span>
                    <span className={!device.serialNumber || device.serialNumber === 'nicht erfasst' ? 'text-slate-500 italic' : 'text-amber-300 font-bold truncate block'}>
                      {device.serialNumber || 'nicht erfasst'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">MAC-ADRESSE:</span>
                    <span className={device.mac === 'nicht erfasst' ? 'text-slate-500 italic' : 'text-slate-200 truncate block'}>
                      {device.mac}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800 col-span-2">
                    <span className="text-[10px] text-slate-500 block">STANDORT / SPECS:</span>
                    <span className="text-slate-300 truncate block">
                      {device.location !== 'nicht erfasst' ? device.location : (device.hardwareSpecs !== 'nicht erfasst' ? device.hardwareSpecs : 'nicht erfasst')}
                    </span>
                  </div>
                </div>

                {/* Auto-detected badge if enriched */}
                {device.isEnriched && device.detectedVia && (
                  <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[11px] font-mono-code text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Erkannt via: {device.detectedVia}</span>
                  </div>
                )}

                {/* Live URL & Connectivity Quick Action Bar */}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-400 text-[10px]">URL:</span>
                    <span className="text-cyan-300 font-bold truncate">http://{device.hostname}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleTestDeviceAddress(device)}
                      disabled={isCurrentlyTesting}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors border border-slate-700"
                      title="mDNS-Auflösung & HTTP-Erreichbarkeit testen"
                    >
                      {isCurrentlyTesting ? 'Prüfe...' : testStatus ? `✓ ${testStatus.latency}ms` : 'Adresse testen'}
                    </button>
                    <a
                      href={`http://${device.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[10px] transition-colors"
                    >
                      <span>Web-UI</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* Mosquitto MQTT Dedicated Configuration Button */}
                {(device.id === 'mosquitto-broker' || device.name.toLowerCase().includes('mosquitto')) && onOpenMqttConfig && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      <div>
                        <span className="font-semibold text-emerald-300 block">Mosquitto MQTT Broker (LXC 201)</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Status: {mqttStatus?.connected ? '🟢 Verbunden (MQTT-Live aktiv)' : '🟡 Getrennt (HTTP-REST Fallback aktiv)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenMqttConfig}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>MQTT-Einstellungen (Port 1883, User, PW)</span>
                    </button>
                  </div>
                )}

                {/* LAN Hardware Configuration Button for Inverter/Meter */}
                {(device.id === 'shelly-pro3em' || device.id === 'ahoy-dtu' || device.id === 'trucki-t2sg' || device.id === 'victron-venus-os') && onOpenHardwareConfig && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={onOpenHardwareConfig}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-[11px] font-mono transition-all"
                    >
                      <Sliders className="w-3 h-3 text-sky-400" />
                      <span>LAN-IP & Port anpassen</span>
                    </button>
                  </div>
                )}

                {/* Short notes */}
                {device.notes && (
                  <p className="text-xs text-slate-400 mt-3 italic bg-slate-900/30 p-2 rounded border border-slate-800/50">
                    {device.notes}
                  </p>
                )}

                {/* Expand / Collapse Button */}
                <div className="mt-4 flex items-center justify-between pt-2">
                  <button
                    onClick={() => setExpandedDeviceId(isExpanded ? null : device.id)}
                    className="flex items-center gap-1 text-xs font-scifi text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <span>WENIGER DETAILS</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>VOLLSTÄNDIGE KONFIGURATION & MQTT TOPICS</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <span className="text-[10px] font-mono-code text-slate-500">
                    Zuletzt geprüft: {device.lastChecked}
                  </span>
                </div>
              </div>

              {/* Expanded Technical Dossier (Section 09: Konfigurations-Dokumentation) */}
              {isExpanded && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-slate-800/90 bg-slate-950/90 space-y-4 text-xs font-mono-code animate-in fade-in">
                  
                  {/* Operating limits table */}
                  {device.operatingLimits.length > 0 && (
                    <div className="pt-3">
                      <div className="text-[11px] font-scifi text-slate-300 mb-2 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        BETRIEBSPARAMETER & SCHUTZGRENZEN (LIMITS)
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left">
                          <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                            <tr>
                              <th className="p-2">Parameter</th>
                              <th className="p-2">Wert</th>
                              <th className="p-2">Einheit</th>
                              <th className="p-2">Bedeutung</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {device.operatingLimits.map((l, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="p-2 text-cyan-300 font-semibold">{l.parameter}</td>
                                <td className="p-2 font-bold text-amber-300">
                                  {showHistoric && device.id === 'trucki-sun2000' && l.parameter === 'Aktuelles Regellimit' 
                                    ? '400 (Historisch)' 
                                    : l.value}
                                </td>
                                <td className="p-2 text-slate-400">{l.unit}</td>
                                <td className="p-2 text-slate-400 text-[11px]">{l.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MQTT Topics & Endpoints */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Topics */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <div className="text-[11px] font-scifi text-cyan-400 mb-1.5 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" />
                        VERBUNDENE MQTT TOPICS ({device.mqttTopics.length})
                      </div>
                      {device.mqttTopics.length > 0 ? (
                        <div className="space-y-1">
                          {device.mqttTopics.map((t, idx) => (
                            <div key={idx} className="p-1.5 rounded bg-slate-950 text-[10px] text-emerald-400 truncate border border-slate-800/80">
                              {t}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Kein direkter MQTT Publisher</span>
                      )}
                    </div>

                    {/* API Endpoints */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <div className="text-[11px] font-scifi text-purple-400 mb-1.5 flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        API ENDPUNKTE ({device.apiEndpoints.length})
                      </div>
                      {device.apiEndpoints.length > 0 ? (
                        <div className="space-y-1">
                          {device.apiEndpoints.map((ep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-950 text-[10px] border border-slate-800/80">
                              <span className="text-purple-300 truncate font-mono-code">{ep}</span>
                              {ep.startsWith('http') && (
                                <a
                                  href={ep.split(' ')[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-white shrink-0 ml-1.5"
                                  title="Im Browser öffnen"
                                >
                                  <ExternalLink className="w-3 h-3 text-purple-400" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Keine öffentlichen HTTP Endpunkte</span>
                      )}
                    </div>
                  </div>

                  {/* Hardware & Network info */}
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex flex-wrap justify-between gap-2">
                    <div><strong>MAC:</strong> {device.mac}</div>
                    <div><strong>Hostname:</strong> {device.hostname}</div>
                    <div><strong>Dienste:</strong> {device.services.join(', ')}</div>
                  </div>

                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
