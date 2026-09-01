#!/usr/bin/env bash
# SSM port-forward: localhost:15432 -> prod RDS :5432 via EC2 instance.
# Requires AWS CLI, Session Manager plugin, and IAM ssm:StartSession on the instance.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/clone-prod-db.env"

LOCAL_PORT="${TUNNEL_LOCAL_PORT:-15432}"
REMOTE_PORT="${TUNNEL_REMOTE_PORT:-5432}"

if [[ -f "$ENV_FILE" ]]; then
  set -a && source "$ENV_FILE" && set +a
fi

: "${EC2_INSTANCE_ID:?Set EC2_INSTANCE_ID in clone-prod-db.env}"
: "${RDS_HOST:?Set RDS_HOST in clone-prod-db.env}"

echo "[tunnel-prod-db] Forwarding 127.0.0.1:${LOCAL_PORT} -> ${RDS_HOST}:${REMOTE_PORT} via ${EC2_INSTANCE_ID}"
echo "Press Ctrl+C to stop."

exec aws ssm start-session \
  --target "$EC2_INSTANCE_ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"${RDS_HOST}\"],\"portNumber\":[\"${REMOTE_PORT}\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}"
