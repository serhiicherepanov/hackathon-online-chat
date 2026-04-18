# R1 — Rich Messaging

Goal: make chat feel real. Attachments (images and files), reply/quote, edit,
delete, multiline composition, and emoji. High visual ROI — these are the
features reviewers notice in the first minute of a demo.

Builds on [R0](r0-mvp.md).

## Scope (in)

- Multiline composer: Enter sends, Shift+Enter newline, autosize.
- Emoji: native OS picker shortcut + a lightweight inline picker (cheap shadcn popover, no heavy picker lib).
- Reply/quote: click reply on a message → banner in composer → outlined quote in resulting message; click quote to scroll to original.
- Edit own messages with gray "edited" indicator.
- Delete own messages (admin path lands in R3).
- Attachments: images and arbitrary files via upload button and clipboard paste.
- Per-attachment optional comment, preserved original filename.
- Size limits enforced server-side: 20 MB file, 3 MB image.
- Download gated by membership / DM-participant re-check on every request.

## Data model additions

- `Message.replyToId` (nullable, self-FK), `editedAt`, `deletedAt` (soft-delete; UI treats as deleted)
- `Attachment` — id, messageId, uploaderId, originalName, storedPath, mime, size, kind (`image` | `file`), comment, createdAt
- FS layout: `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` (named volume)

## API additions

- `POST /api/uploads` — multipart; size/mime validation; returns `attachmentId` (pre-message staging)
- `POST /api/conversations/:id/messages` — extended body: `{ text, replyToId?, attachmentIds?[] }`
- `PATCH /api/messages/:id` — edit body (author only until R3)
- `DELETE /api/messages/:id` — author only until R3
- `GET /api/files/:id` — streams attachment after membership check; `Content-Disposition` preserves original name

## Realtime additions

- `message.updated`, `message.deleted` on `room:{id}` and `dm:{id}`

## UI additions

- `MessageComposer` v2: `Textarea` with autosize, emoji popover, attach button, paste handler, reply banner with dismiss.
- `MessageItem`: quote block, inline edit, "edited" badge, delete confirm, image thumbnails with lightbox, file chip with size + download.
- Upload progress inside composer; optimistic message render with pending state.

## Acceptance criteria

1. A pastes a PNG from the clipboard → preview appears; sends with an optional comment; B sees a thumbnail, opens lightbox, downloads with original filename.
2. A attempts a 25 MB upload → rejected both client- and server-side; 18 MB file succeeds.
3. A edits a message → "edited" badge appears live for B without a refresh.
4. A deletes a message → it disappears live for B; no history hole reload.
5. A replies to one of B's messages → the quote is visible in the new message and clicking it scrolls to the original.
6. A user who is removed from a room (dev action; full ban flow lands in R3) cannot `GET /api/files/:id` for that room's attachments.
