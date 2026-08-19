# Join / Onboarding Audit Notes

## Purpose
Joining Kingdom Network should be simple enough for a first-time or low-tech user, preserve how the person connected, avoid duplicate people, and securely create the correct church relationship before Start Here continues the profile.

## Verified 2026-08-19
- Public church join page is bilingual and uses progressive onboarding: first/last name, email, optional phone, password and optional communication consent only.
- Public signup status is resolved server-side from the church slug and respects `public_signup_enabled` plus configured pilot capacity.
- The browser does not choose its church role. `handle_new_user()` reads the church's configured `public_signup_role` and creates the membership server-side.
- Public signup capacity is rechecked in the database during account creation, not only displayed in the page UI.
- New public signups begin with a `guest` relationship and are routed to Start Here after confirmation/session creation.
- Existing-account detection redirects the person to sign in rather than creating a duplicate auth identity.
- `handle_new_user()` attempts to claim an existing Outreach record by normalized email/phone before creating a new guest outreach record.
- When no existing Outreach record matches, public signup creates a guest follow-up assigned to pastor/church-admin with a 24-hour due date.
- Signup consent and preferred language flow into the linked Outreach communication record.
- Friendship Group join links are validated against the church/group before signup.
- Friendship Group signup records `join_source='friendship_group'` and `join_group_id`; the outreach source trigger attaches the group source and can assign the group leader as follow-up owner.
- Public signup cannot move itself into an arbitrary disabled church or choose an elevated role through client metadata.

## Still open in this tab
- Permanent QR presentation/generation in the admin UI should be visually verified and made easy to print/share.
- Event-specific join source is still a future extension alongside the working church and Friendship Group sources.
- Full end-to-end email-confirmation testing should be repeated on the next deployment after all tab changes are complete.
