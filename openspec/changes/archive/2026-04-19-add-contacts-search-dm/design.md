## Context

R2 landed the `social-graph` capability (friends, requests, blocks) and the sidebar `+ New DM` dialog from earlier phases. Two rough edges remain:

1. The contacts page is a static list with no filter, and a friend row has no affordance to start a DM — users must memorize usernames and type them into a separate dialog.
2. `POST /api/friends/requests` accepts only a raw `userId` in its body. Users copy-paste ids out of Prisma Studio or URL params during QA; this is not how a real messenger onboards contacts.

Fixing (1) and (2) is a pure UI + light-API change: no schema migration, no new realtime channels.

## Goals / Non-Goals

**Goals:**
- Searchable contacts page that filters in-place across all four sections (friends, inbound, outbound, blocked) by username substring.
- Click-to-DM from any friend row on the contacts page and from a new contact picker inside the sidebar "New DM" dialog.
- `POST /api/friends/requests` accepts a single free-form `identifier` that may be a user id, username, or email.

**Non-Goals:**
- No global user search / directory (caller can only send a request by a specific identifier they already know).
- No change to friendship, block, or DM access rules (R2 semantics stand).
- No change to realtime event shapes or Centrifugo channels.
- No new Prisma columns or indexes (username and email are already unique in the schema).

## Decisions

### 1. Client-side filter over a server-side search endpoint

The contacts payload is already fully loaded via `GET /api/friends` and is expected to stay small per the sizing hint in `AGENTS.md` (~50 contacts). A client-side filter is simpler, avoids a new endpoint, and is instant. If the list ever grows past a few hundred entries, we can revisit and introduce `?q=` server-side filtering without changing the UI contract.

**Alternative considered:** add `?q=` to `GET /api/friends`. Rejected as premature.

### 2. Contact picker replaces free-text username in "New DM"

The new dialog renders the caller's **friends** list with a search box on top. Clicking a row calls the existing `POST /api/dm/:username` endpoint and navigates to `/dm/:conversationId`. We deliberately drop the free-text username field because (a) R2's friendship gate already requires a friendship to start a new DM, so typing a stranger's username just produces a 403, and (b) the picker is strictly more usable. Empty state (no friends yet) shows a short message and a link to `/contacts`.

**Alternative considered:** keep both a picker and a free-text field. Rejected — the free-text path is a dead end for strangers and adds noise.

### 3. Friend request identifier resolution order: id → username → email

`POST /api/friends/requests` now accepts `{ identifier: string }`. The server resolves it in this order:
1. If it matches `/^c[a-z0-9]{24}$/` (CUID shape used by Prisma), treat as a user id.
2. Else if it contains `@`, resolve by unique email.
3. Else, resolve by unique username.

A helper `resolveUserByIdentifier(prisma, identifier)` returns `{ user } | { error: "user_not_found" }`; existing 404 / 400 / 409 shapes are preserved. For backwards compatibility with the R2 tests and any external callers, the endpoint also still accepts the legacy `{ userId }` body shape and treats it as `{ identifier: userId }` — a deprecation note goes in the route comment.

**Alternative considered:** separate fields `{ email?, username?, userId? }`. Rejected — one free-form input matches the UI and the mental model.

### 4. Reuse existing data, no new hooks

`useContacts` already returns the full friend/request/block payload; filter purely in the component with `useMemo`. `useSendFriendRequest` is updated to take a single `identifier` string (its current signature) — no shape change on the client call site.

## Risks / Trade-offs

- **[Email enumeration via friend requests]** → Responding `404 user_not_found` for unknown emails lets an attacker probe which emails are registered. **Mitigation:** return the same error shape (`{ error: "user_not_found" }`) for unknown id, username, and email, i.e. no extra bit of information is leaked beyond what the username path already leaks today. If this becomes a concern, we can later collapse all "cannot send request" errors to a single generic error — out of scope here.
- **[Identifier heuristic edge cases]** → A username containing `@` would be misrouted to the email branch; the Zod validator already rejects `@` in usernames so this is a non-issue.
- **[Large contacts list performance]** → Client-side filter is O(n) per keystroke; fine up to a few thousand rows rendered with a simple filter. If we ever cross that threshold, swap in a server-side `?q=`.
- **[Backwards compatibility]** → Existing R2 tests POST `{ userId }`. Keeping that shape as an accepted alias avoids touching those tests on unrelated assertions.
