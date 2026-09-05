#!/usr/bin/env bash
# Local-only Flyway checksum helper for compose Postgres (:25432).
# Use when Spring fails with "Migration checksum mismatch".
# Never points at RDS. Does not edit committed migrations.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MIG_DIR="$ROOT/server/src/main/resources/db/migration"
CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-$(command -v podman >/dev/null 2>&1 && echo podman || echo docker)}"
COMPOSE="${CONTAINER_RUNTIME} compose"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
PG_DB="${PG_DB:-nammamedmate}"
PG_USER="${PG_USER:-postgres}"
SKIP_CONFIRM=false
CMD=""
VERSION=""

usage() {
  cat <<'EOF'
Fix Flyway checksum mismatch on local compose Postgres (:25432) only.

  ./scripts/flyway-local-fix.sh              # show applied vs local checksums
  ./scripts/flyway-local-fix.sh repair       # update history checksums (schema already matches)
  ./scripts/flyway-local-fix.sh replay       # drop objects from the latest version and re-apply
  ./scripts/flyway-local-fix.sh replay 38    # replay this version through latest
  ./scripts/flyway-local-fix.sh --yes replay

repair  = checksum in flyway_schema_history only. Use when the SQL edit was
          whitespace/comments and the schema is already correct.
replay  = DROP TABLE/INDEX created by that version, delete its history row,
          then the next `make dev` re-applies the current file. Use when you
          edited an unpublished local migration after it had already run.

Shipped migrations stay immutable — add V(n+1) instead of editing them.
EOF
}

log() { printf '[flyway-local-fix] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h | --help) usage; exit 0 ;;
      --yes) SKIP_CONFIRM=true ;;
      status | repair | replay)
        [[ -z "$CMD" ]] || die "Specify one command"
        CMD=$1
        ;;
      [0-9]*) VERSION=$1 ;;
      *) die "Unknown argument: $1" ;;
    esac
    shift
  done
  CMD="${CMD:-status}"
}

load_env() {
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
  PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
  if [[ "${DATABASE_URL:-}" == *rds.amazonaws.com* ]]; then
    die "DATABASE_URL points at RDS — refused"
  fi
}

ensure_local_postgres() {
  command -v "$CONTAINER_RUNTIME" >/dev/null 2>&1 || die "Missing ${CONTAINER_RUNTIME}"
  command -v python3 >/dev/null 2>&1 || die "python3 is required"
  [[ -d "$MIG_DIR" ]] || die "Missing ${MIG_DIR}"
  $COMPOSE -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1 \
    || die "Local Postgres not ready — run: make deps"
}

psql_db() {
  $COMPOSE -f "$COMPOSE_FILE" exec -T -e "PGPASSWORD=${PG_PASSWORD}" postgres \
    psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 -At "$@"
}

mig_file() {
  local version=$1
  local match
  match=$(compgen -G "${MIG_DIR}/V${version}__*.sql" || true)
  [[ -n "$match" ]] || die "No migration file for version ${version}"
  printf '%s\n' $match | head -n1
}

python_mig() {
  python3 - "$MIG_DIR" "$@" <<'PY'
import pathlib, re, sys, zlib

mig_dir = pathlib.Path(sys.argv[1])
mode = sys.argv[2]

def checksum(path: pathlib.Path) -> int:
    text = path.read_bytes()
    if text.startswith(b"\xef\xbb\xbf"):
        text = text[3:]
    lines = text.decode("utf-8").splitlines()
    if lines and lines[0].startswith("\ufeff"):
        lines[0] = lines[0][1:]
    crc = 0
    for line in lines:
        crc = zlib.crc32(line.encode("utf-8"), crc)
    crc &= 0xFFFFFFFF
    return crc - 0x100000000 if crc >= 0x80000000 else crc

def version_of(path: pathlib.Path) -> str:
    return path.name.split("__", 1)[0][1:]

def files():
    return sorted(mig_dir.glob("V*__*.sql"), key=lambda p: int(version_of(p)))

CREATE_TABLE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)",
    re.I,
)
CREATE_INDEX = re.compile(
    r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+ON\s+([a-zA-Z_][a-zA-Z0-9_]*)",
    re.I,
)

if mode == "checksum":
    print(checksum(pathlib.Path(sys.argv[3])))
elif mode == "drops":
    versions = [int(v) for v in sys.argv[3].split(",") if v]
    earlier = set()
    tables, indexes = [], []
    for path in files():
        v = int(version_of(path))
        sql = path.read_text()
        if v < min(versions):
            earlier.update(CREATE_TABLE.findall(sql))
            continue
        if v not in versions:
            continue
        for name in CREATE_TABLE.findall(sql):
            if name not in earlier:
                tables.append(name)
        for name, table in CREATE_INDEX.findall(sql):
            if table in earlier:
                indexes.append(name)
    print("tables\t" + ",".join(tables))
    print("indexes\t" + ",".join(indexes))
else:
    sys.exit("unknown mode")
