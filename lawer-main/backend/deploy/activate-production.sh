#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/var/www/zdraft/backend}
PHP_VERSION=${PHP_VERSION:-8.4}
API_DOMAIN=${API_DOMAIN:-}
RUN_TESTS=${RUN_TESTS:-1}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root (sudo)." >&2
  exit 1
fi
if [ -z "$API_DOMAIN" ]; then
  echo "Set API_DOMAIN, e.g. API_DOMAIN=api.example.com" >&2
  exit 1
fi
if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env. Copy .env.example and fill real production values first." >&2
  exit 1
fi
cd "$APP_DIR"
if grep -Eq '^APP_KEY=[[:space:]]*$' .env; then
  php artisan key:generate --force
fi
if grep -Eq '^(DB_PASSWORD=CHANGE_ME|SUPER_ADMIN_PASSWORD=CHANGE_TO_)' .env; then
  echo "Production .env still contains placeholder database/admin secrets." >&2
  exit 1
fi

php artisan optimize:clear
php artisan migrate --seed --force

if [ "$RUN_TESTS" = "1" ]; then
  # Database smoke tests deliberately stay skipped here; never point destructive/integration
  # tests at the live production database. Run them against an isolated zdraft_test DB first.
  php artisan test
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

sed "s/api\.example\.com/${API_DOMAIN}/g" "$APP_DIR/deploy/nginx/api.conf" > /etc/nginx/sites-available/zdraft-api
ln -sfn /etc/nginx/sites-available/zdraft-api /etc/nginx/sites-enabled/zdraft-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

cp "$APP_DIR/deploy/systemd/zdraft-laravel-scheduler.service" /etc/systemd/system/zdraft-laravel-scheduler.service
systemctl daemon-reload
systemctl enable --now zdraft-laravel-scheduler.service
systemctl restart "php${PHP_VERSION}-fpm"

curl -fsS "http://127.0.0.1/health" -H "Host: ${API_DOMAIN}" >/dev/null
curl -fsS "http://127.0.0.1/ready" -H "Host: ${API_DOMAIN}" >/dev/null

echo "Laravel is active behind Nginx. Next: certbot --nginx -d ${API_DOMAIN}, then run deploy/smoke-production.sh against HTTPS."
