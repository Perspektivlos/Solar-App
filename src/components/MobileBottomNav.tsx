import React, { useState } from 'react';
import { 
  Zap, 
  Activity, 
  Layers, 
  Radio, 
  Menu, 
  X, 
  Network, 
  Sliders, 
  Wrench, 
  FileText, 
  Smartphone, 
  HelpCircle,
  Cpu,
  ChevronRight
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenWhy: () => void;
  onOpenPWAInfo: () => void;
  onOpenDeviceSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenWhy,
  onOpenPWAInfo,
  onOpenDeviceSettings
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const primaryTabs = [
    { id: 'dashboard', label: 'Fluss', icon: Zap },
    { id: 'energy', label: 'Phasen', icon: Activity },
    { id: 'devices', label: 'Geräte', icon: Layers },
    { id: 'mqtt-api', label: 'MQTT', icon: Radio },
  ];

  const secondaryTabs = [
    { id: 'network', label: 'Netzwerk & IP-Plan', icon: Network, desc: 'ARP-Scan, mDNS & Host-Inventar' },
    { id: 'control', label: 'Steuerung & Limits', icon: Sliders, desc: 'Zero-Export, Trucki & Ahoy Limits' },
    { id: 'maintenance', label: 'Wartung & Changelog', icon: Wrench, desc: 'Historie & Komponenten-Audit' },
    { id: 'report', label: 'Anlagenbericht', icon: FileText, desc: 'PDF, JSON & Markdown Export' },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Slide-up "Mehr" Drawer / Sheet for secondary tools */}
      {sheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn"
          onClick={() => setSheetOpen(false)}
        >
          <div 
            className="w-full bg-[#0c1220] border-t border-slate-700/80 rounded-t-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Weitere Module & Werkzeuge</h3>
              </div>
              <button 
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-1 gap-2">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isActive 
                        ? 'bg-sky-500/15 border-sky-500/50 text-white' 
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{tab.label}</div>
                        <div className="text-[11px] text-slate-400">{tab.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>

            {/* System Actions in Mobile Menu */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSheetOpen(false);
                  onOpenDeviceSettings();
                }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:text-white hover:border-slate-700"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Geräte-Erkennung</span>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  onOpenWhy();
                }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:text-white hover:border-slate-700"
              >
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span>"Warum?" Prüfer</span>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  onOpenPWAInfo();
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Mobile PWA & Homescreen-Installation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#090e1a]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
                  isActive
                    ? 'text-sky-400 bg-sky-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400 stroke-[2.2]' : 'text-slate-400'}`} />
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          {/* "Mehr" Button */}
          <button
            onClick={() => setSheetOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
              secondaryTabs.some(t => t.id === activeTab)
                ? 'text-sky-400 bg-sky-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] mt-1 tracking-tight">Mehr...</span>
          </button>
        </div>
      </div>
    </>
  );
};
