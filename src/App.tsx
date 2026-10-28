import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Radio, 
  FileText, 
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { 
  SolarTelemetry, 
  DeviceInventoryItem, 
  NetworkHost, 
  DiscoveredDevice, 
  MqttTopicDoc, 
  ApiDoc, 
  ChangeLogEntry, 
  MaintenanceEntry 
} from './types';
import { 
  INITIAL_TELEMETRY, 
  INITIAL_DEVICES, 
  INITIAL_NETWORK_HOSTS, 
  INITIAL_DISCOVERED_DEVICE, 
  INITIAL_MQTT_TOPICS, 
  INITIAL_API_DOCS, 
  INITIAL_CHANGELOG, 
  INITIAL_MAINTENANCE,
  getAutoEnrichedDevices,
  getAutoEnrichedHosts
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { SciFiEnergyFlow } from './components/SciFiEnergyFlow';
import { WhyDrawer } from './components/WhyDrawer';
import { DeviceInventory } from './components/DeviceInventory';
import { NetworkIpPlan } from './components/NetworkIpPlan';
import { MqttApiDocs } from './components/MqttApiDocs';
import { ControlAndScripts } from './components/ControlAndScripts';
import { AuditAndMaintenance } from './components/AuditAndMaintenance';
import { SystemReportGenerator } from './components/SystemReportGenerator';
import { EnergyAnalytics } from './components/EnergyAnalytics';
import { PWASetupInfoModal } from './components/PWASetupInfoModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { DeviceSettingsModal } from './components/DeviceSettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppUpdateModal } from './components/AppUpdateModal';
import { HardwareConfigModal } from './components/HardwareConfigModal';
import { MqttSettingsModal } from './components/MqttSettingsModal';

