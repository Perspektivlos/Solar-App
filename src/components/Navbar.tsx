import React from 'react';
import { 
  Zap, 
  Activity, 
  Server, 
  Cpu, 
  Play, 
  Pause, 
  Radio, 
  ShieldCheck, 
  Sliders, 
  FileText, 
  Network, 
  Layers, 
  Wrench, 
  HelpCircle,
  Clock
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  onOpenWhy: () => void;
  lastTickTime: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSimulating,
  setIsSimulating,
  onOpenWhy,
  lastTickTime
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Steuerzentrale', icon: Zap },
    { id: 'energy', label: 'Energie & Phasen', icon: Activity },
    { id: 'devices', label: 'Geräteinventar', icon: Layers },
    { id: 'network', label: 'Netzwerk & IP', icon: Network },
    { id: 'mqtt-api', label: 'MQTT & APIs', icon: Radio },
    { id: 'control', label: 'Steuerung & Integrationen', icon: Sliders },
    { id: 'maintenance', label: 'Wartung & Changelog', icon: Wrench },
    { id: 'report', label: 'Anlagenbericht', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090d16]/80 backdrop-blur-xl shadow-lg">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 text-xs border-b border-white/[0.05] text-slate-400 bg-[#070a11]/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 tracking-wide text-slate-200 font-semibold text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-tight text-white text-sm">SOLAR-LOKAL</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-normal hidden sm:inline">Proxmox VE Hypervisor (LXC Core)</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Lokal & Cloudfrei • Hardened ACL</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 font-mono-code text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>CET: {lastTickTime}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.08] bg-slate-900/60 font-mono-code text-[11px] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline text-slate-400">Node:</span>
            <span className="text-slate-200 font-medium">14% (12W)</span>
          </div>

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isSimulating
                ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Live-Telemetrie pausieren oder fortsetzen"
          >
            {isSimulating ? (
              <>
                <Pause className="w-3 h-3 text-emerald-400" />
                <span>Live</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-amber-400" />
                <span>Pausiert</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenWhy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/60 text-slate-300 border border-white/[0.08] hover:bg-slate-800 hover:text-white text-xs transition-all"
            title="System-Diagnose: 'Warum?' & 'Woher kommt dieser Wert?'"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Diagnose / Herkunft</span>
          </button>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="flex items-center justify-between px-4 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.09] text-white border border-white/[0.14] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
