## Context

The authenticated shell already depends on a sidebar-driven navigation model for invites, direct messages, and rooms, but the current small-screen layout leaves that navigation inaccessible or visually broken on mobile. The requested change is a UI-only shell adjustment: keep the existing data sources and conversation flows, but make navigation reachable on phones, free header space by hiding branding on small screens, and move current-user identity out of the cramped mobile top bar.

## Goals / Non-Goals

**Goals:**
- Make room/DM/invite navigation reachable on mobile through an explicit burger-menu entry point.
- Preserve one canonical sidebar content tree so desktop and mobile stay behaviorally consistent.
- Keep the mobile header compact by hiding the logo and moving current-user identity out of the top bar.
- Add targeted regression coverage for responsive shell behavior.

**Non-Goals:**
- Redesigning message views, members/details content, or conversation-level moderation UI.
- Changing room, DM, invite, auth, or realtime APIs.
- Reworking the desktop shell beyond the minimal structural changes needed to share navigation content.

## Decisions

- **Use one shared navigation content component for both desktop and mobile shells.**
  - Desktop keeps a persistent left sidebar.
  - Mobile renders the same content inside a drawer/sheet opened from a burger button.
  - Alternative considered: maintain separate desktop/mobile sidebar trees.
  - Reason for rejection: duplicated navigation markup tends to drift and doubles regression surface for unread badges, accordion state, and entry points.

- **Treat the top bar as a compact mobile control strip.**
  - On small screens, hide the logo/app-name treatment and reserve the header for the burger trigger plus route/conversation context.
  - Alternative considered: keep the logo and compress other controls around it.
  - Reason for rejection: it preserves branding at the cost of the more important navigation affordance on narrow screens.

- **Move current-user identity/actions out of the mobile top bar and into the right-side shell details area.**
  - This keeps account context available without consuming scarce header width.
  - Alternative considered: keep the user trigger in the top bar and only add the burger button.
  - Reason for rejection: it still leaves the mobile header overcrowded and does not address the user's requested information hierarchy.

- **Cover the behavior with focused component/e2e tests instead of broad visual snapshot tests.**
  - Component tests can assert drawer trigger/visibility behavior at mobile breakpoints.
  - Existing or new e2e coverage can verify that a mobile user can open the drawer and navigate to a room/DM.

## Risks / Trade-offs

- **Drawer state and route changes can get out of sync** -> Mitigate by centralizing mobile-nav open/close state and auto-closing the drawer after successful navigation.
- **Responsive-only regressions are easy to miss in desktop-first testing** -> Mitigate with explicit mobile viewport coverage in automated tests.
- **Moving current-user controls may reduce discoverability for desktop users if over-applied** -> Mitigate by scoping the relocation primarily to mobile behavior unless implementation review shows a clean shared placement for all breakpoints.
