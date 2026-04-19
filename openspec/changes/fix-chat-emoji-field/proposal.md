## Why

Users report they cannot add emoji from the chat composer’s emoji control. The product already specifies caret insertion and an open popover for repeated picks; the current `emoji-picker-element` integration is likely broken or flaky (custom-element lifecycle, event wiring with the shadow picker, or focus/caret sync with the controlled textarea). Fixing this restores a core R1 composer capability and prevents silent regressions.

## What Changes

- Repair the composer emoji flow so a picked emoji reliably reaches the composer text at the caret (or a defined fallback when the textarea is not available).
- Add automated tests (Vitest + Testing Library) covering emoji insertion behavior for the composer/popover integration, without relying on manual browser-only checks.
- Optionally tighten types or picker setup if needed for `emoji-picker-element` compatibility; no REST, auth, or realtime contract changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chat-ui`: Add an explicit requirement (and scenarios) that composer emoji insertion is **covered by automated regression tests**, in addition to the existing caret-insertion behavior already specified for the emoji popover.

## Impact

- **Code**: `components/chat/emoji-popover.tsx`, `components/chat/message-composer.tsx`; new colocated test file(s) under `components/chat/` (or `lib/` if pure helpers are extracted).
- **Dependencies**: Existing `emoji-picker-element` dependency; no new packages unless investigation shows a minimal necessary addition.
- **APIs / realtime**: None.
- **Docs**: None beyond OpenSpec change artifacts unless README explicitly documents emoji behavior (unlikely for this fix).
