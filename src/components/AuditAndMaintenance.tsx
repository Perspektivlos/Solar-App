import React, { useState } from 'react';
import { 
  History, 
  Wrench, 
  Plus, 
  Search, 
  ArrowRight,
  BookOpen,
  FileText,
  Download,
  Zap,
  BatteryCharging,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Network,
  Cpu,
  Layers,
  FileCode,
  CheckCircle2,
  ExternalLink,
  User,
  Info,
  GitBranch,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ChangeLogEntry, MaintenanceEntry } from '../types';

interface ManualDoc {
  id: string;
  title: string;
  subtitle: string;
  version: string;
  date: string;
  fileUrl: string;
  isLocalAsset: boolean;
  category: 'gateway' | 'inverter' | 'battery' | 'mppt' | 'meter';
  badgeColor: string;
  tags: { label: string; value: string; color?: string }[];
  description: string;
}

interface WiringDiagram {
  id: string;
  title: string;
  category: 'rs485' | 'dc' | 'ac' | 'pv';
  standard: string;
  cableGauge: string;
  protection: string;
  summary: string;
  connections: { from: string; to: string; signal: string; color: string; note: string }[];
  safetyNotes: string[];
}

interface AuditAndMaintenanceProps {
  changeLog: ChangeLogEntry[];
  maintenanceLog: MaintenanceEntry[];
  onAddMaintenanceEntry: (entry: Omit<MaintenanceEntry, 'id'>) => void;
}

