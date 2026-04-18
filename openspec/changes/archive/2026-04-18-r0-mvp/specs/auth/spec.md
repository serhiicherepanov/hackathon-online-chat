## ADDED Requirements

### Requirement: Account registration

The system SHALL allow a new visitor to create an account by providing a unique `email`, a unique `username`, and a password, and SHALL start a signed-in session in the same request.

#### Scenario: Successful registration signs the user in

- **WHEN** a visitor submits `POST /api/auth/register` with a valid email, a unique username, and a password ≥ 8 characters
- **THEN** the server creates a `User` row with the password stored as an argon2id hash
- **AND** creates a `Session` row bound to the request's browser and sets a `Secure`, `HttpOnly`, `SameSite=Lax` cookie that identifies it
- **AND** responds with `200 OK` and a JSON body describing the authenticated user (no passwordHash)

#### Scenario: Duplicate email is rejected

- **WHEN** `POST /api/auth/register` is called with an email that already exists in `User`
- **THEN** the server responds with `409 Conflict`
- **AND** no new `User` or `Session` row is created

#### Scenario: Duplicate username is rejected

- **WHEN** `POST /api/auth/register` is called with a username that already exists in `User`
- **THEN** the server responds with `409 Conflict`
- **AND** no new `User` or `Session` row is created

#### Scenario: Invalid input is rejected

- **WHEN** `POST /api/auth/register` is called with a missing field, a malformed email, a username containing characters outside `[A-Za-z0-9_]` or a password shorter than 8 characters
- **THEN** the server responds with `400 Bad Request` and a JSON body describing the field errors
- **AND** no `User` or `Session` row is created

### Requirement: Sign-in with email or username

The system SHALL allow an existing user to sign in by submitting either their email or username together with their password, and SHALL start a new per-browser session on success.

#### Scenario: Valid credentials open a session

- **WHEN** `POST /api/auth/sign-in` is called with a correct email/password or username/password pair
- **THEN** the server verifies the password against the stored argon2id hash
- **AND** creates a new `Session` row with `userAgent`, `ip`, `createdAt`, and `lastSeenAt` populated
- **AND** sets the session cookie and responds with `200 OK` describing the authenticated user

#### Scenario: Invalid credentials are rejected without leaking account existence

- **WHEN** `POST /api/auth/sign-in` is called with a wrong password, or with an email/username that does not exist
- **THEN** the server responds with `401 Unauthorized` and the same generic error message in both cases
- **AND** no `Session` row is created

### Requirement: Persistent per-browser session

The system SHALL treat a session cookie as valid until it is explicitly invalidated; closing and reopening the browser SHALL NOT end the session, and inactivity SHALL NOT end it.

#### Scenario: Session survives browser restart

- **WHEN** a user signs in, closes the browser without signing out, then reopens the app
- **THEN** the existing session cookie is still accepted
- **AND** the server resolves the current user without requiring a new sign-in

#### Scenario: Multiple browsers hold independent sessions

- **WHEN** the same user signs in from browser A and browser B
- **THEN** two distinct `Session` rows exist for that user, each with its own token hash

### Requirement: Sign-out invalidates only the current browser

The system SHALL provide a sign-out endpoint that deletes the `Session` row corresponding to the caller's cookie and clears the cookie, WITHOUT affecting other active sessions of the same user.

#### Scenario: One browser signs out, another stays signed in

- **WHEN** user U is signed in on browsers A and B, and calls `POST /api/auth/sign-out` from browser A
- **THEN** the `Session` row for browser A is deleted and browser A's session cookie is cleared
- **AND** browser B's session remains valid and can continue authenticated requests

### Requirement: Current-user resolution

The system SHALL expose a way for the web client to obtain the current authenticated user for the request, used by the app shell to gate authenticated UI.

#### Scenario: Authenticated GET returns the user

- **WHEN** `GET /api/auth/me` is called with a valid session cookie
- **THEN** the server responds with `200 OK` and the authenticated user's id, email, and username
- **AND** updates `Session.lastSeenAt` to the current time

#### Scenario: Unauthenticated GET returns 401

- **WHEN** `GET /api/auth/me` is called without a session cookie, with an unknown cookie, or with a deleted `Session` row
- **THEN** the server responds with `401 Unauthorized`

### Requirement: Username immutability

The system SHALL NOT expose any API that updates `User.username` after account creation.

#### Scenario: No rename endpoint exists

- **WHEN** the auth API surface is inspected
- **THEN** there is no endpoint that accepts a new `username` for an existing account
