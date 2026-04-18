## Why

The current contacts UX is awkward: the contacts page has no way to find a friend in a long list and no shortcut to start a DM with them, the sidebar "New DM" popup forces users to type an exact username (no discovery), and friend requests only accept a raw user id — users don't see or share ids, they share emails and usernames. This change makes contacts first-class by letting users search, click-to-DM, and invite by either email or username.

## What Changes

- Add a search input on the contacts page that filters the **Friends**, **Incoming**, **Outgoing**, and **Blocked** sections by peer username (case-insensitive substring match) as the user types.
- Make each friend row on the contacts page clickable: clicking opens (creating if needed) the DM with that user and navigates to `/dm/:conversationId`.
- Replace the sidebar **"+ New DM"** dialog's free-text username field with a searchable contact list sourced from the caller's friends; clicking a contact starts/opens the DM. Keep the dialog usable when the user has zero friends (show an empty state that links to `/contacts`).
- Extend the friend-request API and UI to accept an **email or username** in addition to the existing `userId`, resolving it server-side to a target user. The contacts page "Send a friend request" form input accepts any of the three.
- Update validation, error shapes, and e2e/unit tests to cover search filtering, click-to-DM, and email-based invites.

## Capabilities

### New Capabilities
_None — this change only extends existing capabilities._

### Modified Capabilities
- `social-graph`: Friend-request creation accepts a peer identifier that may be a `userId`, `username`, or `email`; contacts page gains search + click-to-DM on friend rows.
- `direct-messages`: Sidebar DM creation flow is driven by contact selection rather than free-text username entry; underlying `POST /api/dm/:username` endpoint is unchanged.

## Impact

- Affected code:
  - `app/(app)/contacts/page.tsx` — add search, click-to-DM handler, broaden request-form label and validation.
  - `components/app/app-shell.tsx` — replace "New DM" username input with contact picker + search.
  - `app/api/friends/requests/route.ts` and `lib/validation/*` — accept `{ identifier }` (or keep `{ userId }` as alias) and resolve by id/username/email.
  - `lib/hooks/use-contacts.ts` — update `useSendFriendRequest` signature to pass identifier.
- No Prisma schema changes, no new Centrifugo channels. Existing realtime events unchanged.
- Tests: add unit tests for the contact-filter helper and identifier-resolution helper; add an e2e test for click-to-DM from contacts and from the sidebar picker, and for inviting by email.
