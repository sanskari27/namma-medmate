#!/usr/bin/env bash
# Capture the 02 · Discover screens from the running app on the emulator.
#
#   ./scripts/capture-discover.sh
#
# OUT_DIR=/tmp/x ./scripts/capture-discover.sh   # override the output folder
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

# name:deep-link-path
ROUTES=(
  "06-home:/home"
  "07-search:/search"
  "08-category:/category/fever"
  "09-product:/product/p29"
  "10-product-rx:/product/DRS003256"
  "11-pharmacies:/pharmacies"
  "12-pharmacy:/pharmacy/hf"
)

echo "▸ launching"
$D shell am force-stop "$PKG"
$D shell am start -n "$PKG/.MainActivity" >/dev/null
sleep 5

for pair in "${ROUTES[@]}"; do
  name="${pair%%:*}"
  route="${pair##*:}"
  echo "▸ $route"
  $D shell am start -a android.intent.action.VIEW -d "medmate://$route" >/dev/null 2>&1 || true
  sleep 3.5
  shot "$name"
done

echo "▸ done -> $OUT"
