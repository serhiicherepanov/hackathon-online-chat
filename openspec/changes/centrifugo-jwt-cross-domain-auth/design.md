## Context

The current realtime stack uses Centrifugo connect/subscribe proxy callbacks that forward `cookie` headers to Next.js route handlers. This works in same-origin deployments but becomes brittle when the web app and Centrifugo are split across domains because browser cookie policies can block or strip cross-site cookies.  
At the same time, the codebase already has a JWT issuer endpoint (`POST /api/centrifugo/connect`) and `centrifuge-js` client wiring that can support token-based authentication. The design goal is to make realtime authentication domain-agnostic while preserving the existing channel authorization rules and event contracts.

## Goals / Non-Goals

**Goals:**
- Make Centrifugo client authentication independent from cross-domain browser cookie delivery.
- Keep existing room/DM/user/presence authorization semantics unchanged.
- Support token refresh for long-lived browser sessions without forcing full reconnect/logout flows.
- Preserve compatibility with current app session model (persistent browser sessions managed by Next.js).

**Non-Goals:**
- Replacing session-based app authentication with OAuth/OIDC or full stateless auth.
- Changing channel naming, message payload schemas, or publish-after-commit guarantees.
- Introducing new realtime infrastructure (Redis engine, alternate brokers, or new transport protocols).

## Decisions

### 1) Use short-lived Centrifugo JWTs as the primary browser auth transport
- **Decision:** Browser clients authenticate to Centrifugo with short-lived JWTs obtained from app endpoints using `centrifuge-js` `getToken` callbacks.
- **Why:** This removes dependence on Centrifugo receiving browser cookies directly and aligns with official Centrifugo + centrifuge-js cross-domain patterns.
- **Alternatives considered:**
  - **Keep cookie-forwarded proxy only:** rejected because it remains fragile in separate-domain deployments.
  - **Long-lived static client token:** rejected due to higher replay risk and weak revocation behavior.

### 2) Keep authorization in Next.js, not in browser claims
- **Decision:** JWTs identify the user (`sub`) while authorization for channel subscribe remains enforced server-side in Next.js (`/api/centrifugo/subscribe`), with DB-backed membership checks.
- **Why:** Keeps business rules centralized and consistent with existing `assertMember`/identity checks.
- **Alternatives considered:**
  - **Embed all channel grants in token claims:** rejected due to stale grants after membership changes and added complexity for revocation.

### 3) Allow token/bearer path for proxy requests and remove cookie requirement from Centrifugo config
- **Decision:** Centrifugo proxy wiring is updated to no longer require forwarding `cookie`; proxy auth uses explicit identity from token-authenticated client context.
- **Why:** Avoids cross-site cookie dependency while retaining proxy authorization controls.
- **Alternatives considered:**
  - **Forward both cookie and authorization forever:** acceptable as temporary compatibility mode, but final target removes mandatory cookie reliance.

### 4) Roll out incrementally with compatibility safety
- **Decision:** Implement in phases: client token refresh first, proxy/header config updates second, then remove cookie-coupled assumptions/comments/docs.
- **Why:** Reduces risk of realtime outage and keeps rollback simple.

## Risks / Trade-offs

- **[Risk] Token refresh endpoint outages disconnect clients** -> **Mitigation:** use short retry backoff and explicit unauthorized handling (`UnauthorizedError`) to separate transient vs permanent auth failures.
- **[Risk] Misconfigured allowed origins break connections in production** -> **Mitigation:** document strict origin config and add startup/health validation guidance.
- **[Risk] Subscription authorization regressions during migration** -> **Mitigation:** keep existing server-side channel checks unchanged and add tests for `room:*`, `dm:*`, `user:*`, and `presence`.
- **[Trade-off] More auth round-trips (token fetch/refresh)** -> **Mitigation:** short token payloads, bounded TTL, and only refresh on expiry/reconnect.

## Migration Plan

1. Add/confirm `centrifuge-js` connection token retrieval via `getToken` with unauthorized handling.
2. Update subscribe token/authorization path to avoid dependence on forwarded browser cookies.
3. Update Centrifugo config to stop requiring `cookie` forwarding for connect/subscribe proxy auth.
4. Validate in compose with separated web/Centrifugo domains and run realtime/e2e checks.
5. Update docs/env guidance; keep rollback by restoring prior config + client factory behavior if needed.

## Open Questions

- Should the subscribe path use dedicated subscription JWTs (`getToken` per channel) immediately, or keep proxy authorization only for this change and add subscription JWTs in a follow-up?
- Do we want explicit JWT audience/issuer enforcement as required (not optional) in production profile now, or keep it optional for local/dev compatibility?
