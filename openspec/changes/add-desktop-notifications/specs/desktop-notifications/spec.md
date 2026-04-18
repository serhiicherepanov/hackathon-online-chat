## ADDED Requirements

### Requirement: Permission request is gesture-gated

The app SHALL only call `Notification.requestPermission()` in direct response to an explicit user gesture (click on an "Enable desktop notifications" control), never on page load or in effect hooks.

#### Scenario: No auto-prompt on any page

- **WHEN** any page in the app loads and the user has never interacted with the notifications settings
- **THEN** `Notification.requestPermission` is not called
- **AND** `Notification.permission` remains its current value (`default`, `granted`, or `denied`)

#### Scenario: Prompt fires on explicit button click

- **WHEN** the user clicks the "Enable desktop notifications" button in the notifications settings panel
- **THEN** the browser shows its native permission prompt exactly once
- **AND** on grant, the app proceeds to subscribe for Web Push
- **AND** on dismiss or deny, the app stores no subscription and shows a help message about changing the setting in browser preferences

### Requirement: Notification categories and defaults

The app SHALL expose four notification categories — **Direct messages**, **@-mentions**, **Room messages** (per-room toggle), and **Friend requests** — with persisted per-user preferences.

#### Scenario: Default categories on first permission grant

- **WHEN** the user grants notification permission for the first time
- **THEN** **Direct messages**, **@-mentions**, and **Friend requests** are enabled by default
- **AND** **Room messages** is disabled by default for all rooms the user is a member of
- **AND** the preferences are persisted in IndexedDB on the client and mirrored to the server for push dispatch

#### Scenario: Toggling a category takes effect without reload

- **WHEN** the user toggles a category off in the settings panel
- **THEN** subsequent events matching that category produce no notification (neither foreground nor push), starting with the next event received
- **AND** the server-side push mirror is updated within 2 seconds so background pushes also stop

### Requirement: Mute window

The settings panel SHALL allow the user to mute all notification categories for **1 hour**, **8 hours**, **until tomorrow 8 AM local**, or **indefinitely**, with a visible indicator and a "Resume notifications" action.

#### Scenario: Timed mute auto-expires

- **WHEN** the user selects "Mute for 1 hour"
- **THEN** no notifications (foreground or push) are shown for the next 60 minutes
- **AND** after the 60 minutes elapse, notifications resume automatically without any user action
- **AND** the server-side push mirror is updated with the mute-until timestamp so background pushes are suppressed for the same window

#### Scenario: Indefinite mute persists across reloads

- **WHEN** the user selects "Mute indefinitely" and later reloads the app
- **THEN** notifications remain muted until the user clicks "Resume notifications"

### Requirement: Notification sounds (foreground)

The app SHALL play a short category-specific sound via a preloaded `HTMLAudioElement` when showing a foreground notification, subject to user preferences, autoplay-policy constraints, and a per-category throttle.

#### Scenario: Sound plays alongside an unfocused-tab DM notification

- **WHEN** user A's tab is open but unfocused, sound is enabled for DMs, the DM category is enabled, no mute window is active, and a DM arrives
- **THEN** the app plays the DM sound clip at the user's configured volume within 500 ms of the event
- **AND** the OS notification is still shown via the Notification API

#### Scenario: First-ever sound plays after permission-grant gesture

- **WHEN** the user clicks "Enable desktop notifications" and grants permission
- **THEN** the app primes every category's audio element during that click handler (play + immediate pause + reset) to satisfy the browser's autoplay policy
- **AND** the next event-driven `play()` call succeeds without an autoplay rejection

#### Scenario: Sound skipped when conversation is focused

- **WHEN** the user's tab is focused AND the currently open conversation matches the event
- **THEN** no sound is played (consistent with no notification being shown)

#### Scenario: Sound off per category

- **WHEN** the user has set **Sound** to `off` for a category
- **THEN** an event in that category shows the OS notification (if enabled) but plays no sound

#### Scenario: Throttled burst

- **WHEN** ten DMs arrive within one second
- **THEN** the DM sound plays at most once during that window (1500 ms throttle for DMs, 500 ms for mentions)
- **AND** the user does not hear a stuttering burst

#### Scenario: Muted category or mute window produces silence

- **WHEN** the user has a global mute window active OR the category is disabled entirely
- **THEN** no sound is played regardless of the sound-per-category setting

#### Scenario: Autoplay disallowed produces a single hint, not repeated errors

- **WHEN** `Navigator.getAutoplayPolicy("mediaelement")` is available and reports `disallowed`, and an event would otherwise play a sound
- **THEN** the app does not attempt playback and does not log an error per event
- **AND** a one-time toast or settings-panel indicator informs the user that browser settings are blocking sound

### Requirement: Foreground notifications via Notification API

The app SHALL display OS notifications from the browser using the `Notification` API for events received over Centrifugo while at least one tab is open, without calling the server for push.

