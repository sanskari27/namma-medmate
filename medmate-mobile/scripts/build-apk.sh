#!/usr/bin/env bash
# Build the MedMate APK locally (no EAS / no cloud build).
#
# Usage: ./scripts/build-apk.sh [debug|release]
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$APP_DIR/scripts/env.sh"

VARIANT="${1:-debug}"

echo "▸ building $VARIANT APK…"
cd "$APP_DIR/android"
./gradlew "assemble${VARIANT^}" --console=plain

APK="$APP_DIR/android/app/build/outputs/apk/$VARIANT/app-$VARIANT.apk"
echo
echo "▸ built: $APK"
ls -lh "$APK"

# Keep a copy next to the repo root so it is easy to grab.
cp "$APK" "$REPO_ROOT/MedMate-$(node -p "require('$APP_DIR/package.json').version")-$VARIANT.apk"
echo "▸ copied: $REPO_ROOT/MedMate-$(node -p "require('$APP_DIR/package.json').version")-$VARIANT.apk"
