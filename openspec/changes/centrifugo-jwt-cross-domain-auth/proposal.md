## Why

The current realtime auth path depends on browser cookies reaching Centrifugo proxy callbacks, which is fragile when the web app and Centrifugo are served from different domains. We need a domain-agnostic auth flow that preserves secure channel authorization without relying on cross-site cookies.

## What Changes

- Move browser Centrifugo auth to explicit short-lived JWT tokens fetched from app endpoints and refreshed via `centrifuge-js` token callbacks.
- Update connect and subscribe authorization paths so they can authenticate requests without requiring forwarded `cookie` headers from Centrifugo.
- Keep channel authorization rules (`room:*`, `dm:*`, `user:*`, `presence`) unchanged while switching identity transport from cookie-bound to token/bearer-driven.
- Tighten configuration guidance for allowed origins and env wiring for separate-domain deployments.
- Add regression coverage for token issuance, reconnect refresh, and subscribe authorization in the cross-domain setup.

## Capabilities

### New Capabilities

- `centrifugo-token-auth`: Domain-agnostic Centrifugo client authentication and refresh flow based on short-lived JWTs.

### Modified Capabilities

- `realtime`: Change connect/subscribe auth requirements to no longer require session cookies on Centrifugo proxy callbacks.
- `app-skeleton`: Update baseline stack/auth wiring expectations so realtime connectivity works with separate web and Centrifugo domains.

## Impact

- Affected code: `lib/centrifuge.ts`, `components/providers/centrifuge-provider.tsx`, `app/api/centrifugo/connect/route.ts`, `app/api/centrifugo/subscribe/route.ts`, `centrifugo/config.json`, env wiring/docs.
- Affected systems: browser auth handshake with Centrifugo, reconnect behavior, Centrifugo proxy header forwarding.
- Tests: unit/integration coverage for token endpoint behavior plus e2e validation of realtime connectivity in a separated-domain topology.
