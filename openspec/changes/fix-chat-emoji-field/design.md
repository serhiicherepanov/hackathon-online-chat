## Context

The composer uses a controlled `TextareaAutosize` with `insertAtCaret` that reads/writes `selectionStart`/`selectionEnd`. `EmojiPopover` hosts `emoji-picker-element` via a wrapper `div` and `dangerouslySetInnerHTML`, dynamically imports the custom element definition, and listens for `emoji-click` on the wrapper. Failures may come from: (1) the event not reaching the listener (shadow DOM / `composedPath` / listener target), (2) the picker not upgrading when created as innerHTML before the module loads, (3) Radix `Popover` focus management closing or blurring the textarea before insertion, or (4) mismatch between library event payload fields and the handler’s `detail` shape.

## Goals / Non-Goals

**Goals:**

- Make emoji selection reliably invoke `onPick` with a Unicode string and have `MessageComposer` update text + caret as already implemented.
- Add fast, deterministic unit/component tests that prove insertion behavior (including mocking or simulating the picker callback where loading the full web component in jsdom is impractical).

**Non-Goals:**

- Replacing `emoji-picker-element` with a different picker unless investigation shows it is the only viable fix (prefer fixing integration).
- Changing message size limits, API payloads, or Centrifugo behavior.

## Decisions

- **Attach / dispatch handling**: Prefer listening on the actual `<emoji-picker>` element (ref + `querySelector` after mount) or use the library’s documented event API so `emoji-click` is not missed. If the picker must stay inside innerHTML, wait for `customElements.whenDefined('emoji-picker')` before relying on clicks, and attach the listener to the element reference, not only the outer div.
- **Tests**: Extract minimal pure helpers if useful (e.g. “insert string at caret into value + selection indices”) and test those in Vitest; for React, render `MessageComposer` or `EmojiPopover` with a test double that calls `onPick` directly to assert textarea value/caret updates without a real Shadow DOM emoji grid.
- **E2E**: Only add Playwright coverage if a focused unit/component suite cannot hold the regression; default to unit tests per AGENTS.md for UI logic.

## Risks / Trade-offs

- **jsdom vs real custom element** → Full picker UI may not run in jsdom; mitigate by testing `insertAtCaret` + `onPick` contract and/or mocking `emoji-click`.
- **Radix popover focus** → If focus traps interfere, document the chosen pattern (e.g. `modal={false}` on popover content if applicable) and verify typing focus returns to the textarea after pick.

## Migration Plan

Deploy as a normal app release: no database migration, no flag. Rollback is reverting the commit.

## Open Questions

- Exact `emoji-picker-element` v1.29.x `emoji-click` payload shape — confirm against types or source if handler needs adjustment.
