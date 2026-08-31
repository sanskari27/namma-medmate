#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: plan.sh <staging|prod>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/terraform/environments/$ENV"
terraform init -backend-config=backend.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -out=tfplan
