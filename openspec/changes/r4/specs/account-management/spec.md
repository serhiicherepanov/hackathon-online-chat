## ADDED Requirements

### Requirement: Password reset works through a single-use recovery token
The system SHALL allow a logged-out user to request a password-reset token by email address, deliver a reset link through the configured dev/test transport, and accept that token exactly once to set a new password.

#### Scenario: Reset request does not leak account existence
- **WHEN** a visitor calls `POST /api/auth/password/reset` with any syntactically valid email
- **THEN** the system responds with the same success-shaped response whether or not the email belongs to an account
- **AND** if the account exists, the server creates a single-use reset token with an expiry and delivers the reset URL through the configured transport

#### Scenario: Valid token sets a new password
- **WHEN** a visitor calls `POST /api/auth/password/reset/confirm` with a valid unexpired token and a replacement password that satisfies the password policy
- **THEN** the server updates the account's password hash
- **AND** marks the token as used so it cannot be redeemed again

#### Scenario: Expired or reused token is rejected
- **WHEN** `POST /api/auth/password/reset/confirm` is called with an expired token, an unknown token, or a token whose `usedAt` is already set
- **THEN** the server responds with an error
- **AND** leaves the existing password hash unchanged

### Requirement: Signed-in users can manage profile and password settings
The system SHALL provide authenticated settings endpoints and UI for editing profile fields exposed by R4 and for changing the current password without altering the immutable username.

#### Scenario: User updates profile fields
- **WHEN** an authenticated user submits `PATCH /api/profile` with valid editable profile fields
- **THEN** the server persists the updated fields for that user
- **AND** subsequent current-user/profile reads return the new values

#### Scenario: User changes password from settings
- **WHEN** an authenticated user submits `POST /api/auth/password/change` with the correct current password and a valid new password
- **THEN** the server replaces the stored password hash
- **AND** the response confirms success without changing the user's username

### Requirement: Users can inspect and revoke active sessions
The system SHALL expose every active session for the authenticated user, including enough metadata to distinguish browsers, and SHALL allow revoking any session without terminating other untouched sessions.

#### Scenario: Sessions list shows the current and other browsers
- **WHEN** an authenticated user calls `GET /api/sessions`
- **THEN** the server responds with every active session for that user including id, created/last-seen timestamps, and browser-identifying metadata
- **AND** the current browser session is distinguishable from the others

#### Scenario: Revoking one session leaves others active
- **WHEN** the user calls `DELETE /api/sessions/:id` for one of their active sessions
- **THEN** the targeted session becomes invalid for future requests
- **AND** other active sessions for the same user remain valid

### Requirement: Delete account removes access while preserving non-owned room history
The system SHALL provide a destructive account-deletion flow that revokes the user's sessions, deletes rooms they own, removes their access elsewhere, and preserves authored messages in non-owned conversations under a tombstone identity.

#### Scenario: Owner deletes account
- **WHEN** an authenticated user confirms `DELETE /api/account`
- **THEN** the system invalidates that user's active sessions
- **AND** deletes rooms owned by that user using the room-deletion invariants already defined by the system
- **AND** removes the user from memberships and DM participation outside those deleted rooms
- **AND** preserves messages authored by that user in surviving conversations under a tombstone label rather than removing the rows

#### Scenario: Delete-account impact is explicit before confirmation
- **WHEN** the signed-in user opens the delete-account UI
- **THEN** the product shows a destructive warning that explains which owned rooms will be deleted and that messages in surviving conversations will be anonymized
- **AND** the API is not called until the user completes the confirmation step
