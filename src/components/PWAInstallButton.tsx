import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, CheckCircle, Info, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenDetails?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenDetails }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  // If already running inside standalone PWA
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDetails}
          title="PWA App aktiv (Standalone)"
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">PWA Installiert</span>
          <span className="sm:hidden">PWA</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Direct Install on Android / Chrome / Edge */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
            title="App auf Smartphone / Homescreen installieren"
          >
            <Download className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>App Installieren</span>
          </button>
        )}

        {/* Guided Install on iOS Safari */}
        {isIOS && !isInstallable && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            title="Auf iPhone / iPad zum Home-Bildschirm hinzufügen"
          >
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <span>iOS App</span>
          </button>
        )}

        {/* Info & Setup Trigger for desktop or whenever user wants to inspect PWA setup */}
        {onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Mobile PWA Setup & Funktionsweise erklären"
          >
            <Smartphone className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">Mobile PWA</span>
            <Info className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-slate-700">
                <Smartphone className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Auf iPhone & iPad installieren</h3>
                <p className="text-xs text-slate-400">SolarHub als Vollbild-App nutzen</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold">1</div>
                <div>
                  Tippe in der Safari-Symbolleiste unten (oder oben) auf das <strong>Teilen-Symbol</strong> <Share2 className="inline h-3.5 w-3.5 mx-1 text-cyan-400" />.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold">2</div>
                <div>
                  Scrolle nach unten und wähle <strong>"Zum Home-Bildschirm"</strong> <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-amber-400" />.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">3</div>
                <div>
                  Tippe oben rechts auf <strong>"Hinzufügen"</strong>. Das SolarHub-Icon erscheint direkt neben deinen anderen Apps!
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300/90 leading-tight">
              ⚡ <strong>Vorteil:</strong> Läuft ohne störende Adressleiste im vollen OLED-Vollbildmodus und speichert Dashboards lokal im Cache.
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              Verstanden & Schließen
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {installSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-medium text-emerald-200 shadow-xl backdrop-blur-md">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>App wurde erfolgreich zum Startbildschirm hinzugefügt!</span>
        </div>
      )}
    </>
  );
};
