# Kingdom Network — Pre-Pro Pilot Hardening

Updated: 2026-08-20
Branch: `pre-pro-pilot-hardening`

This file tracks work that can be prepared and verified before the next production deployment. Production `main` should remain unchanged until the next approved deployment batch.

## Completed in this hardening pass

### Learning engine
- Verified Effective Soul Winning is already expanded to the current assessment standard:
  - Checkpoint 1: 6 questions
  - Checkpoint 2: 6 questions
  - Final exam: 20 questions
  - Passing score: 80%
- Verified `private.submit_assessment_attempt_impl` enforces required checkpoint order server-side.
- Verified the final exam is blocked server-side until every required module assessment is passed.
- Verified passing a required module assessment marks the related module complete.
- Identified a direct-URL bypass where an enrolled learner could manually open a later lesson page even though the later assessment itself was still blocked.
- Fixed the direct-URL lesson bypass on this branch by checking all required assessments on earlier modules before rendering a later lesson.

### Supabase security review
- Ran current Supabase security advisors.
- Reviewed high-impact SECURITY DEFINER functions including member-status changes, imports, directory reads, finance reporting, and Resend provider configuration.
- Confirmed the reviewed high-impact functions perform explicit church-role / permission checks internally.
- Confirmed public invitation-preview and invite-email validation functions intentionally expose only limited invite-validation data.
- Remaining account-level Auth warning: leaked-password protection is disabled and should be enabled in Supabase Auth settings.
- Remaining infrastructure warning: `pg_net` is installed in the public schema. Review before moving because extensions/functions may depend on its current location.
- `church_signup_settings` and `public_signup_registrations` have RLS enabled with no direct RLS policies. Confirm whether these tables are intentionally RPC/service-only before changing them.

### Evangelism / follow-up audit
Existing implementation already includes:
- searchable/pipeline-style Outreach section
- quick guest/contact capture
- follow-up owner
- automatic follow-up due date
- stage tracking
- interaction history
- service attendance tracking
- Bible-study tracking
- consent-aware email/SMS fields
- communication language
- duplicate prevention using normalized phone/email
- member-account linking rather than creating duplicate people
- secure admin invitation bridge from Outreach to member account
- recommended next-step guidance by outreach stage

## Next highest-value fixes

### 1. Finish source / visit history capture
The database already contains:
- `outreach_contacts.source_type`
- `outreach_contacts.source_label`
- `outreach_contacts.source_group_id`
- `outreach_contacts.source_occurred_at`

The current quick-add Outreach UI/action does not consistently populate those fields. Add a simple source selector covering:
- Main church / service
- Friendship Group
- Outreach
- Event
- Leader/manual entry

Keep the quick-add flow minimal. Source should be optional and default safely to leader/manual entry when not supplied. Show the source on the person's Outreach detail/history page.

### 2. Verify automated communication workflow
Confirm whether first-visit thank-you, re-invite, Bible-study follow-up, and First Steps invitation are only queued/configured or fully deliverable. Keep consent checks mandatory before sending.

### 3. Verify missed-follow-up escalation
The UI already surfaces overdue and unassigned follow-ups. Verify whether leadership escalation/notification exists beyond the dashboard warning.

### 4. Enable leaked-password protection
After reviewing the Supabase Auth settings, enable compromised-password protection for the pilot.

## Deployment rule for this branch
- Do not merge to `main` only to create a tiny deployment.
- Batch pilot-hardening changes together.
- Run security tests, lint, and production build before merge.
- Merge/deploy after Vercel Pro billing/spend controls are configured, unless an urgent production fix requires otherwise.
