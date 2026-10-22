import React from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  X, 
  Check, 
  Sun, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Radio, 
  Zap, 
  Maximize2, 
  RefreshCw,
  Sparkles,
  Layers,
  Sliders
} from 'lucide-react';
import { DeviceInfo, DeviceOverride } from '../hooks/useDeviceDetection';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceInfo: DeviceInfo & {
    setOverride: (override: DeviceOverride) => void;
    toggleWakeLock: () => Promise<void>;
  };
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  deviceInfo
}) => {
  if (!isOpen) return null;

  const {
    deviceType,
    detectedType,
    override,
    isDesktop,
    isTablet,
    isMobile,
    isTouch,
    pointerType,
    touchPoints,
    screenWidth,
    screenHeight,
    pixelRatio,
    orientation,
    isStandalone,
    isBackground,
    wakeLockActive,
    wakeLockSupported,
    hardwareSummary,
    setOverride,
    toggleWakeLock
  } = deviceInfo;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Monitor className="w-5 h-5 text-sky-400" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-amber-400" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-emerald-400" />;
      default:
        return <Cpu className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Cpu className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Geräte-Erkennung & Hintergrund-Betrieb
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-sky-950/80 text-sky-300 border border-sky-800">
                  {override === 'auto' ? 'AUTO-DETECT' : `MANUELL: ${override.toUpperCase()}`}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automatische Hardware-Optimierung für Desktop PC, Wand-Tablet und Smartphone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Active Status Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950/90 to-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code uppercase tracking-wider text-slate-400">
                Aktiver Anzeigemodus
              </span>
              <div className="flex items-center gap-2 text-xs font-mono-code">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">Aktiv</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                {getDeviceIcon(deviceType)}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {deviceType === 'desktop' && 'Desktop PC'}
                  {deviceType === 'tablet' && 'Tablet / Wanddisplay'}
                  {deviceType === 'mobile' && 'Mobile Smartphone'}
                  <span className="text-xs font-normal text-slate-400">
                    ({hardwareSummary})
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Erkannte physikalische Hardware:{' '}
                  <span className="text-slate-200 font-mono-code uppercase">
                    {detectedType}
                  </span>
                  {override !== 'auto' && (
                    <span className="text-amber-400 ml-1.5 font-mono-code">
                      [Vom Benutzer überschrieben]
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Device Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              Modus-Umschaltung (Automatisch oder Vorschau erzwingen)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Option: Auto */}
              <button
                onClick={() => setOverride('auto')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  override === 'auto'
                    ? 'bg-sky-500/15 border-sky-500 text-white shadow-lg shadow-sky-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  {override === 'auto' && <Check className="w-4 h-4 text-sky-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Auto-Erkennung</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Hardware-Sensorik ({detectedType})
                  </div>
                </div>
              </button>

              {/* Option: Desktop */}
              <button
                onClick={() => setOverride('desktop')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  override === 'desktop'
                    ? 'bg-sky-500/15 border-sky-500 text-white shadow-lg shadow-sky-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  {override === 'desktop' && <Check className="w-4 h-4 text-sky-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Desktop PC</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Volles HUD, Tastatur-Shortcuts
                  </div>
                </div>
              </button>

              {/* Option: Tablet */}
              <button
                onClick={() => setOverride('tablet')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  override === 'tablet'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Tablet className="w-4 h-4 text-amber-400" />
                  {override === 'tablet' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Tablet / Wand</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    2-Spalten Touch-Layout & Kiosk
                  </div>
                </div>
              </button>

              {/* Option: Mobile */}
              <button
                onClick={() => setOverride('mobile')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  override === 'mobile'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  {override === 'mobile' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Smartphone</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Daumenleiste & Kompakte Karten
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Live Sensor & Hardware Telemetry Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              Erkannte Hardware-Parameter & Umgebungsdaten
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono-code">
              
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Bildschirm-Auflösung</span>
                <span className="text-slate-200 font-bold">{screenWidth} × {screenHeight} px</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">DPI: {pixelRatio}x</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Zeiger / Eingabemethode</span>
                <span className="text-slate-200 font-bold capitalize">
                  {pointerType === 'fine' ? 'Maus / Trackpad (Fine)' : 'Touchscreen (Coarse)'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Touch-Punkte: {touchPoints}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Ausrichtung</span>
                <span className="text-slate-200 font-bold capitalize">
                  {orientation === 'landscape' ? 'Querformat (Landscape)' : 'Hochformat (Portrait)'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Ratio: {(screenWidth / Math.max(1, screenHeight)).toFixed(2)}:1</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">PWA Standalone Status</span>
                <span className={`font-bold ${isStandalone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isStandalone ? 'Installiert (App-Fenster)' : 'Standard Web-Browser'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Service Worker: Aktiv</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Hintergrund-Ausführung</span>
                <span className={`font-bold ${isBackground ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isBackground ? 'Hintergrund (Minimiert)' : 'Vordergrund (Aktiv)'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {isBackground ? 'Takt: 8s (Akkuschonung)' : 'Takt: 2s (Echtzeit)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Wand-Display Kiosk-Modus</span>
                <span className={`font-bold ${wakeLockActive ? 'text-amber-400' : 'text-slate-400'}`}>
                  {wakeLockActive ? 'Display bleibt aktiv' : 'Standard Ruhemodus'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  WakeLock API: {wakeLockSupported ? 'Verfügbar' : 'Nicht unterstützt'}
                </span>
              </div>

            </div>
          </div>

          {/* Kiosk / Wall Display WakeLock Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  Wand-Tablet / Kiosk-Modus (Display wachhalten)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Verhindert das Abdunkeln oder Sperren des Bildschirms. Ideal bei montierten Tablets im Flur oder an der Wand zur kontinuierlichen Solar-Überwachung.
              </p>
            </div>

            <button
              onClick={toggleWakeLock}
              disabled={!wakeLockSupported}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                wakeLockActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              } ${!wakeLockSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{wakeLockActive ? 'Display aktiv gehalten' : 'Display wachhalten'}</span>
            </button>
          </div>

          {/* Background Running Information Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Wie verhält sich die App im Hintergrund?</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-slate-300">PWA Offline & Service Worker:</strong> Alle App-Ressourcen, Schema-Vorlagen und Schnittstellen-Definitionen sind lokal im Browser gecacht.
              </li>
              <li>
                <strong className="text-slate-300">Intelligente Takt-Drosselung:</strong> Wird das Smartphone gesperrt oder der Browser minimiert, schaltet der Telemetrie-Takt automatisch von 2s auf 8s um, um Akku und CPU zu schonen.
              </li>
              <li>
                <strong className="text-slate-300">Sofortige Wiederaufnahme:</strong> Beim Entsperren des Geräts oder Wechsel in den Tab wird ohne Neuladen sofort wieder der 2-Sekunden-Echtzeit-Takt fortgeführt.
              </li>
              <li>
                <strong className="text-slate-300">Direkter LAN-Zugriff:</strong> Trucki (<code className="text-sky-300">http://trucki.local</code>), Shelly Pro 3EM und AhoyDTU bleiben direkt über das Heimnetzwerk ansprechbar.
              </li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/70">
          <span className="text-[11px] font-mono-code text-slate-500">
            SOLAR-LOKAL-APP • MULTI-DEVICE RUNTIME
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            Fertig
          </button>
        </div>

      </div>
    </div>
  );
};
