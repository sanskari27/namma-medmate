#!/usr/bin/env bash
# Shared toolchain env for MedMate native builds.
#
# Resolve paths relative to this file so the scripts work from any checkout
# location (local machine, CI runner, …).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"

# --- Java -------------------------------------------------------------------
if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
elif [ -n "${JAVA_HOME:-}" ]; then
  : # already set by the caller (CI)
fi

# --- Android ----------------------------------------------------------------
if [ -z "${ANDROID_HOME:-}" ]; then
  export ANDROID_HOME="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export GRADLE_OPTS="-Dorg.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8"

# npm's global cache has bad perms on this machine; keep installs project-local
if [ -z "${npm_config_cache:-}" ]; then
  export npm_config_cache="$REPO_ROOT/tools/.npm-cache"
fi
