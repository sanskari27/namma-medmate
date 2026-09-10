#!/usr/bin/env bash
# Install/refresh host Nginx + Let's Encrypt certs for api/pharmacy/admin.
# Run on the prod EC2 host from the repo checkout (as root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="${CERTBOT_EMAIL:-ops@nammamedmate.com}"
DOMAINS=(api.nammamedmate.com pharmacy.nammamedmate.com admin.nammamedmate.com)

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root (sudo)" >&2
  exit 2
fi

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

install -d -m 755 /var/www/certbot
rm -f /etc/nginx/sites-enabled/default

HTTP_CONF="${ROOT}/infra/nginx/namma-medmate.http.conf"
TLS_CONF="${ROOT}/infra/nginx/namma-medmate.conf"

if [[ ! -f /etc/letsencrypt/live/api.nammamedmate.com/fullchain.pem ]]; then
  install -m 644 "$HTTP_CONF" /etc/nginx/sites-available/namma-medmate.conf
  ln -sfn /etc/nginx/sites-available/namma-medmate.conf /etc/nginx/sites-enabled/namma-medmate.conf
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos -m "$EMAIL" \
    $(printf -- '-d %s ' "${DOMAINS[@]}")
fi

install -m 644 "$TLS_CONF" /etc/nginx/sites-available/namma-medmate.conf
ln -sfn /etc/nginx/sites-available/namma-medmate.conf /etc/nginx/sites-enabled/namma-medmate.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx
echo "TLS ready for ${DOMAINS[*]}"
