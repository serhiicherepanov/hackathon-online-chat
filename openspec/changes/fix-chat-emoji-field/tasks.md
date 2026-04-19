## 1. Diagnose and fix emoji integration

- [x] 1.1 Reproduce the failure path (composer → emoji button → pick) and confirm whether `onPick`/`emoji-click` fires and whether `detail` matches `emoji-picker-element` v1.29.x.
- [x] 1.2 Fix `EmojiPopover` so the picker upgrades reliably and `emoji-click` is handled (listener target, `customElements.whenDefined`, ref to `<emoji-picker>`, or equivalent).
- [x] 1.3 Verify `MessageComposer` `insertAtCaret` still runs after the pick (focus/selection); adjust popover focus behavior only if needed (e.g. Radix modal mode).

## 2. Automated tests and verification

- [x] 2.1 Add colocated Vitest tests (e.g. `emoji-popover.test.tsx` and/or `message-composer.test.tsx`) that assert draft text updates when `onPick` is invoked; mock heavy custom-element UI if required.
- [x] 2.2 Optional: extract a small pure `insertAtCaret` helper for value + indices and unit-test it if it simplifies coverage.
- [x] 2.3 Run `pnpm typecheck` and `pnpm test`; fix any regressions.
