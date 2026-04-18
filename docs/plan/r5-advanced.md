# R5 — Advanced (stretch, Centrifugo-native)

Goal: advanced track that stays on the approved stack
(see [`AGENTS.md`](../../AGENTS.md)). No XMPP/Jabber. Federation-style value is
delivered by scaling Centrifugo horizontally and exposing a first-class
integration API for bots and external services.

Only start R5 if [R0–R4](index.md) are complete and demo-ready.

## Scope (in)

- **Horizontal Centrifugo**: multi-node Centrifugo cluster fronted by a broker (Redis engine) so publishes from any Next.js pod reach subscribers on any node.
- **Integration / bot API**: token-scoped HTTP endpoints that let external clients post messages into rooms/DMs and subscribe to events via Centrifugo just like browsers.
- **Admin observability dashboard** (reuses wireframe Manage Room pattern):
  - Connections dashboard: live client count, per-node distribution, per-user tab count.
  - Traffic dashboard: publishes/sec, subscribe errors, top channels by throughput, per-bot token usage.
- **Load test**: scripted 300+ synthetic clients split across two Centrifugo nodes, bidirectional messaging across rooms; publishes Prometheus metrics.

## Compose additions

- `centrifugo-a`, `centrifugo-b` — two Centrifugo nodes sharing a Redis engine.
- `redis` — engine + pub/sub backplane for Centrifugo.
- `prometheus` (optional, dev-only) — scrapes Centrifugo `/metrics` and the Next.js app; feeds the admin dashboard.
- App config updated: `CENTRIFUGO_HTTP_API` becomes a comma-separated list or points to a reverse-proxied cluster endpoint.

## Data model additions

- `BotToken` — id, ownerUserId, name, tokenHash, scopes (rooms/dms/publish-only), createdAt, revokedAt
- `IntegrationEvent` (optional, append-only) — id, tokenId, action, channel, payloadSize, createdAt — used to power per-bot throughput view

## API additions

- `POST /api/bots` — create bot token (returns plaintext once)
- `DELETE /api/bots/:id` — revoke
- `POST /api/bots/:id/messages` — bot publishes a message into an allowed conversation (goes through the same Prisma + Centrifugo pipeline as user messages, so history is persisted identically)
- `GET /api/admin/realtime/connections` — aggregate from Centrifugo admin API
- `GET /api/admin/realtime/channels` — top channels by msg/sec from Centrifugo stats

## Realtime additions

- `admin:realtime` channel (admins only) — periodic snapshots of connection and channel metrics, so the dashboard updates live without polling.

## UI additions

- `/admin/integrations` — bot tokens CRUD, per-token stats.
- `/admin/realtime` — connections + channels dashboards (Virtuoso for long tables, sparklines for rates).

## Acceptance criteria

1. Compose brings up two Centrifugo nodes + Redis; a browser connected to node A receives messages published by a bot whose HTTP publish hit node B.
2. Load test: 300 concurrent clients split across the two nodes, 10 minutes of mixed traffic; p95 delivery < 3 s, no dropped subscriptions, Redis backplane stable.
3. `/admin/realtime` shows live client count across both nodes and correctly reflects tab counts per user during the test.
4. A bot token with `publish-only` scope can post a message into a specific room but cannot read or publish to any other channel (verified with a denied request).
5. Revoking a bot token terminates its active subscription and rejects subsequent publishes immediately.

## Out of scope (explicit)

- No XMPP/Jabber server, no s2s federation, no non-Centrifugo transport.
- No multi-region deployment; single Compose stack only.
