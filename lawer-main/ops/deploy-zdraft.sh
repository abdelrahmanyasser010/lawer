#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO=${SOURCE_REPO:-/home/deploy/zdraft}
BRANCH=${BRANCH:-main}
DEPLOY_SCOPE=${DEPLOY_SCOPE:-auto}

FRONTEND_DIR=${FRONTEND_DIR:-/home/abdo/htdocs/zdraft.tech}
FRONTEND_USER=${FRONTEND_USER:-abdo}
FRONTEND_SERVICE=${FRONTEND_SERVICE:-zdraft-frontend.service}

DASHBOARD_DIR=${DASHBOARD_DIR:-/home/abdo1/htdocs/dashboard.zdraft.tech}
DASHBOARD_USER=${DASHBOARD_USER:-abdo1}
DASHBOARD_SERVICE=${DASHBOARD_SERVICE:-zdraft-dashboard.service}

BACKEND_DIR=${BACKEND_DIR:-/home/abdo2/htdocs/api.zdraft.tech}
BACKEND_USER=${BACKEND_USER:-abdo2}
BACKEND_GROUP=${BACKEND_GROUP:-${BACKEND_USER}}
PHP_BIN=${PHP_BIN:-php}

LOCK_FILE=${LOCK_FILE:-/var/lock/zdraft-deploy.lock}
CHANGED_FILES=""

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this orchestrator with sudo/root so it can sync owned htdocs paths and manage systemd." >&2
    exit 1
  fi
}

run_as() {
  local user=$1
  shift
  if [[ "$(id -un)" == "${user}" ]]; then
    "$@"
  else
    sudo -H -u "${user}" "$@"
  fi
}

pull_source() {
  if [[ ! -d "${SOURCE_REPO}/.git" ]]; then
    echo "Missing source repository at ${SOURCE_REPO}" >&2
    exit 2
  fi

  cd "${SOURCE_REPO}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"

  local before after
  before=$(git rev-parse HEAD)
  git pull --ff-only origin "${BRANCH}"
  after=$(git rev-parse HEAD)

  CHANGED_FILES=$(mktemp)
  if [[ "${before}" != "${after}" ]]; then
    git diff --name-only "${before}" "${after}" > "${CHANGED_FILES}"
    log "Updated ${BRANCH}: ${before}..${after}"
  else
    : > "${CHANGED_FILES}"
    log "Source repository already up to date at ${after}"
  fi
}

scope_includes() {
  local component=$1
  case "${DEPLOY_SCOPE}" in
    all) return 0 ;;
    "${component}") return 0 ;;
    auto) return 1 ;;
    *)
      echo "Invalid DEPLOY_SCOPE=${DEPLOY_SCOPE}. Use auto, all, frontend, dashboard, or backend." >&2
      exit 2
      ;;
  esac
}

changed_matches() {
  local pattern=$1
  [[ -n "${CHANGED_FILES}" ]] && grep -Eq "${pattern}" "${CHANGED_FILES}"
}

should_deploy_frontend() {
  scope_includes frontend || changed_matches '^(frontend/|packages/|package\.json|package-lock\.json)$'
}

should_deploy_dashboard() {
  scope_includes dashboard || changed_matches '^(dashboard/|packages/|package\.json|package-lock\.json)$'
}

should_deploy_backend() {
  scope_includes backend || changed_matches '^(backend/|ops/deploy-zdraft\.sh)$'
}

sync_tree() {
  local source_dir=$1
  local target_dir=$2
  local owner=$3

  install -d -o "${owner}" -g "${owner}" "${target_dir}"
  rsync -a --delete \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    --exclude='node_modules/' \
    --exclude='storage/' \
    --exclude='bootstrap/cache/' \
    "${source_dir}/" "${target_dir}/"
  chown -R "${owner}:${owner}" "${target_dir}"
}

sync_packages_next_to() {
  local target_dir=$1
  local owner=$2
  local parent_dir
  parent_dir=$(dirname "${target_dir}")

  install -d -o "${owner}" -g "${owner}" "${parent_dir}/packages"
  rsync -a --delete "${SOURCE_REPO}/packages/" "${parent_dir}/packages/"
  chown -R "${owner}:${owner}" "${parent_dir}/packages"
}

deploy_next_app() {
  local source_name=$1
  local target_dir=$2
  local owner=$3
  local service=$4

  log "Deploying ${source_name} to ${target_dir}"
  sync_tree "${SOURCE_REPO}/${source_name}" "${target_dir}" "${owner}"
  sync_packages_next_to "${target_dir}" "${owner}"
  run_as "${owner}" bash -lc "cd '${target_dir}' && npm install --no-audit --no-fund && npm run build"
  systemctl restart "${service}"
  systemctl is-active --quiet "${service}"
}

deploy_backend() {
  log "Deploying backend to ${BACKEND_DIR}"
  sync_tree "${SOURCE_REPO}/backend" "${BACKEND_DIR}" "${BACKEND_USER}"
  BACKEND_DIR="${BACKEND_DIR}" \
    APP_USER="${BACKEND_USER}" \
    APP_GROUP="${BACKEND_GROUP}" \
    PHP_BIN="${PHP_BIN}" \
    bash "${BACKEND_DIR}/deploy/scripts/deploy-vps.sh"
}

main() {
  require_root
  exec 9>"${LOCK_FILE}"
  flock -n 9 || { echo "Another ZDraft deployment is already running." >&2; exit 1; }

  pull_source
  trap '[[ -n "${CHANGED_FILES}" && -f "${CHANGED_FILES}" ]] && rm -f "${CHANGED_FILES}"' EXIT

  local deployed=0
  if should_deploy_frontend; then
    deploy_next_app "frontend" "${FRONTEND_DIR}" "${FRONTEND_USER}" "${FRONTEND_SERVICE}"
    deployed=1
  fi
  if should_deploy_dashboard; then
    deploy_next_app "dashboard" "${DASHBOARD_DIR}" "${DASHBOARD_USER}" "${DASHBOARD_SERVICE}"
    deployed=1
  fi
  if should_deploy_backend; then
    deploy_backend
    deployed=1
  fi

  if [[ "${deployed}" -eq 0 ]]; then
    log "No frontend, dashboard, backend, package, or deploy-script changes detected."
  fi

  log "ZDraft deployment orchestration finished."
}

main "$@"
