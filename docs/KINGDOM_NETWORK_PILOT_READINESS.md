# Kingdom Network — Pilot Readiness Status

Last reconciled: 2026-08-19

This file is the current pilot-hardening source of truth. An item is marked complete only when the supporting product flow or database control exists. External/infrastructure items stay explicitly blocked instead of being treated as unfinished app code.

## P0 — Pilot account access and onboarding

- [x] Existing users can sign in and recover/resend account email flows.
- [x] Public pilot signup is capacity-aware and fails closed if capacity is reached during account creation.
- [x] Church-specific public signup binds the new account to the intended church instead of whichever church happens to be first.
- [x] Permanent church join page exists at `/join/[church-slug]`.
- [x] Pastor/admin invitation screen exposes a permanent member join link and scannable QR code.
- [x] Personal leadership invitations remain expiring and exact-email bound.
- [x] Signup confirmation routes new people into Start Here/onboarding.
- [x] Bilingual English/Spanish entry flow is preserved.
- [ ] Live end-to-end pilot-user confirmation on multiple real devices/accounts — **requires real pilot users, not more app code**.

## P0 — Permissions and privacy

- [x] Pastoral care is permission-bound.
- [x] Member private details are self/authorized-leadership only.
- [x] Verified milestone changes are limited to authorized member-record managers.
- [x] Documents, messages, message reports, group reports and outreach use restricted RLS/role access.
- [x] Public pre-auth RPC surface is limited to invite/signup validation and preview needs.
- [x] Permission helper execution is unavailable to anonymous users.
- [x] Signup trigger fails closed for invalid invite, unavailable public church and full pilot capacity.
- [x] Household/family records use RLS and authorized member-record management.
- [ ] Supabase leaked-password protection — **blocked on Auth project configuration; not an application-code change**.

## P0 — Learning Center

- [x] Courses, modules, enrollment progress and credential completion exist.
- [x] Sequential required-assessment gates are enforced.
- [x] Required assessment passing threshold is 80%.
- [x] Final assessment stays locked until prior required published assessments are passed.
- [x] Passing required module assessment can complete the module.
- [x] Course completion requires required modules/assessments/final completion.
- [x] Assessment standards upgrade queue/framework exists for legacy curriculum.
- [x] The Prophet can resume the member's most recently active unfinished course directly.
- [ ] Legacy final exams below current question-count standard need source-curriculum review before expansion — **do not fabricate questions**.
  - Disciple Your Disciplers 1: 5 questions
  - Disciple Your Disciplers 2: 6
  - Disciple Your Disciplers 3: 12
  - Disciple Your Disciplers 4: 5
  - Disciple Your Disciplers 5: 5
  - Disciple Your Disciplers 6: 6
  - Disciple Your Disciplers 7: 6
  - Disciple Your Disciplers 8: 4
  - First Steps: 34
  - Strategy of Jesus L4 Multiply: 16

## P0 — Member records

- [x] Searchable member-record dashboard exists.
- [x] Member self-edit contact workflow exists.
- [x] Authorized leadership can maintain private contact details.
- [x] Verified New Birth milestones are separate from self-entered claims.
- [x] Baptism and Holy Ghost dates distinguish exact, approximate and unknown.
- [x] Focused New Birth Date Review is available to authorized record managers.
- [x] First Steps, Salt, Soul Winning, Bible Study Teacher, Timothys, School of Pastors, safety training and covenant fields exist.
- [x] Household/family grouping exists with adult/spouse/child/dependent/other relationships and primary-contact flag.
- [x] One active member can belong to only one household per church.

## P0 — Friendship Groups

- [x] Group roster and leader/assistant access exist.
- [x] Reports capture meeting date, attendance, guests, Bible studies, baptisms and Holy Ghost reports.
- [x] Reports distinguish regular meeting, Matthew party, picnic, barbecue, special event and other.
- [x] Reports capture location, lesson, prayer needs, issues/pastoral attention, follow-up and general notes separately.
- [x] Report history is searchable and filterable by event type.
- [x] Named guests create Evangelism follow-up records with source history.
- [x] Named baptism/Holy Ghost reports enter the leadership verification queue instead of silently changing official records.

## P0 — Evangelism and follow-up

- [x] Quick-add outreach record exists.
- [x] Follow-up owner, stage, due date, Bible-study progress, prayer request, notes and consent are tracked.
- [x] Outreach is searchable by person/contact/notes/owner.
- [x] Outreach filters by stage, source and queue state.
- [x] Structured source/origin exists: church service, Friendship Group, outreach, event, leader entry, website or other.
- [x] Friendship Group guest handoff preserves source context.
- [x] Overdue, due-soon and unassigned queues are visible.
- [x] Existing outreach guest can be reconciled to an existing active member only by pastor/admin.
- [x] Duplicate member linkage is blocked.
- [x] Secure invite redemption continues linking an outreach record to a newly created member account.
- [ ] Scheduled thank-you/reinvite/First Steps/missed-follow-up escalation — **blocked until a real server-side scheduler/service identity is provisioned**. Do not fake this with page-load logic.

## P0 — Church Health

- [x] Active-member, group, learning and serving snapshots exist.
- [x] 30-day Friendship Group ministry pulse exists.
- [x] Verified Journey metrics exist.
- [x] Outreach funnel and operational-attention queues exist.
- [x] Trend direction compares current/prior group activity, outreach contacts and guest movement.
- [x] 12-week reported attendance trend exists.
- [x] Biggest verified pathway gaps are surfaced without assigning a fake spiritual score.
- [x] Recent prayer needs/issues from Friendship Group reports surface to leadership.

## P0 — The Prophet

- [x] Product framing is The Prophet, with explicit AI/helper language.
- [x] It does not claim divine revelation.
- [x] Text commands and optional voice input exist.
- [x] Persistent signed-in launcher exists across the app.
- [x] Role-aware routing keeps leader/admin tools out of normal member navigation.
- [x] It routes to My Today, schedule, groups, outreach, learning, prayer/care, Journey, serving, messages, directory and trusted resources.
- [x] Authorized member-record routing exists.
- [x] Private Journey memories/testimony routing exists.
- [x] Church testimony routing exists.
- [x] Active-course resume uses live enrollment data.
- [ ] Broad AI write-actions that change ministry/member records — **defer until per-action confirmation, permission checks and audit trail are implemented**.

## P0 — Navigation and simplicity

- [x] Member mobile navigation prioritizes Home, Learn, Groups and Calendar.
- [x] Leader-only Outreach/Teams/Admin tools are role-gated.
- [x] Pastor/admin navigation exposes People Search, Households, New Birth Dates and Church Admin.
- [x] English/Spanish entry and high-use workflows are preserved.

## Verification before production merge

- [ ] Sync newest `main` into the reconciled hardening branch if parallel work moved again.
- [ ] Open clean PR from `agent/pilot-hardening-reconciled` to `main`.
- [ ] Confirm GitHub mergeability.
- [ ] Confirm Vercel build/deployment. If Vercel build-rate limiting blocks verification, record that as the blocker instead of calling the build green.
- [ ] Re-run Supabase security advisor after household/RLS changes.
- [ ] Merge to production only after the verification items above are satisfied.

## Explicitly deferred / not P0 blockers

- Non-member sponsored business placements and monetization.
- Full cross-church/network discovery expansion.
- Finance/tithes/offerings module.
- Advanced gamification.
- Broad autonomous AI actions without human approval.
- Large legacy curriculum rewrites not grounded in source material.
