## Why

R0 and R1 make the chat usable, but they still lack the social guardrails and richer presence model expected from a classic messenger. R2 closes that gap by adding friend and block flows, AFK-aware presence across multiple tabs, and typing indicators so the app feels more trustworthy and alive in day-to-day use.

## What Changes

- Add a social graph for friend requests, accepted friendships, blocked users, and a contacts view that shows pending, accepted, and blocked relationships.
- Enforce friendship and block rules for direct messages, while grandfathering pre-existing R0/R1 DMs and freezing prior DM history when a block is created.
- Upgrade presence from binary online/offline to online/afk/offline with correct multi-tab aggregation and a cold-load snapshot fallback.
- Add throttled typing indicators for room and DM conversations, including realtime fan-out and auto-expiry in the UI.
- Surface the new social and presence states in the app shell, DM list, room member lists, and DM conversation view.

## Capabilities

### New Capabilities
- `social-graph`: Friend requests, friendship lifecycle, user blocking, contacts management, and frozen-DM UX.
- `typing-indicators`: Conversation typing events, throttling, expiry, and UI rendering for rooms and DMs.

### Modified Capabilities
- `presence`: Change presence from online/offline to online/afk/offline with multi-tab aggregation, heartbeat-driven AFK detection, and updated snapshot semantics.
- `direct-messages`: Require friendship and no active block for new DM creation and new DM sends, while allowing grandfathered existing DMs to remain usable unless blocked.
- `messages`: Reject new sends into blocked direct-message conversations and surface frozen-DM state to the composer and message API.
- `realtime`: Extend channel event contracts to carry typing, richer presence changes, social notifications, and DM freeze events.

## Impact

- Affected areas include the Prisma schema, social/presence route handlers, Centrifugo publish and subscribe flows, Zustand/TanStack Query client state, and chat shell UI for contacts, presence dots, and typing banners.
- Adds new REST endpoints for friends and blocks, new realtime event payloads on `user:{id}`, `room:{id}`, `dm:{id}`, and `presence`, and new client-side activity tracking for AFK state.
- Requires updates to tests and release docs to cover friend acceptance, block enforcement, AFK transitions across tabs, and typing visibility.
