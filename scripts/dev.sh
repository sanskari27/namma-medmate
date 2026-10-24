#!/usr/bin/env bash
# Host-run pharmacy dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '[dev] %s\n' "$*"; }

if [[ ! -d namma-pharmacy/node_modules ]]; then
  log "npm ci in namma-pharmacy/"
  (cd namma-pharmacy && npm ci --no-audit --no-fund)
fi

log "Pharmacy dashboard http://localhost:3000"
cd namma-pharmacy && npm run dev
