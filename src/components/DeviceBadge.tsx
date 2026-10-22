import React from 'react';
import { Monitor, Tablet, Smartphone, Sparkles, Sun } from 'lucide-react';
import { DeviceInfo } from '../hooks/useDeviceDetection';

interface DeviceBadgeProps {
  deviceInfo: DeviceInfo;
  onClick: () => void;
}

export const DeviceBadge: React.FC<DeviceBadgeProps> = ({ deviceInfo, onClick }) => {
  const { deviceType, override, isBackground, wakeLockActive } = deviceInfo;

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'desktop':
        return 'Desktop PC';
      case 'tablet':
        return 'Tablet';
      case 'mobile':
        return 'Smartphone';
      default:
        return 'Device';
    }
  };

  const renderIcon = () => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor className="w-3.5 h-3.5 text-sky-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-amber-400" />;
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono-code transition-all border ${
        deviceType === 'desktop'
          ? 'bg-sky-950/40 border-sky-500/30 text-sky-300 hover:bg-sky-900/50 hover:border-sky-400'
          : deviceType === 'tablet'
          ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400'
          : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400'
      }`}
      title="Hardware- & Geräte-Erkennung öffnen (Desktop, Tablet, Smartphone & Hintergrund-Status)"
    >
      {renderIcon()}
      <span className="font-semibold tracking-wide hidden sm:inline">
        {getDeviceLabel()}
      </span>
      {override !== 'auto' ? (
        <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
          FIX
        </span>
      ) : (
        <span className="text-[10px] text-slate-400 group-hover:text-slate-300 hidden md:inline">
          AUTO
        </span>
      )}

      {wakeLockActive && (
        <Sun className="w-3 h-3 text-amber-400 animate-pulse ml-0.5" title="Kiosk Display Wachgehalten" />
      )}

      {isBackground && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" title="Hintergrund-Modus aktiv" />
      )}
    </button>
  );
};
