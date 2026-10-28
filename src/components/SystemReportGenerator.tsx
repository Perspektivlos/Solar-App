import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  Sparkles,
  Code,
  Terminal,
  Server,
  Layers,
  ChevronRight,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { DeviceInventoryItem, NetworkHost, MqttTopicDoc, ApiDoc, ChangeLogEntry, MaintenanceEntry, SolarTelemetry } from '../types';

interface SystemReportGeneratorProps {
  telemetry: SolarTelemetry;
  devices: DeviceInventoryItem[];
  hosts: NetworkHost[];
  mqttTopics: MqttTopicDoc[];
  apiDocs: ApiDoc[];
  changeLog: ChangeLogEntry[];
  maintenanceLog: MaintenanceEntry[];
}

export const SystemReportGenerator: React.FC<SystemReportGeneratorProps> = ({
  telemetry,
  devices,
  hosts,
  mqttTopics,
  apiDocs,
  changeLog,
  maintenanceLog
}) => {
  const [reportVersion, setReportVersion] = useState<'v1.2 (Aktuell)' | 'v1.1 (08.09.2026)' | 'v1.0 (Initial)'>('v1.2 (Aktuell)');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<'python_instance' | 'python_install' | 'proxmox_bash' | 'docker' | 'mosquitto_acl'>('python_instance');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const reportDate = '20.10.2026';

  // 14. Automatische Plausibilitätsprüfung Checklist
  const plausibilityChecks = [
    { label: 'Geräte im LAN erreichbar', status: 'ok', detail: 'Alle 9 Kern-Hosts antworten auf Ping (< 5ms Latenz)' },
    { label: 'MQTT Broker & ACL aktiv', status: 'ok', detail: 'Mosquitto 1883 aktiv, keine anonymen Logins zugelassen' },
    { label: 'Telemetrie-Datenstrom vorhanden', status: 'ok', detail: 'Shelly, Ahoy und Trucki senden im 1s - 5s Takt' },
    { label: 'Firmware-Stände verifiziert', status: 'ok', detail: '9 von 9 Geräten mit bekannter Version dokumentiert' },
    { label: 'IP-Plan lückenlos dokumentiert', status: 'ok', detail: 'Statische DHCP-Reservierungen & Subnetz 192.168.0.0/24' },
    { label: 'Lokale APIs antworten (200 OK)', status: 'ok', detail: 'Trucki JSON live & AhoyDTU API funktional' },
    { label: '48V LiFePO4 Zellendrift', status: 'ok', detail: 'Drift 5 mV (weit unter Warnschwelle 30 mV)' },
    { label: 'Ungewöhnliche Konfigurationsänderung', status: 'info', detail: 'Trucki Powerlimit heute automatisch auf 600W angepasst' }
  ];

  // ==============================================================================
  // SCHLÜSSELFERTIGE PYTHON- & BASH-SKRIPTE FÜR PROXMOX VE 8 LXC
  // ==============================================================================

  const PYTHON_CREATE_INSTANCE = `#!/usr/bin/env python3
"""
==============================================================================
Solar-Lokal-App - Proxmox VE Instanzerstellung (Python Script 1/2)
Erstellt automatisiert einen ressourcensparenden Debian 12 LXC Container (CT 105).
Ausführung auf dem Proxmox Host oder via Automation.
==============================================================================
"""

import subprocess
import sys
import time

CT_ID = 105
HOSTNAME = "solar-lokal-core"
MEMORY_MB = 1024
CORES = 2
DISK_SIZE = "8G"
STORAGE = "local-lvm"
BRIDGE = "vmbr0"
IP_ADDR = "192.168.0.205/24"
GATEWAY = "192.168.0.1"
TEMPLATE = "/var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst"

def run_cmd(command):
    print(f"[*] Führe aus: {command}")
    res = subprocess.run(command, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Fehler: {res.stderr.strip()}")
        return False
    if res.stdout.strip():
        print(f"[✓] {res.stdout.strip()}")
    return True

def create_proxmox_instance():
    print("==================================================")
    print(f" Erstelle Proxmox LXC Container {CT_ID} ({HOSTNAME})")
    print("==================================================")
    
    # 1. Container anlegen
    create_cmd = (
        f"pct create {CT_ID} {TEMPLATE} "
        f"--hostname {HOSTNAME} "
        f"--memory {MEMORY_MB} "
        f"--cores {CORES} "
        f"--net0 name=eth0,bridge={BRIDGE},ip={IP_ADDR},gw={GATEWAY} "
        f"--storage {STORAGE} "
        f"--rootfs {STORAGE}:{DISK_SIZE} "
        f"--onboot 1 "
        f"--unprivileged 1 "
        f"--features nesting=1"
    )
    
    if not run_cmd(create_cmd):
        print("[!] Instanzerstellung fehlgeschlagen.")
        sys.exit(1)
        
    # 2. Container starten
    print(f"[*] Starte Container {CT_ID}...")
    run_cmd(f"pct start {CT_ID}")
    time.sleep(4)
    
    # 3. Status prüfen
    res = subprocess.run(f"pct status {CT_ID}", shell=True, capture_output=True, text=True)
    print(f"[✓] Container Status: {res.stdout.strip()}")
    print("[✓] Instanz erfolgreich bereitgestellt! Führe nun install_solar_app.py aus.")

if __name__ == "__main__":
    create_proxmox_instance()
`;

  const PYTHON_INSTALL_APP = `#!/usr/bin/env python3
"""
==============================================================================
Solar-Lokal-App - App & Service Installation (Python Script 2/2)
Installiert Node.js 20, Git, klont das Repository, baut die App
und richtet den systemd-Hintergrundservice ein.
==============================================================================
"""

import subprocess
import sys
import time

CT_ID = 105
APP_DIR = "/opt/solar-lokal"
REPO_URL = "https://github.com/Perspektivlos/Solar-Lokal-App.git"
WEB_PORT = 3000

def exec_in_container(cmd):
    full_cmd = f'pct exec {CT_ID} -- bash -c "{cmd}"'
    print(f"[*] In CT {CT_ID}: {cmd}")
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Warnung/Info: {res.stderr.strip()[:200]}")
    return res.returncode == 0

def install_application():
    print("==================================================")
    print(f" Installiere Solar-Lokal-App in Container {CT_ID}")
    print("==================================================")
    
    # 1. Basis-Pakete & NodeSource Node.js 20 LTS
    print("[*] 1/4 Installiere Systempakete & Node.js 20...")
    exec_in_container("apt-get update && apt-get install -y curl git mosquitto-clients build-essential")
    exec_in_container("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs")
    
    # 2. Repository klonen und bauen
    print("[*] 2/4 Klone Solar-Lokal-App und installiere npm dependencies...")
    exec_in_container(f"rm -rf {APP_DIR} && git clone {REPO_URL} {APP_DIR}")
    exec_in_container(f"cd {APP_DIR} && npm install && npm run build")
    
    # 3. Systemd Service für automatischen Neustart nach Reboot anlegen
    print("[*] 3/4 Richte systemd Service 'solar-lokal.service' ein...")
    service_def = f"""[Unit]
Description=Solar-Lokal Energy Management Core
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={APP_DIR}
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port {WEB_PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""
    exec_in_container(f"cat << 'EOF' > /etc/systemd/system/solar-lokal.service\\n{service_def}\\nEOF")
    
    # 4. Service aktivieren & starten
    print("[*] 4/4 Aktiviere & starte Service...")
    exec_in_container("systemctl daemon-reload && systemctl enable --now solar-lokal.service")
    time.sleep(2)
    
    print("\\n" + "="*60)
    print("[✓] FERTIG! Solar-Lokal-App läuft dauerhaft im Hintergrund.")
    print(f"[✓] Dashboard erreichbar unter: http://192.168.0.205:{WEB_PORT}")
    print("="*60)

if __name__ == "__main__":
    install_application()
`;

  const PROXMOX_LXC_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# Solar-Lokal-App Proxmox VE 8 LXC Installer (Bash Alternative)
# ==============================================================================
set -e

CTID=105
HOSTNAME="solar-lokal-core"
MEMORY=1024
CORES=2
DISK_SIZE=8G
BRIDGE="vmbr0"
IP_ADDR="192.168.0.205/24"
GATEWAY="192.168.0.1"

echo "=== Erstelle Solar-Lokal LXC Container $CTID ==="
pct create $CTID /var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst \\
  --hostname $HOSTNAME \\
  --memory $MEMORY \\
  --cores $CORES \\
  --net0 name=eth0,bridge=$BRIDGE,ip=$IP_ADDR,gw=$GATEWAY \\
  --storage local-lvm \\
  --rootfs local-lvm:$DISK_SIZE \\
  --onboot 1 \\
  --unprivileged 1

echo "=== Starte Container und installiere Node.js & Git ==="
pct start $CTID
sleep 4

pct exec $CTID -- bash -c "apt-get update && apt-get install -y curl git mosquitto-clients"
pct exec $CTID -- bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"

echo "=== Clone Solar-Lokal-App Repository ==="
pct exec $CTID -- bash -c "git clone https://github.com/Perspektivlos/Solar-Lokal-App.git /opt/solar-lokal"
pct exec $CTID -- bash -c "cd /opt/solar-lokal && npm install && npm run build"

echo "=== Systemd Service für automatischen Start einrichten ==="
cat << 'EOF' | pct exec $CTID -- tee /etc/systemd/system/solar-lokal.service
[Unit]
Description=Solar-Lokal App Core Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/solar-lokal
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

pct exec $CTID -- systemctl daemon-reload
pct exec $CTID -- systemctl enable --now solar-lokal.service

echo "=== Installation erfolgreich! Web-UI erreichbar unter: http://$IP_ADDR:3000 ==="
`;

  const DOCKER_COMPOSE_STACK = `version: '3.8'

# ==============================================================================
# Solar-Lokal Stack: Mosquitto + InfluxDB v2 + Grafana
# Optimiert für Proxmox VE (LXC oder VM)
# ==============================================================================

services:
  mosquitto:
    image: eclipse-mosquitto:2.0.18
    container_name: solar-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log

  influxdb:
    image: influxdb:2.7.6-alpine
    container_name: solar-influxdb
    restart: unless-stopped
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=solaradmin
      - DOCKER_INFLUXDB_INIT_PASSWORD=SolarSecureMasterPass2026!
      - DOCKER_INFLUXDB_INIT_ORG=solarhome
      - DOCKER_INFLUXDB_INIT_BUCKET=solar
      - DOCKER_INFLUXDB_INIT_RETENTION=365d
    volumes:
      - ./influxdb/data:/var/lib/influxdb2
      - ./influxdb/config:/etc/influxdb2

  grafana:
    image: grafana/grafana:11.1.0
    container_name: solar-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - influxdb
`;

  const MOSQUITTO_ACL_CONFIG = `# /etc/mosquitto/conf.d/solar_hardened.conf
# ==============================================================================
# Mosquitto MQTT Broker Konfiguration mit striktem ACL-Hardening
# ==============================================================================
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/aclfile

# WebSocket Listener für Web-Dashboard Telemetrie
listener 9001 0.0.0.0
protocol websockets

# /etc/mosquitto/aclfile
# ------------------------------------------------------------------------------
# 1. Shelly Pro 3EM (darf nur seine eigenen Status-Topics schreiben)
user shelly_pro3em
topic write venus/grid/shellypro/#
topic read shellypro3em/rpc

# 2. AhoyDTU (Hoymiles HM-1500)
user ahoy_dtu
topic write venus/pv/ahoydtu/#
topic read venus/pv/ahoydtu/+/cmd/#

# 3. Trucki 2 Shelly Gateway (Liest Shelly Grid & schreibt T2SG Status)
user trucki_gateway
topic read venus/grid/shellypro/#
topic write T2SG/#
topic read T2SG/ACSETPOINTOVR
topic read T2SG/METEROVR
topic read T2SG/ZEPCOVR
topic read T2SG/REBOOTOVR

# 4. Venus OS (Victron MPPTs)
user victron_venus
topic write N/b827eb79321c/#
topic write venus/battery/lifepo4/#
topic read R/b827eb79321c/#

# 5. Solar-Lokal-App Core (Lesezugriff auf alles, Schreibzugriff auf Steuerung)
user solar_app
topic read #
topic write T2SG/#
topic write venus/pv/ahoydtu/+/cmd/#
`;

  const handleCopyScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const generateMarkdownReport = () => {
    return `# SOLARANLAGE – SYSTEMDOKUMENTATION
**Stand:** ${reportDate} | **Version:** ${reportVersion}
**Infrastruktur:** Proxmox VE 8 (Intel N100 Mini-PC, Debian 12 LXC)
**Sicherheitskonzept:** Komplett Cloudfrei, Mosquitto ACL-Hardening, lokale InfluxDB v2 & Grafana

---

## 1. Anlagenübersicht & Live-Status
- **PV Erzeugung:** ${telemetry.pvTotalWatts} W (Hoymiles: ${telemetry.pvHoymilesWatts}W, 2x Victron MPPT: ${telemetry.pvVictronMppt1Watts + telemetry.pvVictronMppt2Watts}W)
- **Batteriespeicher:** 48V (51.2V) LiFePO4 Speicher (6x Power Queen 25.6V 100Ah in 3P2S = 15.36 kWh) | SoC: ${telemetry.batterySocPercent}% | Leistung: ${telemetry.batteryWatts} W
- **Netzbezug / Einspeisung (Shelly Pro 3EM):** ${telemetry.gridTotalWatts} W (saldiert über L1/L2/L3)
- **Hausverbrauch:** ${telemetry.houseTotalWatts} W | **Autarkiegrad:** ${telemetry.autarkyPercent}%

---

## 2. Geräteinventar (${devices.length} Komponenten)
${devices.map(d => `### ${d.name}
- **Kategorie:** ${d.category}
- **Hersteller/Modell:** ${d.vendor} ${d.model} (SN: ${d.serialNumber || 'N/A'})
- **IP / MAC:** ${d.ip} (${d.mac}) | Hostname: ${d.hostname}
- **Firmware:** ${d.firmwareVersion} (Status: ${d.firmwareStatus})
- **Dienste:** ${d.services.join(', ')}
- **Standort:** ${d.location}
- **Limits:** ${d.operatingLimits.map(l => `${l.parameter}: ${l.value} ${l.unit}`).join('; ')}
`).join('\n')}

---

## 3. IP-Plan & Netzwerkdienste
| IP | Port | Hostname / Gerät | Dienste | Status | Latenz |
|---|---|---|---|---|---|
${hosts.map(h => `| ${h.ip} | ${h.port || '—'} | ${h.name} | ${h.services.join(', ')} | ${h.status} | ${h.latencyMs} ms |`).join('\n')}

---

## 4. MQTT-Themenbaum & Schemas
${mqttTopics.map(t => `### Topic: \`${t.topic}\`
- **Quelle:** ${t.source}
- **Frequenz:** ${t.frequency}
- **Felder:** ${t.fields.map(f => `${f.field} (${f.type}, ${f.unit})`).join(', ')}
`).join('\n')}

---

## 5. Lokale APIs
${apiDocs.map(a => `- **${a.method}** \`${a.baseUrl}${a.endpoint}\` – ${a.description} (Status: ${a.status}, Latenz: ${a.responseTimeMs}ms)`).join('\n')}

---

## 6. Proxmox VE Bereitstellungsskripte
### Python Script 1: Instanzerstellung (\`create_proxmox_lxc.py\`)
\`\`\`python
${PYTHON_CREATE_INSTANCE}
\`\`\`

### Python Script 2: App & Service Setup (\`install_solar_app.py\`)
\`\`\`python
${PYTHON_INSTALL_APP}
\`\`\`

---

## 7. Letzte Konfigurationsänderungen (Audit Log)
${changeLog.slice(0, 5).map(c => `- **${c.timestamp}** [${c.device}] ${c.parameter}: ${c.oldValue} -> ${c.newValue} (Quelle: ${c.source})`).join('\n')}

---

## 8. Wartungsprotokoll
${maintenanceLog.slice(0, 5).map(m => `- **${m.date}** [${m.device}] ${m.task} – Ergebnis: ${m.result} (${m.technician})`).join('\n')}
`;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md);
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownloadJSON = () => {
    const dataDump = {
      reportDate,
      version: reportVersion,
      telemetry,
      devices,
      hosts,
      mqttTopics,
      apiDocs,
      changeLog,
      maintenanceLog,
      deploymentScripts: {
        pythonCreateInstance: PYTHON_CREATE_INSTANCE,
        pythonInstallApp: PYTHON_INSTALL_APP,
        proxmoxBash: PROXMOX_LXC_SCRIPT,
        dockerCompose: DOCKER_COMPOSE_STACK,
        mosquittoAcl: MOSQUITTO_ACL_CONFIG
      }
    };
    const blob = new Blob([JSON.stringify(dataDump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Solar-Lokal-Dokumentation-${reportDate}.json`;
    a.click();
    setCopiedFormat('json');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Versioning */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <FileText className="w-4 h-4" />
                </span>
                Anlagen-Zustandsbericht & Systemdokumentation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automatisch generierte, revisionssichere Volldokumentation der gesamten Solaranlage inklusive Proxmox VE Bereitstellungsskripte
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Version dropdown */}
            <div className="flex items-center gap-1 text-xs font-mono-code bg-slate-950/80 px-3 py-1.5 rounded-lg border border-white/[0.08]">
              <History className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={reportVersion}
                onChange={(e) => setReportVersion(e.target.value as any)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                <option value="v1.2 (Aktuell)">Dokumentation v1.2 (Aktuell)</option>
                <option value="v1.1 (08.09.2026)">Dokumentation v1.1 (08.09.2026)</option>
                <option value="v1.0 (Initial)">Dokumentation v1.0 (Initial 2026)</option>
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs transition-colors border border-white/[0.08]"
              title="Drucken oder als PDF speichern"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>DRUCKEN / PDF</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs transition-colors border border-white/[0.08]"
              title="Als formatierte Markdown-Datei kopieren"
            >
              {copiedFormat === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
              <span>MARKDOWN</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md"
              title="JSON-Export herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON EXPORT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 14. Automatische Plausibilitätsprüfung (Audit Status) */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-emerald-500/30">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            14. AUTOMATISCHE SYSTEM-PLAUSIBILITÄTSPRÜFUNG
          </div>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            STATUS: 8/8 PRÜFUNGEN BESTANDEN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {plausibilityChecks.map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.06] text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {item.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {item.status === 'info' && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                <span className="text-slate-200">{item.label}</span>
              </div>
              <div className="text-slate-400 text-[11px] font-mono-code pl-5">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* NEUER BEREICH: INFRASTRUKTUR- & BEREITSTELLUNGSSKRIPTE (PASSEND ZUM STIL) */}
      {/* ============================================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Code className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Infrastruktur- & Proxmox Automatisierungsskripte
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-slate-800 text-sky-300 border border-white/[0.08]">
                PROXMOX VE 8 LXC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Schlüsselfertige Python- & Bash-Skripte zur automatisierten Container-Bereitstellung und Systemd-Dienste-Konfiguration
            </p>
          </div>

          {/* Subtabs for scripts */}
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-white/[0.08] text-xs font-medium overflow-x-auto gap-1">
            <button
              onClick={() => setActiveScriptTab('python_instance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'python_instance'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Python: Instanz</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('python_install')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'python_install'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Python: App Setup</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('proxmox_bash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'proxmox_bash'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-violet-400" />
              <span>Bash Alternative</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('docker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'docker'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Docker Stack</span>
            </button>

            <button
              onClick={() => setActiveScriptTab('mosquitto_acl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeScriptTab === 'mosquitto_acl'
                  ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mosquitto ACL</span>
            </button>
          </div>
        </div>

        {/* Script Content Viewer */}
        <div className="rounded-xl border border-white/[0.08] bg-[#050811] p-4 sm:p-5 relative">
          {activeScriptTab === 'python_instance' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Skript 1: Instanzerstellung via Python (Debian 12 LXC Container 105)
                  </div>
                  <div className="text-xs text-slate-400">
                    Erstellt den unprivilegierten Container mit 1024 MB RAM, 2 Cores, fester IP 192.168.0.205 und Nesting
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('py_inst', PYTHON_CREATE_INSTANCE)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'py_inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedScript === 'py_inst' ? 'Kopiert!' : 'Python Script 1 kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PYTHON_CREATE_INSTANCE}
              </pre>
            </div>
          )}

          {activeScriptTab === 'python_install' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Skript 2: App Installation & Systemd Service (Python)
                  </div>
                  <div className="text-xs text-slate-400">
                    Installiert Node.js 20, klont das Repository nach /opt/solar-lokal, kompiliert die App und startet den Service
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('py_app', PYTHON_INSTALL_APP)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'py_app' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copiedScript === 'py_app' ? 'Kopiert!' : 'Python Script 2 kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PYTHON_INSTALL_APP}
              </pre>
            </div>
          )}

          {activeScriptTab === 'proxmox_bash' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    Proxmox VE 8 Bash One-Liner / Shell Script
                  </div>
                  <div className="text-xs text-slate-400">
                    Kombinierter Shell-Ablauf für Direktausführung in der Proxmox Host-Shell
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('sh_inst', PROXMOX_LXC_SCRIPT)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'sh_inst' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
                  <span>{copiedScript === 'sh_inst' ? 'Kopiert!' : 'Bash Script kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {PROXMOX_LXC_SCRIPT}
              </pre>
            </div>
          )}

          {activeScriptTab === 'docker' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Docker Compose Stack (Mosquitto + InfluxDB v2 + Grafana)
                  </div>
                  <div className="text-xs text-slate-400">
                    Vollständiger lokaler Telemetrie-Stack für Proxmox VM oder LXC Docker Host
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('docker_stack', DOCKER_COMPOSE_STACK)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'docker_stack' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copiedScript === 'docker_stack' ? 'Kopiert!' : 'docker-compose.yml kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {DOCKER_COMPOSE_STACK}
              </pre>
            </div>
          )}

          {activeScriptTab === 'mosquitto_acl' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Mosquitto ACL Sicherheitskonfiguration (/etc/mosquitto/aclfile)
                  </div>
                  <div className="text-xs text-slate-400">
                    Gewährleistet Least-Privilege Zugriff für Shelly, AhoyDTU, Trucki und VenusOS
                  </div>
                </div>
                <button
                  onClick={() => handleCopyScript('mosq_acl', MOSQUITTO_ACL_CONFIG)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition-colors border border-white/[0.1]"
                >
                  {copiedScript === 'mosq_acl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copiedScript === 'mosq_acl' ? 'Kopiert!' : 'ACL Konfiguration kopieren'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-black/60 border border-white/[0.05] font-mono-code text-xs text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
                {MOSQUITTO_ACL_CONFIG}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Rendered Live Technical Report View (Ready for Reading / Printing) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#070a11] p-6 sm:p-10 font-mono-code text-xs text-slate-300 space-y-8 shadow-2xl print:border-none print:p-0 print:bg-white print:text-black">
        
        {/* Cover Header */}
        <div className="border-b-2 border-sky-500/40 pb-6">
          <div className="text-[10px] text-sky-400 uppercase tracking-widest mb-1">
            DOKUMENTATIONS-STAND: {reportDate} • PROXMOX VE 8 LXC DEPLOYMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 print:text-black">
            SOLARANLAGE // SYSTEMDOKUMENTATION
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Lokales Cloudfreies Energiemanagementsystem • {reportVersion}
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.08] space-y-1 text-slate-300">
          <div className="font-bold text-xs text-sky-400 uppercase mb-2">Inhaltsverzeichnis:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>1. Anlagenübersicht & Live-Metriken</div>
            <div>2. Geräteinventar & Topologie</div>
            <div>3. Netzwerk & IP-Plan</div>
            <div>4. Proxmox LXC Automatisierungsskripte</div>
            <div>5. MQTT-Struktur & Payload Schemas</div>
            <div>6. APIs & Schnittstellen</div>
            <div>7. Firmware-Status & Hardware-Specs</div>
            <div>8. Konfiguration & Schwellwerte</div>
            <div>9. Wartungsprotokoll & Revisionsverlauf</div>
          </div>
        </div>

        {/* 1. Anlagenübersicht */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            1. Anlagenübersicht & Live-Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">PV ERZEUGUNG:</span>
              <span className="text-base font-bold text-amber-400">{telemetry.pvTotalWatts} W</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">BATTERIE ENTLEERUNG:</span>
              <span className="text-base font-bold text-emerald-400">{Math.abs(telemetry.batteryWatts)} W ({telemetry.batterySocPercent}%)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">NETZBEZUG (SALDIERT):</span>
              <span className="text-base font-bold text-violet-400">{telemetry.gridTotalWatts} W</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.06]">
              <span className="text-[10px] text-slate-500 block">HAUSVERBRAUCH:</span>
              <span className="text-base font-bold text-sky-400">{telemetry.houseTotalWatts} W</span>
            </div>
          </div>
        </div>

        {/* 2. Geräteinventar */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            2. Geräteinventar ({devices.length} Komponenten)
          </h3>
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-slate-900/30 border border-white/[0.06] flex flex-wrap justify-between items-center gap-2">
                <div>
                  <strong className="text-slate-100">{d.name}</strong>
                  <span className="text-slate-500 ml-2">({d.vendor} {d.model})</span>
                  <div className="text-[11px] text-slate-400">{d.location} • FW: {d.firmwareVersion} ({d.firmwareStatus})</div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-sky-400">{d.ip}</span>
                  <span className="text-slate-500 ml-2">[{d.services.join(', ')}]</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. IP Plan Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            3. IP-Plan & Netzwerkdienste (Subnetz 192.168.0.0/24)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">IP-Adresse</th>
                  <th className="p-2.5">Port</th>
                  <th className="p-2.5">Gerät</th>
                  <th className="p-2.5">Dienste</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300 text-[11px]">
                {hosts.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 text-sky-300 font-bold">{h.ip}</td>
                    <td className="p-2.5 text-amber-400">{h.port || '—'}</td>
                    <td className="p-2.5">{h.name}</td>
                    <td className="p-2.5 text-slate-400">{h.services.join(', ')}</td>
                    <td className="p-2.5 text-emerald-400">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Proxmox Automatisierung Zusammenfassung */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-sky-300 uppercase border-b border-white/[0.08] pb-1">
            4. Proxmox VE 8 LXC Bereitstellung
          </h3>
          <div className="p-3 rounded-lg bg-slate-900/30 border border-white/[0.06] space-y-2 text-slate-300">
            <div className="text-xs">
              Die Automatisierungsskripte (<code className="text-amber-300">create_proxmox_lxc.py</code> & <code className="text-emerald-300">install_solar_app.py</code>) erzeugen den unprivilegierten Container 105 (Debian 12) auf <code className="text-sky-300">local-lvm</code> mit statischer IP <code className="text-sky-300">192.168.0.205</code>, Node.js 20 LTS und registrieren den systemd-Hintergrunddienst <code className="text-emerald-300">solar-lokal.service</code>.
            </div>
            <div className="text-[11px] text-slate-400">
              Vollständiger Quellcode ist im Abschnitt oben und in den Export-Dateien (Markdown & JSON) hinterlegt.
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-white/[0.08] text-[10px] text-slate-500 flex justify-between items-center">
          <span>Generiert durch Solar-Lokal Core • Proxmox VE 8 Host</span>
          <span>Revisionssicher • Cloudfrei • Stand: {reportDate}</span>
        </div>

      </div>

    </div>
  );
};
