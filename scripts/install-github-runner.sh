#!/usr/bin/env bash
# Install a persistent GitHub Actions runner labeled deploy-prod on the prod EC2 host.
# Usage (on the host, as root or with sudo):
#   RUNNER_TOKEN=... ./scripts/install-github-runner.sh
# Token: gh api -X POST repos/OWNER/REPO/actions/runners/registration-token --jq .token
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/sanskari27/namma-medmate}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
RUNNER_USER="${RUNNER_USER:-ubuntu}"
LABELS="${RUNNER_LABELS:-self-hosted,deploy-prod,linux,x64}"

if [[ -z "${RUNNER_TOKEN:-}" ]]; then
  echo "RUNNER_TOKEN is required" >&2
  exit 2
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root (sudo)" >&2
  exit 2
fi

apt-get update -qq
apt-get install -y -qq curl tar jq

install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ ! -x ./config.sh ]]; then
  latest=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name)
  ver="${latest#v}"
  curl -fsSL -o actions-runner.tar.gz \
    "https://github.com/actions/runner/releases/download/${latest}/actions-runner-linux-x64-${ver}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm -f actions-runner.tar.gz
  chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"
fi

if [[ ! -f .runner ]]; then
  sudo -u "$RUNNER_USER" ./config.sh --unattended \
    --url "$REPO_URL" \
    --token "$RUNNER_TOKEN" \
    --name "namma-medmate-prod" \
    --labels "$LABELS" \
    --work _work \
    --replace
fi

./svc.sh install "$RUNNER_USER"
./svc.sh start
./svc.sh status
echo "Runner installed at ${RUNNER_DIR} with labels ${LABELS}"
