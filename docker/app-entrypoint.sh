#!/bin/sh
set -eu

SERVICE_FIELD='"service":"app-entrypoint","env":"'"${NODE_ENV:-development}"'"'

log() {
  LEVEL=$1
  MSG=$2
  TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  printf '{"level":"%s","time":"%s","msg":"%s",%s}\n' "$LEVEL" "$TS" "$MSG" "$SERVICE_FIELD"
}

log info "entrypoint starting"

ATTEMPT=1
MAX_ATTEMPTS=3
until pnpm exec prisma migrate deploy; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    log error "prisma migrate deploy failed after ${MAX_ATTEMPTS} attempts"
    exit 1
  fi
  log warn "prisma migrate deploy failed, retrying (attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
  ATTEMPT=$((ATTEMPT + 1))
  sleep 2
done

if [ "${NODE_ENV:-development}" = "production" ]; then
  log info "migrations applied, starting next start (production)"
  exec pnpm start
else
  log info "migrations applied, starting next dev (development)"
  exec pnpm dev
fi
