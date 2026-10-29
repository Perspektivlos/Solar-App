#!/usr/bin/env bash
# =============================================================================
# Solar-Lokal App - Update im LXC-Container (Debian 12 / Ubuntu)
#
#   bash /opt/solar-lokal/scripts/proxmox/update_solar_app.sh
#
# - zieht den aktuellen Stand von GitHub (nur Fast-Forward)
# - installiert Abhaengigkeiten und baut das Frontend
# - korrigiert alte Installationen: systemd startet das Backend (npm start)
#   statt "vite preview", Nginx reicht /api/ unveraendert an Port 3000 weiter
# - prueft danach Backend und Nginx
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/solar-lokal}"
SERVICE="${SERVICE:-solar-lokal}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-https://github.com/Perspektivlos/Solar-App.git}"
NGINX_SITE="/etc/nginx/sites-available/solar-lokal"
UNIT="/etc/systemd/system/${SERVICE}.service"

say()  { printf '\n\033[36m[>] %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m[✓] %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[31m[x] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Bitte als root ausfuehren."
[ -d "$APP_DIR" ] || die "$APP_DIR fehlt. Erst installieren mit install_solar_app.py."
command -v git >/dev/null || { apt-get update -qq && apt-get install -y -qq git; }
cd "$APP_DIR"

say "1/7 Sicherung von Konfiguration"
BACKUP="/root/solar-lokal-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in .env hardware-config.json mqtt-config.json; do
  [ -f "$f" ] && cp -a "$f" "$BACKUP/" && ok "gesichert: $f"
done
cp -a "$UNIT" "$BACKUP/" 2>/dev/null || true
cp -a "$NGINX_SITE" "$BACKUP/" 2>/dev/null || true
ok "Sicherung in $BACKUP"

say "2/7 Git-Stand aktualisieren ($BRANCH)"
git ls-remote --heads "$REPO_URL" "$BRANCH" >/dev/null 2>&1 || die "GitHub nicht erreichbar ($REPO_URL). DNS/Gateway im CT pruefen: ping -c1 github.com"
if [ ! -d .git ]; then
  # Installation per rsync (ohne .git): in einen Git-Checkout umwandeln.
  # Untracked Dateien (.env, *-config.json, node_modules) bleiben erhalten.
  warn "Kein Git-Checkout gefunden -> wird mit $REPO_URL verknuepft"
  git init -q
  git remote add origin "$REPO_URL"
  git fetch -q origin "$BRANCH"
  git checkout -q -f -B "$BRANCH" "origin/$BRANCH"
  OLD="kein-git"
else
  OLD=$(git rev-parse --short HEAD)
fi
git fetch --quiet origin "$BRANCH"
NEW=$(git rev-parse --short "origin/$BRANCH")
echo "    aktuell: $OLD  ->  neu: $NEW"
if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Lokale Aenderungen gefunden, werden per 'git stash' beiseitegelegt:"
  git status --short
  git stash push -m "update_solar_app $(date -Iseconds)" >/dev/null
fi
git checkout --quiet "$BRANCH"
git merge --ff-only --quiet "origin/$BRANCH" || die "Kein Fast-Forward moeglich. Bitte manuell pruefen (git log / git status)."
ok "Code auf $(git rev-parse --short HEAD)"

say "3/7 Node.js pruefen"
# Vite 6, Tailwind 4, vite-plugin-pwa 2 und @google/genai brauchen Node.js >= 20.
# Debian 12 liefert 18.x -> offizielles Node.js 22 LTS von nodejs.org nach /usr/local
# (ohne fremde APT-Quelle, mit SHA256-Pruefung).
NODE_MIN=20
node_major() { local v; v=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//'); echo "${v:-0}"; }
if [ "$(node_major)" -lt "$NODE_MIN" ]; then
  warn "Node.js $(node -v 2>/dev/null || echo fehlt) ist zu alt -> installiere Node.js 22 LTS"
  case "$(uname -m)" in
    x86_64) NARCH=x64 ;;
    aarch64) NARCH=arm64 ;;
    *) die "Architektur $(uname -m) nicht unterstuetzt" ;;
  esac
  BASE="https://nodejs.org/dist/latest-v22.x"
  TMPD=$(mktemp -d)
  curl -fsSL "$BASE/SHASUMS256.txt" -o "$TMPD/SHASUMS256.txt"
  TARBALL=$(grep -oE "node-v22\.[0-9]+\.[0-9]+-linux-${NARCH}\.tar\.xz" "$TMPD/SHASUMS256.txt" | head -1)
  [ -n "$TARBALL" ] || die "Node-22-Paket nicht gefunden"
  curl -fsSL "$BASE/$TARBALL" -o "$TMPD/$TARBALL"
  (cd "$TMPD" && grep " $TARBALL\$" SHASUMS256.txt | sha256sum -c -) || die "Pruefsumme von $TARBALL falsch"
  command -v xz >/dev/null || { apt-get update -qq && apt-get install -y -qq xz-utils; }
  tar -xJf "$TMPD/$TARBALL" -C /usr/local --strip-components=1 --no-same-owner
  rm -rf "$TMPD"
  hash -r
  export PATH="/usr/local/bin:$PATH"
  [ "$(node_major)" -ge "$NODE_MIN" ] || die "Node.js-Update fehlgeschlagen ($(node -v))"
  ok "Node.js $(node -v), npm $(npm -v) unter /usr/local"
  # native Module (Tailwind oxide, esbuild, rollup) fuer neue Node-Version neu holen
  rm -rf node_modules
