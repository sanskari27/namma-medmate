#!/usr/bin/env bash
# Seed demo/illustration data into production RDS.
# Intended for empty or demo-only prod. Uses the same idempotent SQL as local.
#
# Run on the prod EC2 host (private reachability to RDS):
#   CONFIRM=SEED_PROD_DEMO ./scripts/seed-prod-demo.sh
#
# Demo logins (same as local docs):
#   password / PIN 123456
#   OWNER  varshmaan.sonkar@gmail.com
#   MASTER sanskarkumar85111@gmail.com
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${CONFIRM:-}" != "SEED_PROD_DEMO" ]]; then
  echo "Refusing to seed prod without CONFIRM=SEED_PROD_DEMO" >&2
  exit 2
fi

AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
ENV_FILE="${ENV_FILE:-/tmp/namma-medmate-prod.env}"

log() { printf '[seed-prod-demo] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

command -v aws >/dev/null 2>&1 || die "aws CLI required"
command -v psql >/dev/null 2>&1 || {
  log "Installing postgresql-client"
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-client
}

log "Pulling compose env from SSM"
AWS_REGION="$AWS_REGION" ./scripts/pull-prod-env.sh "$ENV_FILE"

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL missing"
[[ -n "${DATABASE_USERNAME:-}" ]] || die "DATABASE_USERNAME missing"
[[ -n "${DATABASE_PASSWORD:-}" ]] || die "DATABASE_PASSWORD missing"

# jdbc:postgresql://host:5432/db
rest="${DATABASE_URL#jdbc:postgresql://}"
hostport="${rest%%/*}"
PGDATABASE="${rest##*/}"
PGHOST="${hostport%%:*}"
PGPORT="${hostport##*:}"
PGUSER="$DATABASE_USERNAME"
export PGPASSWORD="$DATABASE_PASSWORD"

log "Waiting for Postgres ${PGHOST}:${PGPORT}/${PGDATABASE}"
for _ in $(seq 1 60); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'SELECT 1' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'SELECT 1' >/dev/null \
  || die "Cannot connect to Postgres"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c 'SELECT 1 FROM tenant LIMIT 1' >/dev/null 2>&1 \
  || die "Schema is not ready (Flyway). Deploy the API first so migrations apply."

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

rm -f "$ENV_FILE"
log "Done."
log "Pharmacy: https://pharmacy.nammamedmate.com  OWNER varshmaan.sonkar@gmail.com / password  PIN 123456"
log "Admin:    https://admin.nammamedmate.com      MASTER sanskarkumar85111@gmail.com / password"
