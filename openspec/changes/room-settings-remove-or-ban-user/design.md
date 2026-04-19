## Context

Room moderation already supports ban and membership removal APIs, but the room settings UI exposes a single "remove user" action that does not clearly communicate whether the target is only removed or also banned. This creates moderator confusion and inconsistent expectations for rejoin behavior.

## Goals / Non-Goals

**Goals:**
- Expose explicit `Remove` and `Ban` actions in Manage Room member moderation flows.
- Define clear, user-visible outcomes for each action and align them with server behavior.
- Keep moderation caches/views (members list, banned list, open room state) consistent after each action.
- Add test coverage for both paths from the room settings surface.

**Non-Goals:**
- Redesigning the entire Manage Room dialog layout.
- Introducing new moderation roles or changing owner/admin permission boundaries.
- Changing invite workflows, DM rules, or unrelated room settings behavior.

## Decisions

- **Separate moderation intents in spec and UI.** `Remove` ejects a current member without creating a room ban; `Ban` creates/retains a room ban and ensures the user is not a member.
  - Alternative considered: keep one destructive action with a secondary toggle in confirmation.
  - Reason for rejection: still adds ambiguity and increases moderator error risk.
- **Keep existing permission model.** Owners and admins keep authority to remove/ban non-owner users; owner remains protected.
  - Alternative considered: owner-only ban action.
  - Reason for rejection: unnecessary scope change and inconsistent with existing R3 moderation model.
- **Use explicit confirmation copy per action.** Remove confirmation explains user can rejoin via normal flows; ban confirmation explains rejoin is blocked until unban.
  - Alternative considered: silent action with toast only.
  - Reason for rejection: destructive actions need up-front clarity.
- **Drive UI updates through existing query invalidation/live events.** After successful remove/ban, refresh members and bans datasets and handle self-target edge cases by revoking room view.
  - Alternative considered: full-page refresh after moderation.
  - Reason for rejection: degrades UX and conflicts with current live-update architecture.

## Risks / Trade-offs

- **Moderator misclick risk remains with two destructive actions** -> Mitigate with distinct labels, iconography, and explicit confirmation copy.
- **Behavior drift between API and UI wording** -> Mitigate by codifying both outcomes in capability specs and adding e2e assertions.
- **Edge-case inconsistency when target is currently offline or in another tab** -> Mitigate by relying on persisted room membership/ban state and existing access-revocation events.
