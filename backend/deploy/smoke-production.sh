#!/usr/bin/env bash
set -euo pipefail
BASE_URL=${BASE_URL:-}
if [ -z "$BASE_URL" ]; then
  echo "Set BASE_URL, e.g. BASE_URL=https://api.example.com" >&2
  exit 1
fi
BASE_URL=${BASE_URL%/}
for path in /health /ready /api/v1/catalog /api/v1/templates; do
  echo "Checking ${BASE_URL}${path}"
  curl --fail --silent --show-error --location --max-time 20 "${BASE_URL}${path}" >/dev/null
done
echo "Public production smoke checks passed."
