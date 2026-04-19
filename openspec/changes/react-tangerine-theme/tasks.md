## 1. Dependencies and token module

- [ ] 1.1 Add `next-themes` to the app dependencies if not already present
- [ ] 1.2 Create `lib/theme/tangerine.ts` exporting light/dark OKLCH maps from the React Tangerine reference plus explicit `--destructive-foreground` values for both modes

## 2. Global styles and Tailwind

- [ ] 2.1 Update `app/globals.css` so `:root` and `.dark` assign the Tangerine variables (keep parity with the TS maps)
- [ ] 2.2 Confirm `tailwind.config.ts` uses `darkMode: 'class'` and semantic colors still map to CSS variables

## 3. Fonts and root layout

- [ ] 3.1 Load Inter, Source Serif 4, and JetBrains Mono via `next/font/google` (or documented equivalent) and wire `fontFamily` / CSS variables to match the theme
- [ ] 3.2 Wrap the app in `ThemeProvider` from `next-themes` with `attribute="class"`, `enableSystem`, a stable `storageKey`, and `suppressHydrationWarning` on `<html>` per library docs

## 4. Signed-in UI control

- [ ] 4.1 Add an appearance control (Light / Dark / Auto) on the account Settings page and/or the top-nav user menu using shadcn components
- [ ] 4.2 Ensure the control calls the theme API (`setTheme`) and labels Auto consistently (e.g. "System")

## 5. Verification and docs

- [ ] 5.1 Add unit tests for any pure helpers (e.g. token export sanity, mode label mapping if non-trivial)
- [ ] 5.2 Add or extend Playwright coverage so a signed-in user can switch appearance and the document has the expected `class` or computed theme (stack-backed e2e per `AGENTS.md`)
- [ ] 5.3 Update `README.md` with a short note on theme / appearance if user-facing behavior warrants it
- [ ] 5.4 Run `pnpm typecheck`, `pnpm test`, and the full `./scripts/ci-e2e.sh` before push
