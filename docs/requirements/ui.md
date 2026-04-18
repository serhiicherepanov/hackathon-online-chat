# 4. UI Requirements
### 4.1 General Layout
The application shall provide a typical web chat layout with:
- top menu
- message area in the center
- message input at the bottom
- rooms and contacts list on the side
#### 4.1.1 Side Layout
- Rooms and contacts are displayed on the right.
- After entering a room, the room list becomes compacted in accordion style.
- Room members are shown on the right side with their online statuses.
### 4.2 Chat Window Behavior
The chat window shall support standard chat behavior:
- automatic scrolling to new messages when the user is already at the bottom
- no forced autoscroll if the user has scrolled up to read older messages
- infinite scroll for older history
### 4.3 Message Composition
The input area shall support:
- multiline text entry
- emoji in messages
- file/image attachment
- reply to message
### 4.4 Notifications in UI
Unread messages shall be visually indicated near:
- room names
- contact names
### 4.5 Admin UI
Administrative actions shall be available from menus and implemented through modal
dialogs.
These actions include:
- ban/unban user
- remove member
- manage admins
- view banned users
- delete messages
- delete room
