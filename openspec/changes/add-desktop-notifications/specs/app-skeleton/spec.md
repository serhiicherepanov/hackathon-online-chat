## ADDED Requirements

### Requirement: Root layout registers PWA assets

The app's root layout SHALL link the web app manifest, the iOS apple-touch-icon, and the theme-color meta tag, and SHALL mount a client-side provider that registers `/sw.js` exactly once per page load.

#### Scenario: HTML head includes PWA link tags

- **WHEN** any page renders
- **THEN** the HTML `<head>` contains `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color" content="...">`, and `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
- **AND** these tags are present on every route, not only `/`

#### Scenario: Service worker is registered from a client provider

- **WHEN** the app shell mounts in a supporting browser
- **THEN** `navigator.serviceWorker.register('/sw.js', { scope: '/' })` is called at most once per page load
- **AND** the registration code lives in a dedicated client component, not inline in the root layout

### Requirement: Environment variables for VAPID

`.env.example` SHALL declare the three variables required for Web Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`, with dev-only defaults that allow local boot.

#### Scenario: Example env declares VAPID vars

- **WHEN** a reviewer reads `.env.example`
- **THEN** it contains entries for `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`
- **AND** dev values are documented as "dev keypair — regenerate for any shared environment"
- **AND** `docker-compose.yml` passes `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as a build arg to the `app` service so it is baked into the client bundle

#### Scenario: Production compose requires the private key

- **WHEN** `docker-compose.prod.yml` is inspected
- **THEN** the `app` service reads `VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY:?VAPID_PRIVATE_KEY is required}` so missing configuration fails fast at boot
