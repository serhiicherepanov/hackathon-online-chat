#!/usr/bin/env bash
# End-to-end pipeline.
# Preflights the environment, brings up the Compose stack, waits for
# /api/health, runs Playwright, and always tears the stack down while dumping
# logs + test-results as artifacts.
#
# This script does NOT install anything. If a prerequisite is missing it
# exits with exit code 2 and tells you the exact command to run yourself.
#
# Prerequisites (checked at startup):
#   - pnpm, node, docker, docker compose, curl on PATH
#   - ./node_modules present                         -> `pnpm install --frozen-lockfile`
#   - Playwright browsers installed for the pinned version
#                                                    -> `pnpm exec playwright install chromium`
#                                                       (on Linux add `--with-deps` once)
#
# Env knobs:
#   TRAEFIK_BIND_PORT   host port for the app (default 3080)
#   PLAYWRIGHT_BASE_URL override base URL (default http://localhost:$TRAEFIK_BIND_PORT)
#   HEALTH_TIMEOUT      seconds to wait for /api/health (default 180)
#   KEEP_STACK=1        skip `docker compose down` on exit (local debugging)
#   HEADED=1            run Playwright in headed mode (visible browser)
#   DEBUG=1             run Playwright Inspector (implies HEADED=1, serial)
#   PWDEBUG=1           alias for DEBUG=1 (also respected by Playwright itself)
#   UI=1                run Playwright UI mode (interactive, implies HEADED=1)
#   SLOWMO_MS=250       slow each action by N ms when HEADED=1 (default unset)
#   E2E_ARGS="..."      extra raw args appended to `playwright test`
#
# All debug modes (HEADED / DEBUG / UI) require a graphical display. Without
# one the script aborts with a clear message — use xvfb-run or run locally.
set -euo pipefail

cd "$(dirname "$0")/.."

# Do NOT force CI=1 here. GitHub Actions sets CI=true on its own; forcing it
# locally would silently enable Playwright retries (2x) and swap the reporter,
# which makes headed/UI debugging look like an infinite retry loop.
export TRAEFIK_BIND_PORT="${TRAEFIK_BIND_PORT:-3080}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${TRAEFIK_BIND_PORT}}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"

ARTIFACTS_DIR="${ARTIFACTS_DIR:-$(pwd)/test-artifacts}"

die() {
  echo "error: $1" >&2
  [ -n "${2:-}" ] && echo "       fix:   $2" >&2
  exit 2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "\`$1\` is not on PATH" "$2"
}

echo "==> preflight"
require_cmd pnpm   "install pnpm (https://pnpm.io/installation) or enable corepack"
require_cmd node   "install Node.js 20+ (https://nodejs.org)"
require_cmd docker "install Docker Engine (https://docs.docker.com/engine/install/)"
require_cmd curl   "install curl"
docker compose version >/dev/null 2>&1 \
  || die "\`docker compose\` subcommand is not available" \
         "install Docker Compose v2 (https://docs.docker.com/compose/install/)"

[ -d node_modules ] \
  || die "node_modules/ is missing" \
         "pnpm install --frozen-lockfile"

[ -x node_modules/.bin/playwright ] \
  || die "Playwright is not installed in node_modules" \
         "pnpm install --frozen-lockfile"

if ! pnpm exec playwright --version >/dev/null 2>&1; then
  die "pnpm exec playwright failed" \
      "pnpm install --frozen-lockfile"
fi

PW_VERSION="$(pnpm exec playwright --version | awk '{print $2}')"
PW_CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
if ! compgen -G "${PW_CACHE}/chromium-*" >/dev/null; then
  die "Playwright chromium browser is not installed (cache: ${PW_CACHE})" \
      "pnpm exec playwright install chromium   # or add --with-deps on Linux (needs sudo)"
fi
echo "    pnpm $(pnpm --version)  node $(node --version)  docker $(docker --version | awk '{print $3}' | tr -d ,)"
echo "    playwright ${PW_VERSION}  browsers: ${PW_CACHE}"

PW_ARGS=()
if [ "${UI:-0}" = "1" ]; then
  PW_ARGS+=(--ui)
  export HEADED=1
fi
if [ "${DEBUG:-0}" = "1" ] || [ "${PWDEBUG:-0}" = "1" ]; then
  PW_ARGS+=(--debug)
  export PWDEBUG=1
  export HEADED=1
fi
if [ "${HEADED:-0}" = "1" ]; then
  PW_ARGS+=(--headed)
  if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
    die "HEADED/DEBUG/UI requested but no DISPLAY is set" \
        "run from a desktop session, or prefix with 'xvfb-run -a'"
  fi
  # Debugging is iterative — retries just obscure the real failure.
  PW_ARGS+=(--retries=0 --workers=1 --reporter=list)
fi
if [ -n "${SLOWMO_MS:-}" ]; then
  PW_ARGS+=(--slow-mo="$SLOWMO_MS")
fi
if [ -n "${E2E_ARGS:-}" ]; then
  read -r -a _extra <<<"$E2E_ARGS"
  PW_ARGS+=("${_extra[@]}")
fi

mkdir -p "$ARTIFACTS_DIR"

cleanup() {
  ec=$?
  echo "==> dumping compose logs to ${ARTIFACTS_DIR}/compose-logs"
  mkdir -p "${ARTIFACTS_DIR}/compose-logs"
  for svc in db centrifugo app traefik; do
    docker compose logs --no-color --timestamps "$svc" \
      > "${ARTIFACTS_DIR}/compose-logs/${svc}.log" 2>&1 || true
  done
  docker compose ps > "${ARTIFACTS_DIR}/compose-logs/ps.txt" 2>&1 || true

  if [ "${KEEP_STACK:-0}" != "1" ]; then
    echo "==> docker compose down -v"
    docker compose down -v --remove-orphans || true
  else
    echo "KEEP_STACK=1 -> leaving stack running"
  fi
  exit "$ec"
}
trap cleanup EXIT INT TERM

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> waiting for ${PLAYWRIGHT_BASE_URL}/api/health"
if ! scripts/wait-for-health.sh "$PLAYWRIGHT_BASE_URL" "$HEALTH_TIMEOUT"; then
  echo "health never came up, dumping app logs:" >&2
  docker compose logs --tail=200 app >&2 || true
  exit 1
fi

echo "==> playwright test ${PW_ARGS[*]:-}"
pnpm exec playwright test "${PW_ARGS[@]}"

echo "==> copying Playwright output to ${ARTIFACTS_DIR}"
[ -d playwright-report ] && cp -r playwright-report "${ARTIFACTS_DIR}/playwright-report" || true
[ -d test-results ]      && cp -r test-results      "${ARTIFACTS_DIR}/test-results"      || true

echo "e2e pipeline ok"
