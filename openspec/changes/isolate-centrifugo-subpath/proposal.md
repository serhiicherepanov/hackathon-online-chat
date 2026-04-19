## Why

Today the Docker stack's Traefik router only sends `/connection/*` to the `centrifugo` container; every other path (including `/api/*`) falls through to the `app` catch-all. That is fine for the single-box setup but blocks two real deployment shapes we now want to support:

1. **Self-hosted Centrifugo + Vercel app** — the Next.js app runs on Vercel (it cannot host Centrifugo), and Centrifugo runs on our own server under a single public hostname (e.g. `webchat.digitalspace.studio`). The app's server-side code needs to call Centrifugo's admin HTTP API (`/api/publish`, `/api/presence`, …) over TLS, and the browser needs to open `wss://…/connection/websocket`. Both must coexist on one hostname without stepping on the app's own `/api/*` routes.
2. **Any reverse-proxy deployment** where the hostname is shared with other services.

The existing `CENTRIFUGO_URL` helper already supports a subpath (test-covered), but the compose Traefik wiring does not expose Centrifugo there, and the `connect`/`subscribe` proxy endpoints in `centrifugo/config.json` are hard-coded to the compose-internal `http://app:3080/...` — which is unreachable from a Centrifugo container that must call a Vercel-hosted app.

## What Changes

- Route Centrifugo behind a single `/centrifugo/*` path prefix via Traefik (both WS and admin API), with a `StripPrefix` middleware so Centrifugo still sees its native `/connection/websocket` and `/api/*` paths. Applied to both `docker-compose.yml` (dev) and `docker-compose.prod.yml` so local and deployed stacks have identical URL shapes.
- Parameterize Centrifugo's connect and subscribe proxy endpoints via env vars (`CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT`, `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT`) so a split deployment can point them at a remote Vercel app URL while `centrifugo/config.json` keeps the in-compose default.
- Update defaults and examples: `NEXT_PUBLIC_CENTRIFUGO_WS_URL` now ends in `/centrifugo/connection/websocket`; `.env.example` and `.env.e2e.example` track the new shape; `centrifugo/README.md` documents the proxy-endpoint env overrides.
- Document the "Vercel app + self-hosted Centrifugo" deployment in `README.md` with the exact env values (origins, cookie domain, WS URL, admin URL) and the trade-offs (TLS requirement, session-cookie parent-domain scoping, admin API key as the only auth for public admin endpoint).
- **Not breaking for API consumers.** The change is a URL-shape change for realtime transport only — no REST endpoint, auth flow, or message schema moves. Operators with custom `.env` overrides must update `NEXT_PUBLIC_CENTRIFUGO_WS_URL` once.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-skeleton`: adds requirements on how Centrifugo is exposed by the default Compose stack (subpath routing) and what `.env.example` documents for split deployments.
- `submission-readiness`: the README section describing deployment must match the new URL shape.

## Impact

- **Compose files**: `docker-compose.yml` and `docker-compose.prod.yml` (new Traefik labels + StripPrefix middleware on the `centrifugo` service).
- **Centrifugo config**: `centrifugo/config.json` and `centrifugo/README.md` (proxy endpoints become env-overridable; config keeps in-compose defaults).
- **Env examples**: `.env.example`, `.env.e2e.example`.
- **Docs**: `README.md` (deployment section) and `centrifugo/README.md`.
- **Scripts/tests**: `scripts/load-test-realtime.ts` uses the internal `centrifugo:3080` host directly and is unaffected; e2e runs against the prod compose, so `.env.e2e.example` and the Playwright client URL inherit the new shape automatically.
- **No code changes** to `lib/centrifugo/*` (the helper already supports subpath bases) or to the Centrifuge client wiring.
- **Operator action required** on existing non-default deployments: update `NEXT_PUBLIC_CENTRIFUGO_WS_URL` to include `/centrifugo` and, when running split, set the new `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` / `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` env vars.
