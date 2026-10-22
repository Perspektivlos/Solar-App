import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  HardDrive, 
  Zap, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Maximize2, 
  Download, 
  Share2, 
  PlusSquare, 
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWASetupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWASetupInfoModal: React.FC<PWASetupInfoModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'uebersicht' | 'architektur' | 'anleitung' | 'diagnose'>('uebersicht');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        setSwRegistered(regs.length > 0);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md animate-fade-in">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Mobile PWA Setup (Progressive Web App)</h2>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-300 uppercase">
                  Vite-PWA & Standalone
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Installation auf Smartphone & Tablet ohne App-Store – Optimiert für lokales PV-Monitoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          {[
            { id: 'uebersicht', label: '1. Was ist das PWA-Setup?', icon: Zap },
            { id: 'architektur', label: '2. Technische Komponenten', icon: Layers },
            { id: 'anleitung', label: '3. Schritt-für-Schritt Installation', icon: Download },
            { id: 'diagnose', label: '4. Live-Status & Diagnose', icon: ShieldCheck },
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-all ${
                  active 
                    ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t-lg' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          
          {/* TAB 1: ÜBERSICHT */}
          {activeTab === 'uebersicht' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 p-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  Was genau bedeutet "Mobile PWA Setup"?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Eine <strong>Progressive Web App (PWA)</strong> verwandelt dieses Web-Dashboard in eine 
                  <strong> vollwertige Smartphone- und Tablet-App</strong>. Sie lässt sich direkt aus dem Browser 
                  (Safari auf iOS oder Chrome auf Android) auf den Startbildschirm (Homescreen) installieren – 
                  <strong>ganz ohne Apple App Store oder Google Play Store</strong>.
                </p>
              </div>

              {/* 4 Core Pillars for PV Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                    <Maximize2 className="h-4 w-4" />
                    <span>1. Echter Vollbildmodus ("Standalone")</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Keine störende Browser-Adresszeile, keine Vor-/Zurück-Buttons oder URL-Eingaben mehr. Die App startet 
                    wie eine native App im Vollbild mit eigenem SolarHub-Icon und eigenem OLED-Dark-Theme.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <Wifi className="h-4 w-4" />
                    <span>2. Schneller LAN-Direktzugriff</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    1-Tap Zugriff aus deinem Heimnetzwerk direkt auf dein <strong>http://trucki.local</strong> (Trucki T2SG Gateway), 
                    die <strong>Shelly Pro 3EM</strong> Leistungsmessung und die <strong>Victron MPPTs</strong>, ohne lange Bookmarks.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <HardDrive className="h-4 w-4" />
                    <span>3. Offline-Fähigkeit & Service Worker</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sämtliche Skripte, UI-Komponenten, Diagramme, Handbuch-Referenzen und Konfigurationsprofile werden 
                    lokal auf dem Smartphone gecacht. Selbst bei Internetausfall oder im Keller ohne WLAN startet die App sofort.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <span>4. 100% Datenschutz & Cloud-Freiheit</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kein Google- oder Apple-Entwicklerkonto nötig, keine Tracker, keine Cloud-Übermittlung von sensiblen 
                    Haushaltsverbräuchen. Alle Netzwerkabfragen verbleiben sicher in deinem lokalen Subnetz (192.168.1.0/24).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TECHNISCHE KOMPONENTEN */}
          {activeTab === 'architektur' && (
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-white">Die 5 Kernbausteine des PWA-Setups in dieser App:</h3>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300 text-xs sm:text-sm">1. Web App Manifest (manifest.webmanifest)</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Aktiv</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Definiert Name (<code className="text-slate-200">SolarHub</code>), Startseite (<code className="text-slate-200">/</code>), Farbschema (<code className="text-slate-200">#020617</code>) und den Anzeigemodus <code className="text-slate-200">display: standalone</code>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-300 text-xs sm:text-sm">2. Service Worker mit Workbox Caching</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Aktiv</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Generiert durch <code className="text-slate-200">vite-plugin-pwa</code>. Verwaltet Precaching aller JS-, CSS- und Bild-Ressourcen mit automatischer Hintergrundaktualisierung (<code className="text-slate-200">registerType: 'autoUpdate'</code>).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 text-xs sm:text-sm">3. Icon-Set (Android Maskable & iOS Apple Touch)</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Vollständig</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Hochauflösende PNG-Icons (192x192, 512x512, maskable 512x512 mit 15% Safe-Zone) sowie <code className="text-slate-200">apple-touch-icon.png</code> (180x180) für das gestochen scharfe iOS Retina Display.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300 text-xs sm:text-sm">4. Mobile Viewport & Status-Bar Meta-Tags</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Konfiguriert</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    In <code className="text-slate-200">index.html</code> verankert: <code className="text-slate-200">viewport-fit=cover</code>, <code className="text-slate-200">black-translucent</code> Statusbar für Edge-to-Edge Display auf iPhone 12–16 mit Dynamic Island und Notch.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-pink-300 text-xs sm:text-sm">5. In-App Installations-Prompt & Haken</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Eingebunden</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Reagiert auf das native Browser-Ereignis <code className="text-slate-200">beforeinstallprompt</code> für 1-Klick-Installation auf Android/Chrome und blendet die Installations-Schritte für Apple iOS Safari ein.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHRITT-FÜR-SCHRITT ANLEITUNG */}
          {activeTab === 'anleitung' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* iOS Anleitung */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Apple iOS (iPhone / iPad)</h4>
                      <p className="text-[11px] text-slate-400">Safari Browser (WebKit)</p>
                    </div>
                  </div>

                  <ol className="space-y-3 text-xs text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px]">1</span>
                      <span>Öffne die URL dieser App im mobilen <strong>Safari Browser</strong> auf deinem iPhone/iPad.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px]">2</span>
                      <span>Tippe in der Safari-Leiste auf den <strong>Teilen-Button</strong> <Share2 className="inline h-3 w-3 text-cyan-400 mx-0.5" /> (Rechteck mit Pfeil nach oben).</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px]">3</span>
                      <span>Scrolle im Menü etwas nach unten und tippe auf <strong>"Zum Home-Bildschirm"</strong> <PlusSquare className="inline h-3 w-3 text-amber-400 mx-0.5" />.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px]">4</span>
                      <span>Bestätige oben rechts mit <strong>"Hinzufügen"</strong>. Fertig! Die App startet nun immer direkt im Vollbild.</span>
                    </li>
                  </ol>
                </div>

                {/* Android Anleitung */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Android (Google Chrome / Brave / Edge)</h4>
                      <p className="text-[11px] text-slate-400">Chromium Browser Engine</p>
                    </div>
                  </div>

                  <ol className="space-y-3 text-xs text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">1</span>
                      <span>Öffne die App im Chrome-Browser auf deinem Android-Gerät.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">2</span>
                      <span>Tippe direkt in der oberen Navigationsleiste dieser App auf den Button <strong>"App Installieren"</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">3</span>
                      <span>Alternativ: Tippe im Chrome-Drei-Punkte-Menü (oben rechts) auf <strong>"App installieren"</strong> oder <strong>"Zum Startbildschirm hinzufügen"</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">4</span>
                      <span>Chrome erstellt eine WebAPK mit nativem Android App-Drawer Icon.</span>
                    </li>
                  </ol>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: LIVE-STATUS & DIAGNOSE */}
          {activeTab === 'diagnose' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Aktueller PWA-Laufzeitstatus auf diesem Endgerät:</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Anzeigemodus:</span>
                  <span className={`font-mono font-medium px-2 py-0.5 rounded ${
                    isInstalled 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isInstalled ? 'Standalone (Vollbild App)' : 'Browser Tab (Web)'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Netzwerk-Verbindung:</span>
                  <span className={`font-mono font-medium px-2 py-0.5 rounded ${
                    isOnline 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {isOnline ? 'Online (Verbunden)' : 'Offline (Cache-Modus)'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Service Worker Unterstützung:</span>
                  <span className="font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Unterstützt (navigator.serviceWorker)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Erkanntes Endgerät:</span>
                  <span className="font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {isIOS ? 'Apple iOS (WebKit)' : 'Chromium / Desktop / Android'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Installations-Hook:</span>
                  <span className={`font-mono font-medium px-2 py-0.5 rounded ${
                    isInstallable ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isInstallable ? 'Bereit für 1-Klick-Installation' : 'Inaktiv (bereits installiert oder iOS)'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Gecachter Ziel-Host:</span>
                  <span className="font-mono font-semibold text-amber-400">
                    http://trucki.local (Port 80)
                  </span>
                </div>
              </div>

              {/* Action Button */}
              {isInstallable && (
                <div className="mt-4 pt-2">
                  <button
                    onClick={install}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all"
                  >
                    <Download className="h-4 w-4 stroke-[2.5]" />
                    <span>Jetzt als App auf diesem Gerät installieren</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/90 px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PWA Manifest: <strong className="text-slate-300">manifest.webmanifest</strong></span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