else
  ok "Node.js $(node -v)"
fi

say "4/7 Abhaengigkeiten und Build"
# tsx (Backend-Start) ist eine devDependency -> dev-Pakete mitinstallieren
NODE_ENV=development npm install --no-audit --no-fund --include=dev
npm install --no-audit --no-fund --no-save @tailwindcss/oxide-linux-x64-gnu >/dev/null 2>&1 || true
npm run build
ok "Frontend gebaut: $APP_DIR/dist"

say "5/7 .env pruefen"
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env aus .env.example angelegt -> MQTT_PASSWORD und MQTT_CA_FILE eintragen!"
fi
grep -q '^PORT=' .env || echo 'PORT=3000' >> .env
if ! grep -q '^MQTT_URL=' .env; then
  cat >> .env <<'ENVEOF'

# --- Solar-Lokal Backend: Mosquitto mit TLS + ACL (ergaenzt von update_solar_app.sh)
MQTT_URL="mqtts://192.168.0.201:8883"
MQTT_USERNAME="mqttapp"
MQTT_PASSWORD=""
MQTT_CA_FILE="/etc/solar-app/ca.crt"
MQTT_REJECT_UNAUTHORIZED=true
ENVEOF
  warn "MQTT-Block in .env ergaenzt"
fi
if ! grep -q '^PORT=3000' .env; then
  warn "PORT in .env ist nicht 3000. Nginx leitet /api/ an 3000 weiter -> wird auf 3000 gesetzt."
  sed -i 's/^PORT=.*/PORT=3000/' .env
fi
if grep -q '^MQTT_PASSWORD=""' .env || ! grep -q '^MQTT_PASSWORD=' .env; then
  if [ -f mqtt-config.json ] && grep -q '"password": *"[^"]' mqtt-config.json; then
    ok "MQTT-Passwort aus mqtt-config.json (Web-UI) wird genutzt"
  else
    warn "MQTT_PASSWORD ist leer. Ohne Passwort keine MQTT-Daten (Venus OS, TRUCKI/#)."
  fi
fi
CA=$(grep -E '^MQTT_CA_FILE=' .env | cut -d= -f2- | tr -d '"' || true)
if [ -n "${CA:-}" ] && [ ! -f "$CA" ]; then
  warn "MQTT_CA_FILE=$CA existiert nicht. CA-Zertifikat vom Broker (.201) hierher kopieren."
fi

say "6/7 systemd und Nginx korrigieren"
if [ -f "$UNIT" ]; then
  NPM_BIN=$(command -v npm) || die "npm nicht gefunden (Node.js installiert?)"
  if ! grep -qx "ExecStart=$NPM_BIN start" "$UNIT"; then
    sed -i "s#^ExecStart=.*#ExecStart=$NPM_BIN start#" "$UNIT"
    ok "systemd: ExecStart=$NPM_BIN start (Backend statt vite preview)"
  fi
  grep -q '^Environment=NODE_ENV=production' "$UNIT" || sed -i "/^WorkingDirectory=/a Environment=NODE_ENV=production" "$UNIT"
  grep -q '^EnvironmentFile=' "$UNIT" || sed -i "/^WorkingDirectory=/a EnvironmentFile=-$APP_DIR/.env" "$UNIT"
  grep -q '^Environment=PORT=' "$UNIT" || sed -i "/^WorkingDirectory=/a Environment=PORT=3000" "$UNIT"
else
  die "$UNIT fehlt. Bitte install_solar_app.py ausfuehren."
fi
if [ -f "$NGINX_SITE" ] && grep -q 'proxy_pass http://127.0.0.1:3000/;' "$NGINX_SITE"; then
  sed -i 's#proxy_pass http://127.0.0.1:3000/;#proxy_pass http://127.0.0.1:3000;#' "$NGINX_SITE"
  ok "Nginx: /api/-Weiterleitung korrigiert (Prefix bleibt erhalten)"
fi
nginx -t
systemctl daemon-reload
systemctl restart "$SERVICE"
systemctl reload nginx
ok "Dienste neu gestartet"

say "7/7 Funktionspruefung"
for i in $(seq 1 20); do
  curl -fs -o /dev/null http://127.0.0.1:3000/api/system/info && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:3000/api/system/info >/dev/null; then
  warn "Backend antwortet nicht. Log:"
  journalctl -u "$SERVICE" -n 40 --no-pager
  die "Update abgebrochen (Sicherung: $BACKUP)"
fi
ok "Backend laeuft auf 127.0.0.1:3000"
sleep 6  # erste Abfragerunde und MQTT-Verbindungsversuch abwarten
curl -fsS http://127.0.0.1/api/telemetry/live | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    const j=JSON.parse(s), d=j.data;
    console.log("    Nginx /api       : OK");
    console.log("    MQTT verbunden   :", j.mqttConnected, j.mqttStatus?.error ? "("+j.mqttStatus.error+")" : "");
    console.log("    Quellen          :", JSON.stringify(d.sources));
    for (const [k,v] of Object.entries(j.diagnostics||{})) if (v.status!=="live") console.log("    "+k.padEnd(16)+": "+v.status+" "+(v.errorMessage||""));
  });' || warn "Nginx liefert /api/telemetry/live nicht aus. Pruefen: nginx -t, $NGINX_SITE"

echo
ok "Fertig: $OLD -> $(git rev-parse --short HEAD)"
