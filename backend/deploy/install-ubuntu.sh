#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/var/www/zdraft/backend}
PHP_VERSION=${PHP_VERSION:-8.4}
NODE_MAJOR=${NODE_MAJOR:-22}

apt-get update
apt-get install -y software-properties-common ca-certificates lsb-release apt-transport-https curl
add-apt-repository -y ppa:ondrej/php
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get update
apt-get install -y \
  nginx postgresql postgresql-contrib composer nodejs weasyprint imagemagick ghostscript clamav clamav-daemon certbot python3-certbot-nginx \
  "php${PHP_VERSION}-fpm" "php${PHP_VERSION}-cli" "php${PHP_VERSION}-pgsql" \
  "php${PHP_VERSION}-mbstring" "php${PHP_VERSION}-xml" "php${PHP_VERSION}-curl" \
  "php${PHP_VERSION}-zip" "php${PHP_VERSION}-imagick" "php${PHP_VERSION}-intl" \
  "php${PHP_VERSION}-bcmath"

mkdir -p /var/lib/zdraft/private /var/lib/zdraft/contracts /var/lib/zdraft/backups
chown -R www-data:www-data /var/lib/zdraft
chmod -R 0770 /var/lib/zdraft

cd "$APP_DIR"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

echo "Install complete. Configure .env, run migrations, build Next apps, then enable Nginx/systemd."
