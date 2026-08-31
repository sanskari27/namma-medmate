#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: apply.sh <staging|prod>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/terraform/environments/$ENV"
terraform apply tfplan
