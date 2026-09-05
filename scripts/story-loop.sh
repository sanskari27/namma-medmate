#!/usr/bin/env bash
# Spawn a fresh Cursor agent per requirement story, then format + commit.
# The process dies after each story so chat context cannot accumulate.
#
# Circuit breaker: N is required. The loop never exceeds N agent spawns,
# and it also stops on agent failure, a dirty tree, logs/STOP, no commit,
# or Cursor included usage above INCLUDED_USAGE_MAX_PCT (default 40).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR=logs
LOG=$LOG_DIR/story-loop.log
STOP_FILE=$LOG_DIR/STOP
PLAN_FILE=$LOG_DIR/current-story.md
AGENT_BIN="${AGENT_BIN:-}"
MODEL="${MODEL:-cursor-grok-4.6-high}"
INCLUDED_USAGE_MAX_PCT="${INCLUDED_USAGE_MAX_PCT:-40}"
N=""
mkdir -p "$LOG_DIR"

usage() {
  cat <<'EOF'
Spawn at most N fresh implement-next-story agents, then format and commit.

  ./scripts/story-loop.sh N
  make story-loop N=3

  N                       max agent spawns this run (required, integer >= 1)
  logs/STOP               create this file to halt before the next spawn
  AGENT_BIN               override agent binary (default: agent, then cursor-agent)
  MODEL                   model id (default: cursor-grok-4.6-high). *-fast ids are refused.
  INCLUDED_USAGE_MAX_PCT  stop before spawn if included usage is above this % (default 40)

logs/story-loop.log is a compact lifecycle log (spawn, progress, verify, format).
Each spawn is a new process. Previous stories live only in git and the tracker.
EOF
}

now() { date -u +%FT%TZ; }
log() { printf '[story-loop] %s %s\n' "$(now)" "$*" | tee -a "$LOG"; }
die() { log "ERROR: $*"; exit 1; }

# Compact agent stream-json into lifecycle lines. Raw thinking/tokens are dropped.
PROGRESS_PY=$(cat <<'PY'
import json, sys
from datetime import datetime, timezone

def ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def emit(msg):
    print(f"[story-loop] {ts()} {msg}", flush=True)

def tool_payload(obj):
    tc = obj.get("tool_call") or {}
    if not isinstance(tc, dict):
        return None, None
    for key, val in tc.items():
        if key.endswith("ToolCall") and isinstance(val, dict):
            return key[: -len("ToolCall")], val
    return None, None

def short(text, n=90):
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 1] + "…"

def duration(ms):
    ms = ms or 0
    if ms >= 60000:
        return f"{round(ms / 60000)}m"
    return f"{round(ms / 1000)}s"

story_logged = False
for raw in sys.stdin:
    raw = raw.strip()
    if not raw.startswith("{"):
        continue
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        continue
    kind = obj.get("type")
    subtype = obj.get("subtype") or ""

    if kind == "system" and subtype == "init":
        emit(f"agent started model={obj.get('model') or 'unknown'}")
        continue

    if kind == "system" and subtype == "task_notification":
        status = obj.get("status") or "unknown"
        title = obj.get("title") or "task"
        detail = obj.get("detail")
        extra = f" ({detail})" if detail else ""
        emit(f"task {status}: {title}{extra}")
        continue

    if kind == "result":
        emit(f"agent finished {subtype or 'done'} in {duration(obj.get('duration_ms'))}")
        continue

    if kind != "tool_call":
        continue

    name, payload = tool_payload(obj)
    if not name:
        continue
    args = payload.get("args") or {}

    if name == "updateTodos" and subtype == "started":
        for todo in args.get("todos") or []:
            status = (todo.get("status") or "").replace("TODO_STATUS_", "").lower()
            content = todo.get("content") or todo.get("id") or "todo"
            if status == "in_progress":
                emit(f"progress: {content}")
            elif status == "completed":
                emit(f"done: {content}")
        continue

    if name == "task":
        desc = args.get("description") or "subagent"
        label = "verify" if "verify" in desc.lower() else "subagent"
        if subtype == "started":
            emit(f"{label} started: {desc}")
        elif subtype == "completed":
            emit(f"{label} finished: {desc}")
        continue

    if name == "shell" and subtype == "started":
        emit(f"running: {args.get('description') or short(args.get('command') or 'shell')}")
        continue

    if name in ("edit", "write") and subtype == "started" and not story_logged:
        path = args.get("path") or ""
        if not path.endswith("current-story.md"):
            continue
        body = args.get("streamContent") or args.get("contents") or ""
        story = (body.splitlines() or [""])[0].strip()
        if story:
            story_logged = True
            emit(f"story {story}")
PY
)

compact_progress() {
  python3 -u -c "$PROGRESS_PY"
}

