## ADDED Requirements

### Requirement: Centrifugo exposed behind a single `/centrifugo/*` subpath

The Docker Compose stack SHALL route all public Centrifugo traffic — both the WebSocket endpoint and the admin HTTP API — through one Traefik path prefix, `/centrifugo/*`, so that a single public hostname can front the realtime service without colliding with the Next.js app's own routes. Traefik SHALL strip the `/centrifugo` prefix before forwarding so Centrifugo receives its native `/connection/websocket` and `/api/*` paths.

#### Scenario: Browser WebSocket reaches Centrifugo via `/centrifugo/connection/websocket`

- **WHEN** the default stack is running (either `docker-compose.yml` or `docker-compose.prod.yml`) on `http://localhost:3080`
- **THEN** opening a WebSocket to `ws://localhost:3080/centrifugo/connection/websocket` reaches the Centrifugo container
- **AND** `NEXT_PUBLIC_CENTRIFUGO_WS_URL` in `.env.example` ends in `/centrifugo/connection/websocket`

#### Scenario: Admin HTTP API reaches Centrifugo via `/centrifugo/api/*`

- **WHEN** the default stack is running
- **THEN** an HTTP request to `http://localhost:3080/centrifugo/api/info` with `Authorization: apikey ${CENTRIFUGO_API_KEY}` reaches the Centrifugo container and returns a `200 OK`
- **AND** the same request to `/api/info` (without the `/centrifugo` prefix) is handled by the `app` service, not Centrifugo

#### Scenario: Single-box monolith keeps internal admin path as the server-side default

- **WHEN** an operator runs the default stack without overriding environment variables
- **THEN** `CENTRIFUGO_URL` defaults to `http://centrifugo:3080` so the `app` container calls Centrifugo's admin API over the compose-internal network (the `/centrifugo` public route is used only when the `app` is deployed elsewhere, e.g. on Vercel)

### Requirement: Centrifugo connect/subscribe proxy endpoints are env-overridable

The Centrifugo config SHALL source its `client.proxy.connect.endpoint` and `channel.proxy.subscribe.endpoint` from environment variables so a split deployment (e.g. app on Vercel, Centrifugo self-hosted) can point the proxies at a public app URL without editing `centrifugo/config.json`.

#### Scenario: Default stack uses in-compose proxy endpoints

- **WHEN** the operator brings up the default stack with no proxy endpoint env vars set
- **THEN** Centrifugo's connect proxy targets `http://app:3080/api/centrifugo/connect`
- **AND** Centrifugo's subscribe proxy targets `http://app:3080/api/centrifugo/subscribe`

#### Scenario: Split deployment overrides proxy endpoints via env

- **WHEN** the operator sets `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT=https://chat.example.com/api/centrifugo/connect` and `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT=https://chat.example.com/api/centrifugo/subscribe` before `docker compose up`
- **THEN** Centrifugo calls those URLs for connect and subscribe authorization
- **AND** neither `centrifugo/config.json` nor any committed file needs to be edited per deployment
