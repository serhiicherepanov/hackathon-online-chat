## Why

The recent avatar unification changed user fallback avatars from the previous face-like style to an abstract gradient treatment, which makes people and rooms feel visually indistinguishable. Restoring a human-oriented avatar style for users while keeping abstract avatars for rooms preserves quick scanning and the intended identity cues across the chat UI.

## What Changes

- Restore the generated fallback avatar style for users so user rows and message authors render the previous face-like treatment instead of the newer abstract gradient style.
- Keep generated room avatars abstract and deterministic so rooms remain visually distinct from people in the sidebar and other room surfaces.
- Clarify the shared avatar contract so user surfaces and room surfaces intentionally use different generated styles while still preserving deterministic rendering and uploaded user avatars.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chat-ui`: change the avatar rendering requirements so user identities use the restored face-like generated style while room identities continue to use deterministic abstract avatars.
- `social-graph`: change accepted-friend avatar requirements so contacts rows use the same restored user-avatar style as other user-facing surfaces.

## Impact

- Affected areas include shared avatar helpers/components plus signed-in UI surfaces that render user and room fallback avatars.
- No API, auth, persistence, or realtime contract changes are expected.
- Verification should focus on shared avatar rendering tests and visible UI flows that differentiate users from rooms.
