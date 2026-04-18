## Context

Server-side presence already has the right shape (R2): Centrifugo connection count + `lastActiveAt` with a 60 s AFK window. The bug is purely client-side: `lib/hooks/use-activity-heartbeat.ts` only sends a heartbeat when raw input was seen within the last 2 s of each 30 s tick. A user who naturally pauses cursor motion between ticks produces no beats at all, so `lastActiveAt` stays stale and the server flips them to AFK after 60 s. Other failure modes observed:

- Listeners attached in bubble phase — Radix popovers / dialog overlays that `stopPropagation` swallow `mousemove`/`keydown` and the window-level listener never fires.
- No re-beat on `visibilitychange` → `visible` or on `focus`, so a tab that was throttled (background) needs up to 30 s to re-signal after the user returns.
- `document.hidden` short-circuits the send even when the user just interacted — e.g., OS just switched focus between tabs of the same app; another tab is fine, but this one goes quiet and still competes on the same user's `lastActiveAt`.

## Goals / Non-Goals

**Goals:**
- An interacting user (any of: mouse move, pointer move, key press, touch, scroll, wheel, focus) is reported `online` within 2 s on all viewing clients, and stays `online` for as long as they keep interacting at least once per minute.
- Client heartbeat cadence guarantees **at least two** beats inside every server AFK window while the user is active (cheap safety margin against jitter, tab throttling, and transient network errors).
- Activity detection survives subtree event handlers that call `stopPropagation` (modals, tooltips, menus).
- Pure activity-gate logic is unit-testable without a DOM.

**Non-Goals:**
- Changing the server-side AFK window (stays 60 s) or the `presence.changed` contract.
- Adding the `window.IdleDetector` API (permission-gated, Chrome-only; optional future enhancement).
- Cross-tab deduplication via `BroadcastChannel` — our heartbeat endpoint is cheap and idempotent; de-duping is an optimization, not a correctness fix.
- Any DB / migration / Centrifugo changes.

## Decisions

### D1. Timing constants

- `HEARTBEAT_INTERVAL_MS = 20_000` (was 30 s). With a 60 s server AFK window this gives 3 planned beats per window, absorbing one missed tick.
- `ACTIVITY_WINDOW_MS = 25_000` (was 2 s). The gate now asks "did the user interact since the last planned beat or shortly before?" rather than "in the last 2 seconds". If the user moves the mouse once every ~20 s while reading, every beat still lands.
- `ACTIVITY_THROTTLE_MS = 1_000`. The per-event `lastActivityAt` bump is rate-limited to once per second — avoids React/event-loop pressure from `mousemove` storms while keeping the timestamp fresh.

Alternative considered: keep the 2 s window but fire a heartbeat **on** every activity event (debounced). Rejected because it couples network traffic to user input patterns (a dragging user could issue 100+ requests/min) and complicates the contract. The server already supports "beat on interval while active"; we just need to widen the activity gate.

### D2. Activity listeners

Attach listeners on `window` **and** `document` with `{ capture: true, passive: true }`:

- `pointerdown`, `pointermove`, `mousemove`, `keydown`, `wheel`, `scroll`, `touchstart`, `focus` (window) + `visibilitychange` (document).
- Capture phase ensures events reach the gate even when inner handlers stop propagation (Radix primitives do this liberally).
- `passive: true` prevents us from blocking scroll.

Alternative considered: use `navigator.getIdleDetector()` when available. Rejected for this fix because it is permission-gated and asynchronous — orthogonal to the bug, and easy to layer on later.

### D3. Immediate beats on state transitions

Send a heartbeat **now** (outside the interval) when:

- `visibilitychange` fires with `document.visibilityState === "visible"`, and
- `focus` fires on `window`.

This closes the "returned to tab but waiting for next interval" gap. Both are idempotent; the server just updates `lastActiveAt`.

### D4. Do not gate on `document.hidden`

Old code skipped the send when `document.hidden === true`. Removed: if the user interacted within the activity window, they were present — send the beat. The server aggregates across all tabs/connections, so a visible tab elsewhere isn't disadvantaged by a hidden tab's (correct) beat.

Consequence: while hidden, browsers throttle `setInterval` to ≥ 1/min, so we still get ~1 beat/min from a backgrounded tab. Combined with the immediate beat on `visibilitychange` on return, this is strictly better than skipping.

### D5. Extract a pure activity-gate helper

Move the "is activity recent enough to beat?" decision into `lib/presence/activity.ts`:

```
shouldBeat({ now, lastActivityAt, activityWindowMs }): boolean
```

Pure, unit-testable, re-used in the hook. The hook owns DOM wiring, side effects, and the `fetch` call only.

## Risks / Trade-offs

- **More heartbeat traffic (~50% increase per active user).** Mitigation: endpoint is tiny (auth check + two DB touches). For our target of ~300 concurrent users this is < 15 req/s peak.
- **Hidden tabs still beat occasionally.** Intentional — prevents a multi-tab user whose foreground tab is another of our tabs from being marked AFK by a throttled-but-correctly-reporting background tab. Server-side AFK is still driven by absence across all tabs, so a truly AFK user still transitions after 60 s.
- **Widening the activity window to 25 s means a user who actually walked away but happened to bump the mouse 24 s ago still looks active for one extra cycle.** Acceptable: the next cycle will skip the beat and the server flips them in under the 60 s rule.
- **Capture-phase listeners can surprise devs adding preventDefault/stopPropagation later.** Mitigation: comment in the hook explaining capture intent; passive flag makes preventDefault a no-op on scroll events anyway.

## Migration Plan

1. Ship alongside R2 on the active phase branch; no server/DB work.
2. Deploy = rebuild the app container (`docker compose build app && docker compose up -d app`). No migration, no config reload.
3. Rollback = revert the commit; hook reverts to prior behavior. Server keeps working because the HTTP contract is unchanged.

## Open Questions

- Should we also drop an immediate beat on Centrifugo `connected` / `reconnect`? Leaning yes but scoping to the visibility/focus paths now; reconnect beat can come with the next realtime polish pass.
