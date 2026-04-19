# 3. Non-Functional Requirements
### 3.1 Capacity and Scale
- The server shall support up to 300 simultaneous users.
- A single chat room may contain up to 1000 participants.
- A user may belong to an unlimited number of rooms.
- For sizing assumptions, a typical user may have around 20 rooms and 50 contacts.
### 3.2 Performance
- After a user sends a message, it should be delivered to recipients within 3 seconds.
- User online status updates should propagate with latency below 2 seconds.
- The application should remain usable when a room contains very large history, including at least 10,000 messages. A long-lived room (for example, ~3 years old) may accumulate on the order of 100,000 messages; the UI must allow the user to progressively scroll up to the earliest messages in such a room without freezing or exhausting memory. This progressive deep-scroll path must be covered by an automated test.
### 3.3 Persistence
- Messages must be persistently stored and remain available for years.
- Chat history loading shall support infinite scrolling for older messages.
### 3.4 File Storage
- Files shall be stored on the local file system.
- Maximum file size: 20 MB.
- Maximum image size: 3 MB.
### 3.5 Session Behavior
- No automatic logout due to inactivity is required.
- Login state shall persist across browser close/open.
- The application shall work correctly across multiple tabs for the same user.
### 3.6 Design Caveats (Transport and Presence)
- Real-time message fan-out to 100+ concurrent users in a room must not rely on plain REST polling; use a push transport (WebSocket / Centrifugo subscription) for live message delivery and presence updates.
- Using WebSockets for *everything* (history loads, profile fetches, room lists, uploads) is discouraged — it tends to overcomplicate the app. The expected shape is a hybrid: classic REST / Server Actions for request-response data (auth, history pages, CRUD, uploads) combined with WebSockets for live updates (new messages, typing, presence).
- User activity (online vs AFK) should be tracked on the client from real user interaction signals (e.g. mouse move, key press, touch, focus) — if such a signal is observed within the last 25 seconds, the client sends a lightweight "user is active" heartbeat to the server on a cadence of no more than 20 seconds. Presence transitions (online → AFK → offline) are derived on the server from the absence of heartbeats, not from an explicit "I am inactive" message.
- Browsers may freeze/hibernate background tabs when they are inactive, suspending all JavaScript. The presence model must therefore **not** depend on the client sending an "inactive" or "offline" signal: the server must infer AFK/offline purely from missing heartbeats (timeout-based), and the client just keeps pinging while it is actually active.
### 3.7 Reliability
The system should preserve consistency of:
- membership
- room bans
- file access rights
- message history
- admin/owner permissions
