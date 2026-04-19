## MODIFIED Requirements

### Requirement: Conversation view with virtualized history

The app SHALL render each conversation view (`/rooms/[id]`, `/dm/[convId]`) with a `react-virtuoso`-backed message list that keyset-paginates older history and auto-scrolls to the bottom only when the user is already pinned there. The list SHALL render reply quote blocks, the "edited" indicator, deleted-message placeholders, image thumbnails with a lightbox, file chips with a size + download action, and per-message emoji reaction chips with an affordance to add or toggle the caller’s reaction. The list SHALL consume `message.updated`, `message.deleted`, and `message.reactions.updated` live without reloading the page.

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

#### Scenario: Reactions update live

- **WHEN** the client receives `message.reactions.updated` for a message currently rendered
- **THEN** the reaction chips for that message update to match the payload
- **AND** the Virtuoso scroll position does not jump unless the row height change would push the user off-bottom while pinned

#### Scenario: User adds a reaction from the message row

- **WHEN** the user chooses an emoji from the message reaction affordance
- **THEN** the client calls `POST /api/messages/:messageId/reactions` with that emoji
- **AND** on success the UI reflects the new summary (via optimistic update or subsequent event)

## ADDED Requirements

### Requirement: Reaction controls are keyboard-accessible

The message reaction affordance SHALL be reachable via keyboard and SHALL expose an accessible name (e.g. `aria-label`) describing the action (e.g. “Add reaction” / “React with 👍”).

#### Scenario: Focus and activate

- **WHEN** the user tabs to a reaction button and activates it with Enter or Space
- **THEN** the same toggle behavior occurs as for pointer activation
