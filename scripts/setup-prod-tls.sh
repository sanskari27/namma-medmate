#!/usr/bin/env bash
# Install/refresh host Nginx + Let's Encrypt for the public site and pharmacy app.
# Run on the prod EC2 host from the repo checkout (as root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="${CERTBOT_EMAIL:-ops@nammamedmate.com}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root (sudo)" >&2
  exit 2
fi

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

install -d -m 755 /var/www/certbot /etc/letsencrypt
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/namma-medmate.conf

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
  openssl dhparam -dsaparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

install_site() {
  local cert="$1" conf_name="$2" http="$3" tls="$4"
  if [[ -f "/etc/letsencrypt/live/${cert}/fullchain.pem" ]]; then
    install -m 644 "$tls" "/etc/nginx/sites-available/${conf_name}"
  else
    install -m 644 "$http" "/etc/nginx/sites-available/${conf_name}"
  fi
  ln -sfn "/etc/nginx/sites-available/${conf_name}" "/etc/nginx/sites-enabled/${conf_name}"
}

issue_site() {
  local cert="$1" conf_name="$2" http="$3" tls="$4"
  shift 4
  local domains=("$@")
  if [[ -f "/etc/letsencrypt/live/${cert}/fullchain.pem" ]]; then
    return 0
  fi
  if certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos -m "$EMAIL" \
    --cert-name "$cert" \
    $(printf -- '-d %s ' "${domains[@]}"); then
    install -m 644 "$tls" "/etc/nginx/sites-available/${conf_name}"
    ln -sfn "/etc/nginx/sites-available/${conf_name}" "/etc/nginx/sites-enabled/${conf_name}"
    echo "TLS ready for ${domains[*]} (cert ${cert})"
  else
    echo "WARNING: certificate not issued for ${domains[*]}." >&2
    echo "Confirm the DNS A record reaches this host, then re-run this script." >&2
    return 1
  fi
}

install_site \
  "${WEBSITE_CERTBOT_CERT_NAME:-medmate-pharmacy}" medmate-website.conf \
  "${ROOT}/infra/nginx/medmate-website.http.conf" \
  "${ROOT}/infra/nginx/medmate-website.conf"
install_site \
  "${PHARMACY_CERTBOT_CERT_NAME:-namma-pharmacy}" pharmacy.conf \
  "${ROOT}/infra/nginx/pharmacy.http.conf" \
  "${ROOT}/infra/nginx/pharmacy.conf"

nginx -t
systemctl enable --now nginx
systemctl reload nginx

issue_site \
  "${WEBSITE_CERTBOT_CERT_NAME:-medmate-pharmacy}" medmate-website.conf \
  "${ROOT}/infra/nginx/medmate-website.http.conf" \
  "${ROOT}/infra/nginx/medmate-website.conf" \
  medmatepharmacy.com www.medmatepharmacy.com || true
issue_site \
  "${PHARMACY_CERTBOT_CERT_NAME:-namma-pharmacy}" pharmacy.conf \
  "${ROOT}/infra/nginx/pharmacy.http.conf" \
  "${ROOT}/infra/nginx/pharmacy.conf" \
  pharmacy.nammamedmate.com

nginx -t
systemctl reload nginx
