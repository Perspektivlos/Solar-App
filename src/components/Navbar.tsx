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
  Clock,
  Sparkles
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { DeviceBadge } from './DeviceBadge';
import { DeviceInfo } from '../hooks/useDeviceDetection';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  onOpenWhy: () => void;
  onOpenPWAInfo?: () => void;
  lastTickTime: string;
  deviceInfo: DeviceInfo;
  onOpenDeviceSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSimulating,
  setIsSimulating,
  onOpenWhy,
  onOpenPWAInfo,
  lastTickTime,
  deviceInfo,
  onOpenDeviceSettings
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Steuerzentrale', icon: Zap, keyNumber: '1' },
    { id: 'energy', label: 'Energie & Phasen', icon: Activity, keyNumber: '2' },
    { id: 'devices', label: 'Geräteinventar', icon: Layers, keyNumber: '3' },
    { id: 'network', label: 'Netzwerk & IP', icon: Network, keyNumber: '4' },
    { id: 'mqtt-api', label: 'MQTT & APIs', icon: Radio, keyNumber: '5' },
    { id: 'control', label: 'Steuerung & Limits', icon: Sliders, keyNumber: '6' },
    { id: 'maintenance', label: 'Wartung & Changelog', icon: Wrench, keyNumber: '7' },
    { id: 'report', label: 'Anlagenbericht', icon: FileText, keyNumber: '8' },
  ];

  const isMobile = deviceInfo.deviceType === 'mobile';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090d16]/85 backdrop-blur-xl shadow-lg">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 text-xs border-b border-white/[0.05] text-slate-400 bg-[#070a11]/60">
        
        {/* Left: Branding & Core Node */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 tracking-wide text-slate-200 font-semibold text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-tight text-white text-sm">SOLAR-LOKAL</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-slate-400 font-normal hidden md:inline">Proxmox VE Hypervisor (LXC Core)</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Lokal & Cloudfrei • Hardened ACL</span>
          </div>
        </div>

        {/* Right: Controls & Device Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Clock (CET) */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono-code text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>CET: {lastTickTime}</span>
          </div>

          {/* Node CPU */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.08] bg-slate-900/60 font-mono-code text-[11px] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Node:</span>
            <span className="text-slate-200 font-medium">14% (12W)</span>
          </div>

          {/* Automatic Device Form Factor Badge */}
          <DeviceBadge 
            deviceInfo={deviceInfo} 
            onClick={onOpenDeviceSettings} 
          />

          {/* Live / Pause Ticker Toggle */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isSimulating
                ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Live-Telemetrie pausieren oder fortsetzen (Tastatur: Leertaste)"
          >
            {isSimulating ? (
              <>
                <Pause className="w-3 h-3 text-emerald-400" />
                <span className="hidden xs:inline">Live</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-amber-400" />
                <span className="hidden xs:inline">Pausiert</span>
              </>
            )}
          </button>

          {/* Diagnose / Herkunft Inspector Trigger */}
          <button
            onClick={onOpenWhy}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded bg-slate-800/60 text-slate-300 border border-white/[0.08] hover:bg-slate-800 hover:text-white text-xs transition-all"
            title="System-Diagnose: 'Warum?' & 'Woher kommt dieser Wert?' (Tastatur: ?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Diagnose / Herkunft</span>
          </button>

          {/* PWA Mobile App Install Button / Status */}
          <PWAInstallButton onOpenDetails={onOpenPWAInfo} />
        </div>
      </div>

      {/* Main navigation row (Hidden on mobile if bottom nav is active, or scrollable on tablet/desktop) */}
      {!isMobile && (
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
                  title={deviceInfo.isDesktop ? `Taste [${tab.keyNumber}]` : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {deviceInfo.isDesktop && (
                    <span className="text-[10px] font-mono-code px-1 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                      {tab.keyNumber}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
