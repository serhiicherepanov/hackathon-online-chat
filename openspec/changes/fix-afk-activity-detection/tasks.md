## 1. Pure activity-gate helper

- [x] 1.1 Create `lib/presence/activity.ts` exporting `shouldBeat({ now, lastActivityAt, activityWindowMs }): boolean` and the shared constants `HEARTBEAT_INTERVAL_MS = 20_000`, `ACTIVITY_WINDOW_MS = 25_000`, `ACTIVITY_THROTTLE_MS = 1_000`.
- [x] 1.2 Add `lib/presence/activity.test.ts` covering: recent activity returns `true`, stale activity returns `false`, `lastActivityAt === null` returns `false`, boundary at exactly `activityWindowMs` returns `true`, and a default `activityWindowMs` argument path.

## 2. Rewrite the activity heartbeat hook

- [x] 2.1 Rewrite `lib/hooks/use-activity-heartbeat.ts` to import constants + `shouldBeat` from `lib/presence/activity.ts`.
- [x] 2.2 Attach activity listeners on `window` and `document` with `{ capture: true, passive: true }` for `pointerdown`, `pointermove`, `mousemove`, `keydown`, `wheel`, `scroll`, `touchstart`, `focus`; and `visibilitychange` on `document`.
- [x] 2.3 Throttle the per-event `lastActivityAt` bump at `ACTIVITY_THROTTLE_MS` (1 Hz) using a timestamp compare — no `setTimeout` leaks.
- [x] 2.4 Remove the `document.hidden` short-circuit in the send path; rely on the activity gate only.
- [x] 2.5 Send an immediate heartbeat on `visibilitychange` → `visible` and on window `focus` (outside the interval), deduplicated by a small in-flight flag so we don't stack identical requests within 500 ms.
- [x] 2.6 Preserve the existing `enabled` gate and the cleanup contract (remove all listeners, clear the interval) so React StrictMode double-mount is safe.

## 3. Wiring and regressions

- [x] 3.1 Confirm `components/app/app-shell.tsx` still calls `useActivityHeartbeat(Boolean(user?.id))` and no other caller exists (`rg useActivityHeartbeat`).
- [x] 3.2 Run `pnpm typecheck` and fix any type errors introduced by the new constants/exports.
- [x] 3.3 Run `pnpm test` and ensure the new and existing presence unit tests pass (including `lib/stores/presence-store.test.ts` and `lib/presence/transitions.test.ts`).

## 4. End-to-end coverage

- [x] 4.1 Add `e2e/presence-afk-active-user.spec.ts`: sign in user A, sign in user B in a second context, make them room-mates, have A tick the mouse once every ~15 s for 90 s (e.g., `page.mouse.move` in a loop with `await page.waitForTimeout`), and assert B's members-panel indicator for A stays in the `online` style for the whole duration (never flips to `afk`).
- [x] 4.2 Add a second assertion in the same spec: when A stops all interaction for 70 s, B sees A transition to `afk` within 5 s of the 60 s threshold.
- [x] 4.3 Run the canonical pipeline with a tight grep: `timeout 420 env E2E_ARGS="-g 'afk'" ./scripts/ci-e2e.sh 2>&1 | tee test-artifacts/fix-afk-activity-detection.log | tail -n 5` and ensure it's green.

## 5. Docs and validation

- [x] 5.1 Re-run `openspec validate fix-afk-activity-detection --strict` and confirm it passes.
- [x] 5.2 If any constant (interval / window) is mentioned in `README.md` or `docs/`, update to match; otherwise skip.
