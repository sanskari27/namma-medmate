#!/usr/bin/env bash
# Capture every onboarding screen from the running app on the emulator.
# Usage: ./scripts/capture-screens.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$APP_DIR/scripts/env.sh"

SERIAL="${SERIAL:-emulator-5554}"
PKG="com.nammamedmate.customer"
OUT="${OUT_DIR:-$REPO_ROOT/_ref/device}"
mkdir -p "$OUT"

D="adb -s $SERIAL"

shot() { $D exec-out screencap -p > "$OUT/$1.png"; echo "  -> $1.png"; }

echo "▸ splash"
$D shell am force-stop "$PKG"
$D shell am start -n "$PKG/.MainActivity" >/dev/null
sleep 1.8
shot 01-splash
sleep 4

for pair in "02-login:/login" "03-otp:/otp" "04-consent:/consent" "05-location:/location"; do
  name="${pair%%:*}"
  route="${pair##*:}"
  echo "▸ $route"
  $D shell am start -a android.intent.action.VIEW -d "medmate://$route" >/dev/null 2>&1 || true
  sleep 4
  shot "$name"
done

echo "▸ done"
