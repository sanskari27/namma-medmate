#!/usr/bin/env bash
# Local-only seed. Never run against RDS / production.
# Requires Flyway-applied schema on compose Postgres (:25432).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-25432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-nammamedmate}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

log() { printf '[seed-local] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

command -v psql >/dev/null 2>&1 || die "psql is required"

log "Waiting for Postgres ${PGHOST}:${PGPORT}/${PGDATABASE}"
for _ in $(seq 1 60); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'SELECT 1' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'SELECT 1 FROM tenant LIMIT 1' >/dev/null 2>&1 \
  || die "Schema is not ready. Start the local stack so Flyway can apply (make dev / make up / make backend)."

log "Seeding accounts + demo data (idempotent)"
psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  -f "$ROOT/scripts/seed-local-accounts.sql" \
  -f "$ROOT/scripts/seed-local-demo/00-helpers.sql" \
  -f "$ROOT/scripts/seed-local-demo/10-org.sql" \
  -f "$ROOT/scripts/seed-local-demo/20-catalog.sql" \
  -f "$ROOT/scripts/seed-local-demo/30-customers.sql" \
  -f "$ROOT/scripts/seed-local-demo/40-stock.sql" \
  -f "$ROOT/scripts/seed-local-demo/50-procurement.sql" \
  -f "$ROOT/scripts/seed-local-demo/60-sales.sql" \
  -f "$ROOT/scripts/seed-local-demo/70-finance-comms.sql" \
  -f "$ROOT/scripts/seed-local-demo/80-hq.sql" \
  -f "$ROOT/scripts/seed-local-demo/90-checks.sql"

log "Done. Dispensary OWNER varshmaan.sonkar@gmail.com / password  PIN 123456"
log "Plan is PRO. Extra staff: pharmacist@ / inventory@ / accountant@ varshmaan.local"
