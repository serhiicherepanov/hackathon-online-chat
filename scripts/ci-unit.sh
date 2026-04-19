#!/usr/bin/env bash
# Host-side unit-test pipeline.
# Runs: prisma generate -> prisma sync guard -> lint -> typecheck -> vitest.
# No Docker, no network, no DB.
#
# This script does NOT install anything. If a prerequisite is missing it
# exits with exit code 2 and tells you the exact command to run yourself.
#
# Prerequisites:
#   - pnpm, node on PATH
#   - ./node_modules present  ->  `pnpm install --frozen-lockfile`
#     (postinstall runs `prisma generate`; this script also runs it before typecheck)
set -euo pipefail

cd "$(dirname "$0")/.."

die() {
  echo "error: $1" >&2
  [ -n "${2:-}" ] && echo "       fix:   $2" >&2
  exit 2
}

echo "==> preflight"
command -v pnpm >/dev/null 2>&1 || die "\`pnpm\` is not on PATH" \
  "install pnpm (https://pnpm.io/installation) or enable corepack"
command -v node >/dev/null 2>&1 || die "\`node\` is not on PATH" \
  "install Node.js 20+"
[ -d node_modules ] || die "node_modules/ is missing" \
  "pnpm install --frozen-lockfile"

echo "    pnpm $(pnpm --version)  node $(node --version)"

echo "==> prisma generate (types for @prisma/client; no DB required)"
pnpm exec prisma generate

echo "==> pnpm check:prisma-client"
pnpm check:prisma-client

echo "==> pnpm lint"
pnpm lint

echo "==> pnpm typecheck"
pnpm typecheck

echo "==> pnpm test"
pnpm test

echo "unit pipeline ok"
