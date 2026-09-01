#!/usr/bin/env bash
# Clone production PostgreSQL into local dev Postgres (compose.yaml port 25432).
# ONE-WAY: read-only pg_dump from prod; restore only into localhost.
# Config: scripts/clone-prod-db.env (gitignored — copy from .example)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/clone-prod-db.env"
CACHE_DIR="${CLONE_DB_CACHE_DIR:-${HOME}/.cache/namma-medmate-db-clone}"
PG_IMAGE="${PG_IMAGE:-docker.io/library/postgres:16-alpine}"
DUMP_PREFIX="namma-medmate-prod"
PG_USE_BACKUP_VOLUME=0
SOURCE="${SOURCE:-direct}"

SKIP_CONFIRM=false
KEEP_DUMP=false

usage() {
  cat <<'EOF'
Clone production PostgreSQL into local dev (compose postgres on :25432).

  ./scripts/clone-prod-db.sh           # confirm before overwrite
  ./scripts/clone-prod-db.sh --yes
  SOURCE=s3 ./scripts/clone-prod-db.sh # restore latest dump from S3 (no live dump)

Requires: docker or podman, scripts/clone-prod-db.env
EOF
}

log() { printf '[clone-prod-db] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

load_env() {
  [[ -f "$ENV_FILE" ]] || die "Missing ${ENV_FILE} — copy scripts/clone-prod-db.env.example"
  set -a && source "$ENV_FILE" && set +a
}

parse_database_url() {
  local jdbc_url=$1 host_var=$2 port_var=$3 db_var=$4
  local url hostport db host port
  url="${jdbc_url#jdbc:}"
  url="${url#postgresql://}"
  url="${url#postgres://}"
  [[ "$url" == *@* ]] && url="${url#*@}"
  [[ "$url" == */* ]] || die "Invalid database URL: ${jdbc_url}"
  hostport="${url%%/*}"
  db="${url#*/}"
  db="${db%%\?*}"
  if [[ "$hostport" == *:* ]]; then
    host="${hostport%%:*}"
    port="${hostport##*:}"
  else
    host="$hostport"
    port="5432"
  fi
  printf -v "$host_var" '%s' "$host"
  printf -v "$port_var" '%s' "$port"
  printf -v "$db_var" '%s' "$db"
}

apply_config() {
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-docker}"
  command -v "$CONTAINER_RUNTIME" >/dev/null 2>&1 || die "Missing ${CONTAINER_RUNTIME}"

  [[ -n "${LOCAL_DATABASE_URL:-}" ]] || die "Set LOCAL_DATABASE_URL in ${ENV_FILE}"
  LOCAL_PG_USER="${LOCAL_PG_USER:-postgres}"
  LOCAL_PG_PASSWORD="${LOCAL_PG_PASSWORD:-postgres}"

  parse_database_url "$LOCAL_DATABASE_URL" LOCAL_PG_HOST LOCAL_PG_PORT LOCAL_PG_DB

  if [[ "$LOCAL_PG_HOST" != "127.0.0.1" && "$LOCAL_PG_HOST" != "localhost" ]]; then
    die "LOCAL_DATABASE_URL must target localhost only (got ${LOCAL_PG_HOST})"
  fi
  if [[ "$LOCAL_DATABASE_URL" == *rds.amazonaws.com* ]]; then
    die "LOCAL_DATABASE_URL must not point at RDS"
  fi

  case "$CONTAINER_RUNTIME" in
    podman) PG_CONTAINER_HOST="${PG_CONTAINER_HOST:-host.containers.internal}" ;;
    docker) PG_CONTAINER_HOST="${PG_CONTAINER_HOST:-host.docker.internal}" ;;
    *) die "CONTAINER_RUNTIME must be podman or docker" ;;
  esac
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) SKIP_CONFIRM=true ;;
      --keep-dump) KEEP_DUMP=true ;;
      -h | --help) usage; exit 0 ;;
      *) die "Unknown option: $1" ;;
    esac
    shift
  done
}

container_pg_host() {
  case "$1" in
    127.0.0.1 | localhost) echo "$PG_CONTAINER_HOST" ;;
    *) echo "$1" ;;
  esac
}

pg_run() {
  local password=$1
  shift
  local -a run_args=(run --rm -e "PGPASSWORD=${password}" --add-host="${PG_CONTAINER_HOST}:host-gateway")
  if [[ "$PG_USE_BACKUP_VOLUME" == 1 ]]; then
    mkdir -p "$CACHE_DIR"
    run_args+=(-v "${CACHE_DIR}:/backup:rw")
  fi
  "${CONTAINER_RUNTIME}" "${run_args[@]}" "${PG_IMAGE}" "$@"
}

