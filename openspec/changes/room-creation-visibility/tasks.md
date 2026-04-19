## 1. Create-room UI

- [ ] 1.1 Add `public` | `private` visibility control (default `public`) to the `/rooms` create-room dialog in `app/(app)/rooms/page.tsx`, with neutral title and short helper text for private rooms.
- [ ] 1.2 Submit `visibility` from local state in `POST /api/rooms` JSON; reset visibility to `public` when the dialog closes after success or cancel, consistent with other fields.
- [ ] 1.3 On `201` response, read `room.id` from the JSON body, invalidate `["rooms"]` and `["me", "rooms"]`, then navigate with `router.push(`/rooms/${id}`)` and close the modal.

## 2. Verification

- [ ] 2.1 Extend `e2e/helpers/rooms.ts` (or add a sibling helper) so tests can create a room from the UI with a chosen visibility; update or add a Playwright spec that covers private creation (e.g. assert request/network or that the new room opens and is absent from the public catalog list).
- [ ] 2.2 Run `pnpm typecheck` and `pnpm test`; run targeted or full `./scripts/ci-e2e.sh` per AGENTS.md before push.
