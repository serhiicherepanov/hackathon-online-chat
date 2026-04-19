## Context

The repository ships two compose files: `docker-compose.yml` (dev, `next dev`, bind-mount) and `docker-compose.prod.yml` (prod image, used by `./scripts/ci-e2e.sh`). Both expose a single public port via Traefik on `:3080`. Centrifugo currently has one router:

```
PathPrefix(`/connection`) -> centrifugo:3080
```

Everything else — including `/api/*`, `/`, static assets, Next.js routes — is caught by the `app` router at `PathPrefix(/)` with `priority=1`. This works for single-box deploys because the Next.js server reaches Centrifugo privately over the docker network at `http://centrifugo:3080/api/*`.

The constraint we cannot meet today:

- Centrifugo needs a hosting machine (Vercel cannot host a long-lived WebSocket service).
- We want the app on Vercel.
- Therefore the Next.js server must reach Centrifugo's admin HTTP API over the public internet on the Centrifugo host, and the browser must reach Centrifugo's WS endpoint on the same host.
- Both must coexist on one hostname without the Traefik `/api/*` route shadowing the app's own `/api/*` endpoints on any operator that keeps `app` on the same host.

The `lib/centrifugo/http-api-url.ts` helper already normalizes a subpath base (`https://host/prefix` → `https://host/prefix/api/publish`); it has a test for exactly that shape. The `centrifuge-js` client accepts any absolute WS URL. So the necessary code support is already in place; this change is about compose wiring, env var plumbing, and documentation.

## Goals / Non-Goals

**Goals:**

- All Centrifugo traffic (WebSocket and admin HTTP API) reaches the Centrifugo container through a single public subpath: `/centrifugo/*`.
- Dev and prod compose have identical URL shapes so developers running `./scripts/ci-e2e.sh` and operators deploying prod see the same paths.
- The Centrifugo `connect`/`subscribe` proxy endpoints are configurable via env so the same image can be pointed at a remote Vercel app URL without editing `centrifugo/config.json`.
- The README documents the Vercel + self-hosted-Centrifugo shape concretely, including the three common failure modes (missing cookie domain, mixed content, wrong proxy endpoint).

**Non-Goals:**

- Not changing the app's own REST `/api/*` routes or contracts.
- Not introducing a second subdomain or requiring DNS changes beyond what the operator already has.
- Not adding IP allowlisting or mutual TLS to the admin API. The `Authorization: apikey ${CENTRIFUGO_API_KEY}` check stays the sole gate; we rely on TLS + a high-entropy key. (Can be revisited later.)
- Not changing token auth, connect-proxy semantics, or subscribe authorization. Those remain per the `realtime` spec.
- Not removing the internal `http://centrifugo:3080` path for the in-compose monolith deploy. That stays the default for `CENTRIFUGO_URL` so a single-box `docker compose up` continues to work without extra env overrides.

## Decisions

### 1. Single `/centrifugo/*` prefix via Traefik `StripPrefix`

Traefik adds one router per service today. We add a dedicated `centrifugo` router:

```
rule     = PathPrefix(`/centrifugo`)
priority = 100
middlewares = centrifugo-strip
```

…plus a middleware:

```
traefik.http.middlewares.centrifugo-strip.stripprefix.prefixes=/centrifugo
```

Centrifugo still sees `/connection/websocket` and `/api/*` natively, so no Centrifugo-side path config is needed. Public URLs become:

- Browser WS: `ws(s)://<host>/centrifugo/connection/websocket`
- Admin API: `http(s)://<host>/centrifugo/api/publish` (etc.)

**Alternatives considered:**

- *Host-based routing (dedicated Centrifugo subdomain)*: cleaner conceptually but requires a second DNS record and a second TLS certificate per environment, which is friction for local development and the e2e pipeline. Path-based routing keeps one hostname everywhere.
- *Configuring Centrifugo's own path prefix*: Centrifugo 6 accepts handler-path settings, but they apply per handler (WS, API) and don't unify under one prefix the way `StripPrefix` does. StripPrefix is mechanically simpler and keeps Centrifugo's config identical to the upstream defaults.
- *Splitting WS (`/connection`) and admin (`/api/centrifugo`) onto two different prefixes*: would collide with the app's `/api/centrifugo/connect` and `/api/centrifugo/subscribe` routes. Using `/centrifugo` as the single umbrella avoids this collision entirely.

### 2. Env-overridable connect/subscribe proxy endpoints

Centrifugo 6 maps env vars to config keys. We expose:

- `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` → `client.proxy.connect.endpoint`
- `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` → `channel.proxy.subscribe.endpoint`

