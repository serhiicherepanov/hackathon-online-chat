## Why

R0 delivered a demo-able MVP where users can exchange plain-text messages in rooms and DMs. Real users, however, expect to paste images, quote prior replies, fix typos, and take back mistakes. R1 closes that credibility gap with the smallest meaningful set of "rich messaging" features (attachments, reply, edit, delete, multiline, emoji) required to make the product feel like a classic web chat.

## What Changes

- Composer becomes multiline with autosize: Enter sends, Shift+Enter inserts newline.
- Inline emoji popover next to composer plus pass-through for OS emoji shortcut.
- Reply/quote: user can reply to a specific message; composer shows a dismissible banner; resulting message renders an outlined quote block that scrolls to the original on click.
- Users can edit their own messages; an "edited" indicator appears live for all recipients.
- Users can delete their own messages (soft delete); message disappears live for recipients with no history reload.
- Attachments: upload button and clipboard paste, for images and arbitrary files, with per-attachment optional comment and preserved original filename.
- Server-side size limits: 20 MB per file, 3 MB per image (rejected client- and server-side).
- Authenticated file download via `GET /api/files/:id`, gated by a per-request membership / DM-participant re-check.
- Prisma additions: `Message.replyToId`, `Message.editedAt`, `Message.deletedAt`; new `Attachment` model; uploads stored under `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` on the named volume reserved in R0.
- Realtime additions: `message.updated` and `message.deleted` events on `room:{id}` and `dm:{id}` channels.
- Optimistic send in the UI: message renders immediately with pending state and per-attachment upload progress.

## Capabilities

### New Capabilities

- `attachments`: file and image uploads, storage layout on the named volume, size/mime validation, membership-gated download endpoint, and per-attachment comment.

### Modified Capabilities

- `messages`: adds reply/quote, edit with `editedAt`, soft-delete with `deletedAt`, attachment association, and `message.updated` / `message.deleted` realtime events. Extends the send API with `replyToId` and `attachmentIds`.
- `chat-ui`: composer becomes multiline + autosize with emoji popover, attach button, paste-to-upload, reply banner; message list renders quote blocks, edit-in-place, deleted state, image thumbnails with lightbox, file chips with size + download, and optimistic pending state.
- `realtime`: adds `message.updated` and `message.deleted` payload contracts on existing `room:{id}` / `dm:{id}` channels.

## Impact

- **Database**: Prisma migration for `Message` columns (`replyToId`, `editedAt`, `deletedAt`) and new `Attachment` table; self-FK on `Message` for replies.
- **Storage**: named volume already reserved in R0 compose becomes active; directory layout `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`.
- **APIs**: new `POST /api/uploads` (multipart), new `GET /api/files/:id` (streamed with `Content-Disposition`), new `PATCH /api/messages/:id` and `DELETE /api/messages/:id`; extended `POST /api/conversations/:id/messages` body.
- **Realtime**: Centrifugo publish paths extended with `message.updated` / `message.deleted`; no new channels.
- **UI**: `MessageComposer` and `MessageItem` rewritten; lightbox and file-chip components added; optimistic message store in Zustand merged with TanStack Query pages.
- **Deps**: lightweight emoji popover (no heavy picker lib), autosize textarea, mime/size validation helper; no new realtime transport.
- **Security**: every file download re-checks room membership / DM participation on the server; original filename preserved in `Content-Disposition` but storage path is UUID-based (no user-controlled names on disk).
