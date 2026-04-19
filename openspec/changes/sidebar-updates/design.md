## Context

The signed-in shell sidebar currently lists Rooms and Direct messages in an order that predates the private-room invite inbox. Primary actions (new DM, browse/create room) are not consistently placed next to the section they affect. DM rows show identity text and unread state but not the same avatar/presence affordances users see in room member lists. Accordion disclosure styling can read as “up” when collapsed, which conflicts with common expand/collapse patterns.

## Goals / Non-Goals

**Goals:**

- Establish sidebar section order: **Invites → Direct messages → Rooms**.
- Place **start new DM** and **room catalog / create room** as compact header-adjacent controls (icon buttons or small secondary buttons) next to their section titles.
- Show **avatar** and **live presence** on each DM row, within existing presence snapshot + `presence.changed` semantics and timing.
- Use **right chevron when collapsed**, **down when expanded** for accordion triggers.

**Non-Goals:**

- Changing DM creation rules, friendship gates, or `POST /api/dm/:username` behavior.
- Changing room catalog or create-room APIs beyond any type/serialization updates needed for the sidebar.
- New presence algorithms or new Centrifugo channels (reuse `user:{id}`, `presence`, and `GET /api/presence`).

## Decisions

1. **Extend `GET /api/me/dm-contacts` peer shape** with `avatarUrl: string | null` sourced from `User.avatarUrl` in the same query that loads DM peers. **Rationale:** Avoids N+1 profile fetches and keeps TanStack Query cache stable; avatar is display metadata, not a separate capability.
2. **Presence for DM peers via existing presence stack.** Client collects peer user ids from the DM contacts query, calls `GET /api/presence?userIds=...` (batched within the 1000-id limit), subscribes to `presence` / per-user channels already used elsewhere, and maps `presence.changed` to rows by `userId`. **Rationale:** Matches members panel behavior and avoids duplicating presence state in the DM contacts JSON (optional alternative: embed `status` in dm-contacts—rejected to avoid coupling HTTP list refresh rate to presence churn).
3. **Header actions reuse existing flows.** The “new DM” control opens the same contact-picker dialog and navigation as today; Rooms header uses links or `router` navigation to `/rooms` and the same create-room modal entry point the catalog uses (extract shared trigger if needed). **Rationale:** No duplicate business logic; satisfies “small button near title.”
4. **Accordion icons.** Use the design system’s `ChevronRight` / `ChevronDown` (or Lucide equivalents) on the trigger; rotate transitions optional. **Rationale:** Meets “right when closed” explicitly.

## Risks / Trade-offs

- **Presence subscription count** → Mitigation: subscribe to `presence` once (already typical) and filter client-side; only snapshot ids for visible DM peers.
- **Slightly larger dm-contacts payload** → Mitigation: one nullable string per peer; negligible vs. message payloads.

## Migration Plan

Deploy as a normal app release: API adds nullable `avatarUrl` field—**backwards compatible** for clients if they ignore unknown fields; update TypeScript types and UI together. No database migration if `avatarUrl` already exists on `User`.

## Open Questions

- None blocking: exact icon size and spacing follow existing shadcn `Accordion` / `Collapsible` patterns in the repo.
