#!/usr/bin/env bash
# Install the APK on the local emulator, launch it, and pull a screenshot.
# Usage: ./scripts/screenshot.sh [out-name] [apk-path]
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$APP_DIR/scripts/env.sh"

SERIAL="${SERIAL:-emulator-5554}"
PKG="com.nammamedmate.customer"
APK="${2:-$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk}"
OUT_DIR="${OUT_DIR:-$REPO_ROOT/_ref/device}"
NAME="${1:-screen}"
mkdir -p "$OUT_DIR"

echo "▸ installing $APK…"
adb -s "$SERIAL" install -r -d "$APK" | tail -2

echo "▸ launching…"
adb -s "$SERIAL" shell am force-stop "$PKG" || true
adb -s "$SERIAL" shell am start -n "$PKG/.MainActivity" >/dev/null
sleep 6

adb -s "$SERIAL" exec-out screencap -p > "$OUT_DIR/$NAME.png"
echo "▸ screenshot -> $OUT_DIR/$NAME.png"
