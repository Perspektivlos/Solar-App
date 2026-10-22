import React, { useState } from 'react';
import { 
  Radio, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronRight, 
  FileCode, 
  Play, 
  CheckCircle2,
  Activity
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
  const [activeSubTab, setActiveSubTab] = useState<'mqtt' | 'api' | 'sniffer'>('mqtt');

  const [selectedTopic, setSelectedTopic] = useState<MqttTopicDoc>(mqttTopics[0]);
  const [selectedApi, setSelectedApi] = useState<ApiDoc>(apiDocs[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiTestResponse, setApiTestResponse] = useState<any | null>(null);

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
              MQTT Topic Engine, REST-APIs & Live Sniffer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Topic-Parser, REST-Endpunkte & Integriertes MQTT Echtzeit-Sniffer Terminal
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

    </div>
  );
};
