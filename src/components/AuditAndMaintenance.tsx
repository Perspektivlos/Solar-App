import React, { useState } from 'react';
import { 
  History, 
  Wrench, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Cpu, 
  Search, 
  Filter, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { ChangeLogEntry, MaintenanceEntry } from '../types';

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
  const [activeTab, setActiveTab] = useState<'changelog' | 'maintenance'>('changelog');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Form state for manual maintenance log
  const [newDevice, setNewDevice] = useState<string>('48V LiFePO4 Speicher (6x Power Queen 100Ah)');
  const [newTask, setNewTask] = useState<string>('Zellenprüfung & Drehmomentkontrolle');
  const [newDescription, setNewDescription] = useState<string>('Prüfung der Zellenspannungen und Anschlüsse.');
  const [newResult, setNewResult] = useState<'Erfolgreich' | 'Warnung' | 'Behoben' | 'Fehlgeschlagen'>('Erfolgreich');
  const [newTechnician, setNewTechnician] = useState<string>('Betreiber (Haucky)');
  const [newNotes, setNewNotes] = useState<string>('Alle 16 Zellen im Toleranzbereich.');

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

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tab Toggle */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <History className="w-4 h-4" />
              </span>
              Änderungsverfolgung & Wartungsprotokoll
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automatische Differenz-Erkennung geänderter Parameter und digitaler Anlagen-Servicepass
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/80 rounded-xl p-1 border border-white/[0.08] text-xs font-medium">
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
            </div>

            {activeTab === 'maintenance' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Eintrag erfassen</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Einträge nach Gerät, Parameter oder Notiz filtern..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono-code"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: 10. ÄNDERUNGSVERFOLGUNG (AUTOMATISCH ERKANNTES CHANGE LOG) */}
      {activeTab === 'changelog' && (
        <div className="space-y-3">
          {filteredChanges.map((entry) => (
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

              {/* Old vs New Value comparison block (Mandate Section 10) */}
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
          ))}
        </div>
      )}

      {/* TAB 2: 11. WARTUNGSPROTOKOLL (AUTOMATISCH & MANUELL) */}
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

    </div>
  );
};
