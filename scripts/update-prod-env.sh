#!/usr/bin/env bash
# Add, update, or remove a KEY=value in the SSM compose .env blob.
# Usage:
#   ./scripts/update-prod-env.sh set KEY VALUE
#   ./scripts/update-prod-env.sh unset KEY
#   ./scripts/update-prod-env.sh keys
set -euo pipefail

PARAM="${SSM_COMPOSE_ENV_PARAM:-/namma-medmate-prod/compose.env}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "usage: $0 set KEY VALUE | unset KEY | keys" >&2
  exit 2
}

valid_key() {
  [[ "$1" =~ ^[A-Z][A-Z0-9_]*$ ]]
}

dotenv_set() {
  local file="$1" key="$2" value="$3" out found=0 line
  out="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "$key="* ]]; then
      printf '%s=%s\n' "$key" "$value"
      found=1
    else
      printf '%s\n' "$line"
    fi
  done <"$file" >"$out"
  if [[ "$found" -eq 0 ]]; then
    printf '%s=%s\n' "$key" "$value" >>"$out"
  fi
  mv "$out" "$file"
}

dotenv_unset() {
  local file="$1" key="$2" out line
  out="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "$key="* ]]; then
      continue
    fi
    printf '%s\n' "$line"
  done <"$file" >"$out"
  mv "$out" "$file"
}

put_param() {
  aws ssm put-parameter \
    --region "$REGION" \
    --name "$PARAM" \
    --type SecureString \
    --overwrite \
    --value "$(cat "$1")" >/dev/null
}

cmd="${1:-}"
case "$cmd" in
  set | unset | keys) ;;
  *) usage ;;
esac

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
"$SCRIPT_DIR/pull-prod-env.sh" "$tmp" >/dev/null

case "$cmd" in
  keys)
    grep -E '^[A-Z][A-Z0-9_]*=' "$tmp" | cut -d= -f1
    ;;
  set)
    [[ $# -eq 3 ]] || usage
    valid_key "$2" || { echo "invalid key: $2" >&2; exit 2; }
    [[ "$3" != *$'\n'* ]] || { echo "value must be a single line" >&2; exit 2; }
    dotenv_set "$tmp" "$2" "$3"
    put_param "$tmp"
    echo "set $2 in ${PARAM}"
    ;;
  unset)
    [[ $# -eq 2 ]] || usage
    valid_key "$2" || { echo "invalid key: $2" >&2; exit 2; }
    dotenv_unset "$tmp" "$2"
    put_param "$tmp"
    echo "unset $2 in ${PARAM}"
    ;;
esac