#### Scenario: Unfocused tab shows a notification for a DM

- **WHEN** user A is signed in with one tab open, that tab is not focused, and user B sends a DM to user A
- **THEN** the app shows a system notification within 3 seconds of the Centrifugo message event
- **AND** the notification title names the sender and the body shows the first line of the message (truncated to ~200 chars)
- **AND** the notification's `tag` groups additional DMs from the same sender into a single OS row

#### Scenario: Focused tab viewing the conversation shows no notification

- **WHEN** user A's tab is focused AND the currently open view is the DM thread with user B AND user B sends a DM
- **THEN** no OS notification is shown
- **AND** the message appears in the thread normally

#### Scenario: Muted category produces no foreground notification

- **WHEN** the user has **Direct messages** disabled OR a mute window is active, AND a DM arrives
- **THEN** no OS notification is shown via the Notification API

### Requirement: Background notifications via Web Push + VAPID

The server SHALL deliver Web Push notifications using VAPID-authenticated HTTP requests (via the `web-push` library) to a user's registered subscriptions when the user has no focused/open tab and the event matches an enabled category.

#### Scenario: Push delivered when all tabs are closed

- **WHEN** user A has registered one or more push subscriptions, has DMs enabled, has no active Centrifugo connections, and user B sends a DM
- **THEN** the server sends a push request to each of user A's subscription endpoints within 3 seconds of the DM being persisted
- **AND** the push payload is encrypted and contains `{ type: "dm", conversationId, senderUsername, preview, url: "/chat/dm/<senderUsername>", tag: "dm:<conversationId>" }`
- **AND** the browser (via the service worker) shows an OS notification matching the payload

#### Scenario: No push when any tab is focused on the target conversation

- **WHEN** user A has at least one Centrifugo connection whose client has reported `focused: true` AND the focused view is the target conversation
- **THEN** the server does NOT send a push for events in that conversation
- **AND** the foreground Notification API path is the only dispatcher

#### Scenario: Expired subscription is pruned

- **WHEN** the server sends a push and `web-push` reports status `404` or `410` for a subscription
- **THEN** the server deletes that subscription row from `PushSubscription`
- **AND** future events do not attempt to push to the deleted endpoint

### Requirement: Subscription lifecycle endpoints

The server SHALL expose `POST /api/push/subscribe` and `DELETE /api/push/subscribe` for managing a signed-in user's push subscriptions.

#### Scenario: Subscribe upserts by endpoint

- **WHEN** the signed-in client sends `POST /api/push/subscribe` with a body containing `{ endpoint, keys: { p256dh, auth }, userAgent }`
- **THEN** the server upserts a row keyed by `(userId, endpoint)` and responds with `201 Created` or `200 OK`
- **AND** subsequent pushes for that user include this subscription as a target

#### Scenario: Unsubscribe removes only the caller's subscription

- **WHEN** the signed-in client sends `DELETE /api/push/subscribe` with `{ endpoint }`
- **THEN** the server deletes only the row matching `(userId, endpoint)` and responds with `204 No Content`
- **AND** subscriptions belonging to other sessions of the same user are untouched

#### Scenario: Unauthenticated callers are rejected

- **WHEN** either endpoint is called without a valid session cookie
- **THEN** the server responds with `401 Unauthorized`
- **AND** no subscription is created, updated, or deleted

### Requirement: Notification click navigates to the source

The service worker SHALL handle `notificationclick` by focusing an existing app window (or opening a new one) and navigating it to the URL carried in the notification payload.

#### Scenario: Click focuses an existing tab and navigates in-app

- **WHEN** the user clicks a DM notification while a tab of the app is already open
- **THEN** the SW calls `focus()` on that client
- **AND** sends it a `postMessage({ type: "navigate", url })` which the client handles via the in-app router (no full reload)
- **AND** the DM thread with the sender is displayed

#### Scenario: Click opens a new tab when none is open

- **WHEN** the user clicks a notification and no client window for the app is open
- **THEN** the SW calls `clients.openWindow(url)` with the URL from the payload
- **AND** the app loads directly on the target conversation or page

### Requirement: Feature detection and graceful degradation

The notifications settings panel SHALL detect browser support and current permission state and present a correct, non-broken UI in every case.

#### Scenario: Unsupported browser shows an explanatory message

- **WHEN** the browser lacks `Notification`, `serviceWorker`, or `PushManager`
- **THEN** the settings panel shows "Your browser does not support desktop notifications" and does not render the enable button
- **AND** no code path that requires these APIs is reached

#### Scenario: Previously-denied permission shows a help message instead of re-prompting

- **WHEN** `Notification.permission === "denied"`
- **THEN** the panel shows "Notifications are blocked. Enable them in your browser's site settings to receive alerts." with a link to browser-specific instructions
- **AND** the enable button is not rendered (clicking it would be silently rejected)
