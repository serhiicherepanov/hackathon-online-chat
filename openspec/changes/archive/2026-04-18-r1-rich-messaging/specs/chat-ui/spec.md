## MODIFIED Requirements

### Requirement: Single-line composer

The conversation view SHALL include a multiline composer backed by an autosizing textarea. Pressing Enter alone SHALL submit the message. Pressing Shift+Enter SHALL insert a newline without submitting. The composer SHALL support attachments via an attach button and clipboard paste, an emoji popover triggered by a dedicated button, and a dismissible reply banner. The composer SHALL clear on successful submit and SHALL restore the text on failure.

#### Scenario: Enter submits, Shift+Enter inserts newline

- **WHEN** the user types a non-empty message and presses Enter without Shift in the composer
- **THEN** the client calls `POST /api/conversations/:id/messages`
- **AND** on success the input clears and the message appears in the list via the live `message.created` event (or optimistically, if optimistic send is implemented)

#### Scenario: Shift+Enter adds a newline

- **WHEN** the user presses Shift+Enter while the composer has focus
- **THEN** a `\n` is inserted at the caret
- **AND** the textarea autosizes to fit the new content up to a capped maximum row count

#### Scenario: Emoji popover inserts at caret

- **WHEN** the user clicks the emoji button and selects an emoji
- **THEN** the emoji glyph is inserted into the textarea at the current caret position
- **AND** the popover stays open to allow repeated insertions until dismissed

#### Scenario: Attach button uploads and stages

- **WHEN** the user picks one or more files via the attach button
- **THEN** the client calls `POST /api/uploads` for each file in parallel
- **AND** renders a per-attachment chip with filename, size, live progress, and a remove button inside the composer
- **AND** pressing Enter with non-empty staged attachments sends the message including `attachmentIds`

#### Scenario: Paste image uploads immediately

- **WHEN** the user pastes image data into the composer
- **THEN** the client creates a File from the clipboard item and calls `POST /api/uploads`
- **AND** a staged-attachment chip appears in the composer with progress

#### Scenario: Reply banner shows the target and is dismissible

- **WHEN** the user clicks "Reply" on a message in the list
- **THEN** a banner appears above the composer with the target message author and a truncated preview and an `×` button
- **AND** clicking `×` clears the reply target; sending uses `replyToId` otherwise

#### Scenario: Oversized body shows an inline error

- **WHEN** the body exceeds 3 KB and the server responds `413`
- **THEN** the composer displays an inline error and keeps the input content so the user can trim it

#### Scenario: Oversized upload is rejected client-side

- **WHEN** the user picks or pastes a file larger than 20 MB (or an image larger than 3 MB)
- **THEN** the composer shows an inline error and does not call `POST /api/uploads`

### Requirement: Conversation view with virtualized history

The app SHALL render each conversation view (`/rooms/[id]`, `/dm/[convId]`) with a `react-virtuoso`-backed message list that keyset-paginates older history and auto-scrolls to the bottom only when the user is already pinned there. The list SHALL render reply quote blocks, the "edited" indicator, deleted-message placeholders, image thumbnails with a lightbox, and file chips with a size + download action. The list SHALL consume `message.updated` and `message.deleted` live without reloading the page.

#### Scenario: Initial page loads newest messages

- **WHEN** a conversation view mounts
- **THEN** the client fetches the first page from `GET /api/conversations/:id/messages?limit=50`
- **AND** renders it reversed so the newest message is at the bottom of the viewport

#### Scenario: Scrolling up loads older messages

- **WHEN** the user scrolls near the top of the virtualized list
- **THEN** the client fetches the next older page using `before=<oldest message id>`
- **AND** appends older messages without visible jump

#### Scenario: New message while pinned to bottom autoscrolls

- **WHEN** the client receives `message.created` and `atBottom` is true
- **THEN** the new message renders and the list stays scrolled to the bottom

#### Scenario: New message while scrolled up shows a pill

- **WHEN** the client receives `message.created` and `atBottom` is false
- **THEN** a "new messages" pill appears above the composer
- **AND** clicking the pill scrolls to the bottom and clears the pill

#### Scenario: Opening a conversation marks it read

- **WHEN** a conversation view mounts or becomes visible (tab focused)
- **THEN** the client calls `POST /api/conversations/:id/read` with the newest visible message id

#### Scenario: Edited message updates live

- **WHEN** the client receives `message.updated` for a message currently rendered in the list
- **THEN** the rendered body updates in place
- **AND** an "edited" badge appears next to the timestamp
- **AND** the Virtuoso scroll position does not jump unless the message's height change would push the user off-bottom while pinned

#### Scenario: Deleted message removes live

- **WHEN** the client receives `message.deleted` for a message currently rendered in the list
- **THEN** the item re-renders as a gray "[deleted message]" placeholder with the original timestamp
- **AND** `body`, attachments, and the quote block are hidden
- **AND** replies to the deleted message still render, showing "[deleted]" in place of the quote preview

#### Scenario: Quote block in a reply

- **WHEN** a message with `replyTo` is rendered
- **THEN** the item shows an outlined quote block above the body with the replied-to author and a truncated preview (or "[deleted]" when `replyTo.deleted`)
- **AND** clicking the quote scrolls the list to the original message when it is within loaded pages, otherwise first paginates back to load it

#### Scenario: Image attachment renders as a thumbnail with a lightbox

- **WHEN** a message has one or more `attachments` with `kind = "image"`
- **THEN** each image renders as a thumbnail (source: `GET /api/files/:id`)
- **AND** clicking the thumbnail opens a lightbox with the full image and a "Download" action that uses the same endpoint with `Content-Disposition: attachment`

#### Scenario: File attachment renders as a chip

- **WHEN** a message has an attachment with `kind = "file"`
- **THEN** the item renders a file chip with icon, original filename, size, and a download link to `GET /api/files/:id`

#### Scenario: Optimistic send renders immediately

- **WHEN** the user presses Enter on a valid composer with or without attachments
- **THEN** a pending message appears at the bottom of the list with a faded style
- **AND** on `201 Created` the pending message is replaced by the server's payload (matched by client-generated correlation id)
- **AND** on error the pending message shows an inline "Retry" action and the composer restores the text

#### Scenario: Inline edit for own message

- **WHEN** the user clicks "Edit" on their own message
- **THEN** the message item swaps to an inline autosizing textarea prefilled with the current body
- **AND** pressing Enter submits `PATCH /api/messages/:id`; Shift+Enter inserts a newline; Esc cancels

#### Scenario: Delete confirmation for own message

- **WHEN** the user clicks "Delete" on their own message
- **THEN** a confirmation dialog appears
- **AND** confirming calls `DELETE /api/messages/:id`
- **AND** on success the message is replaced live by the deleted placeholder (via `message.deleted` or local optimism)
