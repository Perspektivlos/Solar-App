import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Filter, 
  Send, 
  Search, 
  Check, 
  Copy, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Activity, 
  Code2, 
  Sliders, 
  X, 
  Info, 
  RefreshCw,
  Cpu,
  Radio,
  FileJson
} from 'lucide-react';
import { MqttLogMessage, MqttPublishPreset } from '../types';

// Standard Quick Presets für typische Solar-Steuerungen (exakt nach T2SG v1.15 Handbuch)
const DEFAULT_PRESETS: MqttPublishPreset[] = [
  {
    id: 't2sg-acsetpointovr',
    name: 'T2SG Inverter-Leistung manuell setzen (Override)',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/ACSETPOINTOVR',
    payload: '350',
    qos: 0,
    retain: false,
    description: 'Manuelle Vorgabe in Watt. Deaktiviert automatisch die ZEPC-Nulleinspeisung (Status wechselt auf ZEPC=2) laut Handbuch.'
  },
  {
    id: 't2sg-meterovr',
    name: 'T2SG Externer Smartmeter-Messwert (MQTT)',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/METEROVR',
    payload: '185',
    qos: 0,
    retain: false,
    description: 'Speist externen Zählerwert (W) zyklisch ein (~500ms). Reaktiviert ZEPC automatisch falls zuvor im manuellen Modus.'
  },
  {
    id: 't2sg-zepcovr',
    name: 'T2SG Nulleinspeisung Ein-/Ausschalten',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/ZEPCOVR',
    payload: '1',
    qos: 0,
    retain: false,
    description: 'Reaktiviert (1) oder pausiert (0) den automatischen Zero-Export Regelkreis für den Lumentree Inverter.'
  },
  {
    id: 't2sg-targetovr',
    name: 'T2SG ZEPC-Zielwert anpassen (Offset)',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/TARGETOVR',
    payload: '15',
    qos: 0,
    retain: false,
    description: 'Setzt den Zielwert für den Netzbezug (z. B. 0W für reine Nulleinspeisung oder 15W für Sicherheitsabstand zur Einspeisung).'
  },
  {
    id: 't2sg-maxpowerovr',
    name: 'T2SG Max-Leistung drosseln / freigeben',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/MAXPOWEROVR',
    payload: '800',
    qos: 0,
    retain: false,
    description: 'Begrenzt die maximale Ausgangsleistung des Inverters dynamisch (z. B. 800 W BKW-Limit oder 2000 W Volllast beim SUN-2000G2-H).'
  },
  {
    id: 't2sg-rebootovr',
    name: 'T2SG Gateway Neustart auslösen',
    targetDevice: 'Trucki2Shelly Gateway (T2SG v1.15)',
    topic: 'TRUCKI/REBOOTOVR',
    payload: 'REBOOTOVR',
    qos: 0,
    retain: false,
    description: 'Sendet den exakten String "REBOOTOVR" laut Handbuch, um einen Soft-Reboot des ESP8266 auszulösen.'
  },
  {
    id: 'hoymiles-limit',
    name: 'Hoymiles Leistungslimitierung (AhoyDTU)',
    targetDevice: 'Hoymiles HM-1500 (AhoyDTU)',
    topic: 'venus/pv/ahoydtu/Hoymiles1500/cmd/limit_nonpersistent_relative',
    payload: JSON.stringify({ limit: 80 }, null, 2),
    qos: 1,
    retain: false,
    description: 'Begrenzt den Wechselrichter temporär auf 80 % der Nennleistung (1200 W).'
  },
  {
    id: 'venus-keepalive',
    name: 'VenusOS D-Bus Keepalive-Ping',
    targetDevice: 'Victron Venus OS (Raspberry Pi / Cerbo)',
    topic: 'R/b827eb79321c/keepalive',
    payload: '',
    qos: 0,
    retain: false,
    description: 'Sendet Keepalive an VenusOS, damit die D-Bus Telemetrie für 60 s aktiv bleibt.'
  },
  {
    id: 'shelly-switch',
    name: 'Shelly Pro 3EM Schaltausgang (RPC)',
    targetDevice: 'Shelly Pro 3EM',
    topic: 'venus/grid/shellypro/rpc',
    payload: JSON.stringify({
      id: 1,
      src: 'solar-dashboard',
      method: 'Switch.Set',
      params: { id: 0, on: true }
    }, null, 2),
    qos: 1,
    retain: false,
    description: 'Schaltet das interne Hilfsrelais des Shelly Pro 3EM ein (z. B. für Schütz).'
  }
];

