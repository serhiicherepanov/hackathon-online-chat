# R2 — Social Graph & Presence v2

Goal: layer the social graph (friends, blocks) on top of the already-working
chat, upgrade presence with correct AFK + multi-tab aggregation, and add typing
indicators.

These are "nice" features rather than "show-stopper" features, which is why
they come after rich messaging in the hackathon ordering. If time runs out,
R0 + R1 alone is still a strong submission.

Builds on [R1](r1-rich-messaging.md).

## Scope (in)

- Friends: send request (by username or from room member list), accept, decline, remove. Optional note on request.
- User-to-user block:
  - blocks prevent new DMs in both directions
  - prior DM history becomes read-only with a frozen banner
  - friendship between the two is effectively terminated
- Enforce DM rule retroactively: new DMs require an accepted friendship and no active block between the pair. Existing R0/R1 DMs are grandfathered.
- Presence v2:
  - AFK state added to `online` / `offline`
  - each tab is one Centrifugo client on `user:{id}`
  - online if any tab active; AFK iff every tab idle >60 s; offline iff no clients
- Typing indicators in rooms and DMs.

## Data model additions

- `Friendship` — userAId, userBId (sorted pair), status (`pending` | `accepted`), requestedById, note, createdAt
- `UserBlock` — blockerId, blockedId, createdAt
- `Presence` — userId, state, updatedAt (DB mirror for cold-load fallback)

## API additions

- `GET /api/friends`, `POST /api/friends/requests`, `POST /api/friends/requests/:id/accept|decline`, `DELETE /api/friends/:userId`
- `POST /api/blocks`, `DELETE /api/blocks/:userId`
- DM send now rejects with `403` if not friends or if either side has a block.

## Realtime additions

- `user:{userId}` events: `friend.request`, `friend.accepted`, `dm.frozen`
- `room:{roomId}` and `dm:{convId}`: `typing` event (throttled client-side, auto-expires after 3 s)
- AFK detection: per-tab inactivity timer (mouse/kbd/visibility) publishes `afk=true|false` on `user:{id}`; server aggregates across tabs and re-publishes `presence.changed`.

## UI additions

- Routes: `/(app)/contacts` (friends list + pending requests + blocked users).
- Components: `FriendRequestDialog`, `PresenceDot` upgraded with AFK half-circle style, `TypingIndicator`, `DmFrozenBanner`, block/unblock menu on user cards.
- Sidebar DM list: presence dot reflects full online/AFK/offline.

## Acceptance criteria

1. A sends a friend request to B by username → B sees it; B accepts → both see each other in contacts.
2. B opens two tabs and idles >60 s in both → A sees B as AFK in under 2 s; B nudges the mouse in one tab → A sees B online in under 2 s.
3. B closes all tabs → A sees B offline within a few seconds of the final socket drop.
4. A blocks B → new DM send from either side is rejected with 403; existing DM history is read-only with a visible frozen banner on both sides.
5. Typing indicator appears for A within 1 s of B starting to type in a room or DM; disappears within 3 s of B stopping.
6. With R0 DMs grandfathered: a previously started DM between two non-friends continues to function; a fresh DM attempt between non-friends is rejected.
