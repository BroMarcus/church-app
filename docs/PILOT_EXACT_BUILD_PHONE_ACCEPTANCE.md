# Kingdom Network — Exact-Build Phone Acceptance

Updated: 2026-08-25

## Purpose

This is the final human acceptance gate for the combined V1 pilot candidate. Automated tests are necessary, but they do not prove that a low-tech member can complete the real email, phone, browser, and church-join flows.

Run this matrix only against one deployed preview whose exact 40-character Git SHA is known. Run the same required scenarios in English and Spanish. Do not reuse PASS evidence from another build, preview, tester, church, device, or edited test setup.

## Safety rules

- Use designated test accounts and a designated test church only.
- Existing users must keep the same Kingdom Network account. A test that requires or encourages a duplicate account is a FAIL.
- Use harmless test material in Fresh Church Setup. Never upload real member records, pastoral notes, finance records, passwords, one-time codes, private prayer details, or access tokens.
- Never paste passwords, one-time codes, confirmation/reset links, invitation tokens, private member data, or meeting addresses into GitHub/Control Room evidence.
- Tap consequential actions once. If the outcome is uncertain, reload/review state before repeating the action.
- Fresh Church Setup approval must create/open an unpublished Course Builder draft. Automatic publication is a release blocker.
- If Auth, membership, permission, resource, readiness, or setup state cannot be verified, the UI must fail closed. It must not invent a normal empty/zero/closed/expired/signed-out state.

## Evidence required for every PASS/FAIL

Record: exact deployed 40-character Git SHA, preview/site origin, device/browser, test-account type, church/test tenant, date, English tested yes/no, Spanish tested yes/no, result, and a short observation. PASS requires both languages for the critical flow. Do not record secrets.

## Test accounts

Prepare three harmless pilot identities:

1. NEW — email has never had a Kingdom Network account.
2. EXISTING — confirmed account already exists and can sign in.
3. ADMIN — Pastor or Church Admin in the designated test church.

For recovery tests, it is useful to have a fourth EXISTING account whose email is intentionally unconfirmed, if the test environment supports this safely.

## A. New account + first login

### A1 — Public signup

1. Open the designated church join link.
2. Create the NEW account once.
3. Confirm the newest email only.
4. Confirm Kingdom Network reaches Start Here with a verified account/church state.
5. Tap the single primary Take me Home / Ir a Inicio action once.
6. Confirm Home is understandable without visiting every section.

PASS when no duplicate submission occurs, confirmation does not dead-end, Start Here stays simple, and Spanish does not fall into English-only recovery.

### A2 — New private invitation

1. ADMIN creates one private invitation for NEW.
2. NEW opens the newest invitation and creates the account once.
3. Confirm the newest email.
4. Verify the invitation is redeemed only after verified authentication.
5. Verify the user reaches Start Here without a second unnecessary password/sign-in step.

PASS when the church connection is attached to the verified account and the invitation is not consumed prematurely.

## B. Existing account — never create a duplicate

### B1 — Public church join

1. EXISTING opens the church join link while signed out.
2. Choose Sign In, not Create Account.
3. Sign in with the existing account.
4. Finish joining the intended church.
5. Confirm Start Here/Home clearly acknowledges the same account/church connection.

PASS when the same user account is used end-to-end and the intended church survives sign-in.

### B2 — Private invitation direct sign-in

1. ADMIN creates a private invitation for EXISTING.
2. EXISTING opens it while signed out.
3. Sign in with the same account.
4. Verify the invitation is applied after verified authentication.

PASS when no second account is requested or created.

### B3 — Damaged, old, revoked, used, or replaced invitation

Test at least one malformed/truncated link and one deliberately revoked/replaced link.

PASS when Create Account is not offered for unsafe invitation context, the user is told to keep the same account, and recovery points to the newest invitation or safe Sign In path.

## C. Password reset + confirmation reliability

### C1 — Forgot password from normal Sign In

1. Request one reset email.
2. Confirm the 60-second client cooldown starts only after a confirmed send.
3. Open only the newest reset email.
4. Set a new password once.
5. Verify the current browser session is actually signed out before the UI claims completion, or verify Account Security fallback appears if cleanup is uncertain.
6. Sign in with the new password.

After the legitimate cooldown expires, refresh the old success URL. PASS only if the button remains available unless another email was actually sent.

### C2 — Forgot password while joining a church/private invitation

Repeat C1 starting from a public church join and from a private invitation.

PASS when the safe `/join/*` destination/private invitation survives reset and re-sign-in, and the existing account finishes the intended connection.

### C3 — Unconfirmed email resend

1. Request one fresh confirmation email.
2. Verify cooldown begins only after confirmed send.
3. Open only the newest email.
4. Confirm the account and continue with the same account.

PASS when temporary send/verification failure does not falsely claim the newest link is expired and does not encourage repeated emails or duplicate accounts.

### C4 — Temporary Auth failure versus truly expired link

Exercise a safe test/stubbed failure if the preview supports it; otherwise verify through the existing regression suite and inspect the user-facing behavior when naturally encountered.

