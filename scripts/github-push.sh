#!/usr/bin/env bash
# ==============================================================================
# Solar-Lokal-App GitHub Push Hilfsskript
# ==============================================================================
# Dieses Skript unterstützt Sie beim sicheren und einfachen Übertragen
# der neuesten Änderungen auf das GitHub-Repository.
# ==============================================================================

set -e

REPO_URL="https://github.com/Perspektivlos/Solar-Lokal-App.git"
BRANCH="main"

echo "=========================================================="
echo "  Solar-Lokal-App: GitHub Push-Manager"
echo "=========================================================="
echo "Ziel-Repository: $REPO_URL"
echo "Ziel-Branch:     $BRANCH"
echo ""

# Überprüfung, ob ein GitHub Personal Access Token (PAT) übergeben wurde
if [ -n "$GITHUB_TOKEN" ]; then
  AUTH_URL="https://${GITHUB_TOKEN}@github.com/Perspektivlos/Solar-Lokal-App.git"
  echo "[*] Verwende GITHUB_TOKEN Umgebungsvariable für die Authentifizierung."
elif [ -n "$1" ]; then
  AUTH_URL="https://${1}@github.com/Perspektivlos/Solar-Lokal-App.git"
  echo "[*] Verwende übergebenes Token für die Authentifizierung."
else
  echo "[i] Bitte geben Sie Ihr GitHub Personal Access Token ein"
  echo "    (oder führen Sie das Skript aus mit: GITHUB_TOKEN=ghp_xxx ./scripts/github-push.sh):"
  read -s -p "Token eingeben: " USER_TOKEN
  echo ""
  if [ -z "$USER_TOKEN" ]; then
    echo "[!] Kein Token angegeben. Push abgebrochen."
    exit 1
  fi
  AUTH_URL="https://${USER_TOKEN}@github.com/Perspektivlos/Solar-Lokal-App.git"
fi

echo "[*] Führe 'git push' nach origin $BRANCH durch..."
git push "$AUTH_URL" "HEAD:refs/heads/$BRANCH"

echo ""
echo "=========================================================="
echo " [OK] Erfolgreich auf GitHub übertragen!"
echo "=========================================================="
