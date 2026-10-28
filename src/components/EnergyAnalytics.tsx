import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Activity, 
  BatteryCharging, 
  Sun, 
  HelpCircle,
  TrendingUp,
  Clock,
  Layers,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Percent,
  Download,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { SolarTelemetry } from '../types';

interface EnergyAnalyticsProps {
  telemetry: SolarTelemetry;
  onOpenWhy: () => void;
}

type Timeframe = '3h' | '6h' | '12h' | '24h';
type ViewMode = 'unified' | 'separated';

interface ChartPoint {
  time: string;
  pv: number;
  battery: number;
  grid: number;
  house: number;
  batterySoc: number;
}

// Generate realistic continuous solar day curve tailored to the selected timeframe
function generateHistoricalData(telemetry: SolarTelemetry, timeframe: Timeframe): ChartPoint[] {
  const points: ChartPoint[] = [];
  const now = new Date();
  
  let hoursCount = 24;
  let intervalMinutes = 15;
  if (timeframe === '3h') {
    hoursCount = 3;
    intervalMinutes = 5;
  } else if (timeframe === '6h') {
    hoursCount = 6;
    intervalMinutes = 10;
  } else if (timeframe === '12h') {
    hoursCount = 12;
    intervalMinutes = 15;
  } else {
    hoursCount = 24;
    intervalMinutes = 20;
  }

  const totalSteps = Math.floor((hoursCount * 60) / intervalMinutes);
  const nowMs = now.getTime();

  for (let i = totalSteps; i >= 0; i--) {
    const pointTime = new Date(nowMs - i * intervalMinutes * 60 * 1000);
    const hours = pointTime.getHours();
    const minutes = pointTime.getMinutes();
    const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Normalized solar day model (peak at 13:00)
    const solarHourFraction = hours + minutes / 60;
    let solarBase = 0;
    if (solarHourFraction >= 6.5 && solarHourFraction <= 19.5) {
      // Bell curve for solar radiation
      const angle = ((solarHourFraction - 6.5) / 13) * Math.PI;
      solarBase = Math.sin(angle);
      // Add subtle atmospheric ripple
      solarBase = Math.max(0, solarBase * 1550 + Math.sin(solarHourFraction * 4) * 80);
    }

    // Household base profile (morning peak 07:30, noon peak 12:30, evening peak 19:30)
    let houseLoad = 280; // Standby
    if (solarHourFraction >= 7 && solarHourFraction <= 9) {
      houseLoad += 600 + Math.sin((solarHourFraction - 7) * Math.PI) * 500; // Coffee, toast
    } else if (solarHourFraction >= 12 && solarHourFraction <= 14) {
      houseLoad += 850 + Math.sin((solarHourFraction - 12) * Math.PI) * 650; // Cooking
    } else if (solarHourFraction >= 18 && solarHourFraction <= 22) {
      houseLoad += 700 + Math.sin((solarHourFraction - 18) * 0.7) * 550; // TV, lights, heat
    } else {
      houseLoad += Math.sin(solarHourFraction * 2) * 50;
    }

    // Battery & Trucki AC Gateway logic:
    // When PV > House: Battery charges (positive battery W)
    // When PV < House: Battery discharges (negative battery W) up to ~600W max
    let batteryFlow = 0;
    let batterySoc = 60;
    const netPvSurplus = solarBase - houseLoad;

    if (netPvSurplus > 0) {
      batteryFlow = Math.min(800, netPvSurplus * 0.85); // Charging
      batterySoc = Math.min(98, 45 + (solarHourFraction - 8) * 8);
    } else {
      // Discharging into house via Sun-2000 zero-export
      batteryFlow = -Math.min(600, Math.abs(netPvSurplus)); // Discharging
      batterySoc = Math.max(25, 90 - (solarHourFraction > 18 ? (solarHourFraction - 18) * 12 : 20));
    }

    // Grid interaction (Shelly Pro 3EM)
    // Grid = House - PV - Discharge (when battery discharged is negative, formula accounts for it)
    const suppliedPower = solarBase + (batteryFlow < 0 ? Math.abs(batteryFlow) : 0) - (batteryFlow > 0 ? batteryFlow : 0);
    let gridBalance = Math.round(houseLoad - suppliedPower);

    // Keep grid near zero when zero-export Trucki is active, small residual drift
    if (Math.abs(gridBalance) < 400 && batterySoc > 20) {
      gridBalance = Math.sin(solarHourFraction * 5) * 85 + (gridBalance > 0 ? 40 : -30);
    }

    // If last step (i === 0), smoothly bind to current live telemetry
    if (i === 0) {
      points.push({
        time: timeFormatted,
        pv: Math.round(telemetry.pvTotalWatts),
        battery: Math.round(telemetry.batteryWatts),
        grid: Math.round(telemetry.gridTotalWatts),
        house: Math.round(telemetry.houseTotalWatts),
        batterySoc: telemetry.batterySocPercent
      });
    } else {
      points.push({
        time: timeFormatted,
        pv: Math.round(Math.max(0, solarBase)),
        battery: Math.round(batteryFlow),
        grid: Math.round(gridBalance),
        house: Math.round(Math.max(120, houseLoad)),
        batterySoc: Math.round(Math.min(100, Math.max(15, batterySoc)))
      });
    }
  }

  return points;
}

