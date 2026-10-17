# Direct app launch and onboarding

## Purpose and route

`/` opens the application directly. It is not a marketing landing page and does not expose account
creation, sign-in, or sign-out actions. On first visit, it runs the guided local profile and
companion onboarding flow. Today is the current destination; after AIF acceptance the default becomes
the shared conversational workspace at `/plan`, while Today remains directly available.

The username is cached in browser local storage. It is not a credential, is never used for
authorization, and is written only after the internal isolated workspace bootstrap succeeds.

## State contract

| State | Required presentation |
|---|---|
| Default | Direct app launch surface with the scripted onboarding conversation when no cached username exists. |
| Existing profile | Load the existing session and onboarding state; offer the daily check-in, then enter the accepted workspace destination without resetting data. |
| Missing local username | Preserve any valid authenticated workspace; collecting a display name must not reset or replace that actor. |
| Loading | Keep the current step visible, disable duplicate submission, and announce workspace preparation or save progress. |
| Error | Keep the current input editable, explain the failed operation, and offer retry. |
| Offline | When the application server is unreachable, keep the dialog readable, disable bootstrap writes, and explain that the server connection must be restored. |
| Permission | The username never grants access; protected routes still require the internal server actor. |
| Lost browser session | Explain that the previous workspace cannot be recovered through a username; creation of a new workspace is separate and does not delete retained data. |
| Desktop session recovery | The main process restores the enrolled actor with OS-protected proof; unavailable proof produces an honest recovery error and preserves data. |
| Success | Cache the trimmed username, persist onboarding/check-in state, and enter `/today` until AIF acceptance changes the default to `/plan`. |

Internet connectivity is not the startup gate. Electron can bootstrap a local profile and run manual
workflows without internet when its loopback application server and local database are ready. An
unavailable AI provider produces a degraded state without blocking that local path.

## Layout and accessibility

- Use a restrained app launch surface with the Omplish mark and no promotional preview composition.
- First-run steps collect a name, optional OpenAI key, companion goals, and a final confirmation.
- Returning users see one daily mood check-in; a configured companion may provide a short response.
- Escape and outside clicks cannot dismiss required first-run setup.
- Initial focus enters the active field; typewriter copy is skippable and reduced motion removes its delay.
- Errors use an alert and retain the current input value.
- Ordinary retry is nondestructive, including legacy bootstrap calls. Optional provider-setting
  failure offers a degraded manual path without overwriting the stored credential.
- The dialog and launch surface meet the shared keyboard, touch, responsive, theme, and reduced-motion
  contracts at 1440, 1024, and 390 CSS px.
