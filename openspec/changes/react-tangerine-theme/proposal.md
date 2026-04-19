## Why

The chat UI currently ships with a single visual theme and no way to respect user or system dark-mode preferences. A classic web chat should feel comfortable in different lighting and match OS appearance. Adopting the **React Tangerine** palette (OKLCH tokens aligned with shadcn/ui CSS variables) gives the product a cohesive, modern look while supporting explicit **light**, **dark**, and **system (auto)** modes.

## What Changes

- Replace the default shadcn/Tailwind semantic tokens with the **React Tangerine Theme** light and dark variable maps (OKLCH), including sidebar, chart, and radius/spacing tokens from the reference implementation.
- Add a **color mode** control: **Light**, **Dark**, and **Auto** (follow `prefers-color-scheme` until the user chooses a fixed mode).
- Persist the user’s choice in **localStorage** (and apply it before paint where possible to avoid flash) so reloads and new tabs stay consistent; **Auto** re-evaluates when the OS theme changes.
- Surface the control in the **signed-in UI** (e.g. Settings and/or user menu) using shadcn patterns; unauthenticated pages inherit **Auto** or a sensible default.
- Load **Inter**, **Source Serif 4**, and **JetBrains Mono** per the theme config (Next.js `next/font` or equivalent) and map `--font-sans`, `--font-serif`, `--font-mono` so typography matches the showcase.
- Ensure **no server/API contract** change; appearance is client-only persistence unless a later phase syncs prefs to the profile.

## Capabilities

### New Capabilities

- `appearance`: Color mode (light / dark / auto), React Tangerine CSS variable sets for light and dark, client persistence, flash-free application at startup, and documented integration points for layout and settings UI.

### Modified Capabilities

- `app-skeleton`: Root layout (or equivalent) SHALL apply the appearance provider and register theme fonts so all routes receive correct CSS variables and font stacks.
- `chat-ui`: Signed-in shell or settings SHALL expose a visible control to set appearance to Light, Dark, or Auto; changing the value SHALL update the UI immediately and persist across sessions.

## Impact

- **Touched**: `app/layout.tsx` (or root providers), `app/globals.css` / Tailwind theme extension, new `lib/` or `components/` module for theme tokens and mode state, Settings (or shell) UI, `README.md` if user-facing behavior is documented there.
- **Dependencies**: Optional `next/font` for Google fonts; no new npm packages strictly required if using existing `next/font/google`.
- **Tests**: Unit tests for mode resolution (auto → effective light/dark, persistence read/write); optional lightweight RTL test for the control if added as a small component.
- **Docker / Compose**: No new services or env vars.