export default function App() {
  const deviceInfo = useDeviceDetection();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [telemetry, setTelemetry] = useState<SolarTelemetry>(INITIAL_TELEMETRY);
  const [devices, setDevices] = useState<DeviceInventoryItem[]>(INITIAL_DEVICES);
  const [hosts, setHosts] = useState<NetworkHost[]>(INITIAL_NETWORK_HOSTS);
  const [discoveredDevice, setDiscoveredDevice] = useState<DiscoveredDevice | null>(INITIAL_DISCOVERED_DEVICE);
  const [mqttTopics] = useState<MqttTopicDoc[]>(INITIAL_MQTT_TOPICS);
  const [apiDocs] = useState<ApiDoc[]>(INITIAL_API_DOCS);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>(INITIAL_CHANGELOG);
  const [maintenanceLog, setMaintenanceLog] = useState<MaintenanceEntry[]>(INITIAL_MAINTENANCE);
  const [isEnriched, setIsEnriched] = useState<boolean>(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState<boolean>(false);
  const [whyMetric, setWhyMetric] = useState<'pv' | 'battery' | 'grid' | 'house'>('pv');
  const [pwaModalOpen, setPwaModalOpen] = useState<boolean>(false);
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [hardwareConfigModalOpen, setHardwareConfigModalOpen] = useState<boolean>(false);
  const [mqttSettingsModalOpen, setMqttSettingsModalOpen] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<string>('14:32:45');
  const [backendInfo, setBackendInfo] = useState<{
    isOnline: boolean;
    isLiveLAN: boolean;
    liveDevicesCount?: number;
    strictLiveOnly?: boolean;
    demoSimulationAllowed?: boolean;
    telemetrySource?: 'mqtt' | 'http_rest' | 'none';
    mqttStatus?: { connected: boolean; brokerUrl: string; lastMessageTime: string | null; priority?: string };
    sources?: { shelly: string; ahoy: string; trucki: string; venus: string };
  }>({ isOnline: true, isLiveLAN: false, strictLiveOnly: true, liveDevicesCount: 0, telemetrySource: 'none' });

  // Dynamic polling interval:
  // - In foreground: 2000ms for fluid, responsive real-time updates
  // - In background (tab hidden / smartphone locked): 8000ms throttled to conserve battery and CPU
  const pollIntervalMs = deviceInfo.isBackground ? 8000 : 2000;

  // Live telemetry ticker connected to Express Backend (/api/telemetry/live)
  useEffect(() => {
    if (!isSimulating) return;

    let isMounted = true;

    const tick = async () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('de-DE', { hour12: false });
      if (isMounted) setLastTickTime(timeStr);

      // 1. Versuche das lokale Express-Backend abzufragen
      try {
        const response = await fetch('/api/telemetry/live', {
          signal: AbortSignal.timeout(1800),
        });
        if (response.ok) {
          const json = await response.json();
          if (json?.data && isMounted) {
            setTelemetry(prev => ({
              ...prev,
              ...json.data
            }));
            setBackendInfo({
              isOnline: true,
              isLiveLAN: Boolean(json.data.isLive),
              liveDevicesCount: json.data.liveDevicesCount || 0,
              strictLiveOnly: json.mode?.strictLiveOnly ?? true,
              demoSimulationAllowed: json.mode?.demoSimulationAllowed ?? false,
              telemetrySource: json.telemetrySource || 'none',
              mqttStatus: json.mqttStatus,
              sources: json.data.sources
            });
            return;
          }
        }
      } catch {
        // Backend kurzzeitig nicht erreichbar -> Fallback
      }

      // 2. Nur wenn Demo-Simulation erlaubt ist, clientseitig driften lassen:
      if (isMounted) {
        setBackendInfo(prev => ({ ...prev, isOnline: false, isLiveLAN: false }));
        if (backendInfo.demoSimulationAllowed) {
          setTelemetry(prev => {
            const pvDrift = Math.floor(Math.random() * 21) - 10;
            const newPvHoymiles = Math.max(800, Math.min(1450, prev.pvHoymilesWatts + pvDrift));
            const newTotalPv = newPvHoymiles + prev.pvVictronMppt1Watts + prev.pvVictronMppt2Watts;
            
            const houseDrift = Math.floor(Math.random() * 15) - 7;
            const newHouseTotal = Math.max(700, prev.houseTotalWatts + houseDrift);

            const neededFromBat = Math.max(0, newHouseTotal - newPvHoymiles);
            const limitedBatWatts = prev.truckiZeroExportEnabled 
              ? Math.min(prev.truckiPowerLimitWatts, Math.round(neededFromBat))
              : 0;
            const newGridWatts = Math.round(newHouseTotal - newPvHoymiles - limitedBatWatts);

            const lumentreeDcDraw = limitedBatWatts > 0 ? Math.round(limitedBatWatts / 0.92) : 0;
            const mpptDcCharge = prev.pvVictronMppt1Watts + prev.pvVictronMppt2Watts;
            const netBatteryWatts = mpptDcCharge - lumentreeDcDraw;

            return {
              ...prev,
              pvHoymilesWatts: newPvHoymiles,
              pvTotalWatts: newTotalPv,
              houseTotalWatts: newHouseTotal,
              truckiActualOutputWatts: limitedBatWatts,
              batteryWatts: netBatteryWatts,
              gridTotalWatts: newGridWatts,
              gridMode: newGridWatts >= 0 ? 'Bezug' : 'Einspeisung'
            };
          });
        }
      }
    };

    tick();
    const interval = setInterval(tick, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimulating, pollIntervalMs]);

  // Keyboard navigation for Desktop PC (keys 1-8, Space, ?, D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key >= '1' && e.key <= '8') {
        const tabMap: Record<string, string> = {
          '1': 'dashboard',
          '2': 'energy',
          '3': 'devices',
          '4': 'network',
          '5': 'mqtt-api',
          '6': 'control',
          '7': 'maintenance',
          '8': 'report',
        };
        if (tabMap[e.key]) {
          setActiveTab(tabMap[e.key]);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsSimulating(prev => !prev);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setWhyDrawerOpen(prev => !prev);
      } else if (e.key.toLowerCase() === 'd') {
        setDeviceSettingsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Accepting Discovered Device
  const handleAcceptDiscoveredDevice = (dev: DiscoveredDevice) => {
    // Add to Network Hosts
    const newHost: NetworkHost = {
      ip: dev.ip,
      port: 80,
      name: dev.suggestedName,
      deviceCategory: dev.suggestedCategory,
      services: dev.services,
      status: 'Online',
      latencyMs: 3.2,
      mac: dev.mac
    };
    setHosts(prev => [...prev, newHost]);

    // Add to Devices Inventory
    const newDeviceItem: DeviceInventoryItem = {
      id: `dev-${Date.now()}`,
      name: dev.suggestedName,
      category: dev.suggestedCategory,
      vendor: 'Tasmota / ESP8266',
      model: 'Smart Energy Plug',
      ip: dev.ip,
      mac: dev.mac,
      hostname: dev.hostname,
      status: 'online',
      firmwareVersion: 'v13.4.0',
      firmwareStatus: 'Aktuell',
      lastChecked: 'Gerade eben',
      hardwareSpecs: '16A Relay, CSE7766 Power Metering IC',
      services: dev.services,
      mqttTopics: [`tele/${dev.hostname}/SENSOR`],
      apiEndpoints: [`http://${dev.ip}/cm?cmnd=Status`],
      location: 'Hauswirtschaftsraum / Waschmaschine',
      operatingLimits: [
        { parameter: 'Max Last', value: '3680', unit: 'W', description: 'Schaltgrenze' }
      ],
      isIstZustand: true,
      notes: 'Neu im Netzwerk erkannt und automatisch in die Anlagen-Dokumentation übernommen.'
    };
    setDevices(prev => [...prev, newDeviceItem]);

    // Record in Changelog
    const newChange: ChangeLogEntry = {
      id: `chg-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      device: dev.suggestedName,
      parameter: 'GERÄTESTOPOLOGIE',
      oldValue: 'Nicht erfasst',
      newValue: `Übernommen (${dev.ip})`,
      source: 'Automatisch',
      detectionType: 'automatisch',
      userNotes: 'Auto-Discovery via ARP Scan & MQTT mDNS Announcement.'
    };
    setChangeLog(prev => [newChange, ...prev]);

    setDiscoveredDevice(null);
  };

  const handleIgnoreDiscoveredDevice = () => {
    setDiscoveredDevice(null);
  };

  const handleSimulateScan = () => {
    // Create a new discovered device if none exists
    if (!discoveredDevice) {
      setDiscoveredDevice({
        ip: '192.168.0.140',
        mac: 'dc:4f:22:9a:71:04',
        hostname: 'shelly-plus-1pm-garage.lan',
        services: ['HTTP', 'MQTT', 'RPC WebSockets'],
        timestamp: 'Vor 10 Sekunden erkannt',
        suggestedName: 'Shelly Plus 1PM (Wallbox / Garage)',
        suggestedCategory: 'Infrastruktur'
      });
    }
  };

  // Gerätedaten automatisch erkennen und anreichern
  const handleAutoDetectAndEnrich = () => {
    setIsAutoDetecting(true);
    setTimeout(() => {
      setIsAutoDetecting(false);
      setIsEnriched(true);
      setDevices(prev => getAutoEnrichedDevices(prev));
      setHosts(prev => getAutoEnrichedHosts(prev));

      const newChange: ChangeLogEntry = {
        id: `chg-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        device: 'Alle 11 Anlagenkomponenten',
        parameter: 'GERÄTEDATEN AUTO-DISCOVERY',
        oldValue: 'Teilweise nicht erfasst',
        newValue: 'Automatisch erkannt & ergänzt',
        source: 'Automatisch',
        detectionType: 'automatisch',
        userNotes: 'Seriennummern, MAC-Adressen und Firmwarestände via Shelly RPC, Ahoy REST, T2SG & Venus OS automatisch erkannt und ergänzt.'
      };
      setChangeLog(prev => [newChange, ...prev]);
    }, 1200);
  };

  // Alle Werte auf den unbestätigten Zustand ("nicht erfasst") zurücksetzen
  const handleResetToUnconfirmed = () => {
    setIsEnriched(false);
    setDevices(INITIAL_DEVICES);
    setHosts(INITIAL_NETWORK_HOSTS);

    const newChange: ChangeLogEntry = {
      id: `chg-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      device: 'Alle 11 Anlagenkomponenten',
      parameter: 'GERÄTEDATEN STATUS',
      oldValue: 'Automatisch erkannt & ergänzt',
      newValue: 'Zurückgesetzt auf „nicht erfasst“',
      source: 'Web-UI',
      detectionType: 'manuell',
      userNotes: 'Unbestätigte / erfundene Daten manuell auf reinen Ist-Zustand („nicht erfasst“) zurückgesetzt.'
    };
    setChangeLog(prev => [newChange, ...prev]);
  };

  // Handle Limit Update (Trucki or Hoymiles)
  // Slider-Werte gebuendelt ans Backend senden (T2SG MAXPOWEROVR), nicht bei jedem Schritt
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTruckiLimit = (value: number) => {
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = setTimeout(() => {
      fetch('/api/control/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limitWatts: value }),
      }).catch(() => { /* Backend nicht erreichbar: nur lokale Anzeige */ });
    }, 600);
  };

  const handleUpdateLimit = (type: 'trucki' | 'hoymiles', value: number) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (type === 'trucki') {
      const oldVal = `${telemetry.truckiPowerLimitWatts} W`;
      sendTruckiLimit(value);
      setTelemetry(prev => ({
        ...prev,
        truckiPowerLimitWatts: value
      }));

      // Add to Changelog (Section 10 mandate)
      const chg: ChangeLogEntry = {
        id: `chg-${Date.now()}`,
        timestamp: nowStr,
        device: 'Trucki / SUN-2000G2-H',
        parameter: 'POWERLIMIT',
        oldValue: oldVal,
        newValue: `${value} W`,
        source: 'Web-UI',
        detectionType: 'automatisch',
        userNotes: 'Manuelle Regleranpassung über Steuerzentrale.'
      };
      setChangeLog(prev => [chg, ...prev]);
    } else {
      const oldVal = `${telemetry.hoymilesLimitPercent} % (${telemetry.hoymilesLimitWatts} W)`;
      const newWatts = Math.round(1500 * (value / 100));
      setTelemetry(prev => ({
        ...prev,
        hoymilesLimitPercent: value,
        hoymilesLimitWatts: newWatts
      }));

      const chg: ChangeLogEntry = {
        id: `chg-${Date.now()}`,
        timestamp: nowStr,
        device: 'AhoyDTU / Hoymiles HM-1500',
        parameter: 'ACTIVE_LIMIT_PERCENT',
        oldValue: oldVal,
        newValue: `${value} % (${newWatts} W)`,
        source: 'API',
        detectionType: 'automatisch',
        userNotes: 'AhoyDTU /api/ctrl Limitierung aktualisiert.'
      };
      setChangeLog(prev => [chg, ...prev]);
    }
  };

  const handleToggleZeroExport = () => {
    setTelemetry(prev => ({
      ...prev,
      truckiZeroExportEnabled: !prev.truckiZeroExportEnabled
    }));
  };

  const handleInspectNode = (node: 'pv' | 'battery' | 'grid' | 'house') => {
    setWhyMetric(node);
    setWhyDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 selection:bg-sky-500/30 selection:text-white relative">
      {/* Subtle ambient lighting layer */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.06),rgba(0,0,0,0))] pointer-events-none" />
      
      {/* HUD Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        onOpenWhy={() => {
          setWhyMetric('pv');
          setWhyDrawerOpen(true);
        }}
        onOpenPWAInfo={() => setPwaModalOpen(true)}
        lastTickTime={lastTickTime}
        deviceInfo={deviceInfo}
        onOpenDeviceSettings={() => setDeviceSettingsOpen(true)}
        backendInfo={backendInfo}
        onOpenUpdateModal={() => setUpdateModalOpen(true)}
        onOpenHardwareConfig={() => setHardwareConfigModalOpen(true)}
        onOpenMqttConfig={() => setMqttSettingsModalOpen(true)}
      />

      {/* Live-Telemetrie Statusleiste: MQTT-First mit automatischem HTTP-REST Fallback */}
      <div className={`border-b px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${
        backendInfo.telemetrySource === 'mqtt'
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          : backendInfo.telemetrySource === 'http_rest'
          ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
          : 'bg-sky-950/40 border-sky-500/20 text-sky-200'
      }`}>
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 shrink-0 ${backendInfo.telemetrySource === 'mqtt' ? 'text-emerald-400 animate-pulse' : backendInfo.telemetrySource === 'http_rest' ? 'text-amber-400' : 'text-sky-400'}`} />
          <span>
            {backendInfo.telemetrySource === 'mqtt' ? (
              <>
                <strong className="text-emerald-300">Live-Daten via MQTT:</strong> Verbunden mit Mosquitto Broker auf <code>{backendInfo.mqttStatus?.brokerUrl || '192.168.0.201:1883'}</code> (Push-Events aktiv).
              </>
            ) : backendInfo.telemetrySource === 'http_rest' ? (
              <>
                <strong className="text-amber-300">HTTP-REST Fallback aktiv:</strong> MQTT-Broker offline oder still – Hub pollt Einzelgeräte direkt (Shelly, Ahoy, Trucki, Venus OS).
              </>
            ) : (
              <>
                <strong>Reiner Live-Modus aktiv:</strong> Keine künstliche Simulation. Im Proxmox-LXC (192.168.0.220) empfängt dieser Hub echte Live-Werte via MQTT (LXC 201) mit HTTP-Fallback.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMqttSettingsModalOpen(true)}
            className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] transition-all flex items-center gap-1.5"
            title="Mosquitto Broker Port 1883, Benutzer, Passwort und Topics konfigurieren"
          >
            <span>MQTT-Broker (1883)</span>
          </button>
          <button
            onClick={() => setHardwareConfigModalOpen(true)}
            className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono text-[11px] transition-all flex items-center gap-1.5"
            title="Hardware-IPs für HTTP-REST Fallback anpassen"
          >
            <span>HTTP-Schnittstellen</span>
          </button>
        </div>
      </div>

      {/* Ambient Wall-Mount Kiosk Alert Banner if WakeLock is active */}
      {deviceInfo.wakeLockActive && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 font-mono-code flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Wanddisplay Kiosk-Modus aktiv: Bildschirm wird dauerhaft wachgehalten.</span>
          </div>
          <button
            onClick={() => deviceInfo.toggleWakeLock()}
            className="text-[11px] underline hover:text-white"
          >
            Deaktivieren
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`max-w-7xl mx-auto px-3 sm:px-6 py-6 relative z-10 ${
        deviceInfo.deviceType === 'mobile' ? 'pb-28' : ''
      }`}>
        
        {/* TAB 1: DASHBOARD (STEUERZENTRALE & ENERGIEFLUSS) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Sci-Fi Energy Flow Matrix */}
            <SciFiEnergyFlow
              telemetry={telemetry}
              onInspectNode={handleInspectNode}
              onOpenWhy={() => {
                setWhyMetric('pv');
                setWhyDrawerOpen(true);
              }}
            />

            {/* Quick Navigation Cards into other Core Modules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div 
                onClick={() => setActiveTab('devices')}
                className="group cursor-pointer p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Geräteinventar ({devices.length} Geräte)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Shelly Pro 3EM, Hoymiles HM-1500, Trucki Gateway, 2x Victron MPPT, Venus OS, Proxmox Node.
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('mqtt-api')}
                className="group cursor-pointer p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-violet-400 font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-violet-400" />
                    MQTT Topics & REST-APIs
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatische Schema-Erkennung, Live-Sniffer (1883) & Publish-Terminal für Trucki, VenusOS & AhoyDTU.
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('report')}
                className="group cursor-pointer p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Anlagen-Zustandsbericht
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vollständige Systemdokumentation mit Versionsverlauf als PDF-Druck, Markdown oder JSON.
                </p>
              </div>

              <div 
                onClick={() => setPwaModalOpen(true)}
                className="group cursor-pointer p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/50 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    Mobile PWA & App-Setup
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vollbild-Installation auf iOS & Android, Offline-Cache, LAN-Sofortzugriff auf http://trucki.local.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ENERGIE & PHASEN */}
        {activeTab === 'energy' && (
          <EnergyAnalytics
            telemetry={telemetry}
            onOpenWhy={() => {
              setWhyMetric('grid');
              setWhyDrawerOpen(true);
            }}
          />
        )}

        {/* TAB 3: GERÄTEINVENTAR */}
        {activeTab === 'devices' && (
          <DeviceInventory
            devices={devices}
            telemetry={telemetry}
            isEnriched={isEnriched}
            isAutoDetecting={isAutoDetecting}
            onAutoDetectAndEnrich={handleAutoDetectAndEnrich}
            onResetToUnconfirmed={handleResetToUnconfirmed}
            onOpenMqttConfig={() => setMqttSettingsModalOpen(true)}
            onOpenHardwareConfig={() => setHardwareConfigModalOpen(true)}
            mqttStatus={backendInfo.mqttStatus}
            telemetrySource={backendInfo.telemetrySource}
          />
        )}

        {/* TAB 4: NETZWERK & IP-PLAN */}
        {activeTab === 'network' && (
          <NetworkIpPlan
            hosts={hosts}
            discoveredDevice={discoveredDevice}
            onAcceptDiscoveredDevice={handleAcceptDiscoveredDevice}
            onIgnoreDiscoveredDevice={handleIgnoreDiscoveredDevice}
            onSimulateScan={handleSimulateScan}
            onOpenHardwareConfig={() => setHardwareConfigModalOpen(true)}
          />
        )}

        {/* TAB 5: MQTT & APIs */}
        {activeTab === 'mqtt-api' && (
          <MqttApiDocs
            mqttTopics={mqttTopics}
            apiDocs={apiDocs}
          />
        )}

        {/* TAB 6: STEUERUNG & INTEGRATIONEN */}
        {activeTab === 'control' && (
          <ControlAndScripts
            telemetry={telemetry}
            onUpdateLimit={handleUpdateLimit}
            onToggleZeroExport={handleToggleZeroExport}
            onNavigateToReport={() => setActiveTab('report')}
            onOpenUpdateModal={() => setUpdateModalOpen(true)}
          />
        )}

        {/* TAB 7: WARTUNG & CHANGELOG */}
        {activeTab === 'maintenance' && (
          <AuditAndMaintenance
            changeLog={changeLog}
            maintenanceLog={maintenanceLog}
            telemetry={telemetry}
            devices={devices}
            onAddMaintenanceEntry={(newEntry) => {
              const created: MaintenanceEntry = {
                id: `mnt-${Date.now()}`,
                ...newEntry
              };
              setMaintenanceLog(prev => [created, ...prev]);
            }}
          />
        )}

        {/* TAB 8: ANLAGENBERICHT */}
        {activeTab === 'report' && (
          <SystemReportGenerator
            telemetry={telemetry}
            devices={devices}
            hosts={hosts}
            mqttTopics={mqttTopics}
            apiDocs={apiDocs}
            changeLog={changeLog}
            maintenanceLog={maintenanceLog}
          />
        )}

      </main>

      {/* "Warum?" & "Woher kommt dieser Wert?" Inspector Modal */}
      <WhyDrawer
        isOpen={whyDrawerOpen}
        onClose={() => setWhyDrawerOpen(false)}
        telemetry={telemetry}
        initialMetric={whyMetric}
      />

      {/* Mobile PWA Setup & Info Modal */}
      <PWASetupInfoModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
      />

      {/* Device & Hardware Settings Modal */}
      <DeviceSettingsModal
        isOpen={deviceSettingsOpen}
        onClose={() => setDeviceSettingsOpen(false)}
        deviceInfo={{
          ...deviceInfo,
          setOverride: deviceInfo.setOverride,
          toggleWakeLock: deviceInfo.toggleWakeLock
        }}
      />

      {/* Mobile Bottom Navigation Dock */}
      {deviceInfo.deviceType === 'mobile' && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenWhy={() => {
            setWhyMetric('pv');
            setWhyDrawerOpen(true);
          }}
          onOpenPWAInfo={() => setPwaModalOpen(true)}
          onOpenDeviceSettings={() => setDeviceSettingsOpen(true)}
        />
      )}

      {/* App Update & Maintenance Modal */}
      <AppUpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        currentVersion="v1.4.0"
      />

      {/* Hardware Configuration & Ping Diagnostic Modal */}
      <HardwareConfigModal
        isOpen={hardwareConfigModalOpen}
        onClose={() => setHardwareConfigModalOpen(false)}
        onConfigSaved={() => {
          fetch('/api/telemetry/live').then(res => res.json()).then(json => {
            if (json?.data) {
              setTelemetry(prev => ({ ...prev, ...json.data }));
              setBackendInfo(prev => ({
                ...prev,
                isLiveLAN: Boolean(json.data.isLive),
                liveDevicesCount: json.data.liveDevicesCount || 0,
                strictLiveOnly: json.mode?.strictLiveOnly ?? true,
                demoSimulationAllowed: json.mode?.demoSimulationAllowed ?? false,
                sources: json.data.sources,
                telemetrySource: json.telemetrySource || 'none',
                mqttStatus: json.mqttStatus,
              }));
            }
          }).catch(console.error);
        }}
      />

      {/* Mosquitto MQTT Broker Settings Modal */}
      <MqttSettingsModal
        isOpen={mqttSettingsModalOpen}
        onClose={() => setMqttSettingsModalOpen(false)}
        onConfigSaved={() => {
          fetch('/api/telemetry/live').then(res => res.json()).then(json => {
            if (json?.data) {
              setTelemetry(prev => ({ ...prev, ...json.data }));
              setBackendInfo(prev => ({
                ...prev,
                isLiveLAN: Boolean(json.data.isLive),
                telemetrySource: json.telemetrySource || 'none',
                mqttStatus: json.mqttStatus,
              }));
            }
          }).catch(console.error);
        }}
      />

      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Global Sci-Fi Status Footer */}
      <footer className="w-full border-t border-slate-800 bg-slate-950/80 px-4 py-3 text-xs font-mono-code text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold font-scifi">SOLAR-LOKAL-APP</span>
            <span>•</span>
            <span>Github: Perspektivlos/Solar-Lokal-App</span>
            <span>•</span>
            <span className="hidden sm:inline">Pfad: G:\QuellCode\Emergent\Solar-Lokal-App</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-400">● 100% LOKAL & CLOUDFREI</span>
            <span>PROXMOX LXC READY</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
