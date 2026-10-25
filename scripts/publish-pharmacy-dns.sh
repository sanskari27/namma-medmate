#!/usr/bin/env bash
# Point pharmacy.nammamedmate.com at this EC2 host. Run on the prod host (instance role).
set -euo pipefail

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"
NAME="pharmacy.nammamedmate.com"
ZONE_NAME="nammamedmate.com."

if ! command -v aws >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq awscli
fi
if ! command -v dig >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq dnsutils
fi

TOKEN="$(curl -fsS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")"
IP="$(curl -fsS -H "X-aws-ec2-metadata-token: ${TOKEN}" http://169.254.169.254/latest/meta-data/public-ipv4)"
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "no public IPv4 from IMDS" >&2; exit 1; }

ZONE_ID="$(aws route53 list-hosted-zones-by-name \
  --dns-name nammamedmate.com \
  --query "HostedZones[?Name=='${ZONE_NAME}' && Config.PrivateZone==\`false\`].Id | [0]" \
  --output text)"
ZONE_ID="${ZONE_ID#/hostedzone/}"
[[ -n "$ZONE_ID" && "$ZONE_ID" != "None" ]] || { echo "public hosted zone ${ZONE_NAME} not found" >&2; exit 1; }

batch="$(mktemp)"
trap 'rm -f "$batch"' EXIT
cat >"$batch" <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${NAME}",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "${IP}"}]
    }
  }]
}
EOF
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "file://${batch}" >/dev/null

NS="$(aws route53 get-hosted-zone --id "$ZONE_ID" --query 'DelegationSet.NameServers[0]' --output text)"
for _ in $(seq 1 30); do
  got="$(dig +time=2 +tries=1 +short "$NAME" A "@${NS}" | head -1 || true)"
  if [[ "$got" == "$IP" ]]; then
    echo "${NAME} -> ${IP}"
    if [[ -n "${GITHUB_ENV:-}" ]]; then
      echo "PHARMACY_PUBLIC_IP=${IP}" >>"$GITHUB_ENV"
    fi
    exit 0
  fi
  sleep 2
done
echo "authoritative DNS for ${NAME} did not return ${IP}" >&2
exit 1
