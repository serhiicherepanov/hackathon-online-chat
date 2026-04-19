## Context

- `POST /api/rooms` and `lib/validation/rooms.ts` already accept `visibility: "public" | "private"` (default public on the server).
- `app/(app)/rooms/page.tsx` hardcodes `visibility: "public"`, uses the title “Create a public room,” and does not navigate to the new room on success (the main `chat-ui` spec expects navigation after create).

## Goals / Non-Goals

**Goals:**

- Let users pick **public** or **private** in the create-room modal and send the chosen value in `POST /api/rooms`.
- Use copy that sets expectations: public rooms appear in the catalog; private rooms do not and rely on invites/membership.
- After successful create, **navigate to** `/rooms/<id>` and close/reset the modal so behavior matches the existing spec scenario.
- Add or extend tests so the visibility control and request body are covered from the UI layer.

**Non-Goals:**

- Changing invite flows, catalog filtering rules, or room moderation APIs.
- Adding a new “create private room” entry point elsewhere in the shell (only the existing `/rooms` modal).

## Decisions

1. **Control type**: Use **radio group** (two options) with **default public** — fewer mis-clicks than a bare select, matches binary choice, aligns with shadcn `RadioGroup` if already in the project; otherwise use segmented control pattern with the same semantics.
2. **State**: Local `useState<"public" | "private">` in the page (or a tiny extracted component) initialized to `"public"`; reset when the dialog closes.
3. **Success path**: Parse `201` JSON for `id` (or whatever the route already returns), then `router.push(`/rooms/${id}`)` plus existing query invalidations so sidebar/catalog stay fresh.
4. **Tests**: Update `e2e/helpers/rooms.ts` to accept an optional visibility or add `createRoomFromCatalog(page, { name, visibility })`; add one e2e path that creates a private room and asserts it does not appear in the catalog list while membership/sidebar shows it (or assert POST via network if simpler). Prefer one focused spec over duplicating every test.

## Risks / Trade-offs

- **Private room not in catalog** → Users may think creation failed; mitigate with short helper text under the visibility control (“Private rooms are hidden here; use invites from the room.”).
- **Navigation vs current behavior** → Slightly changes UX (user leaves catalog page); aligns with written spec and reduces confusion about where the new room went.

## Migration Plan

- Ship with normal deploy; no data migration.

## Open Questions

- (none)
