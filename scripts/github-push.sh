#!/usr/bin/env bash
# ==============================================================================
# Solar-App GitHub Push Manager
# ==============================================================================
# Sicheres Deployment-Skript für das Repository Perspektivlos/Solar-App
# Verwendet tokenfreie Authentifizierung via GitHub CLI (gh) oder SSH-Key.
# Niemals Token-Interpolation in Klartext-URLs!
# ==============================================================================

set -e

REPO_NAME="Perspektivlos/Solar-App"
SSH_URL="git@github.com:${REPO_NAME}.git"
HTTPS_URL="https://github.com/${REPO_NAME}.git"
BRANCH="main"

echo "=========================================================="
echo "  Solar-App: Sicherer GitHub Push-Manager"
echo "=========================================================="
echo "Ziel-Repository: $REPO_NAME"
echo "Ziel-Branch:     $BRANCH"
echo "=========================================================="
echo ""

# Überprüfen, ob git initialisiert ist
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[!] Fehler: Kein Git-Repository im aktuellen Verzeichnis gefunden."
  exit 1
fi

# 1. Prüfen, ob GitHub CLI (gh) verfügbar und angemeldet ist
HAS_GH=false
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    HAS_GH=true
    echo "[✓] GitHub CLI (gh) erkannt und authentifiziert."
  fi
fi

# 2. Prüfen, ob SSH-Zugriff zu GitHub eingerichtet ist
HAS_SSH=false
if ssh -T -o BatchMode=yes -o ConnectTimeout=4 git@github.com 2>&1 | grep -q "successfully authenticated"; then
  HAS_SSH=true
  echo "[✓] SSH-Authentifizierung mit GitHub erfolgreich verifiziert."
fi

# Auswählen der sicheren Push-Methode
PUSH_METHOD=""
REMOTE_TARGET=""

if [ "$HAS_SSH" = true ]; then
  PUSH_METHOD="ssh"
  REMOTE_TARGET="$SSH_URL"
  echo "[*] Verwende SSH-Key für sicheren Push ($SSH_URL)"
elif [ "$HAS_GH" = true ]; then
  PUSH_METHOD="gh"
  REMOTE_TARGET="$HTTPS_URL"
  echo "[*] Verwende GitHub CLI Credential Helper ($HTTPS_URL)"
elif [ -n "$GITHUB_TOKEN" ] || [ -n "$GH_TOKEN" ]; then
  TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
  echo "[*] Umgebungsvariable für Token vorhanden. Verwende temporären HTTP-Header (kein Token in URL)..."
  # Sichere Übertragung via git http.extraHeader statt URL-Embedding
  PUSH_METHOD="token_header"
  REMOTE_TARGET="$HTTPS_URL"
else
  echo "[!] Keine sichere Authentifizierungsmethode gefunden."
  echo ""
  echo "Empfohlene Vorgehensweise (eine der Optionen):"
  echo "  1) GitHub CLI einrichten:"
  echo "     gh auth login"
  echo ""
  echo "  2) SSH-Key hinterlegen:"
  echo "     ssh-keygen -t ed25519 -C \"solar-app-deploy\""
  echo "     cat ~/.ssh/id_ed25519.pub  # Auf https://github.com/settings/keys einfügen"
  echo ""
  echo "  3) Umgebungsvariable für automatisierte Umgebungen setzen:"
  echo "     export GH_TOKEN=\"ghp_deinToken\""
  echo ""
  exit 1
fi

# Remote 'origin' konfigurieren oder anpassen falls nötig
CURRENT_ORIGIN=$(git remote get-url origin 2>/dev/null || true)
if [ -z "$CURRENT_ORIGIN" ]; then
  echo "[*] Richte remote 'origin' auf $REMOTE_TARGET ein..."
  git remote add origin "$REMOTE_TARGET"
elif [ "$CURRENT_ORIGIN" != "$REMOTE_TARGET" ]; then
  echo "[*] Aktualisiere remote 'origin' auf $REMOTE_TARGET (vorher: $CURRENT_ORIGIN)..."
  git remote set-url origin "$REMOTE_TARGET"
fi

# Push ausführen
echo "[*] Übertrage Änderungen auf branch '$BRANCH'..."
if [ "$PUSH_METHOD" = "token_header" ]; then
  # Token als Basic Auth Header übergeben ohne ihn in git-Historie oder Remote-URL zu schreiben
  BASIC_AUTH=$(echo -n "x-access-token:${TOKEN}" | base64 | tr -d '\n')
  git -c "http.extraHeader=Authorization: Basic ${BASIC_AUTH}" push origin "HEAD:refs/heads/$BRANCH"
else
  git push origin "HEAD:refs/heads/$BRANCH"
fi

echo ""
echo "=========================================================="
echo " [OK] Erfolgreich auf Perspektivlos/Solar-App übertragen!"
echo "=========================================================="
