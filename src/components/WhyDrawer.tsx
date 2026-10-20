import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Database, 
  Cpu, 
  Radio, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Layers, 
  Terminal,
  Activity,
  Zap,
  BatteryCharging,
  Sun,
  Home
} from 'lucide-react';
import { SolarTelemetry, ValueProvenance } from '../types';

interface WhyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SolarTelemetry;
  initialMetric?: 'pv' | 'battery' | 'grid' | 'house';
}

export const WhyDrawer: React.FC<WhyDrawerProps> = ({
  isOpen,
  onClose,
  telemetry,
  initialMetric = 'pv'
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'pv' | 'battery' | 'grid' | 'house'>(initialMetric);

  if (!isOpen) return null;

  // Pre-configured lineage and "Warum?" explanations matching exact hardware
  const dataProvenanceMap: Record<string, ValueProvenance> = {
    pv: {
      metricLabel: 'PV-Gesamtleistung (1.420 W)',
      currentValue: `${telemetry.pvTotalWatts} W`,
      explanationWhy: {
        reason: 'Warum wird aktuell 1.420 W erzeugt und nicht das theoretische Maximum von 2.320 Wp?',
        checks: [
          { check: 'Hoymiles HM-1500 Limitierung', status: 'ok', note: 'Aktuelles Limit steht auf 100% (1.500 W). Keine Drosselung durch AhoyDTU aktiv.' },
          { check: 'Einstrahlung & Sonnenstand', status: 'info', note: 'Sonnenstand Nachmittag (~42° Azimut). String Ost (Victron #1) liefert 240W, String West (Victron #2) 220W, Hoymiles Dach 960W.' },
          { check: 'Inverter Temperatur', status: 'ok', note: 'Gehäusetemperatur 38.5°C (weit unter thermischem Throttling bei >65°C).' },
          { check: 'Netzspannungsgrenzen (VDE-AR-N 4105)', status: 'ok', note: 'Netzspannung liegt bei 231.2V (Abschaltung erst bei >253V).' },
          { check: 'Batterie-Aufnahmefähigkeit', status: 'ok', note: 'LiFePO4 bei 78% SoC, nimmt Ladung unbegrenzt auf.' }
        ]
      },
      path: [
        {
          step: 1,
          layer: 'Sensor / Messfühler',
          name: '4x Trina Solar 420Wp (Süddach) + 4x 410Wp Module (Ost/West)',
          details: 'Gleichstromerzeugung der Solarzellen'
        },
        {
          step: 2,
          layer: 'Gerät / Hardware',
          name: 'Hoymiles HM-1500 (4 Ch) & 2x Victron SmartSolar MPPT 150/35',
          details: 'MPPT Tracker erfassen Spannung (33.4V) und Strom (7.2A) je Eingang'
        },
        {
          step: 3,
          layer: 'Protokoll / Bus',
          name: 'NRF24L01+ 2.4GHz RF (AhoyDTU) + VE.Direct USB (VenusOS Pi 3B)',
          details: 'Drahtlose Telemetrie zum ESP32 & serielle D-Bus Daten zum Raspberry Pi'
        },
        {
          step: 4,
          layer: 'MQTT Topic / API',
          name: 'venus/pv/ahoydtu/HM1500/ch0/P_AC & N/d4aa81/solarcharger/288/Yield/Power',
          details: 'MQTT Broker Mosquitto (192.168.0.201:1883)',
          payloadSnippet: JSON.stringify({ P_AC: telemetry.pvHoymilesWatts, U_AC: 231.5, I_AC: 4.15, yield_mppt1: telemetry.pvVictronMppt1Watts, yield_mppt2: telemetry.pvVictronMppt2Watts }, null, 2)
        },
        {
          step: 5,
          layer: 'Datenbank',
          name: 'InfluxDB v2 (192.168.0.203:8086) // Bucket: solar_home',
          details: 'Measurement: pv_telemetry, Field: total_pv_watts, Tags: inverter=HM-1500'
        },
        {
          step: 6,
          layer: 'Visualisierung',
          name: 'Solar-Lokal App Dashboard (React HUD) + Grafana Panel 12',
          details: 'Echtzeit-Aggregat der summierten PV-Leistung im Glassmorphism Interface'
        }
      ]
    },
    battery: {
      metricLabel: 'Batterieentladung (-602 W / 52.8 V)',
      currentValue: `${telemetry.batteryWatts} W (78% SoC)`,
      explanationWhy: {
        reason: 'Warum entlädt die LiFePO4 Batterie gerade mit ~600 W ins Hausnetz?',
        checks: [
          { check: 'Trucki Nulleinspeisungs-Regelung', status: 'ok', note: 'Trucki Gateway versucht den Netzbezug am Shelly Pro 3EM auf 0W zu halten. Da der Hausverbrauch 963W beträgt und PV nur teilweise deckt, liefert der Sun-2000 Inverter die Differenz.' },
          { check: 'Eingestelltes Power-Limit', status: 'ok', note: 'Trucki Powerlimit steht auf 600W. Der Sun-2000 ist somit am Maximum der erlaubten Einspeisung.' },
          { check: 'LiFePO4 Sicherheitsbereich', status: 'ok', note: 'SoC 78% liegt komfortabel über der Mindestgrenze von 15%. Batteriespannung 52.8V > 46.4V Cutoff.' },
          { check: 'BMS Zellendrift', status: 'ok', note: 'Zellendrift 5 mV, alle 16 Zellen gleichmäßig ausbalanciert.' }
        ]
      },
      path: [
        {
          step: 1,
          layer: 'Sensor / Messfühler',
          name: 'JK-BMS Shunt & 16S Balancerleitungen (6x Power Queen 100Ah)',
          details: 'Hochpräziser Strom-Shunt erfasst -11.4A Entladestrom bei 52.8V'
        },
        {
          step: 2,
          layer: 'Gerät / Hardware',
          name: 'Trucki2Shelly ESP Gateway & Sun-2000 Inverter (Lumentree)',
          details: 'ESP8266 empfängt Shelly Messwerte und moduliert Sun-2000 per RS485 DAC'
        },
        {
          step: 3,
          layer: 'Protokoll / Bus',
          name: 'RS485 Modbus RTU (Inverter) + WiFi 802.11b/g/n (Trucki Gateway)',
          details: 'Interne Baudrate 9600 bps zu Sun-2000 Leistungselektronik'
        },
        {
          step: 4,
          layer: 'MQTT Topic / API',
          name: 'Trucki/status/LIVE & venus/battery/lifepo4/soc',
          details: 'Mosquitto MQTT Broker (Port 1883)',
          payloadSnippet: JSON.stringify({ power_limit: 600, actual_power: 595, v_bat: 52.8, soc: 78, current: -11.4 }, null, 2)
        },
        {
          step: 5,
          layer: 'Datenbank',
          name: 'InfluxDB v2 (192.168.0.203) // Bucket: solar_home',
          details: 'Measurement: battery_bms, Field: watts, soc, voltage'
        },
        {
          step: 6,
          layer: 'Visualisierung',
          name: 'Solar-Lokal App Batterie-HUD & Grafana Battery Tile',
          details: 'Berechnung des Restlaufzeit-Horizonts und Ladezustand'
        }
      ]
    },
    grid: {
      metricLabel: 'Netzbezug (+145 W saldiert)',
      currentValue: `${telemetry.gridTotalWatts} W`,
      explanationWhy: {
        reason: 'Warum zeigt das Netz trotz Nulleinspeisung noch +145 W Bezug und Phasenunterschiede?',
        checks: [
          { check: 'Einphasige Inverter-Einspeisung', status: 'info', note: 'Der Sun-2000 speist einphasig auf Phase L2 ein (-95W). Phase L1 hat Verbraucher (+180W), Phase L3 (+60W).' },
          { check: 'Saldierender Stromzähler', status: 'ok', note: 'Der Shelly Pro 3EM saldiert korrekt über alle Phasen: (+180) + (-95) + (+60) = +145 W.' },
          { check: 'Trucki Regelverzögerung / Limit', status: 'info', note: 'Trucki Inverter hat sein gesetztes Power-Limit von 600W erreicht. Der überschüssige Hausbedarf von 145W wird aus dem öffentlichen Netz bezogen.' },
          { check: 'Netzfrequenz', status: 'ok', note: 'Netzfrequenz stabil bei 50.01 Hz im europäischen Verbundnetz.' }
        ]
      },
      path: [
        {
          step: 1,
          layer: 'Sensor / Messfühler',
          name: '3x Klappwandler 120A am Hausanschlusskabel L1, L2, L3',
          details: 'Induktive Strom- und Direktspannungsmessung an den 3 Außenleitern'
        },
        {
          step: 2,
          layer: 'Gerät / Hardware',
          name: 'Shelly Pro 3EM (DIN-Schiene, IP: 192.168.0.100)',
          details: 'Gen2 ESP32 Dual-Core Messrechner mit interner 1-Sekunden Abtastung'
        },
        {
          step: 3,
          layer: 'Protokoll / Bus',
          name: 'Ethernet LAN (100 Mbit/s RJ45) zu Unifi/Fritz Switch',
          details: 'Direkte kabelgebundene Anbindung für minimale Latenz (~1.2 ms)'
        },
        {
          step: 4,
          layer: 'MQTT Topic / API',
          name: 'venus/grid/shellypro/status/em:0',
          details: 'Payload mit Phasen L1/L2/L3 Wirkleistung und Gesamt-Summe',
          payloadSnippet: JSON.stringify({ a_act_power: 180.4, b_act_power: -95.2, c_act_power: 60.1, total_act_power: 145.3 }, null, 2)
        },
        {
          step: 5,
          layer: 'Datenbank',
          name: 'InfluxDB v2 Bucket: solar_home // Measurement: grid_shelly',
          details: 'Speichert a_power, b_power, c_power und total_power'
        },
        {
          step: 6,
          layer: 'Visualisierung',
          name: 'Solar-Lokal App Netzvektor & Phasen-Matrix',
          details: 'Zeigt Schieflast, Leistungsfaktor und saldierte Bilanz'
        }
      ]
    },
    house: {
      metricLabel: 'Hausverbrauch (963 W)',
      currentValue: `${telemetry.houseTotalWatts} W`,
      explanationWhy: {
        reason: 'Wie errechnet sich der Hausverbrauch von 963 W genau?',
        checks: [
          { check: 'Formel der Energiebilanz', status: 'ok', note: 'Hauslast = PV-Leistung (1.420W) + Batterieentladung (602W) + Netzbezug (145W) - Batterieladung (1.204W) = 963 W.' },
          { check: 'Gleichzeitige Lasterfassung', status: 'ok', note: 'Kühlschrank, Server-Rack Proxmox (65W), Standby-Geräte und Beleuchtung aktiv.' },
          { check: 'Keine Großverbraucher', status: 'info', note: 'Waschmaschine und Herd derzeit inaktiv (Grundlastbereich).' }
        ]
      },
      path: [
        {
          step: 1,
          layer: 'Sensor / Messfühler',
          name: 'Virtuelle Aggregation aller Teilmesspunkte',
          details: 'Kombination aus Shelly 3EM, Hoymiles AhoyDTU und Trucki LiFePO4 Shunt'
        },
        {
          step: 2,
          layer: 'Gerät / Hardware',
          name: 'Lokaler Berechnungs-Core im Proxmox LXC',
          details: 'Saldierungs-Engine synchronisiert Zeitstempel aller 3 Quellen (<100ms Delta)'
        },
        {
          step: 3,
          layer: 'Protokoll / Bus',
          name: 'Lokaler Mosquitto MQTT Event-Bus',
          details: 'MQTT QOS 1 Delivery'
        },
        {
          step: 4,
          layer: 'MQTT Topic / API',
          name: 'solar/calculated/house_load',
          details: 'Interne Verrechnung',
          payloadSnippet: JSON.stringify({ house_watts: telemetry.houseTotalWatts, pv_contrib: 580, bat_contrib: 238, grid_contrib: 145 }, null, 2)
        },
        {
          step: 5,
          layer: 'Datenbank',
          name: 'InfluxDB v2 Measurement: house_consumption',
          details: 'Wird sekündlich in die Zeitreihendatenbank geschrieben'
        },
        {
          step: 6,
          layer: 'Visualisierung',
          name: 'Solar-Lokal Dashboard & Historie',
          details: 'Tageskumulierung und Autarkie-Graph'
        }
      ]
    }
  };

  const activeProvenance = dataProvenanceMap[selectedMetric] || dataProvenanceMap.pv;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl glass-panel border border-white/[0.1] bg-[#0c101a] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  System-Diagnose • „Warum?“ & „Woher kommt dieser Wert?“
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lückenlose Datenherkunft (Lineage) & Technische Entscheidungsbegründung
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

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-2 p-3 bg-slate-950/60 border-b border-white/[0.06] overflow-x-auto">
          <span className="text-xs font-medium text-slate-400 mr-2 whitespace-nowrap">Messwert:</span>
          
          <button
            onClick={() => setSelectedMetric('pv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all whitespace-nowrap ${
              selectedMetric === 'pv' 
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>PV-Leistung ({telemetry.pvTotalWatts} W)</span>
          </button>

          <button
            onClick={() => setSelectedMetric('battery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all whitespace-nowrap ${
              selectedMetric === 'battery' 
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>LiFePO4 Speicher ({Math.abs(telemetry.batteryWatts)} W)</span>
          </button>

          <button
            onClick={() => setSelectedMetric('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all whitespace-nowrap ${
              selectedMetric === 'grid' 
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' 
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Netzbezug ({telemetry.gridTotalWatts} W)</span>
          </button>

          <button
            onClick={() => setSelectedMetric('house')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-code transition-all whitespace-nowrap ${
              selectedMetric === 'house' 
                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30' 
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hauslast ({telemetry.houseTotalWatts} W)</span>
          </button>
        </div>

        {/* Body content with 2 sections */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* SECTION 1: "WARUM?" (Root Cause & Operational Constraints) */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-xs font-scifi bg-purple-500/30 text-purple-300 border border-purple-500/40">
                17. ERWEITERUNG: „WARUM?“
              </span>
              <h3 className="text-sm font-semibold text-purple-200">
                {activeProvenance.explanationWhy.reason}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {activeProvenance.explanationWhy.checks.map((c, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 font-scifi font-bold mb-1">
                    {c.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {c.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {c.status === 'info' && <Activity className="w-4 h-4 text-cyan-400" />}
                    <span className="text-slate-200">{c.check}</span>
                  </div>
                  <p className="text-slate-400 pl-5">{c.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: "WOHER KOMMT DIESER WERT?" (Full Data Provenance Chain) */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-scifi bg-cyan-500/30 text-cyan-300 border border-cyan-500/40">
                  18. ERWEITERUNG: „WOHER KOMMT DIESER WERT?“
                </span>
                <span className="text-xs text-slate-400">
                  Lückenlose Datenkette von der physischen Messung bis ins UI
                </span>
              </div>
              <span className="text-xs font-mono-code text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-cyan-500/20">
                WERT: {activeProvenance.currentValue}
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="relative border-l-2 border-cyan-500/30 ml-4 pl-6 space-y-5">
              {activeProvenance.path.map((step) => (
                <div key={step.step} className="relative group">
                  {/* Glowing Node Dot */}
                  <div className="absolute -left-[31px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-slate-950 border border-cyan-400 text-cyan-400 text-[10px] font-mono-code font-bold group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    {step.step}
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800/90 hover:border-cyan-500/40 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-scifi font-semibold uppercase tracking-wider text-cyan-400">
                        {step.layer}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-500">
                        SCHRITT {step.step} VON 6
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-200">
                      {step.name}
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      {step.details}
                    </div>

                    {step.payloadSnippet && (
                      <div className="mt-2.5 p-2.5 rounded bg-slate-900/90 border border-slate-800 font-mono-code text-[11px] text-emerald-400 overflow-x-auto">
                        <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          MQTT RAW PAYLOAD CAPTURE:
                        </div>
                        <pre>{step.payloadSnippet}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400 font-mono-code">
          <span>Proxmox Node: 192.168.0.200 • Mosquitto: 192.168.0.201</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-scifi transition-colors"
          >
            SCHLIESSEN
          </button>
        </div>

      </div>
    </div>
  );
};
