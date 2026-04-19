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

# E2E runs against the production build (`docker-compose.prod.yml` + baked
# `next build`). Dev mode's lazy per-route compilation makes the first test of
# every route blow through its 30s budget, which is never what e2e should
# exercise. Config is isolated in `.env.e2e` so the pipeline does not touch a
# developer's local `.env`.
#
# `.env.e2e` itself is gitignored (it holds secrets). `.env.e2e.example` is
# the committed template; if `.env.e2e` is missing we copy the example so a
# fresh clone / CI runner just works out of the box. Customize locally by
# editing `.env.e2e` after the first run.
COMPOSE_FILE_E2E="${COMPOSE_FILE_E2E:-docker-compose.prod.yml}"
ENV_FILE_E2E="${ENV_FILE_E2E:-.env.e2e}"
ENV_FILE_E2E_EXAMPLE="${ENV_FILE_E2E_EXAMPLE:-.env.e2e.example}"
if [ ! -f "$ENV_FILE_E2E" ]; then
  if [ -f "$ENV_FILE_E2E_EXAMPLE" ]; then
    echo "info: $ENV_FILE_E2E not found; seeding from $ENV_FILE_E2E_EXAMPLE"
    cp "$ENV_FILE_E2E_EXAMPLE" "$ENV_FILE_E2E"
  else
    echo "error: neither $ENV_FILE_E2E nor $ENV_FILE_E2E_EXAMPLE exist" >&2
    exit 2
  fi
fi
# Compose v5 has a buildx bake bug that panics on `docker compose up --build`.
# Disable it so v5 falls back to the classic per-service build path.
export COMPOSE_BAKE=false

# Pin the compose project name so the image tag the script builds below
# (`hackathon-online-chat-app:latest`) matches the name compose resolves for
# `services.app`. Without this pin, running from a git worktree whose
# directory name is not `hackathon-online-chat` (e.g.
# `hackathon-online-chat-theme-design-improvement-check`) makes compose look
# for `<worktree>-app:latest` and fail with "No such image".
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hackathon-online-chat}"

dc() {
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE_E2E" --env-file "$ENV_FILE_E2E" "$@"
}

export TRAEFIK_BIND_PORT="${TRAEFIK_BIND_PORT:-3080}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${TRAEFIK_BIND_PORT}}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"

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

[ -f "$ENV_FILE_E2E" ] || die \
  "missing $ENV_FILE_E2E" \
  "restore it from git or copy .env.example (see scripts/ci-e2e.sh)"
[ -f "$COMPOSE_FILE_E2E" ] || die \
  "missing $COMPOSE_FILE_E2E" \
  "restore it from git or override with COMPOSE_FILE_E2E=path"

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
    dc logs --no-color --timestamps "$svc" \
      > "${ARTIFACTS_DIR}/compose-logs/${svc}.log" 2>&1 || true
  done
  dc ps > "${ARTIFACTS_DIR}/compose-logs/ps.txt" 2>&1 || true

  if [ "${KEEP_STACK:-0}" != "1" ]; then
    echo "==> docker compose down -v"
    dc down -v --remove-orphans || true
  else
    echo "KEEP_STACK=1 -> leaving stack running"
  fi
  exit "$ec"
}
trap cleanup EXIT INT TERM

# Compose v5 has a buildx/bake regression that crashes even with
# COMPOSE_BAKE=false on some environments (panic in build_bake.go). Build the
# app image out-of-band with the legacy builder, then `compose up --no-build`.
# Compose would tag the built image as `<project>-app`. Pre-build with that
# tag so `up --no-build` finds it.
APP_IMAGE="hackathon-online-chat-app:latest"
echo "==> docker build (target=production) -> $APP_IMAGE"
set -a
# shellcheck source=/dev/null  # env file, runtime-provided path
. "$ENV_FILE_E2E"
set +a
DOCKER_BUILDKIT=0 docker build \
  --target production \
  --build-arg "NEXT_PUBLIC_CENTRIFUGO_WS_URL=${NEXT_PUBLIC_CENTRIFUGO_WS_URL}" \
  -t "$APP_IMAGE" \
  .

echo "==> docker compose -f $COMPOSE_FILE_E2E --env-file $ENV_FILE_E2E up -d --no-build"
dc up -d --no-build

echo "==> waiting for ${PLAYWRIGHT_BASE_URL}/api/health"
if ! scripts/wait-for-health.sh "$PLAYWRIGHT_BASE_URL" "$HEALTH_TIMEOUT"; then
  echo "health never came up, dumping app logs:" >&2
  dc logs --tail=200 app >&2 || true
  exit 1
fi

echo "==> playwright test ${PW_ARGS[*]:-}"
pnpm exec playwright test "${PW_ARGS[@]}"

echo "==> copying Playwright output to ${ARTIFACTS_DIR}"
[ -d playwright-report ] && cp -r playwright-report "${ARTIFACTS_DIR}/playwright-report" || true
[ -d test-results ]      && cp -r test-results      "${ARTIFACTS_DIR}/test-results"      || true

echo "e2e pipeline ok"