// Hilfsfunktion: MQTT Topic Wildcard Matching (# und +)
export function matchesMqttFilter(pattern: string, topic: string): boolean {
  if (!pattern || pattern.trim() === '' || pattern === '#') return true;
  
  const cleanPattern = pattern.trim().toLowerCase();
  const cleanTopic = topic.toLowerCase();

  // Exakter Match oder einfacher Substring wenn keine MQTT Wildcards
  if (!cleanPattern.includes('#') && !cleanPattern.includes('+')) {
    return cleanTopic.includes(cleanPattern);
  }

  const pParts = cleanPattern.split('/');
  const tParts = cleanTopic.split('/');

  for (let i = 0; i < pParts.length; i++) {
    const p = pParts[i];
    if (p === '#') {
      return true; // # matcht alle restlichen Ebenen
    }
    if (i >= tParts.length) {
      return false;
    }
    if (p === '+') {
      continue; // + matcht genau eine Ebene
    }
    if (p !== tParts[i]) {
      return false;
    }
  }

  return pParts.length === tParts.length;
}

export const MqttLiveSniffer: React.FC = () => {
  // Sniffer State
  const [messages, setMessages] = useState<MqttLogMessage[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<MqttLogMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Publish Form State
  const [publishTopic, setPublishTopic] = useState<string>(DEFAULT_PRESETS[0].topic);
  const [publishPayload, setPublishPayload] = useState<string>(DEFAULT_PRESETS[0].payload);
  const [publishQos, setPublishQos] = useState<0 | 1 | 2>(0);
  const [publishRetain, setPublishRetain] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [showPublishPanel, setShowPublishPanel] = useState<boolean>(true);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Initial Seed Data (Echte Beispieldaten aus dem System)
  useEffect(() => {
    const now = Date.now();
    const seedMessages: MqttLogMessage[] = [
      {
        id: 'msg-seed-1',
        timestamp: new Date(now - 8500).toLocaleTimeString('de-DE', { hour12: false }) + '.210',
        timeMs: now - 8500,
        topic: 'venus/grid/shellypro/em:0/total_act_power',
        payload: { total_act_power: 742.3, total_aprt_power: 781.4 },
        rawPayload: '{"total_act_power": 742.3, "total_aprt_power": 781.4}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Shelly Pro 3EM',
        sizeBytes: 52
      },
      {
        id: 'msg-seed-2',
        timestamp: new Date(now - 7100).toLocaleTimeString('de-DE', { hour12: false }) + '.680',
        timeMs: now - 7100,
        topic: 'venus/pv/ahoydtu/Hoymiles1500/ch0/P_AC',
        payload: { P_AC: 1285.4, YieldDay: 5420, Temp: 39.2, LimitPercent: 100 },
        rawPayload: '{"P_AC": 1285.4, "YieldDay": 5420, "Temp": 39.2, "LimitPercent": 100}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Hoymiles HM-1500 (AhoyDTU)',
        sizeBytes: 68
      },
      {
        id: 'msg-seed-3',
        timestamp: new Date(now - 5600).toLocaleTimeString('de-DE', { hour12: false }) + '.115',
        timeMs: now - 5600,
        topic: 'TRUCKI/ACDISPLAY',
        payload: { value: 595, unit: 'W', inverter: 'SUN-2000G2-H' },
        rawPayload: '{"value": 595, "unit": "W", "inverter": "SUN-2000G2-H"}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Trucki2Shelly Gateway (RS485)',
        sizeBytes: 54
      },
      {
        id: 'msg-seed-3b',
        timestamp: new Date(now - 5100).toLocaleTimeString('de-DE', { hour12: false }) + '.320',
        timeMs: now - 5100,
        topic: 'TRUCKI/VBAT',
        payload: { value: 52.84, unit: 'V', cutoff: 48.0, reboot: 52.0 },
        rawPayload: '{"value": 52.84, "unit": "V", "cutoff": 48.0, "reboot": 52.0}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Trucki2Shelly Gateway (VBat)',
        sizeBytes: 60
      },
      {
        id: 'msg-seed-3c',
        timestamp: new Date(now - 4800).toLocaleTimeString('de-DE', { hour12: false }) + '.710',
        timeMs: now - 4800,
        topic: 'TRUCKI/ZEPC',
        payload: { zepc_state: 1, mode: 'Auto-Zero-Export', target_watts: 0 },
        rawPayload: '{"zepc_state": 1, "mode": "Auto-Zero-Export", "target_watts": 0}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Trucki2Shelly Gateway (ZEPC)',
        sizeBytes: 66
      },
      {
        id: 'msg-seed-4',
        timestamp: new Date(now - 4200).toLocaleTimeString('de-DE', { hour12: false }) + '.890',
        timeMs: now - 4200,
        topic: 'N/b827eb79321c/system/0/Dc/Battery/Soc',
        payload: { value: 78.4 },
        rawPayload: '{"value": 78.4}',
        qos: 0,
        retain: true,
        direction: 'in',
        source: 'Victron VenusOS',
        sizeBytes: 15
      },
      {
        id: 'msg-seed-5',
        timestamp: new Date(now - 2800).toLocaleTimeString('de-DE', { hour12: false }) + '.340',
        timeMs: now - 2800,
        topic: 'N/b827eb79321c/solarcharger/288/Yield/Power',
        payload: { value: 412.5 },
        rawPayload: '{"value": 412.5}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Victron MPPT 150/35 #1',
        sizeBytes: 16
      },
      {
        id: 'msg-seed-6',
        timestamp: new Date(now - 1400).toLocaleTimeString('de-DE', { hour12: false }) + '.902',
        timeMs: now - 1400,
        topic: 'venus/grid/shellypro/em:0/a_act_power',
        payload: { a_act_power: 245.2, a_voltage: 231.8, a_current: 1.06 },
        rawPayload: '{"a_act_power": 245.2, "a_voltage": 231.8, "a_current": 1.06}',
        qos: 0,
        retain: false,
        direction: 'in',
        source: 'Shelly Pro 3EM',
        sizeBytes: 58
      }
    ];

    setMessages(seedMessages);
  }, []);

  // Live Generator Ticker
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const timeStr = `${now.toLocaleTimeString('de-DE', { hour12: false })}.${ms}`;

      // Zufälliges Topic & realistische Daten generieren
      const generators = [
        () => {
          const watts = Math.round(720 + (Math.random() * 60 - 30));
          return {
            topic: 'venus/grid/shellypro/em:0/total_act_power',
            source: 'Shelly Pro 3EM',
            qos: 0 as const,
            retain: false,
            payload: { total_act_power: watts, pf: 0.96 }
          };
        },
        () => {
          const pac = Math.round(1280 + (Math.random() * 40 - 20));
          return {
            topic: 'venus/pv/ahoydtu/Hoymiles1500/ch0/P_AC',
            source: 'Hoymiles HM-1500 (AhoyDTU)',
            qos: 0 as const,
            retain: false,
            payload: { P_AC: pac, YieldDay: 5480, Temp: 39.4 }
          };
        },
        () => {
          const sp = Math.round(580 + (Math.random() * 30 - 15));
          return {
            topic: 'TRUCKI/ACDISPLAY',
            source: 'Trucki2Shelly Gateway',
            qos: 0 as const,
            retain: false,
            payload: { value: sp, setpoint: sp + 5, unit: 'W' }
          };
        },
        () => {
          const vbat = Number((52.8 + (Math.random() * 0.1 - 0.05)).toFixed(2));
          return {
            topic: 'TRUCKI/VBAT',
            source: 'Trucki2Shelly Gateway',
            qos: 0 as const,
            retain: false,
            payload: { value: vbat, unit: 'V' }
          };
        },
        () => {
          const meterW = Math.round(140 + (Math.random() * 20 - 10));
          return {
            topic: 'TRUCKI/METER',
            source: 'Trucki2Shelly Gateway',
            qos: 0 as const,
            retain: false,
            payload: { value: meterW, unit: 'W' }
          };
        },
        () => {
          const temp = Number((38.8 + (Math.random() * 0.8 - 0.4)).toFixed(1));
          return {
            topic: 'TRUCKI/TEMPERATURE',
            source: 'Trucki2Shelly Gateway',
            qos: 0 as const,
            retain: false,
            payload: { value: temp, unit: '°C', maxLimit: 75 }
          };
        },
        () => {
          const p1 = Math.round(410 + (Math.random() * 10 - 5));
          return {
            topic: 'N/b827eb79321c/solarcharger/288/Yield/Power',
            source: 'Victron MPPT 150/35 #1',
            qos: 0 as const,
            retain: false,
            payload: { value: p1 }
          };
        },
        () => {
          const p2 = Math.round(430 + (Math.random() * 12 - 6));
          return {
            topic: 'N/b827eb79321c/solarcharger/289/Yield/Power',
            source: 'Victron MPPT 150/35 #2',
            qos: 0 as const,
            retain: false,
            payload: { value: p2 }
          };
        },
        () => {
          return {
            topic: 'solar/telemetry/heartbeat',
            source: 'Solar-Lokal Core',
            qos: 0 as const,
            retain: false,
            payload: { uptime_sec: 142050, broker_clients: 5, mem_rss_mb: 48.2 }
          };
        }
      ];

      const pickedGen = generators[Math.floor(Math.random() * generators.length)]();
      const rawPayload = JSON.stringify(pickedGen.payload);

      const newMsg: MqttLogMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: timeStr,
        timeMs: Date.now(),
        topic: pickedGen.topic,
        payload: pickedGen.payload,
        rawPayload,
        qos: pickedGen.qos,
        retain: pickedGen.retain,
        direction: 'in',
        source: pickedGen.source,
        sizeBytes: new TextEncoder().encode(rawPayload).length
      };

      setMessages(prev => {
        const next = [...prev, newMsg];
        // Puffer auf maximal 150 Nachrichten begrenzen
        return next.length > 150 ? next.slice(next.length - 150) : next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Autoscroll an das Ende des Terminals
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Filter-Logik
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Kategorie Filter
      if (selectedCategory === 'shelly' && !msg.topic.includes('shelly')) return false;
      if (selectedCategory === 'hoymiles' && !msg.topic.includes('ahoydtu') && !msg.topic.includes('Hoymiles')) return false;
      if (selectedCategory === 'trucki' && !msg.topic.includes('Trucki') && !msg.topic.startsWith('T2SG')) return false;
      if (selectedCategory === 'victron' && !msg.topic.includes('b827eb79321c')) return false;
      if (selectedCategory === 'outbound' && msg.direction !== 'out') return false;

      // Topic Filter mit Wildcard
      if (filterTopic && !matchesMqttFilter(filterTopic, msg.topic)) {
        return false;
      }

      // Keyword im Payload
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        if (!msg.rawPayload.toLowerCase().includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }, [messages, selectedCategory, filterTopic, filterKeyword]);

  // Publish Aktion ausführen
  const handlePublish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!publishTopic.trim()) return;

    setIsPublishing(true);

    setTimeout(() => {
      let parsedPayload: any = publishPayload;
      try {
        parsedPayload = JSON.parse(publishPayload);
      } catch {
        // Plain string fallback
      }

      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const timeStr = `${now.toLocaleTimeString('de-DE', { hour12: false })}.${ms}`;

      const outboundMsg: MqttLogMessage = {
        id: `pub-${Date.now()}`,
        timestamp: timeStr,
        timeMs: Date.now(),
        topic: publishTopic.trim(),
        payload: parsedPayload,
        rawPayload: publishPayload,
        qos: publishQos,
        retain: publishRetain,
        direction: 'out',
        source: 'Diagnose-Terminal (Local Client)',
        sizeBytes: new TextEncoder().encode(publishPayload).length
      };

      setMessages(prev => [...prev, outboundMsg]);
      setIsPublishing(false);
      setPublishSuccessMsg(`Nachricht erfolgreich an "${publishTopic}" publiziert (ACK 1883 in 4.2ms)`);

      setTimeout(() => {
        setPublishSuccessMsg(null);
      }, 4000);
    }, 280);
  };

  // Preset anwenden
  const applyPreset = (preset: MqttPublishPreset) => {
    setPublishTopic(preset.topic);
    setPublishPayload(preset.payload);
    setPublishQos(preset.qos);
    setPublishRetain(preset.retain);
  };

  // Text kopieren
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Log als JSON exportieren
  const handleExportLog = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mqtt-traffic-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Berechne Metriken
  const msgRate = useMemo(() => {
    if (messages.length < 2) return '0.0';
    const recent = messages.filter(m => Date.now() - m.timeMs <= 5000);
    return (recent.length / 5).toFixed(1);
  }, [messages]);

  const totalBytes = useMemo(() => {
    return messages.reduce((acc, m) => acc + m.sizeBytes, 0);
  }, [messages]);

  return (
    <div className="space-y-6">
      
      {/* Oberer Status- & Steuerbalken */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide font-scifi flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  LIVE MQTT-SNIFFER & TRAFFIC-MONITOR
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  Mosquitto 1883
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span>Status: <strong className={isPaused ? 'text-amber-400' : 'text-emerald-400'}>{isPaused ? 'Pausiert' : 'Aktiv (Empfängt)'}</strong></span>
                <span>•</span>
                <span>Durchsatz: <strong className="text-slate-200 font-mono-code">{msgRate} msg/s</strong></span>
                <span>•</span>
                <span>Puffer: <strong className="text-slate-200 font-mono-code">{messages.length} / 150 Pakete</strong> ({(totalBytes / 1024).toFixed(1)} KB)</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Pause / Resume Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                isPaused
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Fortsetzen' : 'Pausieren'}</span>
            </button>

            {/* Autoscroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                autoScroll
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'bg-white/[0.05] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoScroll ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              <span>Auto-Scroll: {autoScroll ? 'An' : 'Aus'}</span>
            </button>

            {/* Clear Log */}
            <button
              onClick={() => {
                setMessages([]);
                setSelectedMessage(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-slate-400 hover:text-red-300 transition-all"
              title="Aktuellen Puffer leeren"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Leeren</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 transition-all"
              title="Log als JSON herunterladen"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>

            {/* Toggle Publish Terminal */}
            <button
              onClick={() => setShowPublishPanel(!showPublishPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                showPublishPanel
                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'bg-white/[0.05] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-violet-400" />
              <span>Befehls-Terminal {showPublishPanel ? 'verbergen' : 'öffnen'}</span>
            </button>

          </div>

        </div>

        {/* Filter-Leiste mit MQTT-Wildcard-Support */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
          
          {/* Quick-Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-500 text-[11px] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {[
              { id: 'all', label: 'Alle' },
              { id: 'shelly', label: 'Shelly Pro 3EM' },
              { id: 'hoymiles', label: 'AhoyDTU / PV' },
              { id: 'trucki', label: 'Trucki Gateway' },
              { id: 'victron', label: 'VenusOS D-Bus' },
              { id: 'outbound', label: 'Nur Gesendete (TX)' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  selectedCategory === chip.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Freitext / Wildcard Input */}
          <div className="flex-1 min-w-[220px] flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                placeholder="Topic Filter (z. B. venus/#, Trucki/+, P_AC...)"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 focus:outline-none text-xs font-mono-code text-slate-200 placeholder-slate-600"
              />
              {filterTopic && (
                <button
                  onClick={() => setFilterTopic('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative w-44">
              <input
                type="text"
                value={filterKeyword}
                onChange={e => setFilterKeyword(e.target.value)}
                placeholder="Payload Keyword..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 focus:outline-none text-xs font-mono-code text-slate-200 placeholder-slate-600"
              />
              {filterKeyword && (
                <button
                  onClick={() => setFilterKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* PUBLISH TERMINAL (AUSKLAPPBARE BEFEHLSZENTRALE) */}
      {showPublishPanel && (
        <div className="glass-panel p-5 rounded-2xl border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.08)] space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Send className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-white font-scifi tracking-wide">
                  MQTT PUBLISH TERMINAL (BEFEHLE AN BROKER SENDEN)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sende Testbefehle direkt an Mosquitto Broker (1883) zur Steuerung von Trucki, Hoymiles oder VenusOS
              </p>
            </div>

            {/* Presets Schnellwahl */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono-code">Schnellbefehle:</span>
              {DEFAULT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono-code bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/30 text-violet-300 transition-all hover:scale-[1.02]"
                  title={preset.description}
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Formular */}
          <form onSubmit={handlePublish} className="space-y-3">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Topic Eingabe */}
              <div className="md:col-span-8">
                <label className="block text-[11px] font-mono-code text-slate-400 mb-1">
                  ZIEL-TOPIC (MQTT PATH)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={publishTopic}
                    onChange={e => setPublishTopic(e.target.value)}
                    placeholder="z. B. Trucki/RS485/rx/power_setpoint"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-violet-500/60 focus:outline-none text-xs font-mono-code text-slate-100 placeholder-slate-600 shadow-inner"
                  />
                </div>
              </div>

              {/* QoS */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono-code text-slate-400 mb-1">
                  QoS LEVEL
                </label>
                <select
                  value={publishQos}
                  onChange={e => setPublishQos(Number(e.target.value) as 0 | 1 | 2)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-violet-500/60 focus:outline-none text-xs font-mono-code text-slate-200"
                >
                  <option value={0}>QoS 0 (At most once)</option>
                  <option value={1}>QoS 1 (At least once)</option>
                  <option value={2}>QoS 2 (Exactly once)</option>
                </select>
              </div>

              {/* Retain Flag */}
              <div className="md:col-span-2 flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={publishRetain}
                    onChange={e => setPublishRetain(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-500 focus:ring-0"
                  />
                  <span className="font-mono-code text-[11px]">Retain Flag</span>
                </label>
              </div>

            </div>

            {/* Payload Editor */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 mb-1">
                <span>PAYLOAD (JSON ODER RAW STRING)</span>
                <span className="text-slate-500">{new TextEncoder().encode(publishPayload).length} Bytes</span>
              </div>
              <textarea
                rows={3}
                value={publishPayload}
                onChange={e => setPublishPayload(e.target.value)}
                placeholder='{"setpoint_watts": 320}'
                className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-violet-500/60 focus:outline-none text-xs font-mono-code text-cyan-300 placeholder-slate-700 shadow-inner"
              />
            </div>

            {/* Submit & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              
              <div className="flex-1">
                {publishSuccessMsg && (
                  <div className="text-xs font-mono-code text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{publishSuccessMsg}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isPublishing || !publishTopic.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isPublishing ? 'animate-bounce' : ''}`} />
                  <span>{isPublishing ? 'Publiziere an Broker...' : 'Nachricht Senden (Publish)'}</span>
                </button>
              </div>

            </div>

          </form>

        </div>
      )}

      {/* HAUPT-BEREICH: TERMINAL LOG & DETAIL INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Linke Seite: Terminal Stream Table */}
        <div className={selectedMessage ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col h-[520px]">
            
            {/* Header Zeile */}
            <div className="px-4 py-3 bg-slate-950/90 border-b border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-mono-code">
              <div className="flex items-center gap-4">
                <span>ZEIT</span>
                <span>DIR</span>
                <span>TOPIC</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline">QUELLE</span>
                <span>PAYLOAD</span>
              </div>
            </div>

            {/* Scrollable Message List */}
            <div 
              ref={terminalRef}
              className="flex-1 overflow-y-auto divide-y divide-white/[0.04] font-mono-code text-xs select-text"
            >
              {filteredMessages.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Terminal className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p>Keine passenden MQTT-Nachrichten für diesen Filter gefunden.</p>
                  <button 
                    onClick={() => {
                      setFilterTopic('');
                      setFilterKeyword('');
                      setSelectedCategory('all');
                    }}
                    className="mt-3 text-cyan-400 hover:underline text-xs"
                  >
                    Filter zurücksetzen
                  </button>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  const isOutbound = msg.direction === 'out';

                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-cyan-500/15 border-l-2 border-cyan-400 text-white' 
                          : isOutbound
                            ? 'bg-violet-950/20 hover:bg-violet-950/40 border-l-2 border-violet-500/60'
                            : 'hover:bg-white/[0.03] text-slate-300'
                      }`}
                    >
                      {/* Linker Teil: Zeit, Direction, Topic */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        
                        {/* Timestamp */}
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {msg.timestamp}
                        </span>

                        {/* Direction Badge */}
                        {isOutbound ? (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            <ArrowUpRight className="w-2.5 h-2.5 text-violet-400" /> TX
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <ArrowDownLeft className="w-2.5 h-2.5 text-sky-400" /> RX
                          </span>
                        )}

                        {/* Topic */}
                        <span className={`text-xs truncate font-bold ${isOutbound ? 'text-violet-300' : 'text-slate-200'}`}>
                          {msg.topic}
                        </span>

                      </div>

                      {/* Rechter Teil: Payload Kurzansicht */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden md:inline text-[10px] text-slate-500 max-w-[120px] truncate">
                          {msg.source}
                        </span>
                        
                        <div className="w-36 sm:w-48 text-right truncate text-[11px] text-cyan-400/90 bg-slate-950/60 px-2 py-0.5 rounded border border-white/[0.04]">
                          {msg.rawPayload}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Terminal Footer Bar */}
            <div className="px-4 py-2 bg-slate-950/90 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 font-mono-code">
              <div>
                Angezeigt: {filteredMessages.length} von {messages.length} Nachrichten
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Tipp: Klicke auf eine Zeile für den JSON-Inspector</span>
              </div>
            </div>

          </div>
        </div>

        {/* Rechte Seite: Detail Inspector (öffnet sich beim Klick) */}
        {selectedMessage && (
          <div className="lg:col-span-5 space-y-4 animate-fadeIn">
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.1)] space-y-4">
              
              {/* Header Inspector */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-cyan-500/20 text-cyan-300">
                      <Code2 className="w-4 h-4" />
                    </span>
                    <h4 className="text-xs font-bold text-white font-scifi tracking-wide">
                      PAYLOAD INSPECTOR
                    </h4>
                  </div>
                  <div className="mt-1 text-xs font-mono-code font-bold text-cyan-300 break-all">
                    {selectedMessage.topic}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/[0.05]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metadaten Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                  <span className="text-slate-500 block text-[10px]">ZEITSTEMPEL</span>
                  <span className="text-slate-200 font-bold">{selectedMessage.timestamp}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                  <span className="text-slate-500 block text-[10px]">RICHTUNG & QUELLE</span>
                  <span className={selectedMessage.direction === 'out' ? 'text-violet-400 font-bold' : 'text-sky-400 font-bold'}>
                    {selectedMessage.direction === 'out' ? 'TX (Ausgehend)' : 'RX (Eingehend)'} • {selectedMessage.source}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                  <span className="text-slate-500 block text-[10px]">QoS & RETAIN</span>
                  <span className="text-slate-300">QoS {selectedMessage.qos} • {selectedMessage.retain ? 'Retained' : 'No Retain'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                  <span className="text-slate-500 block text-[10px]">PAKETGRÖSSE</span>
                  <span className="text-slate-300">{selectedMessage.sizeBytes} Bytes</span>
                </div>
              </div>

              {/* JSON Payload Viewer */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono-code">
                  <span>FORMATTIERTER PAYLOAD</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(selectedMessage.rawPayload, 'payload')}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20"
                    >
                      {copiedId === 'payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'payload' ? 'Kopiert' : 'Kopieren'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 max-h-56 overflow-y-auto">
                  <pre className="text-xs font-mono-code text-cyan-300 whitespace-pre-wrap break-all">
                    {typeof selectedMessage.payload === 'object'
                      ? JSON.stringify(selectedMessage.payload, null, 2)
                      : selectedMessage.rawPayload}
                  </pre>
                </div>
              </div>

              {/* Aktionen: Als Vorlage für Publish Terminal übernehmen */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setPublishTopic(selectedMessage.topic);
                    setPublishPayload(
                      typeof selectedMessage.payload === 'object'
                        ? JSON.stringify(selectedMessage.payload, null, 2)
                        : selectedMessage.rawPayload
                    );
                    setShowPublishPanel(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-mono-code transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-violet-400" />
                  <span>Als Publish-Vorlage ins Terminal laden</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
