## ADDED Requirements

### Requirement: Split-deploy (Vercel app + self-hosted Centrifugo) is documented

The repository SHALL include README guidance for operators who run the Next.js app on Vercel while self-hosting the Centrifugo/Postgres stack, covering the exact environment variables required on each side and the three common failure modes (cookie scoping, TLS for WebSocket, proxy endpoint pointing at the public app URL).

#### Scenario: README lists the split-deploy env block

- **WHEN** a reviewer opens `README.md`
- **THEN** they find a section that prescribes `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_CLIENT_ALLOWED_ORIGINS`, and `SESSION_COOKIE_DOMAIN` for the app side
- **AND** `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` and `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` for the Centrifugo side
- **AND** a note that the admin HTTP API is protected by `CENTRIFUGO_API_KEY` alone once publicly exposed, so the key must be high-entropy
