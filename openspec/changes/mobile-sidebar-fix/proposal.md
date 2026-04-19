## Why

The signed-in shell is hard to use on mobile because the main navigation sidebar is not reliably accessible, which blocks room and DM switching on small screens. The header also spends space on branding instead of navigation affordances, while the current-user identity is duplicated in a less useful place for mobile layouts.

## What Changes

- Make the authenticated chat shell responsive on mobile by replacing the always-visible desktop sidebar pattern with a burger-triggered navigation drawer on small screens.
- Hide the logo/app branding in the mobile top bar so the header can prioritize the menu trigger and active-conversation context.
- Move the current-user identity display out of the top bar and into the right sidebar so the small-screen header stays compact while user/account context remains available.
- Keep desktop behavior intact: the persistent sidebar remains visible on larger breakpoints and existing room/DM/invite navigation flows continue to work.
- Add focused automated coverage for the responsive shell behavior so the mobile navigation entry point does not regress.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chat-ui`: The authenticated app shell requirements need responsive behavior for small screens, including a burger-triggered left navigation drawer, compact mobile header treatment, and relocation of current-user identity to the right sidebar.

## Impact

- **Code**: Signed-in shell layout/components, sidebar/navigation components, top-bar/header components, right sidebar profile/user summary, and responsive styling/hooks.
- **Tests**: UI tests for mobile shell navigation visibility and drawer open/close behavior; targeted e2e coverage if an existing shell/navigation spec already exercises responsive chat-shell flows.
- **APIs / realtime**: None.
- **Docs**: OpenSpec artifacts only unless README explicitly documents mobile shell behavior.