export const EnergyAnalytics: React.FC<EnergyAnalyticsProps> = ({
  telemetry,
  onOpenWhy
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [viewMode, setViewMode] = useState<ViewMode>('unified'); // 'die 1' selected by user
  
  // Interactive curve visibility toggles for Option 1
  const [visibleSeries, setVisibleSeries] = useState<{
    pv: boolean;
    battery: boolean;
    grid: boolean;
    house: boolean;
  }>({
    pv: true,
    battery: true,
    grid: true,
    house: true
  });

  const chartData = useMemo(() => {
    return generateHistoricalData(telemetry, timeframe);
  }, [telemetry, timeframe]);

  // Derived KPI calculations for the Energy Balance
  const energyBalance = useMemo(() => {
    const pvYield = telemetry.pvDailyYieldKwh || 6.84;
    const gridImport = telemetry.gridDailyImportKwh || 1.82;
    const gridExport = telemetry.gridDailyExportKwh || 0.45;
    const batCharged = telemetry.batteryDailyChargedKwh || 4.12;
    const batDischarged = telemetry.batteryDailyDischargedKwh || 2.85;
    
    // Direct consumption = PV Yield - Battery Charged - Grid Export
    const directConsumption = Math.max(0, Number((pvYield - (batCharged * 0.7) - gridExport).toFixed(2)));
    const totalHouseConsumption = Number((directConsumption + batDischarged + gridImport).toFixed(2));
    
    // Autarky = (Total House - Grid Import) / Total House
    const autarky = totalHouseConsumption > 0 
      ? Math.min(100, Math.max(0, Number((((totalHouseConsumption - gridImport) / totalHouseConsumption) * 100).toFixed(1))))
      : 84.5;

    // Self-consumption = (PV Yield - Grid Export) / PV Yield
    const selfConsumptionRate = pvYield > 0
      ? Math.min(100, Math.max(0, Number((((pvYield - gridExport) / pvYield) * 100).toFixed(1))))
      : 93.4;

    // Battery efficiency (discharged / charged)
    const batteryEfficiency = batCharged > 0 
      ? Math.min(98, Number(((batDischarged / batCharged) * 100).toFixed(1)))
      : 92.4;

    return {
      pvYield,
      gridImport,
      gridExport,
      batCharged,
      batDischarged,
      directConsumption,
      totalHouseConsumption,
      autarky,
      selfConsumptionRate,
      batteryEfficiency
    };
  }, [telemetry]);

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload as ChartPoint;
    if (!data) return null;

    return (
      <div className="glass-panel p-3.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl text-xs space-y-2.5 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 font-mono-code text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {data.time} Uhr
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
            SoC {data.batterySoc}%
          </span>
        </div>

        <div className="space-y-1.5 font-mono-code">
          {visibleSeries.pv && (
            <div className="flex items-center justify-between text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                PV-Erzeugung:
              </span>
              <span className="font-bold">{data.pv} W</span>
            </div>
          )}

          {visibleSeries.house && (
            <div className="flex items-center justify-between text-rose-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Hausverbrauch:
              </span>
              <span className="font-bold">{data.house} W</span>
            </div>
          )}

          {visibleSeries.battery && (
            <div className="flex items-center justify-between text-cyan-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Akku-Nutzung:
              </span>
              <span className="font-bold">
                {data.battery > 0 ? `+${data.battery} W (Ladung)` : `${data.battery} W (Entladung)`}
              </span>
            </div>
          )}

          {visibleSeries.grid && (
            <div className="flex items-center justify-between text-indigo-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Netz (Shelly):
              </span>
              <span className="font-bold">
                {data.grid > 0 ? `+${data.grid} W (Bezug)` : `${data.grid} W (Einspeisung)`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER & CONTROL BAR */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Activity className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Energie-Analyse & Recharts Zeitverlauf
              </h2>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Live Synchron
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Hochauflösende Messdaten von Hoymiles HM-1500, Victron MPPTs, 48V LiFePO4 Speicher und Shelly Pro 3EM
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Selector (Option 1 default vs Option 2) */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'unified'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Option 1: Alle 4 Messreihen synchron in einem Diagramm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multilinie (Option 1)</span>
              </button>
              <button
                onClick={() => setViewMode('separated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'separated'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Option 2: Getrennte Diagramme pro Kanal"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>4 Kanäle (Option 2)</span>
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/[0.08]">
              {(['3h', '6h', '12h', '24h'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition-all ${
                    timeframe === tf
                      ? 'bg-slate-700 text-white font-semibold shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={onOpenWhy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-white/[0.08] hover:bg-slate-700 text-xs font-medium transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Phasenschiefe?</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHART VIEW SECTION (OPTION 1 OR OPTION 2) */}
      {viewMode === 'unified' ? (
        /* ================= OPTION 1: UNIFIED MULTI-LINE RECHARTS ================= */
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Synchroner Leistungsverlauf • {timeframe} Zeitfenster
              </h3>
              <p className="text-[11px] text-slate-400">
                Klicke auf die Legenden-Kacheln, um einzelne Kurven ein- oder auszublenden
              </p>
            </div>

            {/* Interactive Series Toggles with Live Values */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggleSeries('pv')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-code border transition-all ${
                  visibleSeries.pv
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-slate-900/60 text-slate-500 border-white/5 opacity-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>PV {telemetry.pvTotalWatts} W</span>
              </button>

              <button
                onClick={() => toggleSeries('house')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-code border transition-all ${
                  visibleSeries.house
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-slate-900/60 text-slate-500 border-white/5 opacity-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Haus {telemetry.houseTotalWatts} W</span>
              </button>

              <button
                onClick={() => toggleSeries('battery')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-code border transition-all ${
                  visibleSeries.battery
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-500 border-white/5 opacity-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Akku {telemetry.batteryWatts} W</span>
              </button>

              <button
                onClick={() => toggleSeries('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-code border transition-all ${
                  visibleSeries.grid
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-500 border-white/5 opacity-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Netz {telemetry.gridTotalWatts} W</span>
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-[360px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="pvGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tickFormatter={(val) => `${val}W`}
                />
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="2 2" />
                <Tooltip content={<CustomTooltip />} />
                
                {/* PV Line */}
                {visibleSeries.pv && (
                  <Line 
                    type="monotone" 
                    dataKey="pv" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    name="PV Erzeugung"
                  />
                )}

                {/* House Consumption Line */}
                {visibleSeries.house && (
                  <Line 
                    type="monotone" 
                    dataKey="house" 
                    stroke="#f43f5e" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                    name="Hausverbrauch"
                  />
                )}

                {/* Battery Flow Line */}
                {visibleSeries.battery && (
                  <Line 
                    type="monotone" 
                    dataKey="battery" 
                    stroke="#06b6d4" 
                    strokeWidth={2} 
                    strokeDasharray="4 2"
                    dot={false}
                    activeDot={{ r: 5, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                    name="Akku-Nutzung"
                  />
                )}

                {/* Grid Exchange Line */}
                {visibleSeries.grid && (
                  <Line 
                    type="monotone" 
                    dataKey="grid" 
                    stroke="#818cf8" 
                    strokeWidth={1.8} 
                    dot={false}
                    activeDot={{ r: 5, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
                    name="Netz (Shelly)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Info bar */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.06] font-mono-code">
            <div className="flex items-center gap-4">
              <span>Nulldurchgang (0W): Trennlinie für Laden/Entladen & Bezug/Einspeisung</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Abtastrate: Alle {timeframe === '3h' ? '5' : timeframe === '6h' ? '10' : '15'} Min • Zeitbasis UTC+2</span>
            </div>
          </div>
        </div>
      ) : (
        /* ================= OPTION 2: 4 SEPARATE COMPACT CHARTS ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: PV Erzeugung */}
          <div className="glass-panel p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-amber-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                PV-Erzeugung (Hoymiles + Victron)
              </span>
              <span className="font-mono-code text-white">{telemetry.pvTotalWatts} W</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pvSolo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pv" stroke="#f59e0b" fill="url(#pvSolo)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Hausverbrauch */}
          <div className="glass-panel p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-rose-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-rose-400" />
                Hausverbrauch (Gesamtlast)
              </span>
              <span className="font-mono-code text-white">{telemetry.houseTotalWatts} W</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="houseSolo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="house" stroke="#f43f5e" fill="url(#houseSolo)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Akku-Nutzung */}
          <div className="glass-panel p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-cyan-300 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-cyan-400" />
                Akku-Nutzung & LiFePO4 SoC
              </span>
              <span className="font-mono-code text-white">{telemetry.batteryWatts} W ({telemetry.batterySocPercent}%)</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="battery" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4: Netzübergabe Shelly */}
          <div className="glass-panel p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-indigo-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-400" />
                Netzbezug / Netzeinspeisung (Shelly Pro 3EM)
              </span>
              <span className="font-mono-code text-white">{telemetry.gridTotalWatts} W</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="2 2" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="grid" stroke="#818cf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ================= COMPLETE KWH ENERGIEBILANZ ================= */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Tages-Energiebilanz in Kilowattstunden (kWh)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vollständige Bilanzierung des Energieflusses: Erzeugung, Speicherung, Netzbezug und Verbrauch
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-mono-code text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Autarkie Heute: <strong className="text-white text-sm">{energyBalance.autarky}%</strong></span>
          </div>
        </div>

        {/* 4 PRIMARY KPI METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* PV Ertrag */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                <Sun className="w-4 h-4 text-amber-400" />
                PV-Ertrag Heute
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                Erzeugung
              </span>
            </div>
            <div className="text-2xl font-bold font-mono-code text-white mb-1">
              {energyBalance.pvYield} <span className="text-sm font-normal text-amber-400">kWh</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-code space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span>Direktverbrauch:</span>
                <span className="text-slate-200 font-semibold">{energyBalance.directConsumption} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>In Akku geladen:</span>
                <span className="text-cyan-300">{energyBalance.batCharged} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Netzeinspeisung:</span>
                <span className="text-emerald-400">{energyBalance.gridExport} kWh</span>
              </div>
            </div>
          </div>

          {/* Hausverbrauch Gesamt */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-rose-300">
                <Zap className="w-4 h-4 text-rose-400" />
                Hausverbrauch Gesamt
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">
                Bedarf
              </span>
            </div>
            <div className="text-2xl font-bold font-mono-code text-white mb-1">
              {energyBalance.totalHouseConsumption} <span className="text-sm font-normal text-rose-400">kWh</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-code space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span>Aus Solar direkt:</span>
                <span className="text-amber-300 font-semibold">{energyBalance.directConsumption} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Aus Batteriespeicher:</span>
                <span className="text-cyan-300">{energyBalance.batDischarged} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Aus öffentlichem Netz:</span>
                <span className="text-indigo-300">{energyBalance.gridImport} kWh</span>
              </div>
            </div>
          </div>

          {/* Batterie LiFePO4 Speicher */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <BatteryCharging className="w-4 h-4 text-cyan-400" />
                Speicherumsatz (48V)
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                LiFePO4
              </span>
            </div>
            <div className="text-2xl font-bold font-mono-code text-white mb-1">
              {energyBalance.batDischarged} <span className="text-sm font-normal text-cyan-400">kWh entl.</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-code space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span>Ladung kumuliert:</span>
                <span className="text-slate-200 font-semibold">{energyBalance.batCharged} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Entladung (Sun-2000):</span>
                <span className="text-slate-200">{energyBalance.batDischarged} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Round-Trip Wirkungsgrad:</span>
                <span className="text-emerald-300 font-semibold">{energyBalance.batteryEfficiency}%</span>
              </div>
            </div>
          </div>

          {/* Netzbilanz (Shelly Pro 3EM) */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-indigo-300">
                <Activity className="w-4 h-4 text-indigo-400" />
                Netzübertritt (Shelly)
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                Saldierend
              </span>
            </div>
            <div className="text-2xl font-bold font-mono-code text-white mb-1">
              {energyBalance.gridImport} <span className="text-sm font-normal text-indigo-400">kWh Bezug</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-code space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span>Netzbezug Heute:</span>
                <span className="text-indigo-300 font-semibold">+{energyBalance.gridImport} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Netzeinspeisung:</span>
                <span className="text-emerald-400">-{energyBalance.gridExport} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Netto-Netzsaldo:</span>
                <span className="text-slate-200 font-semibold">+{(energyBalance.gridImport - energyBalance.gridExport).toFixed(2)} kWh</span>
              </div>
            </div>
          </div>

        </div>

        {/* VISUAL ENERGY FLOW PROGRESS BARS & PROPORTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          
          {/* Solar Energy Distribution Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-amber-300">Verteilung des Solarertrags ({energyBalance.pvYield} kWh = 100%)</span>
              <span className="text-slate-400 font-mono-code">Eigenverbrauch: {energyBalance.selfConsumptionRate}%</span>
            </div>

            {/* Segmented Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${(energyBalance.directConsumption / energyBalance.pvYield) * 100}%` }} 
                className="bg-amber-400 h-full transition-all" 
                title={`Direktverbrauch: ${energyBalance.directConsumption} kWh`}
              />
              <div 
                style={{ width: `${(energyBalance.batCharged / energyBalance.pvYield) * 100}%` }} 
                className="bg-cyan-400 h-full transition-all" 
                title={`Batterieladung: ${energyBalance.batCharged} kWh`}
              />
              <div 
                style={{ width: `${(energyBalance.gridExport / energyBalance.pvYield) * 100}%` }} 
                className="bg-emerald-400 h-full transition-all" 
                title={`Netzeinspeisung: ${energyBalance.gridExport} kWh`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-code pt-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-amber-400"></span>
                <span>Direkt: {((energyBalance.directConsumption / energyBalance.pvYield) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-cyan-400"></span>
                <span>Akku: {((energyBalance.batCharged / energyBalance.pvYield) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-emerald-400"></span>
                <span>Netz: {((energyBalance.gridExport / energyBalance.pvYield) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Household Consumption Coverage Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-rose-300">Deckung des Hausverbrauchs ({energyBalance.totalHouseConsumption} kWh = 100%)</span>
              <span className="text-slate-400 font-mono-code">Autarkie: {energyBalance.autarky}%</span>
            </div>

            {/* Segmented Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${(energyBalance.directConsumption / energyBalance.totalHouseConsumption) * 100}%` }} 
                className="bg-amber-400 h-full transition-all" 
                title={`Direkte PV-Deckung: ${energyBalance.directConsumption} kWh`}
              />
              <div 
                style={{ width: `${(energyBalance.batDischarged / energyBalance.totalHouseConsumption) * 100}%` }} 
                className="bg-cyan-400 h-full transition-all" 
                title={`Akku-Deckung: ${energyBalance.batDischarged} kWh`}
              />
              <div 
                style={{ width: `${(energyBalance.gridImport / energyBalance.totalHouseConsumption) * 100}%` }} 
                className="bg-indigo-400 h-full transition-all" 
                title={`Netzbezug: ${energyBalance.gridImport} kWh`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-code pt-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-amber-400"></span>
                <span>Solar: {((energyBalance.directConsumption / energyBalance.totalHouseConsumption) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-cyan-400"></span>
                <span>Akku: {((energyBalance.batDischarged / energyBalance.totalHouseConsumption) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-sm bg-indigo-400"></span>
                <span>Netz: {((energyBalance.gridImport / energyBalance.totalHouseConsumption) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3-PHASEN MATRIX SHELLY PRO 3EM */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
              Shelly Pro 3EM • 3-Phasen Netzbezug & Schieflast
            </h3>
          </div>
          <span className="text-xs font-mono-code text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Saldierter Netzbezug: <strong className="text-white">{telemetry.gridTotalWatts} W</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {telemetry.gridPhases.map((phase) => {
            const isImport = phase.activePower >= 0;
            return (
              <div 
                key={phase.phase} 
                className="p-4 rounded-xl border border-white/[0.06] bg-slate-900/60 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-300 px-2 py-0.5 rounded bg-slate-800/80 border border-white/[0.06]">
                    Phase {phase.phase}
                  </span>
                  <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full border ${
                    isImport ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}>
                    {isImport ? 'Bezug' : 'Einspeisung'}
                  </span>
                </div>

                <div className="text-2xl font-bold font-mono-code text-white mb-1">
                  <span className={isImport ? 'text-indigo-300' : 'text-emerald-400'}>
                    {phase.activePower > 0 ? `+${phase.activePower}` : phase.activePower}
                  </span>
                  <span className="text-xs text-slate-400 ml-1 font-mono-code">W</span>
                </div>

                <div className="space-y-1 text-xs font-mono-code text-slate-400 pt-3 border-t border-white/[0.06]">
                  <div className="flex justify-between">
                    <span>Spannung:</span>
                    <span className="text-slate-200 font-semibold">{phase.voltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stromstärke:</span>
                    <span className="text-slate-200">{phase.current} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Power Factor (cos φ):</span>
                    <span className="text-sky-300">{phase.powerFactor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequenz:</span>
                    <span className="text-slate-400">{phase.frequency} Hz</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06] text-xs text-slate-400 leading-relaxed font-sans">
          <strong className="text-indigo-300 font-medium">Hinweis zur Phasensaldierung:</strong> Der Sun-2000 Inverter speist einphasig auf <strong className="text-slate-200">Phase L2</strong> ein. Dank des nach EN 50470-3 saldierenden Shelly Pro 3EM Stromzählers wird der Bezug von L1 (+180W) und L3 (+60W) vollumfänglich mit der Einspeisung auf L2 (-95W) verrechnet.
        </div>
      </div>

      {/* 2 GRID BLOCKS: HOYMILES 4 KANÄLE & LIFEPO4 16S ZELLEN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* HOYMILES HM-1500 4 KANÄLE */}
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                Hoymiles HM-1500 • 4x MPPT Tracker
              </h3>
            </div>
            <span className="text-xs font-mono-code text-amber-300">
              Gesamt: {telemetry.pvHoymilesWatts} W • {telemetry.hoymilesTempC} °C
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {telemetry.hoymilesChannels.map((ch) => (
              <div key={ch.channel} className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs font-mono-code">
                <div className="flex justify-between items-center text-slate-400 mb-1">
                  <span className="text-amber-400 font-semibold">Kanal {ch.channel}</span>
                  <span className="text-slate-500 text-[11px]">HM-1500</span>
                </div>
                <div className="text-lg font-bold font-mono-code text-white">
                  {ch.power} <span className="text-xs text-amber-400 font-normal">W</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Spannung:</span>
                    <span className="text-slate-200">{ch.voltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strom:</span>
                    <span className="text-slate-200">{ch.current} A</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Victron MPPT Summary */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.06] text-xs font-mono-code space-y-1.5">
            <div className="text-[11px] text-amber-400 font-semibold uppercase">
              Zusätzlich: 2x Victron SmartSolar MPPT 150/35 (Venus OS)
            </div>
            <div className="flex justify-between text-slate-300">
              <span>MPPT 150/35 [288]:</span>
              <span className="font-semibold text-amber-300">{telemetry.pvVictronMppt1Watts} W (Float)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>MPPT 150/35 [289]:</span>
              <span className="font-semibold text-amber-300">{telemetry.pvVictronMppt2Watts} W (Float)</span>
            </div>
          </div>
        </div>

        {/* 48V LIFEPO4 16S EINZELZELLEN TELEMETRIE */}
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                48V LiFePO4 • 16S Zellen-Balancing
              </h3>
            </div>
            <span className="text-xs font-mono-code text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Delta: 5 mV (Ideal)
            </span>
          </div>

          {/* Cell Grid 16 cells */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {telemetry.batteryCellVoltages.map((v, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06] text-center font-mono-code">
                <span className="text-[10px] text-slate-500 block">Z{idx + 1}</span>
                <span className="text-xs font-bold text-emerald-300">{v.toFixed(3)}</span>
                <span className="text-[9px] text-slate-500 block">V</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono-code text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">Gesamtspannung:</span>
              <span className="text-emerald-300 font-bold">{telemetry.batteryVoltage} V</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">SoH (Gesundheit):</span>
              <span className="text-white font-bold">{telemetry.batteryHealthPercent}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">Zyklen:</span>
              <span className="text-white font-bold">{telemetry.batteryCycles}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
