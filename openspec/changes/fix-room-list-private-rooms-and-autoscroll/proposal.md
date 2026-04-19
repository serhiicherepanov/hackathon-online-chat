## Why

Users currently lose track of private rooms they belong to because the general room browsing surfaces only public rooms. Separately, switching into an existing conversation can leave the newest messages below the viewport, forcing an extra manual scroll, the room members panel can go stale when another user joins until the page is reloaded, and the sidebar still has UX mismatches in both its header control order and what counts as an invite.

## What Changes

- Update the general room-browsing UI so authenticated users can discover their own private-room memberships from that screen, while keeping the public joinable catalog limited to public rooms and ordering the private-room section before public results.
- Clarify the conversation-view scroll contract so opening or switching to a conversation anchors the list on the latest messages when the user has not intentionally scrolled away in that session.
- Update the room view so the members panel reflects newly joined users live instead of waiting for a manual refresh.
- Correct the sidebar accordion header layout so each header renders title first, then action buttons, then the open/close arrow.
- Expand the sidebar Invites section so it aggregates both pending private-room invites and incoming friend requests.
- Replace generic room avatars in room lists with visibility-aware icons: a public-room icon for public rooms and a lock icon for private rooms.
- Add or adjust automated coverage for the room-list visibility behavior, the conversation-open autoscroll behavior, the live member-list update behavior, and the sidebar invite/header/room-icon behaviors.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chat-ui`: Extend the app-shell, room-browsing, conversation-view, and room-members-panel requirements so the sidebar uses the correct header control order, the Invites section aggregates room and friend invites, room rows use visibility-aware icons for public vs private rooms, the `/rooms` experience surfaces the caller's private-room memberships in a separate section before the public catalog, entering an existing room or DM shows the latest messages in view instead of leaving the newest content below the fold, and visible room membership stays current when other users join.

## Impact

- **Code**: Sidebar/app-shell invite aggregation, accordion headers, and room-row icons, `app/(app)/rooms/page.tsx`, room-list query composition for `/api/rooms` plus `/api/me/rooms`, room-view members-panel state/subscriptions, `components/chat/message-list.tsx`, and related unit/e2e tests.
- **APIs**: No new endpoint required if the page reuses existing room-membership data; otherwise only minimal read-shape adjustments should be considered.
- **Realtime**: Reuse the existing room-channel membership event contract (for example `member.joined`) and the existing user-scoped `friend.request` notification rather than adding a new event family; conversation-open behavior must remain compatible with existing live message handling.
- **Docs**: OpenSpec artifacts only unless implementation reveals user-facing setup or behavior that is documented elsewhere.
