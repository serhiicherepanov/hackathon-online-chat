## 1. API: identifier-based friend requests

- [x] 1.1 Add `lib/social/resolve-identifier.ts` exporting `resolveUserByIdentifier(prisma, identifier)` that picks id / email / username branch per design §3 and returns `{ user } | { error: "user_not_found" }`.
- [x] 1.2 Add colocated unit tests `lib/social/resolve-identifier.test.ts` covering: cuid id match, email match, username match, unknown identifier, username that looks like a cuid, empty/whitespace identifier.
- [x] 1.3 Update `app/api/friends/requests/route.ts` Zod schema to accept `{ identifier: string }` with `{ userId: string }` as a legacy alias (same resolution); route uses `resolveUserByIdentifier` and preserves existing 400/403/404/409 error shapes.
- [x] 1.4 Confirm `pnpm typecheck` and `pnpm test` are green after changes.

## 2. Contacts page: search + click-to-DM + email/username invite

- [x] 2.1 In `app/(app)/contacts/page.tsx` add a controlled search input above the sections and `useMemo`-derived filtered lists for `friends`, `inboundRequests`, `outboundRequests`, `blockedUsers` (case-insensitive substring over `peer.username`).
- [x] 2.2 Rename the "Send a friend request" form label/placeholder to accept "user id, username, or email" and change the submit payload to `{ identifier }` (update `useSendFriendRequest` in `lib/hooks/use-contacts.ts` to forward `identifier` as-is).
- [x] 2.3 Make each friend row clickable (button-role wrapper) that calls `POST /api/dm/:username` and `router.push('/dm/'+conversationId)`; keep the existing **Remove** / **Block** buttons working and non-triggering (stop propagation).
- [x] 2.4 Add a colocated component test (or extend an existing one) for the filter helper extracted to `lib/social/filter-contacts.ts` covering match/no-match/empty-query cases.

## 3. Sidebar: contact-picker New DM dialog

- [x] 3.1 In `components/app/app-shell.tsx` replace the free-text username field inside the "Start a DM" dialog with a search input + scrollable list of the caller's accepted friends (sourced from `useContacts`).
- [x] 3.2 Clicking a contact row calls the existing `startDm(username)` helper (refactor current `startDm` to accept the username argument instead of reading from state), closes the dialog, and navigates to the new DM.
- [x] 3.3 When the friend list is empty, render an empty-state message and a `<Link href="/contacts">` CTA; do NOT render the username input in that case.

## 4. Tests

- [x] 4.1 Add e2e coverage in `e2e/` for: (a) inviting a friend by email succeeds and appears in outbound requests, (b) clicking a friend on `/contacts` opens their DM, (c) sidebar "+ New DM" picker opens the DM for the chosen contact. Seed social state via `e2e/helpers/social.ts` where needed.
- [x] 4.2 Run `timeout 900 env E2E_ARGS="-g contacts-search-dm" ./scripts/ci-e2e.sh 2>&1 | tee test-artifacts/contacts-search-dm.log | tail -n 5` and confirm green.

## 5. Docs + wrap-up

- [x] 5.1 Update `README.md` only if any user-visible setup/env changed (expected: no changes — no README updates required: no new env vars, ports, scripts, or setup steps).
- [x] 5.2 Run `pnpm typecheck && pnpm test` and `openspec validate add-contacts-search-dm --strict`; fix any issues.
