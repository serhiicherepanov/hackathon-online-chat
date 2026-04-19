## 1. API and types

- [ ] 1.1 Extend `GET /api/me/dm-contacts` to include `peer.avatarUrl` (nullable) from `User.avatarUrl` for each DM peer; update any serializers and shared TS types used by the client.
- [ ] 1.2 Add or extend unit tests for the dm-contacts response shape (existing test file next to route or lib helper).

## 2. Sidebar layout and chrome

- [ ] 2.1 Reorder shell sidebar sections to **Invites → Direct messages → Rooms**; ensure invite data (`GET /api/me/invites`) still mounts correctly in the Invites block.
- [ ] 2.2 Add compact header actions: **new DM** beside "Direct messages", **browse rooms** + **create room** beside "Rooms", reusing the same dialog/navigation behavior as today’s flows.
- [ ] 2.3 Fix accordion disclosure: **right** chevron (or equivalent) when collapsed, **down** when expanded; remove misleading upward-only collapsed styling.

## 3. DM rows: avatar and presence

- [ ] 3.1 Render peer avatar (image or initials/placeholder) on each DM row using `avatarUrl` from the contacts payload.
- [ ] 3.2 Wire DM peer user ids into the existing presence snapshot + `presence.changed` path so each row shows `online` / `afk` / `offline` within the same timing expectations as other presence UI.

## 4. Verification

- [ ] 4.1 Update or add component/unit tests for sidebar ordering and chevron behavior if the project tests these surfaces.
- [ ] 4.2 Extend e2e coverage for the authenticated shell if needed (sidebar order, header buttons, DM row presence/avatar smoke), and run the stack-backed e2e suite before push per `AGENTS.md`.
