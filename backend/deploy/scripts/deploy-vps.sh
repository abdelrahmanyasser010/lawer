#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${ROOT_DIR:-/var/www/zdraft}
BACKEND_DIR=${BACKEND_DIR:-${ROOT_DIR}/backend}
FRONTEND_DIR=${FRONTEND_DIR:-${ROOT_DIR}/frontend}
DASHBOARD_DIR=${DASHBOARD_DIR:-${ROOT_DIR}/dashboard}
PHP_BIN=${PHP_BIN:-php}

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Missing ${BACKEND_DIR}/.env. Copy backend/.env.example and set real production values first." >&2
  exit 2
fi

cd "${BACKEND_DIR}"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
"${PHP_BIN}" artisan migrate --seed --force
"${PHP_BIN}" artisan config:clear
"${PHP_BIN}" artisan cache:clear
"${PHP_BIN}" artisan config:cache
"${PHP_BIN}" artisan route:cache
"${PHP_BIN}" artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

cd "${ROOT_DIR}"
npm install
npm run build:engine

if [[ -d "${FRONTEND_DIR}" ]]; then
  npm --workspace frontend run build
fi

if [[ -d "${DASHBOARD_DIR}" ]]; then
  npm --workspace zdraft-dashboard run build
fi

cd "${BACKEND_DIR}"
"${PHP_BIN}" artisan zdraft:doctor --json

systemctl restart php*-fpm || true
systemctl restart zdraft-laravel-scheduler.service || true
systemctl restart zdraft-frontend.service || true
systemctl restart zdraft-dashboard.service || true
systemctl reload nginx || true

echo "Z draft deploy finished."
