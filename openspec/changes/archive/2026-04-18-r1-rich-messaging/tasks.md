## 1. Data model and migration

- [x] 1.1 Extend `prisma/schema.prisma`: add `replyToId` (nullable self-FK), `editedAt`, `deletedAt` to `Message`; add composite index on `(replyToId)`
- [x] 1.2 Add `Attachment` model in Prisma: `id, uploaderId, messageId (nullable), originalName, storedPath, mime, size, kind, comment, createdAt`; index `(messageId)`, index `(uploaderId, createdAt)` for staged GC
- [x] 1.3 Run `prisma migrate dev --name r1_attachments_and_message_meta`; verify tables/indexes in local Postgres
- [x] 1.4 Update seed (if any) to exercise a message with an attachment and a reply

## 2. Uploads endpoint and storage layer

- [x] 2.1 Add `lib/uploads/storage.ts` with `writeUpload(stream, { ext }) → { storedPath, size }`; path `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`; create dirs lazily; fsync on close
- [x] 2.2 Add extension allowlist helper: lowercase, `[a-z0-9]{0,8}`, else empty
- [x] 2.3 Implement `POST /api/uploads` (Route Handler, `runtime = 'nodejs'`): parse multipart with streaming size cap (20 MB total, 3 MB when image mime); persist `Attachment` row with `messageId = NULL`; return `{ id, kind, originalName, mime, size, comment }`
- [x] 2.4 Reject unauth (`401`), oversized (`413`), oversized comment (`400`); on any failure, delete partial bytes from disk
- [x] 2.5 Unit-test storage helper (uuid + path layout) and mime→kind mapping

## 3. File download endpoint

- [x] 3.1 Implement `GET /api/files/:id`: load `Attachment` + `message → conversation`; call shared membership helper (`assertConversationAccess(userId, conversationId)`)
- [x] 3.2 Stream bytes with `Content-Type`, `Content-Length`, RFC 5987-encoded `Content-Disposition: attachment; filename*=UTF-8''...`
- [x] 3.3 Allow uploader to download own staged attachment; `403` for everyone else on staged
- [x] 3.4 Never resolve paths outside `UPLOADS_DIR` (defense-in-depth check on `storedPath`)

## 4. Message API extensions

- [x] 4.1 Extend `POST /api/conversations/:id/messages` Zod schema: accept optional `replyToId` (ulid) and `attachmentIds` (array of cuid/uuid, min 0 max 10)
- [x] 4.2 Validate reply target: same `conversationId`, `deletedAt IS NULL`; else `400`
- [x] 4.3 Validate attachments inside a transaction: every row must have `uploaderId = caller` and `messageId IS NULL`; else `403`/`409`; update each to point at new message
- [x] 4.4 Allow empty `body` when `attachmentIds.length > 0`; otherwise keep existing empty-body rejection
- [x] 4.5 Implement `PATCH /api/messages/:id`: author-only (403 else); reject when `deletedAt` (410); reject empty body without attachments (400); reject no-op edit (400); set `editedAt`; publish `message.updated` post-commit
- [x] 4.6 Implement `DELETE /api/messages/:id`: author-only (403 else); idempotent on already-deleted; set `deletedAt`; publish `message.deleted` post-commit
- [x] 4.7 Update message serializer: include `attachments[]`, `replyTo` preview, `editedAt`, `deletedAt`, strip `body`/`attachments`/`replyTo.bodyPreview` when `deletedAt` is set
- [x] 4.8 Update history endpoint to return deleted rows with stripped payload so replies still render

## 5. Realtime publish contract

- [x] 5.1 Add `publishMessageUpdated(convId, payload)` and `publishMessageDeleted(convId, { id, conversationId, deletedAt })` helpers alongside the existing `publishMessageCreated`
- [x] 5.2 Wire helpers into `PATCH` and `DELETE` handlers (post-commit only); log + swallow publish errors (API still succeeds)
- [x] 5.3 Extend client subscription handler for `room:{id}` / `dm:{id}` to dispatch `message.updated` and `message.deleted` to the store / TanStack Query cache
- [x] 5.4 Add Zod-typed realtime payload schemas for `message.updated` and `message.deleted`; parse defensively before mutating cache

