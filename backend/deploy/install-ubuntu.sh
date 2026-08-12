#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/var/www/zdraft/backend}
PHP_VERSION=${PHP_VERSION:-8.4}
INSTALL_DEV=${INSTALL_DEV:-1}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root (sudo)." >&2
  exit 1
fi

apt-get update
apt-get install -y software-properties-common ca-certificates lsb-release apt-transport-https curl unzip git
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y \
  nginx postgresql postgresql-contrib composer weasyprint imagemagick ghostscript clamav clamav-daemon \
  certbot python3-certbot-nginx \
  "php${PHP_VERSION}-fpm" "php${PHP_VERSION}-cli" "php${PHP_VERSION}-pgsql" \
  "php${PHP_VERSION}-mbstring" "php${PHP_VERSION}-xml" "php${PHP_VERSION}-curl" \
  "php${PHP_VERSION}-zip" "php${PHP_VERSION}-imagick" "php${PHP_VERSION}-intl" \
  "php${PHP_VERSION}-bcmath"

if [ ! -f "$APP_DIR/artisan" ]; then
  echo "Laravel backend not found at $APP_DIR. Upload the project first or set APP_DIR." >&2
  exit 1
fi

install -d -o www-data -g www-data -m 0770 \
  /var/lib/zdraft/private \
  /var/lib/zdraft/contracts \
  /var/backups/zdraft

cd "$APP_DIR"
if [ "$INSTALL_DEV" = "1" ]; then
  composer install --prefer-dist --optimize-autoloader --no-interaction
else
  composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
fi

mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache /var/lib/zdraft /var/backups/zdraft
chmod -R ug+rwX storage bootstrap/cache /var/lib/zdraft /var/backups/zdraft

php -m | grep -qi pdo_pgsql || { echo "pdo_pgsql is missing" >&2; exit 1; }
php -m | grep -qi imagick || { echo "imagick is missing" >&2; exit 1; }
php -m | grep -qi mbstring || { echo "mbstring is missing" >&2; exit 1; }
command -v weasyprint >/dev/null || { echo "weasyprint is missing" >&2; exit 1; }

echo "Base server packages are ready. Configure backend/.env, PostgreSQL and Nginx, then run deploy/activate-production.sh."