USAGE_PY=$(cat <<'PY'
import json, os, sqlite3, subprocess, sys, urllib.request

def fail(msg):
    print(msg)
    sys.exit(1)

def token():
    env = (os.environ.get("CURSOR_SESSION_TOKEN") or "").strip()
    if env:
        return env
    try:
        out = subprocess.check_output(
            ["security", "find-generic-password", "-s", "cursor-access-token", "-a", "cursor-user", "-w"],
            stderr=subprocess.DEVNULL,
        )
        tok = out.decode().strip()
        if tok:
            return tok
    except (OSError, subprocess.CalledProcessError):
        pass
    home = os.path.expanduser("~")
    paths = [
        os.path.join(home, "Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        os.path.join(home, ".config/Cursor/User/globalStorage/state.vscdb"),
    ]
    appdata = os.environ.get("APPDATA")
    if appdata:
        paths.append(os.path.join(appdata, "Cursor/User/globalStorage/state.vscdb"))
    for path in paths:
        if not os.path.isfile(path):
            continue
        try:
            conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=3)
            row = conn.execute(
                "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1"
            ).fetchone()
            conn.close()
        except sqlite3.Error:
            continue
        if row and row[0]:
            return str(row[0]).strip()
    return None

limit = float(sys.argv[1])
tok = token()
if not tok:
    fail("no Cursor session token (sign in to Cursor or the agent CLI)")

req = urllib.request.Request(
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
    data=b"{}",
    headers={
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode())
except Exception as exc:
    fail(f"could not read Cursor included usage: {exc}")

plan = data.get("planUsage") if isinstance(data, dict) else None
if not isinstance(plan, dict):
    fail("Cursor usage response had no planUsage")
percent = plan.get("totalPercentUsed")
if percent is None:
    percent = plan.get("autoPercentUsed")
try:
    percent = float(percent)
except (TypeError, ValueError):
    fail("Cursor included usage percent was missing")

print(f"included usage {percent:.1f}% (stop above {limit:.0f}%)")
if percent > limit:
    sys.exit(2)
PY
)

ensure_included_usage_ok() {
  local out st
  set +e
  out=$(python3 -c "$USAGE_PY" "$INCLUDED_USAGE_MAX_PCT")
  st=$?
  set -e
  case "$st" in
    0)
      log "$out"
      ;;
    2)
      log "$out"
      halt "included usage is above ${INCLUDED_USAGE_MAX_PCT}%; not starting further agents"
      ;;
    *)
      die "${out:-could not check Cursor included usage}"
      ;;
  esac
}

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
[[ "$INCLUDED_USAGE_MAX_PCT" =~ ^[0-9]+([.][0-9]+)?$ ]] \
  || die "INCLUDED_USAGE_MAX_PCT must be a number, got '$INCLUDED_USAGE_MAX_PCT'"
case "$MODEL" in
  *-fast) die "refusing $MODEL (Fast is about 2x cost). Use cursor-grok-4.6-high" ;;
esac

: >>"$LOG"
command -v python3 >/dev/null 2>&1 || die "python3 is required"

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
log "stop before spawn if included usage is above ${INCLUDED_USAGE_MAX_PCT}%"

for ((i = 1; i <= N; i++)); do
  [[ -f "$STOP_FILE" ]] && halt "stop file $STOP_FILE (spawn $i/$N skipped)"

  ensure_included_usage_ok
  log "spawn $i/$N started"
  rm -f "$PLAN_FILE"

  set +e
  set +o pipefail
  "$AGENT_BIN" -p --force --trust --sandbox disabled \
    --model "$MODEL" \
    --workspace "$ROOT" \
    --output-format stream-json \
    --stream-partial-output \
    "$PROMPT" | compact_progress | tee -a "$LOG"
  statuses=("${PIPESTATUS[@]}")
  set -o pipefail
  set -e

  agent_status=${statuses[0]:-1}
  filter_status=${statuses[1]:-1}
  [[ $filter_status -eq 0 ]] || die "progress filter exited $filter_status on spawn $i/$N"
  [[ $agent_status -eq 0 ]] || die "agent exited $agent_status on spawn $i/$N"

  log "format started after spawn $i/$N"
  set +e
  format_out=$(make format 2>&1)
  format_status=$?
  set -e
  if [[ $format_status -ne 0 ]]; then
    printf '%s\n' "$format_out" | tee -a "$LOG"
    die "format failed after spawn $i/$N"
  fi
  log "format done after spawn $i/$N"

  if ! commit_story; then
    halt "no commit after spawn $i/$N (no remaining ready story, or agent made no changes)"
  fi

  log "committed $(git rev-parse --short HEAD) ($i/$N)"
  if ((i < N)); then
    log "next agent will spawn ($((i + 1))/$N)"
  fi
done

log "circuit breaker: reached N=$N"
exit 0
