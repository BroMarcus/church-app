# One Kingdom — Pilot Phone Acceptance Gate

Status: REQUIRED BEFORE PREVIEW VERIFIED / READY

This is the exact live-device acceptance gate for the V1 pilot candidate. It is intentionally small, repeatable, bilingual, and non-destructive.

## Rules

- Test one exact deployed preview SHA. Record the SHA before starting.
- Run English and Spanish independently; do not assume one language proves the other.
- Use disposable pilot accounts/invitations only. Never edit or delete real member records to make a test pass.
- Do not change production schema, RLS, Auth configuration, finance data, or paid integrations during acceptance.
- A build/test pass is BUILD VERIFIED only. A flow is PREVIEW VERIFIED only after it is personally opened and completed on the actual preview/device.
- On any failure, record: role, language, device/browser, exact starting URL, step, visible message, and whether Retry/Back/Sign in recovered safely.

## Evidence header

Record once per run:

- Preview URL:
- Deployed commit SHA:
- Date/time:
- Tester:
- English device/browser:
- Spanish device/browser:
- Test church:
- Disposable test accounts used:

## A. Public join → new account → first login

Run once EN and once ES.

1. Open the church QR/share link while signed out.
2. Confirm the public page opens in the intended language.
3. Choose to join/create an account.
4. Confirm the account screen stays in the intended language.
5. Create a disposable account with a real reachable test email.
6. Confirm the page clearly says to check Inbox + Spam/Junk and to open the newest email.
7. Open the newest confirmation email on the same phone.
8. Confirm the link does not strand the user on a raw Auth/error page.
9. Sign in with the same account.
10. Confirm the user is connected to the intended church without creating a duplicate account/profile.
11. Confirm first login opens Start Here / Empieza Aquí when appropriate.
12. Complete or skip only the optional onboarding fields allowed by the UI.
13. Confirm Home / Inicio is the obvious next destination.

PASS requires: same account, correct church, correct language, no raw backend errors, no duplicate Person/profile, and a clear Home destination.

## B. Existing account → church join

Run once EN and once ES.

1. Start signed out with an account that already exists.
2. Open the church join link.
3. Choose the existing-account/sign-in path.
4. Confirm the UI explicitly discourages creating another account.
5. Sign in.
6. Confirm the user returns to/completes the intended church join safely.
7. Confirm no duplicate account/profile is created.

PASS requires: same account reused and intended church join completed.

## C. Private Person invitation

Run once EN and once ES with a disposable Person/invitation.

1. Create/copy/share the secure invitation from the authorized leader/admin surface.
2. Open the invitation signed out on the phone.
3. Confirm invitation language is preserved.
4. Complete registration with the invited email.
5. Confirm email if required.
6. Sign in once with the same account.
7. Confirm invitation redemption reaches the intended church/person flow.
8. If approval is required, confirm the user sees a simple pending state rather than unrelated church data.
9. Complete approval from the authorized leadership account.
10. Refresh/sign in again and confirm the approved user reaches the correct first-login/Home experience.

PASS requires: invitation cannot be silently applied to the wrong email/account and pending users do not gain broader access.

## D. Bad login → forgot password → reset → return

Run once EN and once ES.

1. Start from a church join link or other supported pilot entry that carries safe return context.
2. Enter a wrong password once.
3. Confirm the message recommends Forgot Password rather than creating another account.
4. Request one reset email.
5. Confirm Inbox + Spam/Junk + newest-email guidance is visible.
6. Confirm repeated taps are not encouraged during email cooldown.
7. Open the newest reset email on the same phone.
8. Set a new password.
9. Confirm the old password no longer works.
10. Continue to sign in with the new password.
11. Confirm safe invitation/join context is preserved when supported.
12. Confirm an invalid/expired reset link gives a simple EN/ES recovery path to request one fresh email.

PASS requires: no duplicate-account suggestion, no raw Auth error, new password works, and safe context is preserved.

## E. Invalid/old invitation and damaged link recovery

Run once EN and once ES.

1. Open an expired/used/revoked disposable invitation.
2. Confirm the page says to use the newest invitation and does not encourage a second account.
3. Open a deliberately malformed disposable invitation URL.
4. Confirm the page explains that the link is damaged/incomplete.
5. Confirm existing users can reach Sign in with the same account.
6. Confirm new users are directed to obtain a fresh invitation when public signup is not appropriate.

PASS requires: no dead end and no unsafe account duplication guidance.

## F. Wrong/unregistered account recovery

Run once EN and once ES.

1. Reach the protected app with an account that lacks the expected app/church registration.
2. Confirm the message is understandable to a low-tech user.
3. Use Check Again/Retry if present.
4. Use Sign Out and sign in with the correct account.
5. Confirm the correct account reaches the expected destination.

PASS requires: recovery without exposing unrelated church/member data.

## G. First-login simplicity

Run Guest/Pending/Member as available, EN and ES.

Confirm:

- Start Here / Empieza Aquí is short and understandable without training.
- Required actions are visually distinct from optional profile completion.
- A user can reach Home / Inicio without understanding church software terminology.
- Member Home does not expose leader/admin-only complexity.
- Loading, empty, retry, and error states remain in the selected language.
- Back/retry/sign-out actions are obvious enough for a low-tech user.

## H. Kingdom Guide

Run EN and ES as a normal member, then one authorized leader/admin role.

Confirm:

- First-day guidance points to Start Here once, then Home / Inicio as the normal starting place.
- Answers use plain language and do not imply divine revelation.
- The Guide does not suggest controls the current role cannot use.
- Normal members are not told to use Platform Owner-only Fresh Church Setup.
- Leader/admin guidance remains scoped to their actual authority.
- Unknown/unsupported requests give a safe next step rather than invented capability.

## I. Fresh Church Setup / Church Builder

Use only a disposable/non-production church setup path.

1. Confirm a normal member cannot see/use the setup entry.
2. Confirm a normal Church Admin cannot see Platform Owner-only setup if that is the current authority model.
3. Confirm the Platform Owner can open the setup surface.
4. Confirm EN/ES labels and recovery messages are understandable.
5. Exercise validation only: blank/invalid short web name, duplicate name/slug, invalid first-admin selection.
6. Do not create a real second church during this acceptance gate unless separately authorized.

PASS requires: authority is enforced in UI and backend, validation is recoverable, and no real tenant/data is created accidentally.

## J. Account Security

Run EN and ES with a disposable account.

- Confirm local sign out actually removes the local session before success is shown.
- Confirm Sign out everywhere does not report success unless session absence is verified.
- Confirm uncertain Auth/client failures produce a safe bilingual recovery state.
- Confirm invitation/join language/context is not turned into an open redirect.

## K. Pilot release decision

Only mark the candidate PREVIEW VERIFIED when all required rows above pass on the same deployed SHA.

If any row fails:

- keep deployment/launch status HOLD;
- record the exact failure;
- fix on an isolated branch;
- rerun automated regression/lint/build;
- deploy one exact preview candidate;
- rerun the failed live row plus any dependent rows.

Never convert BUILD VERIFIED into PREVIEW VERIFIED based only on code review, CI, screenshots, or assumptions.