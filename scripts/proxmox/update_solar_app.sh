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
NGINX_SITE="/etc/nginx/sites-available/solar-lokal"
UNIT="/etc/systemd/system/${SERVICE}.service"

say()  { printf '\n\033[36m[>] %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m[✓] %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[31m[x] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Bitte als root ausfuehren."
[ -d "$APP_DIR/.git" ] || die "$APP_DIR ist kein Git-Checkout. Neu installieren mit install_solar_app.py."
cd "$APP_DIR"

say "1/6 Sicherung von Konfiguration"
BACKUP="/root/solar-lokal-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in .env hardware-config.json mqtt-config.json; do
  [ -f "$f" ] && cp -a "$f" "$BACKUP/" && ok "gesichert: $f"
done
cp -a "$UNIT" "$BACKUP/" 2>/dev/null || true
cp -a "$NGINX_SITE" "$BACKUP/" 2>/dev/null || true
ok "Sicherung in $BACKUP"

say "2/6 Git-Stand aktualisieren ($BRANCH)"
OLD=$(git rev-parse --short HEAD)
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

say "3/6 Abhaengigkeiten und Build"
# tsx (Backend-Start) ist eine devDependency -> dev-Pakete mitinstallieren
NODE_ENV=development npm install --no-audit --no-fund --include=dev
npm install --no-audit --no-fund --no-save @tailwindcss/oxide-linux-x64-gnu >/dev/null 2>&1 || true
npm run build
ok "Frontend gebaut: $APP_DIR/dist"

say "4/6 .env pruefen"
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env aus .env.example angelegt -> MQTT_PASSWORD und MQTT_CA_FILE eintragen!"
fi
grep -q '^PORT=' .env || echo 'PORT=3000' >> .env
if ! grep -q '^PORT=3000' .env; then
  warn "PORT in .env ist nicht 3000. Nginx leitet /api/ an 3000 weiter -> wird auf 3000 gesetzt."
  sed -i 's/^PORT=.*/PORT=3000/' .env
fi
if grep -q '^MQTT_PASSWORD=""' .env || ! grep -q '^MQTT_PASSWORD=' .env; then
  warn "MQTT_PASSWORD ist leer. Ohne Passwort keine MQTT-Daten (Venus OS, TRUCKI/#)."
fi
CA=$(grep -E '^MQTT_CA_FILE=' .env | cut -d= -f2- | tr -d '"' || true)
if [ -n "${CA:-}" ] && [ ! -f "$CA" ]; then
  warn "MQTT_CA_FILE=$CA existiert nicht. CA-Zertifikat vom Broker (.201) hierher kopieren."
fi

say "5/6 systemd und Nginx korrigieren"
if [ -f "$UNIT" ]; then
  if grep -q 'npm run preview' "$UNIT"; then
    sed -i 's#^ExecStart=.*#ExecStart=/usr/bin/npm start#' "$UNIT"
    ok "systemd: 'vite preview' durch Backend-Start ersetzt"
  fi
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

say "6/6 Funktionspruefung"
for i in $(seq 1 20); do
  curl -fsS -o /dev/null http://127.0.0.1:3000/api/system/info && break
  sleep 1
done
if ! curl -fsS http://127.0.0.1:3000/api/system/info >/dev/null; then
  warn "Backend antwortet nicht. Log:"
  journalctl -u "$SERVICE" -n 40 --no-pager
  die "Update abgebrochen (Sicherung: $BACKUP)"
fi
ok "Backend laeuft auf 127.0.0.1:3000"
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
