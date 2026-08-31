#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: destroy.sh <staging|prod>}"
if [[ "${CONFIRM_DESTROY:-}" != "yes" ]]; then
  echo "Refusing to destroy. Re-run with CONFIRM_DESTROY=yes" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/terraform/environments/$ENV"
terraform destroy
