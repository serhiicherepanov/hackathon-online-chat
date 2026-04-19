## Why

The chat sidebar grew feature-by-feature: room lists, DMs, and invites landed in different places, so navigation feels inconsistent. Users scan for conversations first; putting DMs after rooms and burying primary actions hurts discoverability. This change aligns the shell with a clearer hierarchy and surfaces peer context (avatar and presence) directly in the DM list.

## What Changes

- Reorder sidebar sections to **Invites → Direct messages → Rooms** (top to bottom).
- Move **start new DM** to a compact control beside the **Direct messages** section title (instead of a dominant control elsewhere in the block).
- Move **browse/create room** actions beside the **Rooms** section title (same pattern as DMs).
- Show each **DM row** with the peer’s **avatar** (or a stable fallback) and **presence status** (online / AFK / offline), consistent with aggregate presence rules.
- Fix **accordion disclosure**: when a section is **collapsed**, the chevron points **right**; when **expanded**, it points **down** (or another clear “open” affordance—not “up” when closed).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `chat-ui`: App shell sidebar structure—section order, accordion affordances, placement of “new DM” and room catalog/create controls next to section headers, DM list row layout including avatar + presence.
- `direct-messages`: DM contacts listing used by the sidebar SHALL include enough peer identity for avatars (`avatarUrl` or null) so the client can render rows without extra per-row profile fetches; presence MAY be merged in the same payload or obtained via the existing presence snapshot + live channel (design will pick one approach and keep a single coherent contract).
- `presence`: Clarify that DM peer rows in the sidebar SHALL reflect the same `online` / `afk` / `offline` semantics as elsewhere, seeded and updated within the existing snapshot and `presence.changed` budget (no new presence algorithm).

## Impact

- **UI**: `components/app/` shell and sidebar accordion components (likely `app-shell` or equivalent), DM and room section headers, styles/icons for chevrons.
- **API**: Possible extension to `GET /api/me/dm-contacts` response shape; TanStack Query keys/types for DM contacts.
- **Client state**: Zustand/query types for DM list rows; wiring peer ids into presence snapshot subscription set if not already covered.
- **Tests**: Unit tests for serializers/helpers; e2e or RTL tests for sidebar order and accordion behavior if covered today.
