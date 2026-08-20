# Join / Onboarding Audit Notes

## Purpose
Joining Kingdom Network should be simple enough for a first-time or low-tech user, preserve how the person connected, avoid duplicate people, and securely create the correct church relationship before Start Here continues the profile.

## Verified 2026-08-20
- Public church join page is bilingual and uses progressive onboarding: first/last name, email, optional phone, password and optional communication consent only.
- Public church join now uses bilingual show/hide-password controls so phone users can verify both password entries before submitting.
- Public signup status is resolved server-side from the church slug and respects `public_signup_enabled` plus configured pilot capacity.
- The browser does not choose its church role. `handle_new_user()` creates new-account memberships server-side.
- Public signup capacity is rechecked in the database during account creation, not only displayed in the page UI.
- New public signups begin with a `guest` relationship and are routed to Start Here after confirmation/session creation.
- Supabase Auth logs on 2026-08-20 show successful new-account confirmation through `/auth/callback` and successful password recovery through `/auth/update-password`, including the password update event.
- Login and email-recovery screens provide English/Spanish guidance, duplicate-click cooldowns, and instructions to open only the newest account email.
- Expected wrong-password and unconfirmed-email attempts are treated as user-facing auth states rather than production error incidents; unexpected auth failures remain error-logged.
- Existing-account detection does not create a duplicate auth identity. The pilot-hardening branch now also preserves the church join destination through sign-in.
- The pilot-hardening branch adds a signed-in “Use my existing account” path backed by an authenticated, idempotent database function. It only creates the normal `member` role, refuses to silently reactivate an intentionally inactive prior membership, respects public pilot capacity, and does not overwrite existing phone/consent data.
- Existing-account public join reuses an Outreach record already linked to the account when one exists; otherwise it attempts normalized email/phone matching before creating a guest follow-up.
- `handle_new_user()` attempts to claim an existing Outreach record by normalized email/phone before creating a new guest outreach record for new accounts.
- When no existing Outreach record matches, public signup creates a guest follow-up assigned to pastor/church-admin with a 24-hour due date.
- Signup consent and preferred language flow into the linked Outreach communication record.
- Friendship Group join links are validated against the church/group before signup.
- Friendship Group signup records `join_source='friendship_group'` and `join_group_id`; the outreach source trigger attaches the group source and can assign the group leader as follow-up owner.
- Public signup cannot move itself into an arbitrary disabled church or choose an elevated role through client metadata.

## Still open in this tab
- The existing-account database function is intentionally not applied to production until the draft PR passes review/build validation.
- Permanent QR presentation/generation in the admin UI should be visually verified and made easy to print/share.
- Event-specific join source is still a future extension alongside the working church and Friendship Group sources.
- Repeat the complete phone-based public signup, confirmation, sign-in, existing-account church join, password recovery, and Spanish first-login walkthrough after the next approved deployment.