Defaults in `centrifugo/config.json` remain `http://app:3080/api/centrifugo/...` so a single-box stack works unchanged. Split deploys override them via `.env`:

```
CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT=https://chat.digitalspace.studio/api/centrifugo/connect
CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT=https://chat.digitalspace.studio/api/centrifugo/subscribe
```

**Rationale:** editing `centrifugo/config.json` per deploy is fragile and pollutes git. The env mapping Centrifugo already provides is designed for exactly this.

### 3. Defaults aligned across dev, prod, and e2e

Both compose files ship the same URL shape. New defaults:

- `NEXT_PUBLIC_CENTRIFUGO_WS_URL=ws://localhost:3080/centrifugo/connection/websocket`
- `CENTRIFUGO_URL=http://centrifugo:3080` (unchanged — this is the internal, in-compose path and does NOT go through Traefik)

`.env.e2e.example` mirrors the prod defaults so `./scripts/ci-e2e.sh` rebuilds the app image against the new WS URL, and the Playwright runner (which navigates through Traefik at `http://localhost:3080`) still reaches Centrifugo through the Traefik router.

### 4. Operator-facing README section

Add a "Split deploy (Vercel app + self-hosted Centrifugo)" section to `README.md` listing the exact env values per side with the three gotchas called out inline:

1. `SESSION_COOKIE_DOMAIN=.<apex>` so the cookie is sent on the WS upgrade.
2. `wss://` required (HTTPS app can't use `ws://`).
3. `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` and `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` must point at the Vercel app's public URL, not `app:3080`.

### 5. Public exposure of `/api/*` relies on the API-key header as the only gate

The admin endpoints are now reachable from the internet whenever the operator points `CENTRIFUGO_URL` at the public host. Centrifugo enforces `Authorization: apikey ${CENTRIFUGO_API_KEY}` on every `/api/*` call, and in prod compose `CENTRIFUGO_API_KEY` is already `:?`-required. We add a README note that this key must be high-entropy (≥ 32 random chars) because it's the sole gate. A future hardening change can layer on IP allowlist or a Traefik BasicAuth/IPWhitelist middleware.

## Risks / Trade-offs

- [Public admin API is only protected by the API key] → TLS is mandatory for any non-localhost deployment; `CENTRIFUGO_API_KEY` documented as a high-entropy secret; future change can add IP allowlist. For the monolith compose deploy this is moot (admin stays on the internal network via `http://centrifugo:3080`).
- [Existing operator `.env` files with the old `NEXT_PUBLIC_CENTRIFUGO_WS_URL=ws://…/connection/websocket`] → Operators must update one line; called out in README and in the commit summary. This is acceptable because prod compose is only used by the hackathon submission pipeline and the small number of operators we know about.
- [Build ARG means `NEXT_PUBLIC_CENTRIFUGO_WS_URL` is baked into the client bundle at `docker build` time] → No change from today; documented in README so operators rebuild after changing the URL.
- [StripPrefix changes what Centrifugo sees in `X-Forwarded-Uri`] → Centrifugo uses the final request path (already stripped) for routing, and the connect/subscribe proxies forward the `cookie` header not the URL, so no proxied payload changes. Verified by e2e which exercises the full connect + subscribe + publish round-trip.
- [Dev compose now routes a new prefix Traefik had never seen] → Traefik is dynamic from docker labels, so bringing the stack up on a fresh branch just works. Existing warm dev stacks need `docker compose up -d` to pick up the new labels; covered in the tasks checklist.

## Migration Plan

1. Land the compose + env-example + README changes on a feature branch.
2. Run `pnpm typecheck` + `pnpm test` (unit tests touch the `centrifugoHttpApiUrl` helper — already green for subpath bases).
3. Run `./scripts/ci-e2e.sh` against the prod compose with the updated `.env.e2e.example` to prove the `/centrifugo/*` routing path works end-to-end (connect, subscribe, publish, presence).
4. For the live Vercel-split deployment (outside this PR): operator sets the split-deploy env vars on Vercel and on the server, redeploys, and verifies `/api/health` on the app and `/centrifugo/api/info` on the Centrifugo host respond.
5. Rollback: revert the single commit; since the helper and `centrifuge-js` code paths are unchanged, no data migration is needed.

## Open Questions

- Do we want to additionally expose Centrifugo's admin UI (served by Centrifugo at `/` with `admin: true`) behind a separate protected path? Not required for this change; can be a follow-up if we ever enable `admin: true`.
- Should we add a Traefik IP allowlist middleware as an optional extra router for `/centrifugo/api/*` guarded by an env toggle? Probably yes, but deferred to keep this change minimal.
