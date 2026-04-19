## Context

The app uses Next.js 15 App Router, Tailwind CSS, and shadcn/ui with semantic CSS variables (`--background`, `--primary`, etc.). Today there is no first-class color-mode switch or persisted preference. The product wants **React Tangerine** OKLCH token sets for light and dark (as in the reference snippet) plus **Light / Dark / Auto** behavior.

## Goals / Non-Goals

**Goals:**

- Ship Tangerine light/dark variable maps as the single source of semantic colors for the UI.
- Implement **Auto** using `prefers-color-scheme` when the user has not pinned light or dark.
- Persist choice in `localStorage`; rehydrate on load with minimal flash of wrong theme.
- Load **Inter**, **Source Serif 4**, and **JetBrains Mono** via `next/font/google` and wire Tailwind `font-sans` / `font-serif` / `font-mono` to match the theme.
- Expose a clear control in the signed-in experience (Settings page and/or user menu).

**Non-Goals:**

- Syncing appearance to the server or Prisma (client-only unless a future change adds profile prefs).
- Theming Centrifugo, email templates, or OS notification icons beyond what `theme-color` / manifest already do elsewhere.
- Supporting multiple unrelated color themes (only Tangerine for this change).

## Decisions

1. **Theme runtime: `next-themes` (recommended) vs hand-rolled context**  
   **Choice:** Use **`next-themes`** `ThemeProvider` with `attribute="class"` on `<html>`, `enableSystem`, `defaultTheme="system"`, and `storageKey` dedicated to this app (e.g. `chat-appearance`).  
   **Rationale:** Handles system preference changes, avoids hydration mismatch patterns, and maps cleanly to Tailwind `dark:` when `darkMode: 'class'`.  
   **Alternative:** Custom Zustand + `matchMedia` — fewer deps but more FOUC and SSR edge cases to hand-code.

2. **Where token values live**  
   **Choice:** A small module (e.g. `lib/theme/tangerine.ts`) exporting `lightTheme` / `darkTheme` as `Record<string, string>` identical to the reference, plus a helper that applies them to `document.documentElement` **or** maps them into `app/globals.css` under `.root` / `.dark` classes.  
   **Rationale:** Keeps tokens versionable and testable; reference values stay copy-paste faithful.  
   **Preferred integration with shadcn:** Define light variables on `:root` and dark overrides on `.dark` in `globals.css` (generated from the TS maps or maintained in sync) so SSR static CSS always matches.

3. **FOUC / flash**  
   **Choice:** Rely on `next-themes` **inline blocking script** pattern (or its built-in `nonce` support if CSP is added later) so the stored class is applied before first paint.  
   **Mitigation:** Avoid async-only client effect without the script.

4. **Missing `--destructive-foreground` in reference**  
   **Choice:** Add explicit `--destructive-foreground` for light and dark (high-contrast text on destructive backgrounds) so shadcn `destructive` buttons match WCAG-style contrast.  
   **Rationale:** Reference showcase used a fallback `#fff`; formalizing the variable matches the rest of the token set.

5. **Control UX**  
   **Choice:** Segmented control or `Select` with three options: **Light**, **Dark**, **Auto** (label “System” is acceptable in UI copy). Calling `setTheme('light' | 'dark' | 'system')` from `next-themes`.

## Risks / Trade-offs

- **[Risk] Hydration mismatch** if theme class differs between server and client → **Mitigation:** `suppressHydrationWarning` on `<html>` where required; use `next-themes` documented pattern.
- **[Risk] `localStorage` unavailable** (private mode, SSR) → **Mitigation:** `next-themes` falls back to system/defaults; no crash.
- **[Risk] Font bundle size** → **Mitigation:** Subset weights actually used; load only necessary families.

## Migration Plan

1. Add dependency `next-themes` if not present.
2. Add token source + `globals.css` updates; verify all shadcn components still resolve variables.
3. Wrap root layout with provider; add fonts.
4. Add Settings (or shell) UI and a short README note on appearance.
5. Rollback: revert provider + CSS + dependency; restore prior `globals.css` from git.

## Open Questions

- None blocking: exact placement (Settings only vs also user menu) can follow existing R4 settings layout.
