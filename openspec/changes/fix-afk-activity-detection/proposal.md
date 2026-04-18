## Why

The current AFK/online indicator incorrectly flips an actively-interacting user to "away". The client only sends a heartbeat when raw input was seen within the **last 2 seconds** of each 30 s tick, has no `visibilitychange` re-beat, does not listen in the capture phase (so Radix/modal subtrees that stop propagation swallow activity events), and has no wake-up beat after tab throttling. A user moving the mouse normally can easily miss the 2 s window at every tick and be marked AFK by the 60 s server-side absence rule. This breaks the core presence UX promised by the spec (< 2 s updates, AFK only after every tab is idle > 1 min).

## What Changes

- Widen the client "is active" activity window and make heartbeat cadence safely shorter than the server AFK threshold (beat every ~20 s, activity counts within the last ~25 s — i.e., at least one beat lands in the 60 s AFK window whenever the user is actually interacting).
- Listen for activity on `window`/`document` with `{ capture: true, passive: true }` and add `pointerdown`, `pointermove`, `wheel`, `visibilitychange` so events in modal/overlay subtrees and pointer-only devices are counted.
- Send an **immediate** heartbeat on `visibilitychange` → `visible`, on `focus`, and on transport reconnect, so a returning/unthrottled tab flips back to active without waiting a full tick.
- Throttle the per-event `lastActivityAt` bump (~1 Hz) so mousemove storms don't overwhelm React but still refresh the timestamp continuously.
- Do not short-circuit the beat when `document.hidden` is true if there was recent real input — rely on the server's absence rule to mark AFK instead of the client guessing.
- Add unit coverage for the activity-gate logic and an e2e smoke that an idle mouse-moving user stays `online` for at least 90 s.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `presence`: tighten the client-side heartbeat contract (capture-phase listeners, widened activity window, immediate beat on visibility/focus change) so an interacting user is never classified AFK while at least one tab is being used.

## Impact

- Code: `lib/hooks/use-activity-heartbeat.ts` (rewrite), `lib/presence/activity.ts` (new pure helper for the activity gate, unit-tested), `app/api/presence/heartbeat/route.ts` (unchanged contract; verify TTL still > client interval), `components/app/app-shell.tsx` (no API change).
- Specs: `openspec/specs/presence/spec.md` gains client-heartbeat requirements.
- Tests: new `lib/presence/activity.test.ts`, new e2e `e2e/presence-afk-active-user.spec.ts`.
- No DB / migration / env changes. No Centrifugo config changes.
