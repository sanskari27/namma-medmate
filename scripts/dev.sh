#!/usr/bin/env bash
# Host-run local stack: Compose Postgres + Redis, Spring + Vite on the host.
# Vite HMR is live. Java class/resource changes trigger DevTools restart.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-$(command -v podman >/dev/null 2>&1 && echo podman || echo docker)}"
COMPOSE="${CONTAINER_RUNTIME} compose"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"

JWT_FALLBACK='local-dev-jwt-secret-min-64-chars-for-hs512-algorithm-change-in-prod-now'

log() { printf '[dev] %s\n' "$*"; }

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-16379}"
export JWT_SECRET="${JWT_SECRET:-$JWT_FALLBACK}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8080}"

cleanup() {
  trap - INT TERM EXIT
  for job in $(jobs -p); do
    kill "$job" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

prefix() {
  local tag=$1
  shift
  "$@" 2>&1 | awk -v t="$tag" '{print "[" t "] " $0; fflush()}'
}

ensure_npm() {
  local app=$1
  if [[ ! -d "$app/node_modules" ]]; then
    log "npm ci in ${app}/"
    (cd "$app" && npm ci --no-audit --no-fund)
  fi
}

mtime_stamp() {
  find src/main/java src/main/resources -type f -print0 2>/dev/null |
    xargs -0 stat -f '%m' 2>/dev/null ||
    find src/main/java src/main/resources -type f -print0 2>/dev/null |
      xargs -0 stat -c '%Y' 2>/dev/null
}

watch_java() {
  local last now
  last=$(mtime_stamp | sort -n | tail -1 || true)
  while sleep 2; do
    now=$(mtime_stamp | sort -n | tail -1 || true)
    if [[ -n "${now:-}" && -n "${last:-}" && "$now" != "$last" ]]; then
      log "Java/resources changed — compiling"
      ./mvnw -q -DskipTests compile || log "compile failed"
    fi
    last=$now
  done
}

log "Stopping containerized apps if they hold 8080/5173/5174"
$COMPOSE -f "$COMPOSE_FILE" stop server dispensary admin >/dev/null 2>&1 || true

log "Starting Postgres + Redis"
$COMPOSE -f "$COMPOSE_FILE" up -d postgres redis

log "Waiting for Postgres"
for _ in $(seq 1 60); do
  if $COMPOSE -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres -d nammamedmate >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

ensure_npm dispensary
ensure_npm admin

(cd server && prefix server ./mvnw spring-boot:run -Dspring-boot.run.profiles=local) &
(cd server && prefix compile watch_java) &
(cd dispensary && prefix dispensary npm run dev) &
(cd admin && prefix admin npm run dev) &

log "API http://localhost:8080  |  dispensary http://localhost:5173  |  admin http://localhost:5174"
log "Ctrl-C stops the apps; Postgres/Redis stay up (make down to stop them)"

wait
