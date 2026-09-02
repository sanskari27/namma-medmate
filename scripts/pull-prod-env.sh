#!/usr/bin/env bash
# Write compose .env from SSM Parameter Store. Run on the prod EC2 host (instance role).
set -euo pipefail

PARAM="${SSM_COMPOSE_ENV_PARAM:-/namma-medmate-prod/compose.env}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
OUT="${1:-.env}"

if ! command -v aws >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq awscli
fi

umask 077
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
aws ssm get-parameter \
  --region "$REGION" \
  --name "$PARAM" \
  --with-decryption \
  --query Parameter.Value \
  --output text >"$tmp"
[[ -s "$tmp" ]] || { echo "empty SSM parameter ${PARAM}" >&2; exit 1; }
mv "$tmp" "$OUT"
trap - EXIT
echo "Wrote ${OUT} from ${PARAM}"
