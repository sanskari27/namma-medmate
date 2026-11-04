#!/usr/bin/env bash
# Verify that MedMate renders identically regardless of the OS font scale.
#
# Background: React Native applies the OS font-size setting to every <Text>
# natively. Handsets that ship with a scale below 1.0 used to render MedMate's
# copy too small while the containers kept their measured heights — the same
# build looked pixel-perfect on one device and broken on another.
#
# Usage: ./scripts/check-font-scale.sh [apk-path]
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$APP_DIR/scripts/env.sh"

SERIAL="${SERIAL:-emulator-5554}"
PKG="com.nammamedmate.customer"
OUT="${OUT_DIR:-$REPO_ROOT/_ref/fontscale}"
APK="${1:-$APP_DIR/android/app/build/outputs/apk/release/app-release.apk}"

mkdir -p "$OUT"

D="adb -s $SERIAL"

echo "▸ installing $APK"
$D install -r -d "$APK" | tail -2

capture() {
  local scale="$1"
  echo "▸ font_scale=$scale"
  $D shell settings put system font_scale "$scale"
  $D shell am force-stop "$PKG"
  $D shell am start -n "$PKG/.MainActivity" >/dev/null
  sleep 5
  $D shell am start -a android.intent.action.VIEW -d "medmate://login" >/dev/null 2>&1 || true
  sleep 4
  $D exec-out screencap -p > "$OUT/login-$scale.png"
  echo "  -> login-$scale.png"
}

# 1.0  = the design baseline
# 0.85 = the "small" step some OEM handsets ship with
# 1.15 = a larger, accessibility-style setting
capture 1.0
capture 0.85
capture 1.15

echo "▸ restoring font_scale=1.0"
$D shell settings put system font_scale 1.0

echo
echo "▸ comparing against the baseline (login-1.0.png)…"
for f in "$OUT"/login-*.png; do
  base="$(basename "$f")"
  [ "$base" = "login-1.0.png" ] && continue
  python3 "$REPO_ROOT/tools/pixdiff.py" "$f" "$OUT/login-1.0.png"
done

echo "▸ done — screenshots in $OUT"
