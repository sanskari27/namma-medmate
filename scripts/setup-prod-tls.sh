#!/usr/bin/env bash
# Install/refresh host Nginx + Let's Encrypt certs for api/pharmacy/admin
# and the public site (medmatepharmacy.com).
# Run on the prod EC2 host from the repo checkout (as root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="${CERTBOT_EMAIL:-ops@nammamedmate.com}"
CERT_NAME="${CERTBOT_CERT_NAME:-namma-medmate}"
DOMAINS=(api.nammamedmate.com pharmacy.nammamedmate.com admin.nammamedmate.com)
WEBSITE_CERT="${WEBSITE_CERTBOT_CERT_NAME:-medmate-pharmacy}"
WEBSITE_DOMAINS=(medmatepharmacy.com www.medmatepharmacy.com)
WEBSITE_HTTP="${ROOT}/infra/nginx/medmate-website.http.conf"
WEBSITE_TLS="${ROOT}/infra/nginx/medmate-website.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root (sudo)" >&2
  exit 2
fi

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

install -d -m 755 /var/www/certbot /etc/letsencrypt
rm -f /etc/nginx/sites-enabled/default

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
  # Fast enough for first boot; rotate later if desired.
  openssl dhparam -dsaparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

HTTP_CONF="${ROOT}/infra/nginx/namma-medmate.http.conf"
TLS_CONF="${ROOT}/infra/nginx/namma-medmate.conf"

install -m 644 "$HTTP_CONF" /etc/nginx/sites-available/namma-medmate.conf
ln -sfn /etc/nginx/sites-available/namma-medmate.conf /etc/nginx/sites-enabled/namma-medmate.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if [[ ! -f "/etc/letsencrypt/live/${CERT_NAME}/fullchain.pem" ]]; then
  certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos -m "$EMAIL" \
    --cert-name "$CERT_NAME" \
    $(printf -- '-d %s ' "${DOMAINS[@]}")
fi

install -m 644 "$TLS_CONF" /etc/nginx/sites-available/namma-medmate.conf
ln -sfn /etc/nginx/sites-available/namma-medmate.conf /etc/nginx/sites-enabled/namma-medmate.conf

if [[ -f "/etc/letsencrypt/live/${WEBSITE_CERT}/fullchain.pem" ]]; then
  install -m 644 "$WEBSITE_TLS" /etc/nginx/sites-available/medmate-website.conf
else
  install -m 644 "$WEBSITE_HTTP" /etc/nginx/sites-available/medmate-website.conf
fi
ln -sfn /etc/nginx/sites-available/medmate-website.conf /etc/nginx/sites-enabled/medmate-website.conf
nginx -t
systemctl reload nginx
echo "TLS ready for ${DOMAINS[*]} (cert ${CERT_NAME})"

if [[ ! -f "/etc/letsencrypt/live/${WEBSITE_CERT}/fullchain.pem" ]]; then
  if certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos -m "$EMAIL" \
    --cert-name "$WEBSITE_CERT" \
    $(printf -- '-d %s ' "${WEBSITE_DOMAINS[@]}"); then
    install -m 644 "$WEBSITE_TLS" /etc/nginx/sites-available/medmate-website.conf
    ln -sfn /etc/nginx/sites-available/medmate-website.conf /etc/nginx/sites-enabled/medmate-website.conf
    nginx -t
    systemctl reload nginx
    echo "TLS ready for ${WEBSITE_DOMAINS[*]} (cert ${WEBSITE_CERT})"
  else
    echo "WARNING: certificate not issued for ${WEBSITE_DOMAINS[*]}." >&2
    echo "At GoDaddy, set medmatepharmacy.com nameservers to the Route 53 hosted zone, then re-run this script." >&2
  fi
fi
