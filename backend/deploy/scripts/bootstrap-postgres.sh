#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${DB_NAME:-zdraft}
DB_USER=${DB_USER:-zdraft}

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "Set DB_PASSWORD before running this script." >&2
  echo "Example: DB_PASSWORD='strong-password' sudo -E bash backend/deploy/scripts/bootstrap-postgres.sh" >&2
  exit 2
fi

sudo -u postgres psql <<SQL
DO
\$do\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
   ELSE
      ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$do\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

echo "PostgreSQL database is ready: ${DB_NAME} / ${DB_USER}"
