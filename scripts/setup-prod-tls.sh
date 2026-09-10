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

install -d -m 755 /var/www/certbot /etc/letsencrypt
rm -f /etc/nginx/sites-enabled/default

# Certbot nginx plugin usually ships these; ensure they exist before TLS vhost.
if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  cat >/etc/letsencrypt/options-ssl-nginx.conf <<'SSL'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384";
SSL
fi
if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

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