## 6. Composer v2 (multiline, emoji, attach, reply)

- [x] 6.1 Swap single-line input for `react-textarea-autosize` with `maxRows` cap; Enter submits, Shift+Enter newline, Esc clears reply/edit context
- [x] 6.2 Add emoji button + shadcn Popover hosting `emoji-picker-element`; inject at caret; keep popover open on pick
- [x] 6.3 Add attach button + hidden `<input type="file" multiple>`; on select, upload each via `POST /api/uploads` with per-file progress (XHR or fetch + stream) and render chips
- [x] 6.4 Implement clipboard paste handler: detect image items, create File, reuse the same upload pipeline
- [x] 6.5 Add client-side size checks (20 MB / 3 MB image) before calling `/api/uploads`; surface inline errors
- [x] 6.6 Reply banner component driven by a Zustand store slice (`replyTarget` per conversation); dismiss button; pass `replyToId` on send
- [ ] 6.7 Optimistic send: client-generated correlation id; pending message in local store; on `201` reconcile by correlation id; on error show Retry and restore text
- [x] 6.8 Unit-test composer store transitions (set/clear reply target, stage/unstage attachments, pending→settled/error)

## 7. Message item v2 (quote, edit, delete, attachments, lightbox)

- [x] 7.1 Render outlined quote block for messages with `replyTo`; show author + truncated preview or "[deleted]"; click scrolls to original, paginating back when needed
- [x] 7.2 Render deleted placeholder for `deleted: true` payloads
- [x] 7.3 "edited" badge next to timestamp when `editedAt` is present
- [x] 7.4 Inline edit mode: swap body for autosizing textarea prefilled; Enter submits `PATCH`, Shift+Enter newline, Esc cancels; show inline error on 4xx
- [x] 7.5 Delete confirm dialog; on confirm call `DELETE`; rely on `message.deleted` to update live (or optimistic removal + rollback on error)
- [x] 7.6 Image thumbnail + shadcn Dialog lightbox (full image, download link)
- [x] 7.7 File chip with icon, original name, size, download link (`GET /api/files/:id` with `download` attr fallback)
- [x] 7.8 Wrap attachment preview and quote-resolver subtrees in error boundaries (`AGENTS.md` rule) — Retry resets boundary

## 8. Garbage collection for staged uploads

- [x] 8.1 Add `scripts/gc-staged-uploads.ts` that deletes `Attachment` rows older than 1 h with `messageId IS NULL` (and their on-disk bytes)
- [x] 8.2 Document manual invocation in README (cron/periodic hook is out of scope for R1; documented as known debt)

## 9. Tests and QA

- [x] 9.1 Vitest: size-limit helper, mime→kind mapping, extension allowlist, reply-preview truncation
- [x] 9.2 Vitest: composer store and optimistic-send reducer
- [x] 9.3 Playwright e2e (`./scripts/ci-e2e.sh`): paste image → thumbnail appears for peer → lightbox opens → download preserves original filename
- [x] 9.4 Playwright e2e: 25 MB upload rejected client- and server-side; 18 MB file upload + download works
- [x] 9.5 Playwright e2e: edit message updates live for peer without reload; delete removes live and shows placeholder; replies to deleted message render "[deleted]" quote
- [x] 9.6 Playwright e2e: reply → quote renders with preview and click scrolls to original (including when original is older than the initial page and requires scroll-back pagination)
- [x] 9.7 Playwright e2e: non-member `GET /api/files/:id` returns 403 (simulate membership loss via dev action)

## 10. Docs and release

- [x] 10.1 Update `.env.example` if any new vars land (e.g. `UPLOADS_DIR` default)
- [x] 10.2 Update `README.md`: R1 features, upload limits, file storage layout, GC script
- [x] 10.3 Flip R1 checkboxes in `ROADMAP.md` as each lands; final flip of the R1 row in the Status overview when demo script passes
- [ ] 10.4 Run R1 demo script end-to-end on a fresh `docker compose up` per `docs/plan/r1-rich-messaging.md` Acceptance criteria
