## 1. Shared shell navigation

- [x] 1.1 Refactor the signed-in shell so the invites/direct-messages/rooms navigation is produced by one shared sidebar content component instead of separate mobile/desktop markup.
- [x] 1.2 Keep the navigation permanently visible at desktop breakpoints and render the same content inside a burger-triggered drawer or sheet on small screens.
- [x] 1.3 Ensure mobile navigation closes after the user selects a room, DM, or invite destination.

## 2. Mobile header and right-sidebar identity

- [x] 2.1 Update the small-screen top bar to hide the logo/app-name treatment and show a burger-menu trigger plus route/conversation context.
- [x] 2.2 Move the current-user identity/actions out of the mobile top bar into the right-side shell details area without regressing sign-out access.
- [x] 2.3 Verify desktop shell behavior stays intact after the responsive layout changes.

## 3. Regression coverage

- [x] 3.1 Add or update component tests for mobile shell behavior, including burger-trigger visibility and drawer open/close behavior.
- [x] 3.2 Add or update stack-backed e2e coverage to verify a mobile viewport user can open the navigation drawer and switch conversations from it.
- [x] 3.3 Run the relevant test suite(s) and capture the resulting logs in `test-artifacts/` before finalizing the implementation change.
