## Context

R0 shipped a working chat with plain text, rooms, DMs, and Centrifugo fan-out. The named `uploads` volume was already reserved in `docker-compose.yml` but nothing writes to it yet. All messages use a single shape `{ id, conversationId, authorId, body, createdAt }`, rendered by `MessageItem` and sent by a single-line `MessageComposer`.

R1 adds attachments, reply, edit, delete, multiline composer, and emoji while staying inside the existing architectural rules (REST for request/response, Centrifugo for live fan-out, Postgres as the source of truth, Virtuoso for lists). All new behavior must survive disconnects, multi-tab, and very long histories — the same constraints R0 already met.

## Goals / Non-Goals

**Goals:**

- Add attachments (images + arbitrary files) end-to-end: upload, persist, associate with a message, re-check access on every download.
- Add reply/quote, edit, and soft-delete at both the API and realtime layer with stable contracts.
- Upgrade composer and message renderer to feel like a normal chat (multiline, emoji, paste-to-upload, inline edit, pending state).
- Keep the Virtuoso-backed list happy: edits/deletes must land live without jumping scroll or forcing a reload.

**Non-Goals:**

- Admin/mod edit-or-delete-of-others (lands in R3).
- Rich link previews, audio/video message authoring, GIF search. Plain embedded `<img>` thumbnail + lightbox is enough.
- Server-side image resizing / transcoding. Original bytes are served as-is with size/mime validation only.
- Full-text search over messages (out of scope for R1).
- Antivirus / malware scanning on uploads (documented risk, not shipped).

## Decisions

### Two-phase upload: `POST /api/uploads` then message create with `attachmentIds`

- The client uploads each file via `POST /api/uploads` as multipart and receives `{ id }`. The message is then sent with `attachmentIds: [id, ...]`.
- Rationale: lets the composer show per-attachment progress, lets paste-to-upload start immediately without waiting for the user to press Enter, and keeps `POST /api/conversations/:id/messages` a small JSON body even when 5 files are attached.
- Staged attachments that are never attached to a message are garbage-collected by a periodic job (age > 1 h and `messageId IS NULL`). We do not block on GC for R1 — the `Attachment` row carries `uploaderId`, `messageId NULLABLE`, `createdAt`.
- Alternative considered: single multipart `POST /api/conversations/:id/messages`. Rejected: breaks progress UI, and mixes JSON + binary in a place we already parse as JSON.

### Storage layout `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`

- UUID filename avoids any user-controlled bytes on disk (no path traversal risk); year/month buckets keep `ls` usable and play nicely with backup tooling.
- `originalName` is stored in the DB and returned via `Content-Disposition` on download so the user sees the file they uploaded.
- Alternative: flat `{uuid}{ext}`. Rejected because tens of thousands of files per directory get unpleasant fast.

### Soft-delete via `deletedAt`, not row removal

- We keep the row so reply targets and quoted renderings still resolve (we render a `[deleted]` placeholder). History pagination continues to include deleted rows but the serializer strips `body` and `attachments`.
- Alternative: hard delete + cascade. Rejected because it creates holes in reply chains and interacts badly with optimistic UI that may be mid-send.

### `message.updated` and `message.deleted` are separate events

- `message.updated` carries the new body + `editedAt`; `message.deleted` carries only `{ id, deletedAt }`. Clients merging with TanStack Query pages can do a simple `id` lookup.
- Alternative: one `message.changed` with a `kind` discriminator. Rejected as marginally shorter but harder to type-narrow on the client.

### Size limits enforced in three places

- Client pre-check (`File.size`) for instant feedback; server multipart parser hard limit (`20 MB`); dedicated image-mime branch capped at `3 MB`. All three are bypassable individually but together catch every realistic failure.
- We use Next.js Route Handlers with a streaming multipart parser (not Server Actions) so we can enforce byte caps early and return `413` without buffering the whole file in memory.

### `GET /api/files/:id` re-checks membership on every request

- We do not rely on the upload-time check. A user who is kicked from a room between R1 and R3 (dev action today, real flow in R3) must immediately lose download access.
- The endpoint resolves `attachment → message → conversation` and calls the same membership helper used by `/api/conversations/:id/messages`.

### Emoji picker: `emoji-picker-element` in a shadcn Popover

- Lightweight (< 100 KB), web-component based, no React baggage, supports native emoji rendering. We do not ship our own emoji sprite sheet.
- OS emoji shortcut (Ctrl+Cmd+Space etc.) continues to work because the composer is a plain `<textarea>`.

### Multiline composer via `react-textarea-autosize`

- Already a tiny, well-known library; Enter sends, Shift+Enter inserts newline, `maxRows` caps growth so the list doesn't disappear.

## Risks / Trade-offs

- **No antivirus scan** → Mitigation: non-goal for R1; documented in README; R4 can add clamav if we keep the slot.
- **UUID filename + user-chosen extension** can still contain a weird ext like `.php`. → Mitigation: we never execute uploads (served via Next.js Route Handler + streamed bytes with fixed `Content-Type`); nginx/Next does not map extensions to handlers.
- **Soft-delete keeps content** in DB for historical replies. → Mitigation: serializer strips `body` and `attachments` on deleted messages; R3 adds a hard-delete tool for moderation.
- **Paste-to-upload for large images** might surprise users on slow connections. → Mitigation: composer shows a progress bar per staged attachment and a dismiss button before send.
- **Optimistic send + attachments** is more complex than text-only. → Mitigation: attachment rows are created server-side before send (two-phase), so the optimistic message carries real `attachmentIds` and the server just validates ownership on send.
- **Reply target deleted before render** → Mitigation: quote block falls back to `[deleted message]` when the referenced message has `deletedAt` set or is missing.

## Migration Plan

1. Prisma migration adds `Message.replyToId`, `Message.editedAt`, `Message.deletedAt`, `Attachment` table, indexes `(messageId)` on `Attachment` and `(replyToId)` on `Message`.
2. Ship `/api/uploads` and `/api/files/:id` behind existing auth middleware.
3. Extend `/api/conversations/:id/messages` to accept `replyToId` + `attachmentIds`; add `PATCH`/`DELETE /api/messages/:id`.
4. Extend Centrifugo publish helper with `message.updated` and `message.deleted` emitters.
5. Ship composer v2 + message renderer v2. Keep R0 single-line path behind a feature flag for one release only if needed; by R1 acceptance, flag is removed.
6. No rollback beyond schema revert — attachments created under R1 would be orphaned if we rolled back (acceptable for a hackathon).

## Open Questions

- Do we cap the number of attachments per message? Proposal: soft cap 10 client-side, no hard server cap for R1.
- Do we allow editing a message that has attachments? Proposal: yes — edit only mutates `body`; attachments are immutable after send.
- Should `PATCH /api/messages/:id` require a minimum delta (no-op reject)? Proposal: reject `400` when the trimmed new body equals the old body and no other fields changed.
