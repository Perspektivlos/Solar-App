import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Activity, 
  Eye,
  EyeOff
} from 'lucide-react';
import { SolarTelemetry } from '../types';

interface SciFiFlowCanvasProps {
  telemetry: SolarTelemetry;
  onInspectNode: (nodeType: 'pv' | 'battery' | 'grid' | 'house') => void;
}

export const SciFiFlowCanvas: React.FC<SciFiFlowCanvasProps> = ({
  telemetry,
  onInspectNode,
}) => {
  const [isAnimationActive, setIsAnimationActive] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [showBadges, setShowBadges] = useState(false);

  // Derived telemetry states
  const isBatteryDischarging = telemetry.batteryWatts < 0;
  const absBatteryWatts = Math.abs(telemetry.batteryWatts);

  const isGridExport = telemetry.gridTotalWatts < -5;
  const absGridWatts = Math.abs(telemetry.gridTotalWatts);

  const mpptWatts = telemetry.pvVictronMppt1Watts + telemetry.pvVictronMppt2Watts;
  const hoymilesWatts = telemetry.pvHoymilesWatts;
  const houseWatts = telemetry.houseTotalWatts;

  // Calculate dynamic animation duration based on power in Watts
  const calculateDuration = (watts: number, minDur = 0.9, maxDur = 4.2): number => {
    const clampedWatts = Math.max(10, Math.min(watts, 3200));
    const normalized = (clampedWatts - 10) / (3200 - 10);
    const dur = maxDur - normalized * (maxDur - minDur);
    return Math.max(0.6, dur / speedMultiplier);
  };

  const durSolarAc = calculateDuration(hoymilesWatts);
  const durSolarDc = calculateDuration(mpptWatts);
  const durBattery = calculateDuration(absBatteryWatts);
  const durGrid = calculateDuration(absGridWatts);
  const durTruckiToHouse = calculateDuration(telemetry.truckiActualOutputWatts);

  // Path coordinates connecting nodes in 920x440 coordinate space:
  // Node positions:
  // Solar PV: Center at (180, 105)
  // Battery 48V: Center at (740, 105)
  // Shelly Grid: Center at (180, 335)
  // Sun-2000 / Trucki: Center at (740, 335) [Bottom-Right]
  // Hausverbrauch Core: Center at (460, 220) [Center]

  // 1. Solar Hoymiles AC -> DIREKT INS HAUS (AC Direkteinspeisung ins Zentrum)
  const pathSolarHoymilesDirect = "M 270 125 C 315 125, 340 205, 385 205";
  
  // 2. Solar Victron DC -> LiFePO4 Battery (direct DC charging arc along top perimeter)
  const pathSolarDc = "M 270 75 C 400 25, 520 25, 650 75";

  // 3. Battery 48V (Top-Right: 740, 105) <-> Sun-2000 Inverter (Bottom-Right: 740, 335)
  const pathBatteryDischarge = "M 740 165 L 740 275";
  const pathBatteryCharge = "M 740 275 L 740 165";
  const pathBattery = isBatteryDischarging ? pathBatteryDischarge : pathBatteryCharge;

  // 4. Grid <-> Hausverbrauch im Zentrum (Shelly Pro 3EM)
  const pathGridImport = "M 270 335 C 315 335, 340 235, 385 235";
  const pathGridExport = "M 385 235 C 340 235, 315 335, 270 335";
  const pathGrid = isGridExport ? pathGridExport : pathGridImport;

  // 5. Sun-2000 (Trucki Nulleinspeise-Inverter 740, 335) -> Hausverbrauch im Zentrum (460, 220)
  const pathTruckiToHouse = "M 650 335 C 600 335, 580 220, 535 220";

  return (
    <div className="relative w-full rounded-xl bg-slate-950/60 border border-white/[0.08] p-3 sm:p-5 overflow-hidden shadow-xl">
      {/* Discreet background architectural grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Diagram Header & Interactive controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white flex items-center gap-2">
              Echtzeit-Energieflussvektoren
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800/80 text-sky-300 border border-white/[0.08]">
                SVG DYNAMIK
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Partikelflussgeschwindigkeit skaliert proportional mit Leistungswerten
            </p>
          </div>
        </div>

        {/* Animation controls */}
        <div className="flex items-center gap-2 font-mono-code text-xs">
          <button
            onClick={() => setIsAnimationActive(!isAnimationActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              isAnimationActive 
                ? 'bg-slate-800 text-sky-300 border-sky-500/30 shadow-sm' 
                : 'bg-slate-900 border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
            title={isAnimationActive ? 'Partikelfluss pausieren' : 'Partikelfluss starten'}
          >
            {isAnimationActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-sky-400" />
                <span>Fluss Aktiv</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>Pausiert</span>
              </>
            )}
          </button>

          <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-white/[0.08] text-[11px]">
            <span className="px-2 py-0.5 text-slate-400">Tempo:</span>
            {[1.0, 1.5, 2.0].map((multiplier) => (
              <button
                key={multiplier}
                onClick={() => setSpeedMultiplier(multiplier)}
                className={`px-2 py-0.5 rounded transition-all ${
                  speedMultiplier === multiplier
                    ? 'bg-white/[0.1] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {multiplier}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowBadges(!showBadges)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showBadges 
                ? 'bg-slate-800 border-sky-500/30 text-sky-300' 
                : 'bg-slate-900 border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
            title={showBadges ? 'Werte-Anzeigen auf Pfaden ausblenden' : 'Werte-Anzeigen auf Pfaden einblenden'}
          >
            {showBadges ? (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Anzeigen: Ein</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Anzeigen: Aus</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* The Master SVG Flow Canvas */}
      <div className="relative z-10 w-full overflow-x-auto pb-1">
        <svg
          viewBox="0 0 920 440"
          className="w-full h-auto min-w-[720px] max-w-[940px] mx-auto select-none"
        >
          <defs>
            {/* Subtle, soft light glow filters */}
            <filter id="soft-glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="soft-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="soft-glow-sky" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="soft-glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Architectural dark gradient fills for nodes */}
            <linearGradient id="grad-solar" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#18171d" />
              <stop offset="100%" stopColor="#0d0f16" />
            </linearGradient>

            <linearGradient id="grad-battery" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#121b18" />
              <stop offset="100%" stopColor="#0c1211" />
            </linearGradient>

            <linearGradient id="grad-grid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#151421" />
              <stop offset="100%" stopColor="#0d0e17" />
            </linearGradient>

            <linearGradient id="grad-house" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#101826" />
              <stop offset="100%" stopColor="#0a101b" />
            </linearGradient>

            <linearGradient id="grad-trucki" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#121722" />
              <stop offset="100%" stopColor="#0b0f17" />
            </linearGradient>
          </defs>

          {/* ============================================================== */}
          {/* ENERGY PIPELINES (Precision vector tracks & animated pulses)   */}
          {/* ============================================================== */}

          {/* 1. Solar Hoymiles AC -> DIREKT INS HAUS */}
          <g id="pipeline-solar-hoymiles-direct">
            <path
              d={pathSolarHoymilesDirect}
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={pathSolarHoymilesDirect}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 8"
              className={isAnimationActive && hoymilesWatts > 10 ? "animate-flow-forward" : ""}
              style={{
                animationDuration: `${durSolarAc}s`,
                strokeOpacity: hoymilesWatts > 10 ? 0.85 : 0.2
              }}
            />
            {isAnimationActive && hoymilesWatts > 10 && (
              <>
                <circle r="3.5" fill="#fbbf24" filter="url(#soft-glow-amber)">
                  <animateMotion
                    path={pathSolarHoymilesDirect}
                    dur={`${durSolarAc}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="3" fill="#fef08a" filter="url(#soft-glow-amber)">
                  <animateMotion
                    path={pathSolarHoymilesDirect}
                    dur={`${durSolarAc}s`}
                    begin={`${(durSolarAc * 0.5).toFixed(2)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </>
            )}
          </g>

          {/* 2. Solar Victron MPPT DC -> 48V Battery */}
          <g id="pipeline-solar-dc">
            <path
              d={pathSolarDc}
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={pathSolarDc}
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 8"
              className={isAnimationActive && mpptWatts > 10 ? "animate-flow-forward" : ""}
              style={{
                animationDuration: `${durSolarDc}s`,
                strokeOpacity: mpptWatts > 10 ? 0.8 : 0.2
              }}
            />
            {isAnimationActive && mpptWatts > 10 && (
              <>
                <circle r="3.5" fill="#facc15" filter="url(#soft-glow-amber)">
                  <animateMotion
                    path={pathSolarDc}
                    dur={`${durSolarDc}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="3" fill="#34d399" filter="url(#soft-glow-emerald)">
                  <animateMotion
                    path={pathSolarDc}
                    dur={`${durSolarDc}s`}
                    begin={`${(durSolarDc * 0.5).toFixed(2)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </>
            )}
          </g>

          {/* 3. Battery 48V <-> Sun-2000 Inverter (Bottom-Right) */}
          <g id="pipeline-battery-ac">
            <path
              d="M 740 165 L 740 275"
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={pathBattery}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 8"
              className={isAnimationActive && absBatteryWatts > 10 ? "animate-flow-forward" : ""}
              style={{
                animationDuration: `${durBattery}s`,
                strokeOpacity: absBatteryWatts > 10 ? 0.85 : 0.2
              }}
            />
            {isAnimationActive && absBatteryWatts > 10 && (
              <circle r="3.5" fill="#34d399" filter="url(#soft-glow-emerald)">
                <animateMotion
                  path={pathBattery}
                  dur={`${durBattery}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>

          {/* 4. Grid <-> Hausverbrauch */}
          <g id="pipeline-grid">
            <path
              d="M 270 335 C 315 335, 340 235, 385 235"
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={pathGrid}
              fill="none"
              stroke={isGridExport ? "#10b981" : "#818cf8"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 8"
              className={isAnimationActive && absGridWatts > 10 ? "animate-flow-forward" : ""}
              style={{
                animationDuration: `${durGrid}s`,
                strokeOpacity: absGridWatts > 10 ? 0.85 : 0.2
              }}
            />
            {isAnimationActive && absGridWatts > 10 && (
              <circle 
                r="3.5" 
                fill={isGridExport ? "#34d399" : "#a78bfa"} 
                filter={isGridExport ? "url(#soft-glow-emerald)" : "url(#soft-glow-indigo)"}
              >
                <animateMotion
                  path={pathGrid}
                  dur={`${durGrid}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>

          {/* 5. Sun-2000 Inverter -> Hausverbrauch */}
          <g id="pipeline-trucki-to-house">
            <path
              d={pathTruckiToHouse}
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={pathTruckiToHouse}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 8"
              className={isAnimationActive && telemetry.truckiActualOutputWatts > 10 ? "animate-flow-forward" : ""}
              style={{
                animationDuration: `${durTruckiToHouse}s`,
                strokeOpacity: telemetry.truckiActualOutputWatts > 10 ? 0.85 : 0.2
              }}
            />
            {isAnimationActive && telemetry.truckiActualOutputWatts > 10 && (
              <circle r="3.5" fill="#38bdf8" filter="url(#soft-glow-sky)">
                <animateMotion
                  path={pathTruckiToHouse}
                  dur={`${durTruckiToHouse}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>

          {/* ============================================================== */}
          {/* FLOW VECTOR TELEMETRY BADGES ON PATHS (AUSBLENDEN / TOGGLE)    */}
          {/* ============================================================== */}
          {showBadges && (
            <>
              {/* Solar Hoymiles AC Direct Badge */}
              <g transform="translate(325, 160)">
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="24"
                  rx="6"
                  fill="#0b0f1a"
                  stroke="rgba(245,158,11,0.4)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  className="text-[10px] font-mono-code font-bold fill-amber-300"
                >
                  ▶ {hoymilesWatts} W AC
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  className="text-[7px] font-mono-code fill-slate-400"
                >
                  DIREKT INS HAUS
                </text>
              </g>

              {/* Victron MPPT DC Charge Badge */}
              <g transform="translate(460, 48)">
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="24"
                  rx="6"
                  fill="#0b0f1a"
                  stroke="rgba(234,179,8,0.4)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  className="text-[10px] font-mono-code font-bold fill-yellow-300"
                >
                  ▶ {mpptWatts} W DC
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  className="text-[7px] font-mono-code fill-slate-400"
                >
                  LADUNG 48V AKKU
                </text>
              </g>

              {/* Battery DC Feed Badge */}
              <g transform="translate(740, 220)">
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="24"
                  rx="6"
                  fill="#0b0f1a"
                  stroke="rgba(16,185,129,0.4)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  className="text-[10px] font-mono-code font-bold fill-emerald-300"
                >
                  {isBatteryDischarging ? '▼' : '▲'} {absBatteryWatts} W
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  className="text-[7px] font-mono-code fill-slate-400"
                >
                  {isBatteryDischarging ? 'DC SPEICHER FEED' : 'LADUNG'}
                </text>
              </g>

              {/* Grid Shelly 3EM Badge */}
              <g transform="translate(325, 290)">
                <rect
                  x="-55"
                  y="-12"
                  width="110"
                  height="24"
                  rx="6"
                  fill="#0b0f1a"
                  stroke={isGridExport ? "rgba(16,185,129,0.4)" : "rgba(129,140,248,0.4)"}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  className={`text-[10px] font-mono-code font-bold ${
                    isGridExport ? 'fill-emerald-300' : 'fill-indigo-300'
                  }`}
                >
                  {isGridExport ? '◀' : '▶'} {absGridWatts} W
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  className="text-[7px] font-mono-code fill-slate-400"
                >
                  {isGridExport ? 'NETZEINSPEISUNG' : 'NETZBEZUG'}
                </text>
              </g>

              {/* Sun-2000 Inverter Output to House Badge */}
              <g transform="translate(595, 280)">
                <rect
                  x="-60"
                  y="-12"
                  width="120"
                  height="24"
                  rx="6"
                  fill="#0b0f1a"
                  stroke="rgba(56,189,248,0.4)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  className="text-[10px] font-mono-code font-bold fill-sky-300"
                >
                  ◀ {telemetry.truckiActualOutputWatts} W
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  className="text-[7px] font-mono-code fill-slate-400"
                >
                  SUN NULLEINSP.
                </text>
              </g>
            </>
          )}

          {/* ============================================================== */}
          {/* CENTRAL NODE: HAUSVERBRAUCH                                    */}
          {/* ============================================================== */}
          <g 
            transform="translate(460, 220)"
            onClick={() => onInspectNode('house')}
            className="cursor-pointer group"
          >
            {/* Soft architectural ring */}
            <circle
              r="62"
              fill="none"
              stroke="rgba(56,189,248,0.2)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <circle
              r="54"
              fill="none"
              stroke="rgba(56,189,248,0.3)"
              strokeWidth="1"
            />

            {/* Core container */}
            <rect
              x="-76"
              y="-46"
              width="152"
              height="92"
              rx="14"
              fill="url(#grad-house)"
              stroke="rgba(56,189,248,0.35)"
              strokeWidth="1"
              className="group-hover:stroke-sky-400 transition-all"
            />

            {/* Core labels */}
            <text
              x="0"
              y="-24"
              textAnchor="middle"
              className="text-[11px] font-semibold tracking-wider fill-sky-300 uppercase"
            >
              Hausverbrauch
            </text>

            <text
              x="0"
              y="4"
              textAnchor="middle"
              className="text-[22px] font-mono-code font-bold fill-white"
            >
              {houseWatts.toLocaleString()} <tspan className="text-[12px] font-mono-code fill-sky-400 font-medium">W</tspan>
            </text>

            <text
              x="0"
              y="20"
              textAnchor="middle"
              className="text-[9.5px] font-mono-code font-semibold fill-emerald-400"
            >
              Autarkie: {telemetry.autarkyPercent.toFixed(0)}%
            </text>

            <text
              x="0"
              y="33"
              textAnchor="middle"
              className="text-[8px] font-mono-code fill-slate-400"
            >
              Hoy: {hoymilesWatts}W • Sun: {telemetry.truckiActualOutputWatts}W • Netz: {telemetry.gridTotalWatts >= 0 ? `+${telemetry.gridTotalWatts}` : telemetry.gridTotalWatts}W
            </text>
          </g>

          {/* ============================================================== */}
          {/* 4 STATIONS                                                     */}
          {/* ============================================================== */}

          {/* --- NODE 1: SOLAR PV (Top-Left: 180, 105) --- */}
          <g 
            transform="translate(180, 105)"
            onClick={() => onInspectNode('pv')}
            className="cursor-pointer group"
          >
            <rect
              x="-90"
              y="-60"
              width="180"
              height="120"
              rx="12"
              fill="url(#grad-solar)"
              stroke="rgba(245,158,11,0.25)"
              strokeWidth="1"
              className="group-hover:stroke-amber-400/60 transition-all"
            />
            {/* Header / Title */}
            <circle cx="-65" cy="-35" r="13" fill="#241a10" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
            <text x="-65" y="-30" textAnchor="middle" className="text-[13px] fill-amber-300">☀</text>
            <text x="-44" y="-38" className="text-[11px] font-semibold fill-amber-400 tracking-wider uppercase">Solar PV</text>
            <text x="-44" y="-26" className="text-[9px] font-mono-code fill-slate-400">Hoymiles + 2x MPPT</text>

            {/* Total Watts Display */}
            <text x="0" y="5" textAnchor="middle" className="text-[22px] font-mono-code font-bold fill-white group-hover:text-amber-100 transition-colors">
              {telemetry.pvTotalWatts.toLocaleString()} <tspan className="text-[12px] font-mono-code fill-amber-400 font-medium">W</tspan>
            </text>

            {/* Sub-readouts */}
            <text x="-75" y="26" className="text-[9px] font-mono-code fill-slate-400">
              AC Hoymiles: <tspan className="fill-amber-300 font-medium">{hoymilesWatts}W</tspan> <tspan className="fill-slate-500 text-[8px]">▶ Direkt</tspan>
            </text>
            <text x="-75" y="42" className="text-[9px] font-mono-code fill-slate-400">
              DC Victron: <tspan className="fill-amber-200 font-medium">{mpptWatts}W</tspan> <tspan className="fill-slate-500 text-[8px]">▶ in Akku</tspan>
            </text>
          </g>

          {/* --- NODE 2: BATTERIE 48V (Top-Right: 740, 105) --- */}
          <g 
            transform="translate(740, 105)"
            onClick={() => onInspectNode('battery')}
            className="cursor-pointer group"
          >
            <rect
              x="-90"
              y="-60"
              width="180"
              height="120"
              rx="12"
              fill="url(#grad-battery)"
              stroke="rgba(16,185,129,0.25)"
              strokeWidth="1"
              className="group-hover:stroke-emerald-400/60 transition-all"
            />
            {/* Header / Title */}
            <circle cx="-65" cy="-35" r="13" fill="#10231c" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            <text x="-65" y="-30" textAnchor="middle" className="text-[12px] fill-emerald-300">⚡</text>
            <text x="-44" y="-38" className="text-[11px] font-semibold fill-emerald-400 tracking-wider uppercase">Batterie 48V</text>
            <text x="-44" y="-26" className="text-[9px] font-mono-code fill-slate-400">6x Power Queen</text>

            {/* Total Watts Display */}
            <text x="0" y="5" textAnchor="middle" className="text-[22px] font-mono-code font-bold fill-white group-hover:text-emerald-100 transition-colors">
              {absBatteryWatts.toLocaleString()} <tspan className="text-[12px] font-mono-code fill-emerald-400 font-medium">W</tspan>
            </text>

            {/* Sub-readouts */}
            <text x="-75" y="26" className="text-[9px] font-mono-code fill-slate-400">
              Ladestand: <tspan className="fill-emerald-300 font-semibold">{telemetry.batterySocPercent}% SoC</tspan>
            </text>
            <text x="-75" y="42" className="text-[9px] font-mono-code fill-slate-400">
              Spannung: <tspan className="fill-slate-200">{telemetry.batteryVoltage}V ({telemetry.batteryCurrent}A)</tspan>
            </text>
          </g>

          {/* --- NODE 3: STROMNETZ (Bottom-Left: 180, 335) --- */}
          <g 
            transform="translate(180, 335)"
            onClick={() => onInspectNode('grid')}
            className="cursor-pointer group"
          >
            <rect
              x="-90"
              y="-60"
              width="180"
              height="120"
              rx="12"
              fill="url(#grad-grid)"
              stroke={isGridExport ? "rgba(16,185,129,0.25)" : "rgba(129,140,248,0.25)"}
              strokeWidth="1"
              className="group-hover:stroke-indigo-400/60 transition-all"
            />
            {/* Header / Title */}
            <circle cx="-65" cy="-35" r="13" fill="#1b1829" stroke="rgba(129,140,248,0.4)" strokeWidth="1" />
            <text x="-65" y="-30" textAnchor="middle" className="text-[12px] fill-indigo-300">☵</text>
            <text x="-44" y="-38" className="text-[11px] font-semibold fill-indigo-400 tracking-wider uppercase">Stromnetz</text>
            <text x="-44" y="-26" className="text-[9px] font-mono-code fill-slate-400">Shelly Pro 3EM</text>

            {/* Total Watts Display */}
            <text 
              x="0" 
              y="5" 
              textAnchor="middle" 
              className="text-[22px] font-mono-code font-bold fill-white group-hover:text-indigo-100 transition-colors"
            >
              {absGridWatts.toLocaleString()} <tspan className="text-[12px] font-mono-code font-medium fill-indigo-400">W</tspan>
            </text>

            {/* Sub-readouts */}
            <text x="-75" y="26" className="text-[9px] font-mono-code fill-slate-400">
              Modus: <tspan className={isGridExport ? "fill-emerald-400 font-semibold" : "fill-indigo-300 font-semibold"}>
                {isGridExport ? 'Einspeisung' : 'Netzbezug'}
              </tspan>
            </text>
            <text x="-75" y="42" className="text-[9px] font-mono-code fill-slate-400">
              L1: <tspan className="fill-slate-300">{telemetry.gridPhases[0].activePower}W</tspan> • L2: <tspan className="fill-slate-300">{telemetry.gridPhases[1].activePower}W</tspan>
            </text>
          </g>

          {/* --- NODE 4: SUN-G2 / TRUCKI (Bottom-Right: 740, 335) --- */}
          <g 
            transform="translate(740, 335)"
            onClick={() => onInspectNode('house')}
            className="cursor-pointer group"
          >
            <rect
              x="-90"
              y="-60"
              width="180"
              height="120"
              rx="12"
              fill="url(#grad-trucki)"
              stroke="rgba(56,189,248,0.25)"
              strokeWidth="1"
              className="group-hover:stroke-sky-400/60 transition-all"
            />
            {/* Header / Title */}
            <circle cx="-65" cy="-35" r="13" fill="#111f2c" stroke="rgba(56,189,248,0.4)" strokeWidth="1" />
            <text x="-65" y="-30" textAnchor="middle" className="text-[12px] fill-sky-300">⚡</text>
            <text x="-44" y="-38" className="text-[11px] font-semibold fill-sky-400 tracking-wider uppercase">Sun-2000 / Trucki</text>
            <text x="-44" y="-26" className="text-[9px] font-mono-code fill-slate-400">RS485 Nulleinspeiser</text>

            {/* Total Watts Display */}
            <text x="0" y="5" textAnchor="middle" className="text-[22px] font-mono-code font-bold fill-white group-hover:text-sky-100 transition-colors">
              {telemetry.truckiActualOutputWatts.toLocaleString()} <tspan className="text-[12px] font-mono-code fill-sky-400 font-medium">W</tspan>
            </text>

            {/* Sub-readouts */}
            <text x="-75" y="24" className="text-[8.5px] font-mono-code fill-slate-400">
              Regelung: <tspan className="fill-sky-300 font-semibold">{absGridWatts < 25 ? 'Zero-Export (0W)' : `Ausgleich (${telemetry.gridTotalWatts}W)`}</tspan>
            </text>
            <text x="-75" y="37" className="text-[8.5px] font-mono-code fill-slate-400">
              Soll / DAC: <tspan className="fill-slate-200">{telemetry.truckiTargetWatts}W • {telemetry.truckiBridgeDacVoltage}V</tspan>
            </text>
            <text x="-75" y="50" className="text-[8.5px] font-mono-code fill-slate-400">
              Status: <tspan className="fill-emerald-400">{telemetry.truckiStatus} • Lim: {telemetry.truckiPowerLimitWatts}W</tspan>
            </text>
          </g>

        </svg>
      </div>

      {/* Footer Topology Quick-Status Bar */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-mono-code">
        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">SOLAR ERTRAG HEUTE</span>
          <span className="text-white font-bold text-sm block mt-0.5">
            {telemetry.pvDailyYieldKwh.toFixed(2)} kWh
          </span>
          <span className="text-[10px] text-amber-400/90 block mt-0.5">
            Aktuell: {telemetry.pvTotalWatts} W
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">Batterie Kapazität</span>
          <span className="text-white font-bold text-sm block mt-0.5">
            {((telemetry.batterySocPercent / 100) * 9.6).toFixed(2)} kWh
          </span>
          <span className="text-[10px] text-emerald-400/90 block mt-0.5">
            {telemetry.batterySocPercent}% SoC (9.6 kWh)
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">Netzbezug Heute</span>
          <span className="text-white font-bold text-sm block mt-0.5">
            {telemetry.gridDailyImportKwh.toFixed(2)} kWh
          </span>
          <span className="text-[10px] text-indigo-400/90 block mt-0.5">
            Aktuell: {telemetry.gridTotalWatts >= 0 ? `+${telemetry.gridTotalWatts}` : telemetry.gridTotalWatts} W
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 block tracking-wider font-semibold uppercase">Autakiegrad</span>
          <span className="text-white font-bold text-sm block mt-0.5">
            {telemetry.autarkyPercent.toFixed(1)}%
          </span>
          <span className="text-[10px] text-sky-400/90 block mt-0.5">
            {isGridExport ? '100% Unabhängig' : `${(100 - (telemetry.gridDailyImportKwh / (telemetry.houseDailyKwh || 1) * 100)).toFixed(0)}% Eigenabdeckung`}
          </span>
        </div>
      </div>
    </div>
  );
};
