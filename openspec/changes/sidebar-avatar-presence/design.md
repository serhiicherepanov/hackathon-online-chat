## Context

- The current product already requires deterministic avatars in conversation rows, avatar display in DM sidebar rows, and live presence on DM/member surfaces, but those rules do not yet define one shared avatar system across rooms, contacts, and messages.
- The request is cross-cutting UI work: it touches the signed-in shell, contacts page, members panel, and any shared identity/presence primitives that those surfaces consume.
- The user explicitly wants room avatars to use abstract generated art from `boring-avatars`, and Context7 confirms the library's `name`, `variant`, `colors`, and `size` props are sufficient for a centralized deterministic renderer.

## Goals / Non-Goals

**Goals:**

- Standardize fallback avatar generation for users so the same person renders the same avatar in chat history, DM rows, contacts, and room/member surfaces.
- Add deterministic abstract avatars for room rows in the sidebar so rooms are as visually scannable as DM peers.
- Standardize presence presentation as a small badge attached to the avatar's bottom-right corner while preserving the existing `online` / `afk` / `offline` model and realtime timing budget.
- Keep the change primarily UI-focused, with little or no backend/API churn.

**Non-Goals:**

- Changing presence semantics, heartbeat timing, or Centrifugo channel design.
- Adding user-uploaded room avatars or any new media storage flow.
- Reworking unrelated sidebar ordering, unread logic, or message author layout beyond the shared avatar contract.

## Decisions

1. **Centralize avatar generation behind shared primitives.** Introduce or extend shared avatar helpers/components so every surface calls the same code path instead of re-implementing fallback logic. For user avatars, use immutable identity data (preferably stable user id, with username only for labels) as the `boring-avatars` seed so the same person keeps the same generated avatar across reloads and future profile edits. For room avatars, seed from stable room identity data so a room row stays visually consistent.
2. **Use one library-backed fallback style.** Adopt `boring-avatars` for generated fallback visuals with a single chosen `variant` and palette defined in one place. Alternatives considered: keep ad-hoc initials-only fallbacks (too inconsistent and visually weak for rooms) or hand-roll SVG generation (more maintenance for little product value).
3. **Preserve uploaded avatars when available.** Existing `avatarUrl` user images still win; the shared generator only covers fallback rendering and room avatars. This avoids changing backend data contracts while still fixing mismatched fallback rendering.
4. **Anchor presence to the avatar, not the text row.** Render a compact status badge in the avatar container's bottom-right corner on surfaces that already expose presence. Alternatives considered: keep a detached dot next to usernames (less scannable once rows include avatars) or add both dot and badge (duplicated signal, noisier UI).
5. **Verify with focused UI tests.** Update component/unit coverage around shared avatar rendering and status-badge placement, and keep at least one e2e assertion on the visible sidebar/member flow so the cross-surface contract does not regress silently.

## Risks / Trade-offs

- **Different existing surfaces may use different seed inputs today** -> Mitigation: define a single helper API that accepts canonical ids and labels so new and old callers converge on one rule.
- **Generated room avatars may feel arbitrary** -> Mitigation: use a stable variant/palette so the abstract shapes read as intentional identity markers rather than random noise.
- **Presence badge overlay can crowd very small avatars** -> Mitigation: constrain the badge size per avatar size tier and keep the overlay only on surfaces that already expose presence.
- **A new dependency adds bundle weight** -> Mitigation: confine usage to shared avatar components and avoid duplicating multiple avatar systems.

## Migration Plan

- Ship as a normal frontend change with no data migration.
- Reuse existing user avatar URLs and presence APIs/events.
- If regressions appear, fallback behavior can be restored by swapping the shared renderer implementation without changing persisted data.

## Open Questions

- Should public room catalog rows also adopt the same room avatar treatment now, or should this change remain scoped to the signed-in sidebar and other currently requested surfaces only?
