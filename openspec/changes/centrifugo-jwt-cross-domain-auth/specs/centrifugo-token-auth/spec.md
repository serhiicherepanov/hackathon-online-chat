## ADDED Requirements

### Requirement: Browser obtains short-lived Centrifugo connection token
The system SHALL provide an authenticated endpoint that issues short-lived HS256 JWT connection tokens for Centrifugo, and SHALL support token refresh for reconnects without requiring browser cookies to be sent to Centrifugo.

#### Scenario: Authenticated caller receives connection token
- **WHEN** an authenticated browser session calls the connection-token endpoint used by `centrifuge-js`
- **THEN** the server returns `200 OK` with `{ "token": "<jws>" }`
- **AND** the token has `sub` equal to the caller user id
- **AND** the token expiration is at most 10 minutes from issuance

#### Scenario: Token refresh is denied after auth loss
- **WHEN** `centrifuge-js` attempts token refresh and the caller is no longer authenticated
- **THEN** the token endpoint returns an unauthorized response
- **AND** the client stops retrying as an authenticated user

### Requirement: Realtime auth must be domain-agnostic
The system SHALL allow Centrifugo client connections and subscriptions when the web app domain and Centrifugo domain differ, without requiring cross-site cookie forwarding.

#### Scenario: Separate-domain deployment connects successfully
- **WHEN** the browser app runs on domain A and Centrifugo runs on domain B
- **THEN** the client can connect and receive publications using JWT token auth
- **AND** no requirement exists for browser cookies to be forwarded by Centrifugo proxy callbacks
