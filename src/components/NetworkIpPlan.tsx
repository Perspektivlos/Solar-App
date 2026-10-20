import React, { useState } from 'react';
import { 
  Network, 
  Search, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Wifi, 
  Server, 
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { NetworkHost, DiscoveredDevice } from '../types';

interface NetworkIpPlanProps {
  hosts: NetworkHost[];
  discoveredDevice: DiscoveredDevice | null;
  onAcceptDiscoveredDevice: (device: DiscoveredDevice) => void;
  onIgnoreDiscoveredDevice: () => void;
  onSimulateScan: () => void;
}

export const NetworkIpPlan: React.FC<NetworkIpPlanProps> = ({
  hosts,
  discoveredDevice,
  onAcceptDiscoveredDevice,
  onIgnoreDiscoveredDevice,
  onSimulateScan
}) => {
  const [search, setSearch] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const filteredHosts = hosts.filter(h => 
    h.ip.includes(search) || 
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.deviceCategory.toLowerCase().includes(search.toLowerCase()) ||
    h.services.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const handleScanClick = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onSimulateScan();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* 05. "NEUES GERÄT ERKANNT" Interactive Discovery Banner */}
      {discoveredDevice && (
        <div className="relative overflow-hidden rounded-2xl glass-panel border border-emerald-500/30 p-4 sm:p-5 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Neues Gerät erkannt
                  </span>
                  <span className="text-xs font-mono-code text-slate-400">{discoveredDevice.timestamp}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {discoveredDevice.suggestedName}
                </h3>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAcceptDiscoveredDevice(discoveredDevice)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Gerät übernehmen</span>
              </button>
              <button
                onClick={onIgnoreDiscoveredDevice}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-white/[0.08]"
              >
                Ignorieren
              </button>
            </div>
          </div>

          {/* Details table for discovered hardware */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06] text-xs font-mono-code">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block uppercase">IP-Adresse</span>
              <span className="text-emerald-300 font-bold">{discoveredDevice.ip}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block uppercase">MAC-Adresse</span>
              <span className="text-slate-200">{discoveredDevice.mac}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block uppercase">Hostname</span>
              <span className="text-sky-300">{discoveredDevice.hostname}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block uppercase">Dienste</span>
              <span className="text-violet-300">{discoveredDevice.services.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main IP Plan & Topology Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.08]">
        
        {/* Header with scan button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Network className="w-4 h-4" />
              </span>
              Netzwerk & IP-Plan (Proxmox Subnet 192.168.0.0/24)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automatische Inventarisierung aller Netzwerk-Hosts, Ports, Latenzen und Protokolle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="IP, Hostname oder Dienst suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/[0.08] focus:border-sky-500/60 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono-code w-60"
              />
            </div>

            <button
              onClick={handleScanClick}
              disabled={isScanning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-white/[0.1] text-white border border-white/[0.14] hover:bg-white/[0.15]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanne...' : 'ARP & Port-Scan'}</span>
            </button>
          </div>
        </div>

        {/* IP Plan Table (Formatted directly according to prompt Section 05 table) */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left font-mono-code text-xs">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase font-scifi border-b border-slate-800">
              <tr>
                <th className="p-3">IP-Adresse</th>
                <th className="p-3">Port</th>
                <th className="p-3">Gerät / Hostname</th>
                <th className="p-3">Kategorie</th>
                <th className="p-3">Dienste</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Latenz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredHosts.map((host, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-bold text-cyan-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {host.ip}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">
                    {host.port ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-amber-400 border border-amber-500/20">
                        {host.port}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-slate-100">
                    <div>{host.name}</div>
                    <div className="text-[10px] text-slate-500">{host.mac}</div>
                  </td>
                  <td className="p-3 text-slate-400">{host.deviceCategory}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {host.services.map((srv, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700/60 text-cyan-300">
                          {srv}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {host.status}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    <span className="text-cyan-400 font-bold">{host.latencyMs}</span> ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Proxmox LXC Network Map Info */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono-code">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Bridge: <strong className="text-slate-200">vmbr0</strong> (VirtIO MTU 1500) • Gateway: 192.168.0.1 (Fritz!Box)</span>
          </div>
          <div className="text-slate-500">
            Aktive ARP-Einträge: <span className="text-emerald-400 font-bold">{hosts.length}</span> / 254
          </div>
        </div>

      </div>
    </div>
  );
};