confirm_overwrite() {
  $SKIP_CONFIRM && return 0
  echo ""
  echo "This will DROP and recreate LOCAL database: ${LOCAL_PG_DB} on ${LOCAL_PG_HOST}:${LOCAL_PG_PORT}"
  echo "Production is read-only (pg_dump). Local prod data is never written back."
  read -r -p "Type 'yes' to continue: " answer
  [[ "$answer" == "yes" ]] || die "Aborted"
}

dump_from_prod() {
  [[ -n "${PROD_DATABASE_URL:-}" ]] || die "Set PROD_DATABASE_URL (use tunnel localhost:15432)"
  [[ -n "${PROD_PG_PASSWORD:-}" ]] || die "Set PROD_PG_PASSWORD"
  PROD_PG_USER="${PROD_PG_USER:-nammamedmate}"
  parse_database_url "$PROD_DATABASE_URL" PROD_PG_HOST PROD_PG_PORT PROD_PG_DB
  local dprod
  dprod="$(container_pg_host "$PROD_PG_HOST")"
  log "Dumping production (read-only)..."
  pg_run "$PROD_PG_PASSWORD" psql -h "$dprod" -p "$PROD_PG_PORT" -U "$PROD_PG_USER" -d "$PROD_PG_DB" \
    -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null || die "Cannot connect to production"
  PG_USE_BACKUP_VOLUME=1
  pg_run "$PROD_PG_PASSWORD" pg_dump \
    -h "$dprod" -p "$PROD_PG_PORT" -U "$PROD_PG_USER" -d "$PROD_PG_DB" \
    --format=custom --no-owner --no-acl -f "/backup/${dump_name}"
}

fetch_from_s3() {
  [[ -n "${S3_DUMP_BUCKET:-}" ]] || die "Set S3_DUMP_BUCKET for SOURCE=s3"
  command -v aws >/dev/null 2>&1 || die "aws CLI required for SOURCE=s3"
  mkdir -p "$CACHE_DIR"
  local key
  key=$(aws s3api list-objects-v2 --bucket "$S3_DUMP_BUCKET" --prefix "${DUMP_PREFIX}-" \
    --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)
  [[ "$key" != "None" && -n "$key" ]] || die "No dumps found in s3://${S3_DUMP_BUCKET}/"
  aws s3 cp "s3://${S3_DUMP_BUCKET}/${key}" "${CACHE_DIR}/${dump_name}"
  log "Downloaded s3://${S3_DUMP_BUCKET}/${key}"
}

restore_local() {
  local dlocal
  dlocal="$(container_pg_host "$LOCAL_PG_HOST")"
  log "Checking local Postgres..."
  pg_run "$LOCAL_PG_PASSWORD" psql -h "$dlocal" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -d postgres \
    -c 'SELECT 1' >/dev/null || die "Local Postgres not up — run: make deps"

  confirm_overwrite

  log "Recreating local database..."
  pg_run "$LOCAL_PG_PASSWORD" psql -h "$dlocal" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -d postgres -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${LOCAL_PG_DB}' AND pid <> pg_backend_pid();"
  pg_run "$LOCAL_PG_PASSWORD" psql -h "$dlocal" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS ${LOCAL_PG_DB};" \
    -c "CREATE DATABASE ${LOCAL_PG_DB} OWNER ${LOCAL_PG_USER};"

  log "Restoring..."
  PG_USE_BACKUP_VOLUME=1
  pg_run "$LOCAL_PG_PASSWORD" pg_restore \
    -h "$dlocal" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -d "$LOCAL_PG_DB" \
    --no-owner --no-acl "/backup/${dump_name}"
}

main() {
  parse_args "$@"
  load_env
  apply_config

  stamp="$(date +%Y%m%d-%H%M%S)"
  dump_name="${DUMP_PREFIX}-${stamp}.dump"
  dump_file="${CACHE_DIR}/${dump_name}"

  "${CONTAINER_RUNTIME}" pull -q "${PG_IMAGE}" >/dev/null 2>&1 || true

  if [[ "$SOURCE" == "s3" ]]; then
    fetch_from_s3
  else
    dump_from_prod
    log "Dump: ${dump_file}"
  fi

  restore_local

  if ! $KEEP_DUMP && [[ "$SOURCE" != "s3" ]]; then
    rm -f "$dump_file"
  fi

  log "Done (${stamp}). Redis and file storage are not cloned."
}

main "$@"