PY
}

applied_rows() {
  psql_db -c "SELECT version || E'\t' || COALESCE(checksum::text, '') FROM flyway_schema_history WHERE success AND version ~ '^[0-9]+$' ORDER BY installed_rank;" 2>/dev/null
}

confirm() {
  $SKIP_CONFIRM && return 0
  echo ""
  echo "$*"
  read -r -p "Type 'yes' to continue: " answer
  [[ "$answer" == "yes" ]] || die "Aborted"
}

cmd_status() {
  local mismatch=0
  local latest=""
  log "Database ${PG_DB}  (compose Postgres only)"
  printf '%-8s %-14s %-14s %s\n' "VERSION" "APPLIED" "LOCAL" "FILE"
  while IFS=$'\t' read -r version applied; do
    [[ -n "$version" ]] || continue
    latest=$version
    local file local_sum
    file=$(mig_file "$version")
    local_sum=$(python_mig checksum "$file")
    local mark=""
    if [[ "$applied" != "$local_sum" ]]; then
      mark="MISMATCH"
      mismatch=$((mismatch + 1))
    fi
    printf '%-8s %-14s %-14s %s\n' "$version" "${applied:--}" "$local_sum" "${mark}"
  done < <(applied_rows)
  echo ""
  if [[ $mismatch -eq 0 ]]; then
    log "Checksums match."
  else
    log "${mismatch} mismatch(es). Edited unpublished SQL after it ran:  $0 --yes replay"
    log "Whitespace-only change and schema already matches:           $0 --yes repair"
    log "Shipped migration: add V$((latest + 1)) instead of editing the old file."
    return 1
  fi
}

mismatched_versions() {
  while IFS=$'\t' read -r version applied; do
    [[ -n "$version" ]] || continue
    local file local_sum
    file=$(mig_file "$version")
    local_sum=$(python_mig checksum "$file")
    if [[ "$applied" != "$local_sum" ]]; then
      printf '%s\n' "$version"
    fi
  done < <(applied_rows)
}

latest_applied() {
  applied_rows | tail -n1 | cut -f1
}

cmd_repair() {
  local versions
  if [[ -n "$VERSION" ]]; then
    versions=$VERSION
  else
    versions=$(mismatched_versions | paste -sd, -)
  fi
  [[ -n "$versions" ]] || { log "Nothing to repair."; return 0; }
  confirm "Update flyway_schema_history checksums for version(s) ${versions} on local ${PG_DB}?"
  IFS=',' read -r -a arr <<< "$versions"
  for version in "${arr[@]}"; do
    local file sum
    file=$(mig_file "$version")
    sum=$(python_mig checksum "$file")
    psql_db -c "UPDATE flyway_schema_history SET checksum = ${sum} WHERE version = '${version}' AND success;" >/dev/null
    log "Repaired V${version} checksum -> ${sum}"
  done
  log "Restart the API (make dev / make backend)."
}

cmd_replay() {
  local start latest
  latest=$(latest_applied)
  [[ -n "$latest" ]] || die "No applied Flyway versions"
  start="${VERSION:-$latest}"
  [[ "$start" =~ ^[0-9]+$ ]] || die "Version must be an integer"
  (( start <= latest )) || die "V${start} is not applied (latest is V${latest})"

  local versions=""
  local v
  for ((v = start; v <= latest; v++)); do
    versions="${versions:+$versions,}$v"
  done

  local drops tables indexes
  drops=$(python_mig drops "$versions")
  tables=$(printf '%s\n' "$drops" | awk -F'\t' '/^tables/{print $2}')
  indexes=$(printf '%s\n' "$drops" | awk -F'\t' '/^indexes/{print $2}')

  echo "Will delete flyway_schema_history from V${start} through V${latest}"
  echo "DROP TABLE IF EXISTS (new in those versions): ${tables:-<none>}"
  echo "DROP INDEX IF EXISTS: ${indexes:-<none>}"
  confirm "Replay V${start}..V${latest} on local ${PG_DB}? Data in those tables is lost."

  local sql="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PG_DB}' AND pid <> pg_backend_pid();"
  if [[ -n "$tables" ]]; then
    sql+=" DROP TABLE IF EXISTS ${tables} CASCADE;"
  fi
  if [[ -n "$indexes" ]]; then
    local idx
    IFS=',' read -r -a idx_arr <<< "$indexes"
    for idx in "${idx_arr[@]}"; do
      sql+=" DROP INDEX IF EXISTS ${idx};"
    done
  fi
  sql+=" DELETE FROM flyway_schema_history WHERE version ~ '^[0-9]+\$' AND version::int >= ${start};"
  psql_db -c "$sql" >/dev/null
  log "Cleared V${start}..V${latest}. Restart the API so Flyway re-applies (make dev / make backend)."
}

parse_args "$@"
load_env
ensure_local_postgres
case "$CMD" in
  status) cmd_status ;;
  repair) cmd_repair ;;
  replay) cmd_replay ;;
esac
