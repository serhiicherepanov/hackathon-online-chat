## Context

The chat already persists messages in PostgreSQL, serves keyset-paginated history over REST, and fans out `message.*` events on `room:{conversationId}` and `dm:{conversationId}` after transactions commit. Clients merge TanStack Query pages with Centrifugo streams in Virtuoso-backed threads. There is no reaction model or API yet.

## Goals / Non-Goals

**Goals:**

- Store emoji reactions with clear uniqueness rules, enforce the same conversation membership and DM freeze rules as sending a message.
- Return a compact **reactions summary** on every message payload (REST history + realtime) so the UI does not refetch per message.
- Publish a single realtime event shape after commit so all participants update counts and “who reacted” consistently.
- Ship a usable picker + chips UI with keyboard access and tests.

**Non-Goals:**

- Non-emoji stickers, image reactions, or paid emoji packs.
- Push notifications or unread badges for reactions.
- Reactions on deleted messages (reactions are rejected or stripped when the message is soft-deleted — see decisions).
- Emoji moderation beyond validation length and allowed scalar/sequence characters.

## Decisions

1. **Data model**  
   - Table `MessageReaction` (or equivalent Prisma model): `id` (cuid), `messageId`, `userId`, `emoji` (UTF-8 string storing a single Unicode emoji or ZWJ sequence), `createdAt`.  
   - **Unique** constraint on `(messageId, userId, emoji)` so a user can add multiple distinct emojis per message but at most one row per emoji per user.  
   - Index on `(messageId)` for aggregation on read. Cascade delete when `Message` is removed.

2. **Emoji validation**  
   - Server validates `emoji` after trim: non-empty, UTF-8 byte length ≤ 64, and matches a documented pattern (emoji presentation / sequences only — no arbitrary text). Reuse or align with any existing emoji helper from the composer/picker if present.  
   - Reject mixed text + emoji in one “emoji” field with `400`.

3. **API**  
   - `POST /api/messages/:messageId/reactions` with body `{ "emoji": "<validated>" }` **toggles** the caller’s reaction: if the row exists, delete it (`200` with `action: "removed"`); otherwise insert (`200` with `action: "added"`). Idempotent for repeat “add” of same emoji (second call removes).  
   - Alternative considered: separate DELETE — rejected to keep one gesture from the UI and fewer routes.  
   - Authorization: load message → conversation → `assertMember` (same as GET message); DM frozen → `403` with same error family as send. Reaction on soft-deleted message → `410` or `400` (pick one and document in spec).

4. **Serialization**  
   - Extend `MessagePayload` with `reactions: ReactionSummary[]` where each entry is `{ emoji, userIds: string[], count: number }` ordered by `emoji` codepoint order for stability, with `userIds` sorted lexicographically for deterministic payloads. Cap `userIds` in the payload to a fixed maximum (e.g. 20) with `count` reflecting the true total — **or** include all participant ids up to room size cap; for ~300 concurrent users and few reactions per message, including all ids is acceptable; document the chosen cap in spec if truncated.

5. **Realtime**  
   - After successful toggle transaction, publish `message.reactions.updated` on the same channel as other message events (`room:` / `dm:`) with `{ type, conversationId, messageId, reactions: ReactionSummary[] }` matching the REST serializer. Publish only after DB commit; HTTP failures logged, mutation still succeeds (mirror `message.updated` behavior).

6. **Client**  
   - TanStack Query: invalidate conversation messages query or merge the single message update in the infinite query cache on `message.reactions.updated`.  
   - Optimistic update optional; must reconcile on failure.  
   - UI: row of chips + “add reaction” opening emoji picker (existing component if available).

## Risks / Trade-offs

- **Payload size in large rooms** — Many distinct reactions could bloat events; mitigation: cap distinct emojis per message (e.g. 20) or cap listed user ids per emoji; document in spec.  
- **Hot path contention** — High toggle rate on one message is rare at target scale; single row upsert/delete is sufficient.  
- **Emoji normalization** — Different codepoints for “same” glyph; mitigation: normalize with a small library or reject variants not matching stored form (document).

## Migration Plan

1. Deploy migration adding `MessageReaction` + indexes.  
2. Deploy application code: new API, serializer, Centrifugo publish, client handlers.  
3. Old clients ignore unknown `reactions` field and unknown event type until updated.  
4. Rollback: remove client usage first; then API; then table (separate migration).

## Open Questions

- Exact emoji validation strategy (regex-only vs `emoji-regex` / `unicode-emoji` package) — resolve during implementation to match lockfile and bundle size.  
- Whether to show reactions on soft-deleted messages — default **no** (empty reactions on deleted payload).
