#!/usr/bin/env bash
set -euo pipefail

# R4 performance verification: large-history seed (if needed) + realtime load test.
# Intended inside the Compose app container (see README). Logs go to test-artifacts/.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/test-artifacts"
mkdir -p "${LOG_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_DIR}/r4-perf-${STAMP}.log"

cd "${ROOT}"

{
  echo "=== r4-perf ${STAMP} ==="
  echo "==> pnpm seed:benchmark-history"
  pnpm seed:benchmark-history
  echo "==> pnpm seed:loadtest-users"
  pnpm seed:loadtest-users
  echo "==> pnpm loadtest:realtime"
  pnpm loadtest:realtime
  echo "=== done ==="
} 2>&1 | tee "${LOG_FILE}"

echo "Wrote ${LOG_FILE}"
