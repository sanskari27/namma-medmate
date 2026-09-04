#!/usr/bin/env bash
# Spawn a fresh Cursor agent per requirement story, then format + commit.
# The process dies after each story so chat context cannot accumulate.
#
# Circuit breaker: N is required. The loop never exceeds N agent spawns,
# and it also stops on agent failure, a dirty tree, logs/STOP, or no commit.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR=logs
LOG=$LOG_DIR/story-loop.log
STOP_FILE=$LOG_DIR/STOP
PLAN_FILE=$LOG_DIR/current-story.md
AGENT_BIN="${AGENT_BIN:-}"
MODEL="${MODEL:-cursor-grok-4.6-high}"
N=""
mkdir -p "$LOG_DIR"

usage() {
  cat <<'EOF'
Spawn at most N fresh implement-next-story agents, then format and commit.

  ./scripts/story-loop.sh N
  make story-loop N=3

  N                 max agent spawns this run (required, integer >= 1)
  logs/STOP         create this file to halt before the next spawn
  AGENT_BIN         override agent binary (default: agent, then cursor-agent)
  MODEL             model id (default: cursor-grok-4.6-high). *-fast ids are refused.

Each spawn is a new process. Previous stories live only in git and the tracker.
EOF
}

log() { printf '[story-loop] %s\n' "$*" | tee -a "$LOG"; }
die() { log "ERROR: $*"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      die "unknown flag $1 (usage: $0 N)"
      ;;
    *)
      N=$1
      shift
      break
      ;;
  esac
done

[[ $# -eq 0 ]] || die "unexpected args: $*"
[[ -n "$N" ]] || { usage; exit 1; }
[[ "$N" =~ ^[1-9][0-9]*$ ]] || die "N must be an integer >= 1, got '$N'"
case "$MODEL" in
  *-fast) die "refusing $MODEL (Fast is about 2x cost). Use cursor-grok-4.6-high" ;;
esac

: >>"$LOG"

if [[ -z "$AGENT_BIN" ]]; then
  if command -v agent >/dev/null 2>&1; then
    AGENT_BIN=$(command -v agent)
  elif command -v cursor-agent >/dev/null 2>&1; then
    AGENT_BIN=$(command -v cursor-agent)
  else
    die "Cursor CLI not found. Install with: curl https://cursor.com/install -fsS | bash"
  fi
fi
command -v "$AGENT_BIN" >/dev/null 2>&1 || die "agent binary not found: $AGENT_BIN"

if [[ -n "$(git status --porcelain)" ]]; then
  die "working tree is dirty; commit or stash before starting the loop"
fi

PROMPT=$(cat <<'EOF'
Follow the implement-next-story skill exactly.

If the tracker already has a row in_progress, finish that story only.
Otherwise select the first dependency-ready story and implement it.

Write a short plan to logs/current-story.md first (story id on line 1), then build it.
Run the listed story gates and independent verification.
Do not run make format. Do not commit. Do not push. Do not start a second story.
Stop after this story is done, or after a real blocker.
EOF
)

halt() {
  log "circuit breaker: $*"
  exit 0
}

commit_story() {
  git add -A
  if git diff --cached --quiet; then
    return 1
  fi
  local story=""
  if [[ -f "$PLAN_FILE" ]]; then
    IFS= read -r story <"$PLAN_FILE" || true
  fi
  git commit -m "Complete ${story:-next requirement story}."
  return 0
}

log "max spawns N=$N model=$MODEL agent=$AGENT_BIN"
log "stop between stories with: touch $STOP_FILE"

for ((i = 1; i <= N; i++)); do
  [[ -f "$STOP_FILE" ]] && halt "stop file $STOP_FILE (spawn $i/$N skipped)"

  log "===== spawn $i/$N $(date -u +%FT%TZ) ====="
  rm -f "$PLAN_FILE"

  set +e
  "$AGENT_BIN" -p --force --trust --sandbox disabled \
    --model "$MODEL" \
    --workspace "$ROOT" \
    --output-format stream-json \
    --stream-partial-output \
    "$PROMPT" | tee -a "$LOG"
  agent_status=${PIPESTATUS[0]}
  set -e

  [[ $agent_status -eq 0 ]] || die "agent exited $agent_status on spawn $i/$N"

  log "format after spawn $i/$N"
  make format

  if ! commit_story; then
    halt "no commit after spawn $i/$N (no remaining ready story, or agent made no changes)"
  fi

  log "committed $(git rev-parse --short HEAD) ($i/$N)"
done

log "circuit breaker: reached N=$N"
exit 0
