#!/usr/bin/env bash
# Poll GET $1/api/health until it returns 200 or timeout expires.
# Usage: scripts/wait-for-health.sh [base_url] [timeout_seconds]
set -euo pipefail

BASE_URL="${1:-${PLAYWRIGHT_BASE_URL:-http://localhost:3080}}"
TIMEOUT="${2:-180}"
INTERVAL=2

echo "waiting for ${BASE_URL}/api/health (timeout ${TIMEOUT}s)"

deadline=$(( $(date +%s) + TIMEOUT ))
last_status=""
while [ "$(date +%s)" -lt "$deadline" ]; do
  status=$(curl -fsS -o /tmp/health.json -w "%{http_code}" "${BASE_URL}/api/health" || true)
  if [ "$status" = "200" ]; then
    echo "health ok: $(cat /tmp/health.json)"
    exit 0
  fi
  if [ "$status" != "$last_status" ]; then
    echo "  status=${status:-no-response}"
    last_status=$status
  fi
  sleep "$INTERVAL"
done

echo "health check timed out after ${TIMEOUT}s (last status: ${last_status:-none})" >&2
exit 1
