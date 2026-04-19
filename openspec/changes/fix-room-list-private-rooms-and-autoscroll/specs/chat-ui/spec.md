## MODIFIED Requirements

### Requirement: Public room catalog page

The app SHALL provide a `/rooms` page that lists public rooms from `GET /api/rooms`, with a search input and a "Create room" button that opens a modal. The same page SHALL also surface the caller's joined private rooms from `GET /api/me/rooms` (or an equivalent membership data source) in a clearly separate authenticated section rendered before the public catalog, and SHALL NOT expose private rooms the caller is not a member of.

#### Scenario: Search filters the room-browsing screen

- **WHEN** the user types into the search input on `/rooms`
- **THEN** the public room section refetches with the debounced search term and re-renders without a full page reload
- **AND** the private-room membership section applies the same search term client-side or through its data source so matching joined private rooms remain discoverable from the same screen

#### Scenario: Joined private rooms appear as a separate list

- **WHEN** the authenticated user has one or more joined private rooms
- **THEN** `/rooms` renders those memberships in a section that is visually separate from the public catalog
- **AND** that private-room section appears before the public room list on the page
- **AND** each private-room row links to `/rooms/<id>`
- **AND** private rooms the caller is not a member of do not appear anywhere on the page

#### Scenario: Join button transitions to membership

- **WHEN** the user clicks "Join" on a catalog row
- **THEN** the client calls `POST /api/rooms/:id/join`
- **AND** on success the row's button becomes "Open" and the sidebar gains the new room entry

#### Scenario: Create-room modal creates and opens

- **WHEN** the user submits the create-room modal with a valid unique name and visibility
- **THEN** the client calls `POST /api/rooms`
- **AND** on success navigates to `/rooms/<id>` and closes the modal
- **AND** if the new room is private, the `/rooms` page shows it in the caller's private-room section the next time that screen is rendered or refreshed

### Requirement: App shell layout

The authenticated app SHALL render within a persistent shell that contains a top navigation bar (app name + current user menu with sign-out) and a right-hand sidebar with **three** accordion sections in this **vertical order** (top to bottom): **Invites**, **Direct messages**, and **Rooms**. The **Invites** section SHALL aggregate pending private-room invites and incoming friend requests. Each sidebar accordion header SHALL render its title first, then any compact action buttons, and the disclosure arrow last. Room rows in sidebar and room-browsing list contexts SHALL use a visibility-aware icon in place of a generic room avatar: a public-room icon for `public` rooms and a lock icon for `private` rooms.

#### Scenario: Sidebar lists invites, rooms, and DMs for the current user

- **WHEN** the app shell mounts
- **THEN** the sidebar loads pending room invites plus incoming friend requests for the Invites section, `GET /api/me/rooms`, and `GET /api/me/dm-contacts` via TanStack Query or equivalent wired data sources
- **AND** renders the Invites, Direct messages, and Rooms sections in that order
- **AND** renders each room and DM contact as a link or navigation target with an unread badge when unread > 0

#### Scenario: Sidebar header order keeps chevron last

- **WHEN** a sidebar accordion header renders with one or more compact action buttons
- **THEN** the visible header order is title first, action buttons second, and disclosure arrow last
- **AND** the disclosure arrow still reflects the current open or closed state

#### Scenario: Invites section includes friend requests

- **WHEN** the current user has an incoming friend request, a pending room invite, or both
- **THEN** the Invites accordion shows all pending invite rows in the same section
- **AND** each row identifies whether it is a room invite or a friend request so the action remains clear

#### Scenario: Room row icon reflects visibility

- **WHEN** a room row renders in the sidebar or `/rooms` list context
- **THEN** a `public` room shows a public-room icon in the leading room-icon slot
- **AND** a `private` room shows a lock icon in the same slot instead of a generic avatar

### Requirement: Conversation view with virtualized history

The app SHALL render each conversation view (`/rooms/[id]`, `/dm/[convId]`) with a `react-virtuoso`-backed message list that keyset-paginate older history and auto-scroll to the bottom when the user enters a conversation or is already pinned there. The list SHALL render reply quote blocks, the "edited" indicator, deleted-message placeholders, image thumbnails with a lightbox, and file chips with a size + download action. The list SHALL consume `message.updated` and `message.deleted` live without reloading the page, and SHALL preserve an intentionally off-bottom reading position after the conversation is already open.

#### Scenario: Initial page loads newest messages

- **WHEN** a conversation view mounts
- **THEN** the client fetches the first page from `GET /api/conversations/:id/messages?limit=50`
- **AND** renders it reversed so the newest message is at the bottom of the viewport
- **AND** anchors the viewport so the latest message is visible without manual scrolling

#### Scenario: Switching to another conversation lands on the latest messages

- **WHEN** the user navigates from one room or DM to another conversation that already has messages
- **THEN** the message list resets any stale off-bottom state from the previous conversation
- **AND** the newly opened conversation renders with its latest message in view near the bottom working area

#### Scenario: Scrolling up loads older messages

- **WHEN** the user scrolls near the top of the virtualized list
- **THEN** the client fetches the next older page using `before=<oldest message id>`
- **AND** appends older messages without visible jump

#### Scenario: New message while pinned to bottom autoscrolls

- **WHEN** the client receives `message.created` and `atBottom` is true
- **THEN** the new message renders and the list stays scrolled to the bottom

#### Scenario: New message while scrolled up shows a pill

- **WHEN** the client receives `message.created` and `atBottom` is false after the conversation is already open
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

### Requirement: Members panel for rooms

The `/rooms/[id]` view SHALL include a members panel listing every member's username with a live online/offline dot, sourced from `GET /api/rooms/:id/members`, `presence.changed` events, and room-channel membership updates such as `member.joined`.

#### Scenario: Members panel renders on room open

- **WHEN** a room view mounts
- **THEN** the members panel lists every `RoomMember` with their username and an initial presence dot sourced from `GET /api/presence?userIds=<...>`

#### Scenario: Members panel updates when another user joins

- **WHEN** the current room view is open and the client receives `member.joined` for that room's conversation
- **THEN** the members panel adds or reveals the joined user without a full page reload
- **AND** the joined user appears only once even if the live event races with a query refresh