PASS when only explicit terminal Auth-link codes produce expired/used guidance. Rate limits, 5xx, transport failures, unknown status, or incomplete Auth success must remain retryable and must not be presented as a bad newest link.

## D. Email-link routing certainty

### D1 — Normal confirmation

PASS when normal account confirmation routes to Start Here or the validated intended church join.

### D2 — Password recovery

PASS when recovery routes to Change Password and cannot bypass password change into an ordinary signed-in page.

### D3 — Login-email change confirmation

PASS when confirming a new login email routes to Account Security, not Start Here/new-member onboarding.

### D4 — Magic-link sign-in

PASS when a valid magic link routes to the validated intended church join when applicable, otherwise Home. It must not be silently treated as new-account signup.

### D5 — Missing/unsupported callback mode

PASS when the callback fails closed before code exchange/invitation redemption and gives safe bilingual recovery.

## E. Sign In and account settings

### E1 — Wrong password versus temporary Auth outage

PASS when a real invalid-credentials condition gives specific help, while an uncertain Auth/network failure says the account may be fine, offers retry, and warns the user not to create another account.

### E2 — Returning-user protected pages

While signed out, open Start Here, Kingdom Guide, Church Builder, Setup Inbox, Account Security, Privacy, Notifications, and Private Care.

PASS when returning users are routed to Sign In rather than being encouraged toward Create Account, with Spanish preserved.

### E3 — Account Security

Test login-email change, password change, and Sign out everywhere using test data.

PASS when temporary client/Auth failures show safe retry and Sign out everywhere does not claim success unless the current browser session is actually gone.

## F. Kingdom Guide — extreme simplicity

1. Open Guide in English and Spanish.
2. Search: forgot password; never received confirmation; already have an account and need to join church; old invitation; duplicate account; Fresh Church Setup.
3. Verify help answers remain separate from approved church-resource search.
4. Trigger/review resource-read and membership-read failure behavior where safely possible.

PASS when Guide tells a new user to use Start Here once and then Home/Inicio as the main starting place, returning users are told to keep the same account, failed reads show retry instead of “no resources/no church,” and Spanish remains Spanish.

## G. Fresh Church Setup / Church Builder

### G1 — Readiness certainty

PASS when failed Auth/membership/readiness reads never produce an invented 0% readiness score or wrong next task.

### G2 — Setup Inbox upload

1. ADMIN uploads one harmless allowed test file.
2. Tap upload once.
3. Verify controls stay locked through confirmed success/refresh.
4. If metadata creation fails in a controlled test, verify storage cleanup is positively confirmed before the UI says it is safe to retry.
5. If cleanup cannot be confirmed, verify the UI says not to upload the same file again yet.

PASS when no duplicate/orphan upload is encouraged.

### G3 — Review and approval

1. Review one recommendation.
2. Approve once.
3. Confirm a real record changed before success is shown.
4. Confirm the result opens as an unpublished Course Builder draft.
5. Retry/reload and verify no duplicate draft is created.

## H. Invitation administration

1. ADMIN opens Join Center in English and Spanish.
2. Verify English QR targets English join and Spanish QR targets Spanish join.
3. Create one invitation on a slow phone; repeat tap must be blocked while pending.
4. Revoke one open invitation; success requires a real changed record.
5. Simulate/observe an uncertain create/revoke failure where safely possible.

PASS when uncertain outcomes tell the leader to reload and inspect the invitation list before repeating any create/copy/revoke action.

## I. Pilot Readiness / Phone Proof integrity

1. Open Real Phone Proof as an authorized ADMIN.
2. Verify loading says to keep the page open while account/church/build identity is checked.
3. Verify missing, malformed, or conflicting build identity cannot be marked PASS.
4. Verify PASS requires device, test-account type, date, valid site/preview, observation note, exact build, and English + Spanish evidence.
5. Edit any evidence field after PASS.

PASS when the result automatically becomes Not tested after evidence changes and stale evidence from another build/site/tester/church is not accepted.

## J. Stop-the-release conditions

Stop and record FAIL immediately if any of these occur:

- existing user is required or encouraged to create a duplicate account;
- raw Supabase/database/Auth/provider error text is shown to a normal user;
- failed read becomes a legitimate empty, zero, closed, expired, or signed-out state;
- Spanish flow falls into an English-only dead end;
- ordinary member sees leader/admin-only data/actions;
- one church can see another church’s data;
- valid join/invitation context is lost during confirmation/password recovery;
- private invitation is consumed before verified authentication;
- setup approval publishes curriculum automatically;
- repeat tap creates duplicate consequential records;
- uncertain invitation/upload/write outcome tells the user to repeat the action without first checking state;
- PASS evidence is accepted without exact build/site/tester/bilingual proof;
- unowned Finance/RLS/schema/Auth-config changes, production writes, paid-service changes, or V2 scope appear in the candidate.

## Pilot-ready definition

The candidate is pilot-ready only when the exact deployed build passes the automated release gate and the required real-phone matrix passes in English and Spanish using designated test accounts. Production deployment remains HOLD until the coordinated release is explicitly approved.