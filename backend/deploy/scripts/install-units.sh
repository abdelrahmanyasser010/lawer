#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${ROOT_DIR:-/var/www/zdraft}
DOMAIN=${DOMAIN:-zdraft.example.com}
ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.zdraft.example.com}
API_DOMAIN=${API_DOMAIN:-api.zdraft.example.com}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

install_nginx_site() {
  local source=$1
  local target=$2
  local content
  content=$(sed \
    -e "s/api\\.zdraft\\.example\\.com/${API_DOMAIN}/g" \
    -e "s/admin\\.zdraft\\.example\\.com/${ADMIN_DOMAIN}/g" \
    -e "s/zdraft\\.example\\.com/${DOMAIN}/g" \
    "${source}")
  printf "%s\n" "${content}" > "/etc/nginx/sites-available/${target}"
  ln -sfn "/etc/nginx/sites-available/${target}" "/etc/nginx/sites-enabled/${target}"
}

install_nginx_site "${DEPLOY_DIR}/nginx/api.conf" "zdraft-api.conf"
install_nginx_site "${DEPLOY_DIR}/nginx/frontend.conf" "zdraft-frontend.conf"
install_nginx_site "${DEPLOY_DIR}/nginx/dashboard.conf" "zdraft-dashboard.conf"

cp "${DEPLOY_DIR}/systemd/zdraft-laravel-scheduler.service" /etc/systemd/system/
cp "${DEPLOY_DIR}/systemd/zdraft-frontend.service" /etc/systemd/system/
cp "${DEPLOY_DIR}/systemd/zdraft-dashboard.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable zdraft-laravel-scheduler.service zdraft-frontend.service zdraft-dashboard.service
nginx -t

echo "Units installed. Next:"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} -d ${API_DOMAIN}"
echo "  systemctl restart zdraft-laravel-scheduler zdraft-frontend zdraft-dashboard nginx"
