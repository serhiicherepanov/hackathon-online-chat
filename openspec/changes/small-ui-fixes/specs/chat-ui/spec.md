## MODIFIED Requirements

### Requirement: App shell layout

The authenticated app SHALL render within a persistent shell that contains a top navigation bar (app name + current user menu with sign-out) and a right-hand sidebar with **three** accordion sections in this **vertical order** (top to bottom): **Invites** (pending private-room invites inbox), **Direct messages** (DM conversations), and **Rooms** (memberships). The main pane renders the active route's content.

Sidebar accordion sections SHALL use a disclosure indicator where a **collapsed** section shows a **chevron pointing right** and an **expanded** section shows a **chevron pointing down**. The collapsed state SHALL NOT use an upward-pointing chevron as the only collapsed affordance.

Whenever a sidebar section header exposes compact action buttons, those action buttons SHALL render before the disclosure chevron in the visual/header control order, and activating them SHALL NOT require the section to be expanded first.

The **Direct messages** section header SHALL include a **compact** control adjacent to the section title that starts a new DM using the same contact-picker dialog and post-select navigation as required for "+ New DM" in the direct-messages capability. That control SHALL remain visible and operable while the Direct messages section is collapsed.

The **Rooms** section header SHALL include **compact** controls adjacent to the section title to open the **public room catalog** (browse/search/join) and to **create a room**, preserving the same behaviors as the entry points on the `/rooms` catalog (modal, navigation, or equivalent). Those controls SHALL remain visible and operable while the Rooms section is collapsed.

Each row in the **Direct messages** list SHALL show the peer's **avatar** (image when available, otherwise a stable fallback such as initials) and **presence status** (`online`, `afk`, or `offline`) consistent with the presence capability.

Toast notifications triggered from the authenticated shell SHALL render above active modal, dialog, drawer, sheet, and popover overlays so the feedback remains visible without first dismissing the overlay that caused it.

When the authenticated shell renders the current user's raw ID in a constrained identity/details surface, the visible label SHALL be shortened to the leading 8 characters of the ID or clipped to an equivalent compact width. Any copy action associated with that label SHALL still copy the full underlying ID.

#### Scenario: Sign-out from the user menu

- **WHEN** a signed-in user clicks "Sign out" in the top-nav user menu
- **THEN** the client calls `POST /api/auth/sign-out`
- **AND** navigates to `/sign-in`
- **AND** any other open tab for the same user that is still holding a valid session cookie continues to work

#### Scenario: Sidebar lists invites, rooms, and DMs for the current user

- **WHEN** the app shell mounts
- **THEN** the sidebar loads pending invites via `GET /api/me/invites` (or equivalent wired data source), `GET /api/me/rooms`, and `GET /api/me/dm-contacts` via TanStack Query
- **AND** renders the Invites, Direct messages, and Rooms sections in that order
- **AND** renders each room and DM contact as a link or navigation target with an unread badge when unread > 0

#### Scenario: Header action icons render before the disclosure chevron

- **WHEN** a sidebar section header includes one or more compact action icons plus an accordion disclosure control
- **THEN** the action icons appear before the disclosure chevron in the header control order
- **AND** the disclosure chevron remains the final expand/collapse affordance for that section

#### Scenario: Collapsed direct-messages section still opens New DM

- **WHEN** the Direct messages accordion section is collapsed and the user activates the compact New DM control in its header
- **THEN** the contact-picker dialog opens without first forcing the section body to expand
- **AND** the user can continue the existing DM creation flow from that dialog

#### Scenario: Collapsed rooms section still opens create-room flow

- **WHEN** the Rooms accordion section is collapsed and the user activates the compact create-room control in its header
- **THEN** the create-room modal opens without first forcing the section body to expand
- **AND** submitting that modal continues to use the same room-creation flow as the `/rooms` catalog

#### Scenario: Collapsed accordion shows a right-pointing chevron

- **WHEN** a sidebar accordion section is collapsed
- **THEN** its disclosure control shows a right-pointing chevron (or equivalent) and does not show only an upward-pointing chevron as the collapsed affordance

#### Scenario: Expanded accordion shows a down-pointing chevron

- **WHEN** a sidebar accordion section is expanded
- **THEN** its disclosure control shows a down-pointing chevron (or equivalent)

#### Scenario: Toast remains visible over an open overlay

- **WHEN** the user triggers an action inside an open dialog, modal, drawer, sheet, or popover that shows a toast notification
- **THEN** the toast renders above that overlay instead of underneath it
- **AND** the feedback remains readable while the overlay stays open

#### Scenario: Visible user-id label is shortened but copy keeps the full value

- **WHEN** the shell shows the current user's ID in a constrained details/sidebar surface with a copy affordance
- **THEN** the visible label shows only the first 8 characters of the ID or an equivalently compact clipped representation
- **AND** activating the copy affordance copies the full untruncated ID to the clipboard

### Requirement: Conversation view with virtualized history

The app SHALL render each conversation view (`/rooms/[id]`, `/dm/[convId]`) with a `react-virtuoso`-backed message list that keyset-paginates older history and auto-scrolls to the bottom only when the user is already pinned there. The list SHALL render reply quote blocks, the "edited" indicator, deleted-message placeholders, image thumbnails with a lightbox, and file chips with a size + download action. The list SHALL consume `message.updated` and `message.deleted` live without reloading the page.

Bottom-pinned behavior SHALL remain correct for long histories: when the user is pinned to the end of the active conversation, newly appended messages SHALL leave the viewport flush with the newest message instead of stopping a few pixels above the true bottom.

The local "new messages" pill state SHALL be scoped to the active conversation only. Switching from one room or DM to another SHALL clear any stale pill state carried from the previous conversation before new live messages for the newly opened conversation are processed.

#### Scenario: Initial page loads newest messages

- **WHEN** a conversation view mounts
- **THEN** the client fetches the first page from `GET /api/conversations/:id/messages?limit=50`
- **AND** renders it reversed so the newest message is at the bottom of the viewport

#### Scenario: Scrolling up loads older messages

- **WHEN** the user scrolls near the top of the virtualized list
- **THEN** the client fetches the next older page using `before=<oldest message id>`
- **AND** appends older messages without visible jump

#### Scenario: New message while pinned to bottom autoscrolls flush to the end

- **WHEN** the client receives `message.created` and `atBottom` is true
- **THEN** the new message renders and the list stays scrolled to the true bottom
- **AND** the viewport does not stop with a residual gap above the newest message

#### Scenario: New message while scrolled up shows a pill for the active conversation

- **WHEN** the client receives `message.created` and `atBottom` is false for the active conversation
- **THEN** a "new messages" pill appears above the composer
- **AND** clicking the pill scrolls to the bottom and clears the pill

#### Scenario: Switching conversations clears stale new-message pill state

- **WHEN** the user navigates away from a conversation that currently shows a local "new messages" pill
- **THEN** opening a different room or DM starts without rendering that stale pill
- **AND** a pill appears there only if new live messages arrive while that newly opened conversation is not pinned to bottom

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
