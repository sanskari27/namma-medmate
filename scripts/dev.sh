#!/usr/bin/env bash
# Host-run local stack: Compose Postgres + Redis, Spring + Vite on the host.
# Vite HMR is live. Spring DevTools restarts when the IDE/Maven writes classes.
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
(cd dispensary && prefix dispensary npm run dev) &
(cd admin && prefix admin npm run dev) &

log "API http://localhost:8080  |  dispensary http://localhost:5173  |  admin http://localhost:5174"
log "Ctrl-C stops the apps; Postgres/Redis stay up (make down to stop them)"

wait
