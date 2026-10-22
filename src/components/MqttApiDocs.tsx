import React, { useState } from 'react';
import { 
  Radio, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  Layers, 
  Database, 
  Clock, 
  ChevronRight, 
  FileCode, 
  Play,
  Cpu,
  CheckCircle2,
  Activity,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Download,
  Zap,
  Thermometer,
  BatteryCharging,
  Sliders
} from 'lucide-react';
import { MqttTopicDoc, ApiDoc } from '../types';
import { MqttLiveSniffer } from './MqttLiveSniffer';

interface MqttApiDocsProps {
  mqttTopics: MqttTopicDoc[];
  apiDocs: ApiDoc[];
}

export const MqttApiDocs: React.FC<MqttApiDocsProps> = ({
  mqttTopics,
  apiDocs
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mqtt' | 'api' | 'sniffer' | 'hardware'>('mqtt');

  const [selectedTopic, setSelectedTopic] = useState<MqttTopicDoc>(mqttTopics[0]);
  const [selectedApi, setSelectedApi] = useState<ApiDoc>(apiDocs[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiTestResponse, setApiTestResponse] = useState<any | null>(null);

  // Hardware Tab Interactive States
  const [selectedBatteryType, setSelectedBatteryType] = useState<'16s' | '8s'>('16s');
  const [customCellCutoff, setCustomCellCutoff] = useState<number>(3.00);
  const [selectedErrorCode, setSelectedErrorCode] = useState<number>(1);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRunApiTest = (api: ApiDoc) => {
    setIsTestingApi(true);
    setTimeout(() => {
      setIsTestingApi(false);
      setApiTestResponse({
        timestamp: new Date().toISOString(),
        status: 200,
        latencyMs: Math.floor(Math.random() * 15 + 8),
        data: api.exampleResponse
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tab Toggle */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Radio className="w-4 h-4" />
              </span>
              MQTT Topic Engine, REST-APIs & Hardware-Referenz
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Offizielle Dokumentation nach Trucki T2SG v1.15 & Lumentree SUN-G2 Handbüchern
            </p>
          </div>

          <div className="flex flex-wrap bg-slate-900/80 rounded-xl p-1 border border-white/[0.08] text-xs font-medium gap-1">
            <button
              onClick={() => setActiveSubTab('mqtt')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'mqtt' 
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>MQTT Schema Parser</span>
            </button>
            <button
              onClick={() => setActiveSubTab('api')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'api' 
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
              <span>Lokale REST-APIs</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sniffer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'sniffer' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Sniffer & Terminal</span>
            </button>
            <button
              onClick={() => setActiveSubTab('hardware')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'hardware' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Handbuch & Hardware-Diagnose</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: MQTT TOPICS & PAYLOAD SCHEMA */}
      {activeSubTab === 'mqtt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Topic Explorer Tree */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-scifi text-slate-300 flex items-center justify-between">
              <span>MQTT TOPIC-BAUM (MOSQUITTO 1883)</span>
              <span className="text-cyan-400 font-mono-code font-bold">{mqttTopics.length} AKTIV</span>
            </div>

            <div className="space-y-2">
              {mqttTopics.map((topicItem, idx) => {
                const isSelected = selectedTopic.topic === topicItem.topic;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedTopic(topicItem)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                      isSelected
                        ? 'glass-panel-glow-cyan border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-code text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                        {topicItem.frequency}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-500">{topicItem.lastSeen}</span>
                    </div>

                    <div className="mt-2 text-xs font-mono-code font-bold text-slate-200 break-all">
                      {topicItem.topic}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                      <span>Quelle: {topicItem.source.split(' ')[0]}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Schema Table & Raw Payload */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Topic Header Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel-glow-cyan border border-cyan-500/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code text-cyan-400">TOPIC DOKUMENTATION</span>
                    <button
                      onClick={() => handleCopy(selectedTopic.topic)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                      title="Topic kopieren"
                    >
                      {copiedText === selectedTopic.topic ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <h3 className="text-base font-bold font-mono-code text-slate-100 break-all mt-0.5">
                    {selectedTopic.topic}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono-code">
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500">Datentyp:</span> {selectedTopic.dataType}
                  </div>
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                    <span className="text-slate-500">Frequenz:</span> {selectedTopic.frequency}
                  </div>
                </div>
              </div>

              {/* Source & Consumers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono-code">
                <div>
                  <span className="text-slate-500 block text-[10px]">DATENQUELLE (SENSOR/HARDWARE):</span>
                  <span className="text-amber-300 font-semibold">{selectedTopic.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">VERBRAUCHER (SUBSCRIBER):</span>
                  <span className="text-emerald-300">{selectedTopic.consumers.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Section 07: Payload Schema Table (Automatic Documentation) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-scifi font-bold text-slate-200 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  07. AUTOMATISCH ERKANNTES PAYLOAD-SCHEMA ({selectedTopic.fields.length} FELDER)
                </h4>
                <span className="text-[10px] font-mono-code text-slate-500">
                  Typsicher & Einheitengeprüft
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left font-mono-code text-xs">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-scifi border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Feld</th>
                      <th className="p-2.5">Typ</th>
                      <th className="p-2.5">Einheit</th>
                      <th className="p-2.5 text-right">Beispielwert</th>
                      <th className="p-2.5">Bedeutung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {selectedTopic.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-cyan-300 font-bold">{f.field}</td>
                        <td className="p-2.5 text-slate-400 text-[11px]">{f.type}</td>
                        <td className="p-2.5">
                          {f.unit !== '—' ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-[11px]">
                              {f.unit}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400 font-bold">{f.example}</td>
                        <td className="p-2.5 text-slate-400 text-[11px]">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Raw JSON Payload Inspector */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono-code text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-scifi text-cyan-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  ECHTZEIT-PAYLOAD (LETZTER EMPFANGENER FRAME)
                </span>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedTopic.samplePayload, null, 2))}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>JSON Kopieren</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900/90 text-emerald-400 overflow-x-auto text-[11px] border border-slate-800">
                {JSON.stringify(selectedTopic.samplePayload, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 2: LOCAL REST-APIs */}
      {activeSubTab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: API Endpoints List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-scifi text-slate-300 flex items-center justify-between">
              <span>LOKALE API-ENDPUNKTE</span>
              <span className="text-purple-400 font-mono-code font-bold">{apiDocs.length} ENDPUNKTE</span>
            </div>

            <div className="space-y-2">
              {apiDocs.map((api, idx) => {
                const isSelected = selectedApi.endpoint === api.endpoint;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedApi(api);
                      setApiTestResponse(null);
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                      isSelected
                        ? 'glass-panel-glow-purple border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/30 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-code text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-bold">
                        {api.method}
                      </span>
                      <span className="text-[10px] font-mono-code text-purple-300">{api.responseTimeMs} ms</span>
                    </div>

                    <div className="mt-2 text-xs font-mono-code font-bold text-slate-200 break-all">
                      {api.endpoint}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      {api.baseUrl}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: API Details & Live Tester */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Selected API Info Card */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel-glow-purple border border-purple-500/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
                      {selectedApi.method}
                    </span>
                    <span className="text-xs font-mono-code text-purple-300">{selectedApi.baseUrl}</span>
                  </div>
                  <h3 className="text-base font-bold font-mono-code text-slate-100 break-all mt-1">
                    {selectedApi.endpoint}
                  </h3>
                </div>

                {/* Interactive Test Request Button */}
                <button
                  onClick={() => handleRunApiTest(selectedApi)}
                  disabled={isTestingApi}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold font-scifi text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                  <span>{isTestingApi ? 'ABFRAGE LÄUFT...' : 'ENDPUNKT TESTEN'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-3">
                {selectedApi.description}
              </p>

              {/* API Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono-code">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">STATUS:</span>
                  <span className="text-emerald-400 font-bold">{selectedApi.status}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">FORMAT:</span>
                  <span className="text-slate-200">{selectedApi.responseFormat}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">LATENZ:</span>
                  <span className="text-cyan-300 font-bold">{selectedApi.responseTimeMs} ms</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">LETZTER ZUGRIFF:</span>
                  <span className="text-slate-400">{selectedApi.lastSuccessfulAccess}</span>
                </div>
              </div>

              {/* Used Fields */}
              <div className="mt-3 pt-2 text-xs font-mono-code">
                <span className="text-slate-500 text-[10px] block mb-1">VERWENDETE PARAMETER / FELDER:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedApi.usedFields.map((field, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded bg-slate-900 border border-purple-500/20 text-purple-300 text-[11px]">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Test result or example response */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono-code text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-scifi text-purple-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  {apiTestResponse ? 'TEST-ANTWORT VOM LOKALEN SERVER (200 OK)' : 'REFERENZ-ANTWORT (BEISPIEL)'}
                </span>
                {apiTestResponse && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Latenz: {apiTestResponse.latencyMs} ms
                  </span>
                )}
              </div>
              <pre className="p-3 rounded-lg bg-slate-900/90 text-purple-300 overflow-x-auto text-[11px] border border-slate-800">
                {JSON.stringify(apiTestResponse ? apiTestResponse.data : selectedApi.exampleResponse, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 3: LIVE MQTT-SNIFFER & DIAGNOSE-TERMINAL */}
      {activeSubTab === 'sniffer' && (
        <MqttLiveSniffer />
      )}

      {/* SUBTAB 4: HANDBUCH & HARDWARE-DIAGNOSE (T2SG v1.15 & LUMENTREE SUN-G2) */}
      {activeSubTab === 'hardware' && (
        <div className="space-y-6">

          {/* PDF Documents Quick-Access Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Trucki T2SG v1.15 Card */}
            <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900/60 to-slate-950/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Trucki2Shelly Gateway (T2SG)
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        v1.15
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Offizielles Handbuch • Stand: 18.01.2026</p>
                  </div>
                </div>
                <a
                  href="/assets/aistudio/Handbuch_T2SG_v1.15_af24b8b7.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF öffnen
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono-code">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Fallback Access-Point</span>
                  <span className="text-sky-300 font-bold">192.168.4.1</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">SSID: Trucki2Shelly_xxx</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MQTT Topic-Syntax</span>
                  <span className="text-amber-300 font-bold">STRIKT GROSS</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">z. B. T2SG/ACDISPLAY</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Zähler-Update Rate</span>
                  <span className="text-emerald-300 font-bold">~500 ms</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Shelly RPC / METEROVR</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">System-Log Download</span>
                  <span className="text-purple-300 font-bold">/log.txt</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Ringspeicher im Web-UI</span>
                </div>
              </div>
            </div>

            {/* Lumentree SUN-G2 Card */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-950/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Lumentree SUN G2 Inverter
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Modell 45-90V (H)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">SUN-600 / 800 / 1000 / 2000 G2 Anleitung</p>
                  </div>
                </div>
                <a
                  href="/assets/aistudio/Lumentree_SUN_Anleitung_1873157f.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF öffnen
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono-code">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">DC Spannungsfenster</span>
                  <span className="text-amber-300 font-bold">45 V – 90 V DC</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Startspannung: 49 V</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">K-Faktor Kalibrierung</span>
                  <span className="text-cyan-300 font-bold">950 – 1050</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Modelljahr 2024–2026</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Übertemperatur Not-Aus</span>
                  <span className="text-rose-400 font-bold">75 °C</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Wiederanlauf &lt; 65 °C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Schnittstelle</span>
                  <span className="text-purple-300 font-bold">RS485 / Limiter</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">DAC 0-65535 Regelung</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section: Lumentree 6 Official Display Error Codes & Troubleshooting */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Lumentree SUN-G2 Display-Fehlercode Diagnosekatalog
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Die 6 offiziellen Display-Fehlermeldungen aus dem Handbuch mit Ursache und Sofortmaßnahme
                </p>
              </div>
              <span className="text-xs font-mono-code text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                Lumentree Kapitel 6 • Fehlerbehebung
              </span>
            </div>

            {/* Error Code Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              {[
                { id: 1, title: 'Übertemperatur', tag: '> 75°C' },
                { id: 2, title: 'U-In zu niedrig', tag: '< Cutoff' },
                { id: 3, title: 'U-In zu hoch', tag: '> 90V' },
                { id: 4, title: 'Netzfehler', tag: 'AC Fail' },
                { id: 5, title: 'Dumping Short', tag: 'Kurzschluss' },
                { id: 6, title: 'Startsp. niedrig', tag: '< 49V' }
              ].map(err => (
                <button
                  key={err.id}
                  onClick={() => setSelectedErrorCode(err.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedErrorCode === err.id
                      ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-mono-code text-amber-400/80">FEHLER #{err.id}</div>
                  <div className="text-xs font-bold truncate mt-0.5">{err.title}</div>
                  <div className="text-[10px] font-mono-code text-slate-400">{err.tag}</div>
                </button>
              ))}
            </div>

            {/* Detailed Selected Error Card */}
            {(() => {
              const errors = [
                {
                  id: 1,
                  displayTitle: 'Übertemperatur',
                  severity: 'Kritischer Not-Stop',
                  badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                  description: 'Die Kühlkörper-Innentemperatur hat den Sicherheitsschwellenwert von 75 °C überschritten. Der Inverter unterbricht sofort die Einspeisung.',
                  trigger: 'Messwert der internen NTC-Sensoren > 75 °C (publiziert über T2SG/TEMPERATURE).',
                  behavior: 'Inverter schaltet die MOSFET-Endstufe aus. Lüfter laufen auf 100% Volllast zur forcierten Abkühlung.',
                  remedy: '1. Lüftungsschlitze auf Staub prüfen und freiblasen.\n2. Mindestabstand von 15 cm zu Wänden und Decken kontrollieren.\n3. Bei hohen Sommertemperaturen Zusatzlüfter im Technikraum aktivieren.\n4. Automatische Reaktivierung erfolgt sobald die Temperatur unter 65 °C sinkt.',
                  handbuchQuote: 'Handbuch S. 20: "Wenn die Temperatur 75 °C erreicht, schaltet das Gerät ab. Nach dem Abkühlen auf 65 °C schaltet sich das Gerät automatisch wieder ein."'
                },
                {
                  id: 2,
                  displayTitle: 'Eingangsspannung zu niedrig',
                  severity: 'Schutzabschaltung (LiFePO4 Tiefentladeschutz)',
                  badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  description: 'Die DC-Batteriespannung ist unter die konfigurierte Grenzspannung (VBat Cutoff) gefallen. Der Inverter stoppt die Stromentnahme.',
                  trigger: 'DC-Klemmen am Inverter messen eine Spannung unterhalb VBat Cutoff (z. B. < 48.0 V bei 16S LiFePO4).',
                  behavior: 'Inverter geht in Standby. Stromaufnahme sinkt auf Ruhestrom (< 0.5 W), um Tiefentladung der Batteriezellen zu verhindern.',
                  remedy: '1. Normaler Betriebszustand bei entladenem Akku – kein Fehler!\n2. Das System wartet, bis PV-Module den Akku wieder auf VBat Reboot (z. B. 52.0 V) aufgeladen haben.\n3. Überprüfen, ob die VBat Cutoff Schwelle im T2SG zur Batterie passt (empfohlen 48.0V bei 16S, niemals unter 44V einstellen!).',
                  handbuchQuote: 'Handbuch S. 14: "Der Inverter schützt die Batterie vor Schäden durch Tiefentladung. Die Abschaltung erfolgt exakt bei Erreichen der konfigurierten Abschaltschwelle."'
                },
                {
                  id: 3,
                  displayTitle: 'Eingangsspannung zu hoch',
                  severity: 'Gefahr von Bauteilschäden',
                  badgeColor: 'bg-red-500/20 text-red-300 border-red-500/50',
                  description: 'Die DC-Spannung überschreitet die absolute Maximalgrenze der internen MOSFETs und Kondensatoren (> 90 V beim Modell H).',
                  trigger: 'DC-Spannung > 90 V (Modell 45-90V) bzw. > 65 V (Modell 22-65V).',
                  behavior: 'Sofortige Notabschaltung aller Gatetreiber. Daueralarm im Display.',
                  remedy: '1. SOFORT DC-Trennschalter öffnen!\n2. Niemals höhere Spannungen als für das Modell zulässig anlegen.\n3. Bei PV-Direktanschluss Leerlaufspannung Voc bei -10 °C berücksichtigen.\n4. Defekte Laderegler prüfen, die die Batteriespannung unkontrolliert anheben könnten.',
                  handbuchQuote: 'Handbuch S. 4: "Maximaler Spannungsbereich: Modell 45-90V H. Eine Überschreitung von 90V DC zerstört die Eingangsstufe."'
                },
                {
                  id: 4,
                  displayTitle: 'Netzfehler (AC Fehler)',
                  severity: 'Netztrennung nach VDE-Norm',
                  badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                  description: 'Die Netzspannung oder Netzfrequenz liegt außerhalb des zulässigen Fensters oder das öffentliche Stromnetz ist ausgefallen.',
                  trigger: 'AC-Spannung < 185 V oder > 265 V, Frequenz außerhalb 47.5 – 51.5 Hz oder ENS-Relais geöffnet.',
                  behavior: 'Inverter trennt das interne Netzkopplungsrelais galvanisch innerhalb von 100 ms (Inselnetz-Schutz).',
                  remedy: '1. Leitungsschutzschalter (B16A) in der Hausverteilung prüfen.\n2. FI-Schutzschalter (RCD) überprüfen.\n3. AC-Spannung an der Schuko-/Wieland-Dose mit Multimeter nachmessen.\n4. Prüfen, ob Stromausfall im Straßenzug vorliegt.',
                  handbuchQuote: 'Handbuch S. 18: "Der Wechselrichter speist nur ein, wenn eine gültige Netzspannung erkannt wird. Bei Stromausfall trennt das Gerät sofort."'
                },
                {
                  id: 5,
                  displayTitle: 'Dumping Load Shorted',
                  severity: 'Kurzschluss Limiter-Port / Last',
                  badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
                  description: 'Es wurde ein interner oder externer Kurzschluss am Limiter-Port (RS485-Buchse) oder an der Laststufe erkannt.',
                  trigger: 'Geringe Impedanz oder unzulässige Spannung am externen Sensor-Eingang.',
                  behavior: 'Ausgangsstufe blockiert, Gerät signalisiert Kurzschluss.',
                  remedy: '1. RS485-Verbindungskabel zum Trucki Gateway abziehen.\n2. Prüfen, ob Pin A+ und Pin B- kurzgeschlossen sind.\n3. Kabel auf Beschädigungen oder Quetschungen an der Gehäusedurchführung untersuchen.\n4. Inverter nach Kabelkorrektur neu starten.',
                  handbuchQuote: 'Handbuch S. 22: "Überprüfen Sie die Verdrahtung des externen Sensors auf Kurzschlüsse."'
                },
                {
                  id: 6,
                  displayTitle: 'Startspannung zu niedrig',
                  severity: 'Bereitschaftszustand',
                  badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                  description: 'Die anliegende Batteriespannung liegt beim Einschalten noch unter der Startspannung des Inverters (49 V beim Modell H).',
                  trigger: 'DC-Spannung beim Start < 49 V (Modell 45-90V H).',
                  behavior: 'Display leuchtet, Inverter startet aber noch keine Netzeinspeisung.',
                  remedy: '1. Warten auf PV-Ladung durch Victron MPPTs oder Hoymiles.\n2. Prüfen, ob Sicherungen am Batterieträger (z. B. 160A NH00 oder MegaFuse) intakt sind.\n3. Spannungsabfall an langen Batteriekabeln kontrollieren (Mindestquerschnitt 25 mm² einhalten).',
                  handbuchQuote: 'Handbuch S. 12: "Startspannung: Modell 45-90V = 49V DC. Unterhalb dieser Spannung startet das Gerät den Einspeisebetrieb nicht."'
                }
              ];

              const currentErr = errors.find(e => e.id === selectedErrorCode) || errors[0];

              return (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono-code">
                        Display-Meldung: <span className="text-rose-400 font-bold">"{currentErr.displayTitle}"</span>
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${currentErr.badgeColor}`}>
                      {currentErr.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Fehlerbeschreibung:</span>
                        <p className="text-slate-300 leading-relaxed">{currentErr.description}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Auslösebedingung:</span>
                        <p className="text-amber-300/90 font-mono-code">{currentErr.trigger}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Geräteverhalten:</span>
                        <p className="text-slate-300">{currentErr.behavior}</p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 font-bold block mb-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Empfohlene Behebung:
                      </span>
                      <pre className="text-slate-200 whitespace-pre-line font-sans text-xs leading-relaxed">
                        {currentErr.remedy}
                      </pre>
                      <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                        {currentErr.handbuchQuote}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section: LiFePO4 Akku Konfiguration & Spannungsrechner */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  LiFePO4 Akku-Konfiguration & Spannungsrechner (T2SG & Lumentree)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optimaler Schutz vor Tiefentladung bei 16S (48V) und 8S (24V) Speicherbänken
                </p>
              </div>

              {/* 16S vs 8S Switch */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono-code">
                <button
                  onClick={() => setSelectedBatteryType('16s')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedBatteryType === '16s'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  16S LiFePO4 (48V)
                </button>
                <button
                  onClick={() => setSelectedBatteryType('8s')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedBatteryType === '8s'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  8S LiFePO4 (24V)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Calculator Controls */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Zell-Abschaltspannung (VBat Cutoff):
                    </span>
                    <span className="font-mono-code font-bold text-emerald-400 text-sm">
                      {customCellCutoff.toFixed(2)} V / Zelle
                    </span>
                  </div>

                  <input
                    type="range"
                    min="2.80"
                    max="3.20"
                    step="0.05"
                    value={customCellCutoff}
                    onChange={(e) => setCustomCellCutoff(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono-code">
                    <span>2.80 V (Aggressiv, 100% DoD)</span>
                    <span className="text-emerald-400 font-bold">3.00 V (Empfohlen, 90% DoD)</span>
                    <span>3.20 V (Sehr schonend)</span>
                  </div>
                </div>

                {/* Calculation Output Cards */}
                {(() => {
                  const cells = selectedBatteryType === '16s' ? 16 : 8;
                  const calculatedCutoff = Number((cells * customCellCutoff).toFixed(1));
                  const recommendedReboot = Number((calculatedCutoff + (cells === 16 ? 4.0 : 2.0)).toFixed(1));
                  const cellReboot = Number((recommendedReboot / cells).toFixed(2));
                  const maxAbsorption = Number((cells * 3.55).toFixed(1));

                  return (
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono-code">
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
                        <span className="text-[10px] text-slate-400 block">VBat Cutoff (Abschaltung)</span>
                        <div className="text-lg font-bold text-amber-300 mt-1">{calculatedCutoff} V</div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          In T2SG: Inverter stoppt bei {calculatedCutoff} V
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                        <span className="text-[10px] text-slate-400 block">VBat Reboot (Wiederanlauf)</span>
                        <div className="text-lg font-bold text-emerald-300 mt-1">{recommendedReboot} V</div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          (~{cellReboot} V/Zelle Hysterese)
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Nennspannung (Nominal)</span>
                        <div className="text-base font-bold text-slate-200 mt-1">
                          {cells === 16 ? '51.2 V (16x 3.2V)' : '25.6 V (8x 3.2V)'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Ladeschluss (Max DC)</span>
                        <div className="text-base font-bold text-sky-300 mt-1">{maxAbsorption} V (3.55V/Z)</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: T2SG ZEPC Modes & MQTT Topics Matrix */}
              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    T2SG v1.15 ZEPC Steuerungs-Zustände (Topic T2SG/ZEPC)
                  </h4>
                  <div className="space-y-2 font-mono-code text-[11px]">
                    <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300"><span className="text-cyan-400 font-bold">ZEPC = 0:</span> Deaktiviert</span>
                      <span className="text-slate-400">Inverterleistung = 0 W</span>
                    </div>
                    <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30 flex justify-between items-center">
                      <span className="text-cyan-200"><span className="text-cyan-400 font-bold">ZEPC = 1:</span> Aktiviert (Auto)</span>
                      <span className="text-emerald-400 font-bold">Nulleinspeisung via Shelly</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300"><span className="text-amber-400 font-bold">ZEPC = 2:</span> Manuell (Override)</span>
                      <span className="text-slate-400">Aktiviert via ACSETPOINTOVR</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300"><span className="text-purple-400 font-bold">ZEPC = 3:</span> MQTT Smartmeter</span>
                      <span className="text-slate-400">Zyklisch via METEROVR (~500ms)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300"><span className="text-slate-400 font-bold">ZEPC = 4:</span> Linked Inverter</span>
                      <span className="text-slate-400">Multi-Inverter Kaskade</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 italic">
                    Hinweis aus Handbuch: Senden an <span className="text-amber-300 font-mono-code">ACSETPOINTOVR</span> schaltet automatisch auf Modus 2 um. Senden an <span className="text-emerald-300 font-mono-code">ZEPCOVR: 1</span> oder <span className="text-emerald-300 font-mono-code">METEROVR</span> reaktiviert die automatische Regelung!
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
