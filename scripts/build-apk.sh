#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# E-Plenarius mobile — Build release APK via WSL2 Ubuntu
#
# Roda este script de dentro do WSL Ubuntu (não do Windows):
#   wsl -d Ubuntu bash "/mnt/c/Users/Diogo Alves/Desktop/E-plenarius/mobile/scripts/build-apk.sh"
#
# Ou já dentro do Ubuntu:
#   bash /mnt/c/Users/Diogo\ Alves/Desktop/E-plenarius/mobile/scripts/build-apk.sh
#
# Resultado: APK em mobile/eplenarius.apk
# Tempo: ~2-3 min (com caches aquecidos), 7-10 min na primeira build.
# ─────────────────────────────────────────────────────────────────
set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

WIN_PROJECT="/mnt/c/Users/Diogo Alves/Desktop/E-plenarius/mobile"
LINUX_BUILD="$HOME/eplenarius-mobile"
APK_OUT="$WIN_PROJECT/eplenarius.apk"

export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
die()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Checks ──
[ -d "$ANDROID_HOME" ] || die "Android SDK não encontrado em $ANDROID_HOME"
[ -d "$JAVA_HOME" ] || die "JDK não encontrado em $JAVA_HOME"
command -v node >/dev/null || die "Node não instalado no Ubuntu"
[ -d "$WIN_PROJECT" ] || die "Pasta do projeto não encontrada: $WIN_PROJECT"

START_TIME=$(date +%s)

step "1/5  Sincronizando código do Windows -> Linux"
mkdir -p "$LINUX_BUILD"
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='android' \
  --exclude='ios' \
  --exclude='.expo' \
  --exclude='eplenarius.apk' \
  "$WIN_PROJECT/" "$LINUX_BUILD/"
ok "Código sincronizado"

cd "$LINUX_BUILD"

step "2/5  npm install"
npm install --silent --no-audit --no-fund
ok "Dependências instaladas"

step "3/5  expo prebuild"
npx expo prebuild --platform android --clean 2>&1 | grep -E "✔|Created|Updated|Finished" || true
ok "Native android/ gerada"

step "4/5  gradle assembleRelease (pode demorar)"
cd android
./gradlew assembleRelease --no-daemon 2>&1 | tail -5
ok "APK compilado"

step "5/5  Copiando APK para o Desktop do Windows"
APK_BUILT="$LINUX_BUILD/android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK_BUILT" ] || die "APK não encontrado em $APK_BUILT"
cp "$APK_BUILT" "$APK_OUT"
SIZE=$(du -h "$APK_OUT" | cut -f1)
ok "APK copiado ($SIZE)"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINS=$((DURATION / 60))
SECS=$((DURATION % 60))

echo -e "\n${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  BUILD CONCLUÍDO em ${MINS}m ${SECS}s${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "  APK: ${BLUE}$APK_OUT${NC}"
echo
echo -e "Para instalar via USB (tablet conectado com depuração USB):"
echo -e "  ${YELLOW}adb install -r '$APK_OUT'${NC}"
echo
