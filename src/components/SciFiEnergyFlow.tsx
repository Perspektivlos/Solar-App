import React, { useState } from 'react';
import { 
  Sun, 
  BatteryCharging, 
  Home, 
  Zap, 
  Activity, 
  HelpCircle
} from 'lucide-react';
import { SolarTelemetry } from '../types';
import { SciFiFlowCanvas } from './SciFiFlowCanvas';

interface SciFiEnergyFlowProps {
  telemetry: SolarTelemetry;
  onInspectNode: (nodeType: 'pv' | 'battery' | 'grid' | 'house') => void;
  onOpenWhy: () => void;
}

export const SciFiEnergyFlow: React.FC<SciFiEnergyFlowProps> = ({
  telemetry,
  onInspectNode,
  onOpenWhy
}) => {
  const [viewMode, setViewMode] = useState<'power' | 'amps' | 'efficiency'>('power');

  const isBatteryDischarging = telemetry.batteryWatts < 0;
  const absBatteryWatts = Math.abs(telemetry.batteryWatts);
  const isGridImport = telemetry.gridTotalWatts >= 0;
  const absGridWatts = Math.abs(telemetry.gridTotalWatts);

  return (
    <div className="relative w-full rounded-2xl glass-panel p-4 sm:p-6 overflow-hidden border border-white/[0.08]">
      {/* Discreet background architectural grid */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.03] via-transparent to-violet-500/[0.02] pointer-events-none" />

      {/* Header bar within matrix */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Activity className="w-4 h-4" />
              </span>
              Energiematrix & Echtzeit-Flussvektoren
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono-code bg-slate-800/80 text-sky-300 border border-white/[0.08]">
              Trucki Zero-Export
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Hoymiles HM-1500 + 2x Victron MPPT • 48V LiFePO4 • Shelly Pro 3EM
          </p>
        </div>

        {/* View mode toggle & Why button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-white/[0.08] text-xs font-mono-code">
            <button
              onClick={() => setViewMode('power')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'power' ? 'bg-white/[0.1] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Leistung (W)
            </button>
            <button
              onClick={() => setViewMode('amps')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'amps' ? 'bg-white/[0.1] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strom (A)
            </button>
            <button
              onClick={() => setViewMode('efficiency')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'efficiency' ? 'bg-white/[0.1] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Autarkie (%)
            </button>
          </div>

          <button
            onClick={onOpenWhy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 text-slate-300 border border-white/[0.08] hover:bg-slate-800 hover:text-white text-xs font-medium transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Diagnose</span>
          </button>
        </div>
      </div>

      {/* Interactive 4-Node Energy Hub */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* NODE 1: PHOTOVOLTAIK */}
        <div 
          onClick={() => onInspectNode('pv')}
          className="group cursor-pointer rounded-xl bg-slate-900/70 hover:bg-slate-900/95 border border-amber-500/20 hover:border-amber-500/40 p-4 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/15 transition-all">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase">Solar PV</div>
                <div className="text-[11px] text-slate-400">Hoymiles + 2x MPPT</div>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Aktiv
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono-code tracking-tight text-white group-hover:text-amber-100 transition-colors">
                {viewMode === 'power' ? telemetry.pvTotalWatts.toLocaleString() : (telemetry.pvTotalWatts / 230).toFixed(2)}
              </span>
              <span className="text-xs font-mono-code text-amber-400 font-medium">
                {viewMode === 'power' ? 'W' : 'A (AC)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Tagesertrag:</span>
              <span className="text-slate-200 font-mono-code font-medium">{telemetry.pvDailyYieldKwh} kWh</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono-code">
            <div className="flex justify-between text-slate-400">
              <span>Hoymiles HM-1500:</span>
              <span className="text-amber-400/90 font-medium">{telemetry.pvHoymilesWatts} W ({telemetry.hoymilesLimitPercent}%)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Victron MPPT Ost (DC):</span>
              <span className="text-slate-300">{telemetry.pvVictronMppt1Watts} W</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Victron MPPT West (DC):</span>
              <span className="text-slate-300">{telemetry.pvVictronMppt2Watts} W</span>
            </div>
          </div>
        </div>

        {/* NODE 2: BATTERIESPEICHER */}
        <div 
          onClick={() => onInspectNode('battery')}
          className="group cursor-pointer rounded-xl bg-slate-900/70 hover:bg-slate-900/95 border border-emerald-500/20 hover:border-emerald-500/40 p-4 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-all">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Batterie 48V</div>
                <div className="text-[11px] text-slate-400">6x Power Queen 100Ah</div>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              {telemetry.batterySocPercent}% SoC
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono-code tracking-tight text-white group-hover:text-emerald-100 transition-colors">
                {viewMode === 'power' ? absBatteryWatts.toLocaleString() : Math.abs(telemetry.batteryCurrent).toFixed(1)}
              </span>
              <span className="text-xs font-mono-code text-emerald-400 font-medium">
                {viewMode === 'power' ? 'W' : 'A (DC)'}
              </span>
              <span className="text-xs text-slate-400 ml-1 font-sans">
                ({isBatteryDischarging ? 'Entladung' : 'Ladung'})
              </span>
            </div>

            {/* Battery SoC refined bar */}
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${telemetry.batterySocPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono-code">
            <div className="flex justify-between text-slate-400">
              <span>Spannung / Strom:</span>
              <span className="text-emerald-400/90 font-medium">{telemetry.batteryVoltage} V / {telemetry.batteryCurrent} A</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trucki Sun-2000:</span>
              <span className="text-sky-300">{telemetry.truckiActualOutputWatts} W (Lim {telemetry.truckiPowerLimitWatts}W)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Max Zellendrift:</span>
              <span className="text-slate-300">5 mV (Ideal)</span>
            </div>
          </div>
        </div>

        {/* NODE 3: HAUSVERBRAUCH */}
        <div 
          onClick={() => onInspectNode('house')}
          className="group cursor-pointer rounded-xl bg-slate-900/70 hover:bg-slate-900/95 border border-sky-500/20 hover:border-sky-500/40 p-4 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:bg-sky-500/15 transition-all">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-sky-400 uppercase">Hausverbrauch</div>
                <div className="text-[11px] text-slate-400">Saldierte Wirkleistung</div>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
              Live
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono-code tracking-tight text-white group-hover:text-sky-100 transition-colors">
                {viewMode === 'power' ? telemetry.houseTotalWatts.toLocaleString() : (telemetry.houseTotalWatts / 230).toFixed(2)}
              </span>
              <span className="text-xs font-mono-code text-sky-400 font-medium">
                {viewMode === 'power' ? 'W' : 'A'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Tagesbedarf:</span>
              <span className="text-slate-200 font-mono-code font-medium">{telemetry.houseDailyKwh} kWh</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono-code">
            <div className="flex justify-between text-slate-400">
              <span>Hoymiles (direkt):</span>
              <span className="text-amber-400/90 font-medium">{telemetry.pvHoymilesWatts} W</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sun-2000 (aus Akku):</span>
              <span className="text-sky-300 font-medium">{telemetry.truckiActualOutputWatts} W</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Netz (Shelly 3EM):</span>
              <span className={telemetry.gridTotalWatts >= 0 ? "text-violet-300 font-medium" : "text-emerald-400 font-medium"}>
                {telemetry.gridTotalWatts >= 0 ? `+${telemetry.gridTotalWatts} W (Bezug)` : `${telemetry.gridTotalWatts} W (Export)`}
              </span>
            </div>
          </div>
        </div>

        {/* NODE 4: ÖFFENTLICHES NETZ */}
        <div 
          onClick={() => onInspectNode('grid')}
          className="group cursor-pointer rounded-xl bg-slate-900/70 hover:bg-slate-900/95 border border-indigo-500/20 hover:border-indigo-500/40 p-4 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/15 transition-all">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">Stromnetz</div>
                <div className="text-[11px] text-slate-400">Shelly Pro 3EM (L1/L2/L3)</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full border ${
              isGridImport 
                ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' 
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}>
              {isGridImport ? 'Bezug' : 'Einspeisung'}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono-code tracking-tight text-white group-hover:text-indigo-100 transition-colors">
                {viewMode === 'power' ? absGridWatts.toLocaleString() : (absGridWatts / 230).toFixed(2)}
              </span>
              <span className="text-xs font-mono-code text-indigo-400 font-medium">
                {viewMode === 'power' ? 'W' : 'A'}
              </span>
              <span className="text-xs text-slate-400 ml-1 font-mono-code">
                {telemetry.gridPhases[0].frequency} Hz
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Tagesbezug / Export:</span>
              <span className="text-slate-200 font-mono-code font-medium">{telemetry.gridDailyImportKwh} / {telemetry.gridDailyExportKwh} kWh</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono-code">
            <div className="flex justify-between text-slate-400">
              <span>L1 ({telemetry.gridPhases[0].voltage}V):</span>
              <span className={telemetry.gridPhases[0].activePower >= 0 ? 'text-violet-300' : 'text-emerald-400'}>
                {telemetry.gridPhases[0].activePower} W
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>L2 ({telemetry.gridPhases[1].voltage}V):</span>
              <span className={telemetry.gridPhases[1].activePower >= 0 ? 'text-violet-300' : 'text-emerald-400'}>
                {telemetry.gridPhases[1].activePower} W
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>L3 ({telemetry.gridPhases[2].voltage}V):</span>
              <span className={telemetry.gridPhases[2].activePower >= 0 ? 'text-violet-300' : 'text-emerald-400'}>
                {telemetry.gridPhases[2].activePower} W
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Real-time SVG Animated Energy Flow Diagram */}
      <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.08]">
        <SciFiFlowCanvas 
          telemetry={telemetry} 
          onInspectNode={onInspectNode} 
        />
      </div>
    </div>
  );
};
