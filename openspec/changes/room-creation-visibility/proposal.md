## Why

The public room catalog’s **Create room** dialog always submits `visibility: "public"` and labels the flow as “public only,” so users cannot create **private** rooms from the UI even though `POST /api/rooms` already accepts `public` | `private`. Private rooms are only reachable today via API or other paths, which blocks the intended product behavior.

## What Changes

- Add a **visibility control** (public vs private) to the create-room modal on `/rooms`, with a clear default (public) and copy that explains private rooms are not listed in the catalog.
- Submit the selected `visibility` in the existing `POST /api/rooms` body (no new endpoint).
- Align dialog title and any helper text with **both** visibility modes (remove “public only” wording).
- Extend **automated tests** (e2e and/or unit/component as appropriate) so creating with each visibility is covered or the control is asserted.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `chat-ui`: Create-room modal on `/rooms` SHALL let the user choose **public** or **private** before submit and SHALL send that value to `POST /api/rooms`. Copy SHOULD clarify that private rooms are joinable via membership/invite, not the public catalog.

## Impact

- **UI**: `app/(app)/rooms/page.tsx` (create-room dialog), possibly shared shadcn controls (`RadioGroup`, `Select`).
- **Tests**: `e2e/helpers/rooms.ts` and specs that create rooms from the UI; optional RTL/unit test if the control is extracted.
- **Docs/README**: Only if setup or user-facing behavior is documented as “public-only” creation today.
