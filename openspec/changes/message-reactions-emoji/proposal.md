## Why

Classic chat users expect to acknowledge messages quickly without composing a reply. Emoji reactions provide lightweight feedback, reduce noise in busy rooms, and match familiar behavior from mainstream messengers. The product already supports rich text, attachments, and threads; reactions complete the core social signal layer for R4 polish.

## What Changes

- Persist **per-message emoji reactions** in PostgreSQL (who reacted with which emoji), scoped to conversation membership and the same DM freeze rules as sending messages.
- Expose **REST** to add or remove the caller’s reaction on a message (toggle or explicit add/remove — see design), with validation on emoji (Unicode emoji sequence, reasonable length cap).
- Include a **reactions summary** on every serialized message (history + realtime) so clients render counts and “who reacted” without N+1 requests.
- Publish **Centrifugo** events on the existing `room:{conversationId}` / `dm:{conversationId}` channels after DB commit so all participants see reactions update within the realtime budget.
- **Chat UI**: show reactions under each message bubble, allow picking an emoji (picker or quick bar), toggle own reaction; keyboard-accessible and consistent with shadcn/ui.
- **Tests**: unit tests for serialization/auth edge cases; Playwright coverage for reacting in a room (and DM if friendship setup exists in helpers).

## Capabilities

### New Capabilities

- `message-reactions`: Emoji reactions on messages — data model, authorization (members only; respect DM frozen/read-only), aggregation rules (one reaction per user per emoji vs toggle), REST API, realtime payload contract, and UX expectations for display and picker.

### Modified Capabilities

- `messages`: Message payloads from `GET` history and realtime events SHALL include reaction summaries; new mutation endpoint(s) for reaction changes SHALL follow the same membership and DM rules as messaging.
- `realtime`: Channel event lists and publish-after-commit rules SHALL include reaction update events alongside existing message events.
- `chat-ui`: Message list SHALL render reactions and expose a control to add/remove the user’s emoji reaction without leaving the thread.

## Impact

- **Prisma**: new model(s) for `MessageReaction` (or equivalent) with indexes for `(messageId)`, uniqueness `(messageId, userId, emoji)` or product-chosen key; migration + `pnpm db:generate`.
- **API**: new route handler(s) under `app/api/messages/[id]/reactions` or nested under conversations — aligned with existing message routes and session auth.
- **Server lib**: `lib/messages/serialize.ts` (and types in `lib/types/chat.ts`) extended with `reactions`; publish helpers next to `message.created` / `message.updated`.
- **Client**: message row component, TanStack Query invalidation or optimistic updates, Centrifugo handler for new event type(s); Zustand/query merge rules for live + paginated history.
- **Centrifugo**: no new channels — same `room:` / `dm:` channels; config unchanged unless payload size limits need tuning.
- **Docs**: README only if env or run instructions change (unlikely).
