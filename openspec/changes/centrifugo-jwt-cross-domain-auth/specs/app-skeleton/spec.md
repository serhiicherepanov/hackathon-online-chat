## MODIFIED Requirements

### Requirement: Centrifugo reachable and token-authenticated

The browser SHALL be able to obtain Centrifugo connection tokens from the Next.js app and establish a WebSocket connection to Centrifugo using those tokens in both same-domain and separate-domain deployments.

#### Scenario: Connect token is issued for authenticated caller

- **WHEN** the browser sends `POST /api/centrifugo/connect` with valid web authentication
- **THEN** the app responds with `200 OK` and a JSON body `{ "token": "<jws>" }`
- **AND** the token is a JWT signed with HS256 using `CENTRIFUGO_TOKEN_HMAC_SECRET`
- **AND** the token's `sub` claim identifies the authenticated user and `exp` is within 10 minutes of issuance

#### Scenario: Unauthenticated caller is refused

- **WHEN** `POST /api/centrifugo/connect` is called without valid web authentication
- **THEN** the app responds with `401 Unauthorized`
- **AND** no token is issued

#### Scenario: Browser connects with token when Centrifugo is on another domain

- **WHEN** the app shell loads and `NEXT_PUBLIC_CENTRIFUGO_WS_URL` points to a different domain than the app origin
- **THEN** the `centrifuge-js` client fetches a token from `/api/centrifugo/connect` and opens a WebSocket to the configured Centrifugo URL
- **AND** the client reaches `connected` state within 5 seconds
- **AND** cross-site browser cookie delivery to Centrifugo is not required for the connection to succeed
