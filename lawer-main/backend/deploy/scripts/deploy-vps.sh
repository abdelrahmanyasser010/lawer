#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR=${BACKEND_DIR:-/home/abdo2/htdocs/api.zdraft.tech}
PHP_BIN=${PHP_BIN:-php}
APP_USER=${APP_USER:-abdo2}
APP_GROUP=${APP_GROUP:-${APP_USER}}
SCHEDULER_UNIT_SOURCE=${SCHEDULER_UNIT_SOURCE:-${BACKEND_DIR}/deploy/systemd/zdraft-laravel-scheduler.service}
SCHEDULER_UNIT_TARGET=${SCHEDULER_UNIT_TARGET:-/etc/systemd/system/zdraft-laravel-scheduler.service}

ensure_laravel_scheduler() {
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "systemctl is required for VPS production scheduler supervision." >&2
    exit 3
  fi

  if [[ ! -f "${SCHEDULER_UNIT_SOURCE}" ]]; then
    echo "Missing scheduler unit: ${SCHEDULER_UNIT_SOURCE}" >&2
    exit 3
  fi

  local php_path
  php_path=$(command -v "${PHP_BIN}")
  sed \
    -e "s#^User=.*#User=${APP_USER}#" \
    -e "s#^Group=.*#Group=${APP_GROUP}#" \
    -e "s#^WorkingDirectory=.*#WorkingDirectory=${BACKEND_DIR}#" \
    -e "s#^ExecStart=.*#ExecStart=${php_path} artisan schedule:work#" \
    "${SCHEDULER_UNIT_SOURCE}" > "${SCHEDULER_UNIT_TARGET}"
  systemctl daemon-reload
  systemctl enable --now zdraft-laravel-scheduler.service
  systemctl restart zdraft-laravel-scheduler.service
  systemctl is-active --quiet zdraft-laravel-scheduler.service
}

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Missing ${BACKEND_DIR}/.env. Copy backend/.env.example and set real production values first." >&2
  exit 2
fi

cd "${BACKEND_DIR}"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
"${PHP_BIN}" artisan migrate --force
"${PHP_BIN}" artisan config:clear
"${PHP_BIN}" artisan cache:clear
"${PHP_BIN}" artisan config:cache
"${PHP_BIN}" artisan route:cache
"${PHP_BIN}" artisan view:cache
chown -R "${APP_USER}:${APP_GROUP}" storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

"${PHP_BIN}" artisan list --raw | grep -F "zdraft:process-outbox" >/dev/null
"${PHP_BIN}" artisan schedule:list | grep -F "zdraft:process-outbox" >/dev/null
"${PHP_BIN}" artisan zdraft:doctor --json

ensure_laravel_scheduler
systemctl restart php*-fpm || true
systemctl reload nginx || true

echo "Z draft backend deploy finished."