export const AuditAndMaintenance: React.FC<AuditAndMaintenanceProps> = ({
  changeLog,
  maintenanceLog,
  onAddMaintenanceEntry
}) => {
  const [activeTab, setActiveTab] = useState<'changelog' | 'maintenance' | 'docs'>('changelog');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [showAddWiringModal, setShowAddWiringModal] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  
  // Docs Tab Sub-Filter
  const [docsFilter, setDocsFilter] = useState<'all' | 'manuals' | 'wiring' | 'diagnostics' | 'battery'>('all');

  // Hardware Tab Interactive States (migrated from MqttApiDocs)
  const [selectedBatteryType, setSelectedBatteryType] = useState<'16s' | '8s'>('16s');
  const [customCellCutoff, setCustomCellCutoff] = useState<number>(3.00);
  const [selectedErrorCode, setSelectedErrorCode] = useState<number>(1);
  const [selectedWiringPlanId, setSelectedWiringPlanId] = useState<string>('plan-rs485');

  // Form state for manual maintenance log
  const [newDevice, setNewDevice] = useState<string>('48V LiFePO4 Speicher (6x Power Queen 100Ah)');
  const [newTask, setNewTask] = useState<string>('Zellenprüfung & Drehmomentkontrolle');
  const [newDescription, setNewDescription] = useState<string>('Prüfung der Zellenspannungen und Drehmomente der M8 Pole (9-11 Nm).');
  const [newResult, setNewResult] = useState<'Erfolgreich' | 'Warnung' | 'Behoben' | 'Fehlgeschlagen'>('Erfolgreich');
  const [newTechnician, setNewTechnician] = useState<string>('Betreiber (Haucky)');
  const [newNotes, setNewNotes] = useState<string>('Alle 16 Zellen im Toleranzbereich (ΔU < 15 mV).');

  // State for extensible manuals library
  const [manuals, setManuals] = useState<ManualDoc[]>([
    {
      id: 'manual-t2sg',
      title: 'Trucki2Shelly Gateway (T2SG)',
      subtitle: 'RS485-Interface & Smartmeter-Emulation für Lumentree',
      version: 'v1.15',
      date: '18.01.2026',
      fileUrl: '/assets/aistudio/Handbuch_T2SG_v1.15_af24b8b7.pdf',
      isLocalAsset: true,
      category: 'gateway',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description: 'Detaillierte Anleitung für das Gateway zur Nulleinspeisung. Enthält Fallback-AP, strikte Uppercase MQTT Topics, Shelly RPC Integration und das 500ms Zähler-Update.',
      tags: [
        { label: 'Fallback AP', value: '192.168.4.1' },
        { label: 'MQTT-Syntax', value: 'STRIKT GROSS' },
        { label: 'Zähler-Update', value: '~500 ms' },
        { label: 'System-Log', value: '/log.txt' }
      ]
    },
    {
      id: 'manual-lumentree',
      title: 'Lumentree SUN G2 Inverter',
      subtitle: 'Netzgekoppelter Wechselrichter mit externem Limiter',
      version: 'SUN-600 / 800 / 1000 / 2000 G2',
      date: 'Modell 45-90V (H)',
      fileUrl: '/assets/aistudio/Lumentree_SUN_Anleitung_1873157f.pdf',
      isLocalAsset: true,
      category: 'inverter',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Original-Betriebsanleitung mit Fehlerdiagnose, Menüführung, K-Faktor Kalibrierung, RS485-Schnittstelle und LiFePO4 Batterieanschluss.',
      tags: [
        { label: 'DC Spannungsbereich', value: '45 V – 90 V DC' },
        { label: 'Startspannung', value: '49 V DC' },
        { label: 'K-Faktor', value: '950 – 1050' },
        { label: 'Übertemperatur', value: '75 °C Not-Aus' }
      ]
    },
    {
      id: 'manual-victron-mppt',
      title: 'Victron SmartSolar MPPT 100/20 & 150/35',
      subtitle: 'Solarladeregler mit VE.Direct Bus & Bluetooth',
      version: 'BlueSolar & SmartSolar',
      date: 'Herstellerdokumentation',
      fileUrl: '#',
      isLocalAsset: false,
      category: 'mppt',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'Ultra-schnelles Maximum Power Point Tracking (MPPT), VE.Direct Textprotokoll, HEX-Befehle und D-Bus-Integration in Victron VenusOS.',
      tags: [
        { label: 'Bus-Protokoll', value: 'VE.Direct (19200 Baud)' },
        { label: 'Ladekennlinie', value: 'LiFePO4 Adaptiv' },
        { label: 'Absorption', value: '56.8 V' },
        { label: 'Float', value: '54.0 V' }
      ]
    },
    {
      id: 'manual-shelly-pro3em',
      title: 'Shelly Pro 3EM Drehstrom-Messgerät',
      subtitle: 'Hutschienen-Energiezähler mit 3x 120A Wandlern & LAN',
      version: 'Pro Gen2 v1.4',
      date: 'Allterco Robotics',
      fileUrl: '#',
      isLocalAsset: false,
      category: 'meter',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Echtzeit-Phasenmessung (L1, L2, L3), bidirektionale Energiemessung saldierend, lokale RPC-JSON API über Port 80 und mDNS/MQTT Telemetrie.',
      tags: [
        { label: 'Phasen', value: '3-Phasig saldierend' },
        { label: 'RPC Endpoint', value: '/rpc/EM.GetStatus' },
        { label: 'Abtastrate', value: '200 ms intern' },
        { label: 'Schnittstelle', value: 'LAN / WLAN' }
      ]
    }
  ]);

  // State for extensible wiring diagrams
  const [wiringPlans, setWiringPlans] = useState<WiringDiagram[]>([
    {
      id: 'plan-rs485',
      title: 'RS485 Bus-Verkabelung: Trucki T2SG ➔ Lumentree RJ45 Limiter-Port',
      category: 'rs485',
      standard: 'TIA/EIA-485-A • 9600 Baud 8N1',
      cableGauge: 'Cat5e / Cat6 geschirmt (FTP/STP)',
      protection: 'Galvanische Trennung & ESD-Schutz',
      summary: 'Überträgt die dynamische Leistungs-Sollwertvorgabe (DAC-Wert 0–65535) im 500ms-Takt vom Trucki Gateway zur Lumentree Inverter-Hauptplatine.',
      connections: [
        { from: 'Trucki T2SG Klemme A (+)', to: 'Lumentree Limiter-Port Pin 1 (A+)', signal: 'Data + (Non-inverting)', color: '#38bdf8', note: 'Verdrilltes Paar (Blau)' },
        { from: 'Trucki T2SG Klemme B (-)', to: 'Lumentree Limiter-Port Pin 2 (B-)', signal: 'Data - (Inverting)', color: '#f59e0b', note: 'Verdrilltes Paar (Weiß/Blau)' },
        { from: 'Trucki T2SG GND Klemme', to: 'Lumentree Limiter-Port Pin 3 / Schirm', signal: 'Signal Ground (Referenz)', color: '#64748b', note: 'Einseitig geerdet gegen Masseschleifen' },
        { from: 'Bus-Terminierung', to: '120 Ω Widerstand parallel an A & B', signal: 'Abschlusswiderstand', color: '#10b981', note: 'Nur erforderlich bei Leitungslänge > 15 m' }
      ],
      safetyNotes: [
        'Niemals versehentlich an den Ethernet-Switch anschließen: Der RJ45-Port am Lumentree führt KEIN Ethernet, sondern RS485-Differenzsignale!',
        'Schirmung des Cat-Kabels nur am Sender (Trucki Gateway) erden, um Ausgleichsströme zu verhindern.',
        'Trucki Gateway muss mit stabiler 5V / 1A USB-Spannungsversorgung betrieben werden.'
      ]
    },
    {
      id: 'plan-dc-battery',
      title: '48V DC LiFePO4 Hochstrom-Verdrahtung (Speicher ➔ Lumentree 1000G2)',
      category: 'dc',
      standard: 'VDE-AR-E 2510-2 (Stationäre elektrische Energiespeichersysteme)',
      cableGauge: '25 mm² bis 35 mm² hochflexible feindrähtige Silikonleitung',
      protection: '160A MegaFuse / NH00 Trenner direkt am Pluspol',
      summary: 'Gleichstrom-Verbindung zwischen 48V 16S LiFePO4 Akkupack und DC-Eingang des Lumentree SUN-1000G2 Inverters (45-90V).',
      connections: [
        { from: 'Akku Pluspol (48V / 51.2V)', to: '160A MegaFuse Sicherungshalter', signal: 'DC + (Ungesichert)', color: '#ef4444', note: 'Max. 30 cm Leitungslänge bis zur Sicherung!' },
        { from: '160A MegaFuse Ausgang', to: 'DC-Haupttrennschalter 1000V / 63A', signal: 'DC + (Gesichert)', color: '#ef4444', note: 'Allpolige manuelle Trennung' },
        { from: 'DC-Haupttrennschalter', to: 'Lumentree DC + Klemme (Rot)', signal: 'DC + Inverter-Eingang', color: '#ef4444', note: 'M8 Ringkabelschuh mit 10 Nm angezogen' },
        { from: 'Akku Minuspol (GND)', to: 'Batterie-Mess-Shunt (z. B. Victron SmartShunt)', signal: 'DC - (Rückleitung)', color: '#0f172a', note: 'Alle Verbraucher hinter dem Shunt!' },
        { from: 'Shunt System-Seite', to: 'Lumentree DC - Klemme (Schwarz)', signal: 'DC - Inverter-Eingang', color: '#0f172a', note: 'M8 Ringkabelschuh mit 10 Nm angezogen' }
      ],
      safetyNotes: [
        'Anzugsmoment für alle M8 Bolzen an Akkupolen und Wechselrichter strikt auf 9 bis 11 Nm einstellen! Lockere Kontakte führen bei Dauerströmen von 25A zu Brandgefahr!',
        'Vor dem ersten Einschalten zwingend Vorwiderstand (z. B. 47Ω 5W Leistungswiderstand) zum Vorladen der internen Inverter-Kondensatoren verwenden (Pre-Charge gegen Funkenschlag).',
        'VBat Cutoff im Trucki Gateway stets auf mindestens 48.0V (3.00 V/Zelle) konfigurieren, um Tiefentladung der LiFePO4-Zellen auszuschließen.'
      ]
    },
    {
      id: 'plan-ac-grid',
      title: 'AC-Netzeinspeisung & Shelly Pro 3EM Phasen-Wandler Schema',
      category: 'ac',
      standard: 'VDE 0100-712 & VDE-AR-N 4105 (Erzeugungsanlagen am Niederspannungsnetz)',
      cableGauge: '3x 2.5 mm² H07RN-F (Gummischlauchleitung)',
      protection: 'B16A Leitungsschutzschalter + RCD Typ A 30mA',
      summary: 'AC-Netzkopplung des Lumentree Wechselrichters an die Hausunterverteilung und phasengenaue Messung durch den Shelly Pro 3EM.',
      connections: [
        { from: 'Haupteinspeisung L1 / L2 / L3', to: 'Shelly Pro 3EM Wandler-Klemmen', signal: 'Messwandler 120A (K ➔ L)', color: '#8b5cf6', note: 'Pfeil K-L muss ZUM Hausverbraucher zeigen!' },
        { from: 'Unterverteilung LS-Schalter B16A', to: 'Wieland RST20i3 Einspeisesteckdose', signal: 'AC Phase (L)', color: '#94a3b8', note: 'Eigene Sicherung für Erzeugeranlage' },
        { from: 'Unterverteilung N-Schiene', to: 'Wieland RST20i3 Neutralleiter', signal: 'AC Nullleiter (N)', color: '#38bdf8', note: 'Blauer Leiter' },
        { from: 'Potentialausgleichsschiene (PA)', to: 'Inverter Gehäuseerdung & PE', signal: 'Schutzleiter (PE)', color: '#22c55e', note: 'Grün-Gelb mind. 6 mm²' }
      ],
      safetyNotes: [
        'Die Klappwandler des Shelly Pro 3EM müssen exakt ausgerichtet sein: Pfeil K (Netz/Zähler) nach L (Verbraucher). Falsche Orientierung führt zu negativen Leistungswerten!',
        'Wechselrichter speist über internes ENS-Relais ein: Bei Stromausfall trennt das Gerät nach VDE-AR-N 4105 innerhalb von < 100 ms ab.',
        'Festanschluss oder normgerechte Einspeisesteckvorrichtung (Wieland RST20i3) verwenden; keine einfachen Schukostecker im Dauerbetrieb bei > 600W.'
      ]
    }
  ]);

  // Form states for adding new Manual modal
  const [newManualTitle, setNewManualTitle] = useState<string>('');
  const [newManualSubtitle, setNewManualSubtitle] = useState<string>('');
  const [newManualVersion, setNewManualVersion] = useState<string>('v1.0');
  const [newManualCategory, setNewManualCategory] = useState<'gateway' | 'inverter' | 'battery' | 'mppt' | 'meter'>('inverter');
  const [newManualUrl, setNewManualUrl] = useState<string>('');
  const [newManualDesc, setNewManualDesc] = useState<string>('');

  // Form states for adding new Wiring Plan modal
  const [newPlanTitle, setNewPlanTitle] = useState<string>('');
  const [newPlanCategory, setNewPlanCategory] = useState<'rs485' | 'dc' | 'ac' | 'pv'>('dc');
  const [newPlanGauge, setNewPlanGauge] = useState<string>('16 mm²');
  const [newPlanProtection, setNewPlanProtection] = useState<string>('100A Schmelzsicherung');
  const [newPlanSummary, setNewPlanSummary] = useState<string>('');

  const handleSubmitMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMaintenanceEntry({
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      device: newDevice,
      type: 'manual',
      task: newTask,
      description: newDescription,
      result: newResult,
      technician: newTechnician,
      notes: newNotes
    });
    setShowAddModal(false);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualTitle.trim()) return;

    const newDoc: ManualDoc = {
      id: `manual-custom-${Date.now()}`,
      title: newManualTitle,
      subtitle: newManualSubtitle || 'Benutzerdefiniertes Anlagendokument',
      version: newManualVersion,
      date: new Date().toLocaleDateString('de-DE'),
      fileUrl: newManualUrl || '#',
      isLocalAsset: newManualUrl.startsWith('/'),
      category: newManualCategory,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: newManualDesc || 'Neu registriertes Handbuch für die Anlagendokumentation.',
      tags: [
        { label: 'Kategorie', value: newManualCategory.toUpperCase() },
        { label: 'Status', value: 'Registriert' }
      ]
    };

    setManuals(prev => [newDoc, ...prev]);
    setShowAddManualModal(false);
    setNewManualTitle('');
    setNewManualSubtitle('');
    setNewManualUrl('');
    setNewManualDesc('');
  };

  const handleAddWiringPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;

    const newPlan: WiringDiagram = {
      id: `plan-custom-${Date.now()}`,
      title: newPlanTitle,
      category: newPlanCategory,
      standard: 'Anlagenspezifischer Verkabelungsplan',
      cableGauge: newPlanGauge,
      protection: newPlanProtection,
      summary: newPlanSummary || 'Benutzerdefinierter Verkabelungsplan.',
      connections: [
        { from: 'Eingangsklemme', to: 'Zielgerät', signal: 'Standard-Signal', color: '#38bdf8', note: 'Verdrahtung nach Anlagenschema ausführen' }
      ],
      safetyNotes: [
        'Vor Arbeiten an spannungsführenden Teilen Anlage allpolig freischalten und gegen Wiedereinschalten sichern!',
        'Spannungsfreiheit mit zweipoligem Spannungsprüfer feststellen.'
      ]
    };

    setWiringPlans(prev => [newPlan, ...prev]);
    setSelectedWiringPlanId(newPlan.id);
    setShowAddWiringModal(false);
    setNewPlanTitle('');
    setNewPlanSummary('');
  };

  const filteredChanges = changeLog.filter(c => 
    c.device.toLowerCase().includes(search.toLowerCase()) ||
    c.parameter.toLowerCase().includes(search.toLowerCase()) ||
    c.source.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaintenance = maintenanceLog.filter(m => 
    m.device.toLowerCase().includes(search.toLowerCase()) ||
    m.task.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredManuals = manuals.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const selectedPlan = wiringPlans.find(p => p.id === selectedWiringPlanId) || wiringPlans[0];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tab Toggle */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wrench className="w-4 h-4" />
              </span>
              Wartung, Changelog & Technische Dokumentation
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Digitaler Anlagen-Servicepass, Auto-Diff Änderungen, PDF-Handbücher & interaktive Verkabelungspläne
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-900/80 rounded-xl p-1 border border-white/[0.08] text-xs font-medium gap-1">
              <button
                onClick={() => setActiveTab('changelog')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'changelog' 
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-sky-400" />
                <span>Änderungsverlauf</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'maintenance' 
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-violet-400" />
                <span>Wartungsprotokoll</span>
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'docs' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Handbücher & Pläne</span>
                <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/30 text-amber-300 font-mono-code font-bold">
                  {manuals.length + wiringPlans.length}
                </span>
              </button>
            </div>

            {/* Contextual Action Buttons */}
            {activeTab === 'maintenance' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Eintrag erfassen</span>
              </button>
            )}

            {activeTab === 'docs' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddManualModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
                  title="Weiteres PDF-Handbuch registrieren"
                >
                  <Plus className="w-4 h-4" />
                  <span>Handbuch +</span>
                </button>
                <button
                  onClick={() => setShowAddWiringModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
                  title="Weiteren Verkabelungsplan anlegen"
                >
                  <Plus className="w-4 h-4" />
                  <span>Verkabelungsplan +</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'docs'
                  ? 'Dokumente, Pläne oder Fehlercodes durchsuchen...'
                  : 'Einträge nach Gerät, Parameter oder Notiz filtern...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono-code"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: ÄNDERUNGSVERFOLGUNG (AUTOMATISCH ERKANNTES CHANGE LOG) */}
      {activeTab === 'changelog' && (
        <div className="space-y-3">
          {filteredChanges.length === 0 ? (
            <div className="p-8 text-center text-slate-500 glass-panel rounded-2xl border border-white/[0.08]">
              Keine Änderungen gefunden, die dem Filter entsprechen.
            </div>
          ) : (
            filteredChanges.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/30 transition-all font-mono-code text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{entry.timestamp}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-200 font-semibold">{entry.device}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-400">
                      Quelle: <strong className="text-cyan-300">{entry.source}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      {entry.detectionType === 'automatisch' ? 'Automatisch erkannt' : 'Manuell'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-slate-400 font-scifi font-bold uppercase tracking-wider text-[11px]">
                    {entry.parameter}:
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-500/30 text-red-300 font-bold">
                      ALT: {entry.oldValue}
                    </span>
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                    <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold">
                      NEU: {entry.newValue}
                    </span>
                  </div>
                </div>

                {entry.userNotes && (
                  <div className="mt-2 text-slate-400 text-[11px] italic bg-slate-900/40 p-2 rounded border border-slate-800/40">
                    Notiz: {entry.userNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: WARTUNGSPROTOKOLL (AUTOMATISCH & MANUELL) */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMaintenance.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-purple-500/30 transition-all font-mono-code text-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{entry.date}</span>
                      <span>•</span>
                      <span className="text-purple-400 font-semibold">{entry.device}</span>
                    </div>
                    <h3 className="text-sm font-bold font-scifi text-slate-100 mt-0.5">
                      {entry.task}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    entry.result === 'Erfolgreich' || entry.result === 'Behoben'
                      ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-950/60 border border-amber-500/30 text-amber-400'
                  }`}>
                    {entry.result}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {entry.description}
                </p>

                {entry.notes && (
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    <span className="text-slate-500 block text-[10px]">DIAGNOSE-NOTIZ:</span>
                    {entry.notes}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Typ: {entry.type === 'auto' ? 'System Auto-Monitor' : 'Manuelle Wartung'}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-cyan-400" />
                    {entry.technician}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HANDBÜCHER, VERKABELUNGSPLÄNE & HARDWARE-DIAGNOSE */}
      {activeTab === 'docs' && (
        <div className="space-y-6">

          {/* Sub-Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-scifi text-slate-400 mr-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              BEREICHE:
            </span>
            {[
              { id: 'all', label: 'Alle Bereiche' },
              { id: 'manuals', label: 'PDF-Handbücher' },
              { id: 'wiring', label: 'Verkabelungspläne & Schemata' },
              { id: 'diagnostics', label: 'Lumentree Fehlerkatalog' },
              { id: 'battery', label: 'LiFePO4 Akku-Rechner & ZEPC' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDocsFilter(f.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-mono-code transition-all ${
                  docsFilter === f.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 1. SECTION: PDF HANDBÜCHER & DOKUMENTE BIBLIOTHEK */}
          {(docsFilter === 'all' || docsFilter === 'manuals') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    PDF-Handbuch & Dokumenten-Bibliothek
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Originale Herstelleranleitungen, Firmware-Hinweise und Protokoll-Referenzen
                  </p>
                </div>
                <span className="text-xs font-mono-code text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  {filteredManuals.length} Dokumente verfügbar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredManuals.map((man) => (
                  <div
                    key={man.id}
                    className="glass-panel p-5 rounded-2xl border border-white/[0.08] hover:border-sky-500/30 transition-all bg-gradient-to-br from-slate-900/60 to-slate-950/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              {man.title}
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code ${man.badgeColor}`}>
                                {man.version}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400">{man.subtitle} • {man.date}</p>
                          </div>
                        </div>

                        {man.isLocalAsset ? (
                          <a
                            href={man.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF öffnen
                          </a>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-mono-code border border-slate-800">
                            Bald verfügbar
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        {man.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono-code">
                      {man.tags.map((tag, tIdx) => (
                        <div key={tIdx} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{tag.label}</span>
                          <span className="text-slate-200 font-bold">{tag.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. SECTION: VERKABELUNGSPLÄNE & SCHEMATA (WIRING DIAGRAMS) */}
          {(docsFilter === 'all' || docsFilter === 'wiring') && (
            <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-amber-400" />
                    Elektrische Verkabelungspläne & Schaltschemata
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Geprüfte Anschlusspläne für RS485-Bus, DC-Hochstromverdrahtung und AC-Netzkopplung
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {wiringPlans.length} Pläne hinterlegt
                  </span>
                </div>
              </div>

              {/* Plan Selector Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {wiringPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedWiringPlanId(plan.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedWiringPlanId === plan.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-code mb-1">
                      <span className="text-amber-400 font-bold uppercase">{plan.category}</span>
                      <span className="text-slate-500">{plan.cableGauge}</span>
                    </div>
                    <div className="text-xs font-bold truncate">{plan.title}</div>
                  </button>
                ))}
              </div>

              {/* Active Plan Detail & Connection Diagram Matrix */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono-code flex items-center gap-2">
                      <span className="p-1 rounded bg-amber-500/20 text-amber-300">#</span>
                      {selectedPlan.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedPlan.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-mono-code">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Norm: {selectedPlan.standard}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                      Querschnitt: {selectedPlan.cableGauge}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300">
                      Absicherung: {selectedPlan.protection}
                    </span>
                  </div>
                </div>

                {/* Connection Routing Table */}
                <div>
                  <h5 className="text-xs font-scifi font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    VERBINDUNGSMATRIX & PIN-BELEGUNG:
                  </h5>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left font-mono-code text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-scifi border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Signal / Ader</th>
                          <th className="p-2.5">Von (Quelle)</th>
                          <th className="p-2.5">Nach (Ziel)</th>
                          <th className="p-2.5">Spezifikation / Montage-Hinweis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {selectedPlan.connections.map((conn, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-900/40">
                            <td className="p-2.5">
                              <span className="flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                                  style={{ backgroundColor: conn.color }}
                                />
                                <span className="font-bold text-slate-200">{conn.signal}</span>
                              </span>
                            </td>
                            <td className="p-2.5 text-cyan-300 font-semibold">{conn.from}</td>
                            <td className="p-2.5 text-amber-300 font-semibold">{conn.to}</td>
                            <td className="p-2.5 text-slate-400 text-[11px]">{conn.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Safety Directives */}
                <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs">
                  <span className="text-amber-400 font-bold block mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Wichtige Sicherheits- & Installationshinweise:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed text-[11px]">
                    {selectedPlan.safetyNotes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 3. SECTION: LUMENTREE SUN-G2 DISPLAY-FEHLERCODES & DIAGNOSEKATALOG */}
          {(docsFilter === 'all' || docsFilter === 'diagnostics') && (
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
          )}

          {/* 4. SECTION: LiFePO4 AKKU RECHNER & T2SG ZEPC MATRIX */}
          {(docsFilter === 'all' || docsFilter === 'battery') && (
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
          )}

        </div>
      )}

      {/* Modal: Neuen Wartungseintrag erfassen */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow-emerald border border-emerald-500/40 bg-slate-950 p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold font-scifi text-emerald-300 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                NEUEN WARTUNGSEINTRAG ERFASSEN
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMaintenance} className="space-y-3 font-mono-code text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Betroffenes Gerät / Komponente:</label>
                <input
                  type="text"
                  value={newDevice}
                  onChange={(e) => setNewDevice(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ausgeführte Arbeit / Aufgabe:</label>
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Detaillierte Beschreibung:</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Ergebnis:</label>
                  <select
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value as any)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="Erfolgreich">Erfolgreich</option>
                    <option value="Behoben">Behoben</option>
                    <option value="Warnung">Warnung</option>
                    <option value="Fehlgeschlagen">Fehlgeschlagen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Prüfer / Techniker:</label>
                  <input
                    type="text"
                    value={newTechnician}
                    onChange={(e) => setNewTechnician(e.target.value)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Zusätzliche Notizen / Messwerte:</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-scifi"
                >
                  ABBRECHEN
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-scifi shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  SPEICHERN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Neues Handbuch / PDF registrieren */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow-cyan border border-sky-500/40 bg-slate-950 p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold font-scifi text-sky-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                NEUES PDF-HANDBUCH REGISTRIEREN
              </h3>
              <button
                onClick={() => setShowAddManualModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3 font-mono-code text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Gerätename / Handbuchtitel:</label>
                <input
                  type="text"
                  placeholder="z. B. Hoymiles HM-1500 Handbuch"
                  value={newManualTitle}
                  onChange={(e) => setNewManualTitle(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Untertitel / Modell:</label>
                  <input
                    type="text"
                    placeholder="z. B. 4-Kanal Mikrowechselrichter"
                    value={newManualSubtitle}
                    onChange={(e) => setNewManualSubtitle(e.target.value)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Version / Revision:</label>
                  <input
                    type="text"
                    placeholder="z. B. v2.1"
                    value={newManualVersion}
                    onChange={(e) => setNewManualVersion(e.target.value)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Gerätekategorie:</label>
                  <select
                    value={newManualCategory}
                    onChange={(e) => setNewManualCategory(e.target.value as any)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="inverter">Wechselrichter</option>
                    <option value="gateway">Gateway & Steuerung</option>
                    <option value="battery">Batteriespeicher</option>
                    <option value="mppt">MPPT Solarladeregler</option>
                    <option value="meter">Smartmeter & Sensoren</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PDF-Pfad oder URL:</label>
                  <input
                    type="text"
                    placeholder="z. B. /assets/...pdf oder https://..."
                    value={newManualUrl}
                    onChange={(e) => setNewManualUrl(e.target.value)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Beschreibung / Wichtige Spezifikationen:</label>
                <textarea
                  rows={2}
                  placeholder="Kurze Zusammenfassung der relevanten technischen Daten..."
                  value={newManualDesc}
                  onChange={(e) => setNewManualDesc(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-scifi"
                >
                  ABBRECHEN
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-scifi shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                >
                  HANDBUCH HINZUFÜGEN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Neuen Verkabelungsplan registrieren */}
      {showAddWiringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow-purple border border-amber-500/40 bg-slate-950 p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold font-scifi text-amber-300 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-400" />
                NEUEN VERKABELUNGSPLAN ANLEGEN
              </h3>
              <button
                onClick={() => setShowAddWiringModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWiringPlan} className="space-y-3 font-mono-code text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Bezeichnung des Verkabelungsplans:</label>
                <input
                  type="text"
                  placeholder="z. B. Victron SmartSolar MPPT zu 48V Sammelschiene"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Schaltungstyp:</label>
                  <select
                    value={newPlanCategory}
                    onChange={(e) => setNewPlanCategory(e.target.value as any)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="dc">Gleichstrom (DC Hochstrom)</option>
                    <option value="rs485">Datenbus (RS485 / Modbus)</option>
                    <option value="ac">Wechselstrom (AC 230V Netz)</option>
                    <option value="pv">Photovoltaik (PV-String)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Leitungsquerschnitt:</label>
                  <input
                    type="text"
                    placeholder="z. B. 16 mm² / 25 mm²"
                    value={newPlanGauge}
                    onChange={(e) => setNewPlanGauge(e.target.value)}
                    className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Schutzorgan / Absicherung:</label>
                <input
                  type="text"
                  placeholder="z. B. 80A Sicherungsautomat / MegaFuse"
                  value={newPlanProtection}
                  onChange={(e) => setNewPlanProtection(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Beschreibung / Verbindungszweck:</label>
                <textarea
                  rows={2}
                  placeholder="Zweck, Leitungswege und elektrotechnische Besonderheiten..."
                  value={newPlanSummary}
                  onChange={(e) => setNewPlanSummary(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddWiringModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-scifi"
                >
                  ABBRECHEN
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-scifi shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  PLAN SPEICHERN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
