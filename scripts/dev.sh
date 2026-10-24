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

if command -v docker >/dev/null 2>&1 || command -v podman >/dev/null 2>&1; then
  runtime=$(command -v podman >/dev/null 2>&1 && echo podman || echo docker)
  log "Postgres on localhost:5432"
  if ! "$runtime" compose -f compose.yaml up -d postgres; then
    log "Compose Postgres did not start. The dashboard uses a database already listening on localhost:5432."
  fi
fi

log "Pharmacy dashboard http://localhost:3000"
cd namma-pharmacy && npm run dev
