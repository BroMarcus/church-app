# Kingdom Network — Package 0: Madera Pilot Inventory & Canonical Architecture

Started: 2026-08-26  
Completed: 2026-08-26  
Deadline: 2026-08-31  
Status: **PLANNING READY — PACKAGE 0 COMPLETE**  
Deployment: **HOLD**

## Purpose

Package 0 exists to prevent the Madera New Life pilot from building on assumptions, duplicate systems, or stale architecture. It is an inventory and contract-lock package, not a feature build.

The package is complete when these six questions are answerable well enough to prevent predictable rework:

1. What do we KEEP / CONNECT / REPAIR / SIMPLIFY / MERGE / HIDE / DEFER / REMOVE?
2. What is the canonical account/member/household identity model?
3. What authorization model is authoritative?
4. Where do duplicate, legacy, or competing sources of truth exist?
5. How do the pilot-core packages exchange data once, safely?
6. What belongs in the Madera pilot versus support scope versus Phase 2?

All six are answered below. Remaining unknowns are deliberately pushed into the package where they belong instead of keeping Package 0 open indefinitely.

---

## Evidence inspected

Package 0 was grounded in:

- current `BroMarcus/church-app` `main`
- `docs/KINGDOM_NETWORK_BUILD_CHECKLIST.md`
- architecture / authorization / privacy / role-matrix documents already in the repository
- current Next.js pilot routes and server actions
- read-only inspection of the connected Supabase schema, RLS policies, triggers, helper functions, and aggregate row counts
- Control Room issue #28, including currently claimed workstreams
- Draft PR #55 combined V1 pilot candidate
- recent Base44 Friendship Group Package D and Evangelism/Invite Package E checkpoints, so proven behavior from the Base44 implementation is not discarded

No production row, schema, RLS policy, RPC, Auth configuration, Finance data, paid service, merge, publish, or deployment was changed by Package 0.

---

# DECISION 1 — Reuse / Repair / Hide / Defer map

| Domain | Pilot decision | Canonical direction |
|---|---|---|
| Auth / login / recovery | **KEEP + VERIFY** | Preserve current hardened same-account authentication and recovery work. Do not rebuild auth. |
| Public join / invitations / Start Here | **KEEP + CONNECT** | Extend current join/invite foundation into Package 2; preserve no-duplicate-account behavior. |
| Member / 360° Member Record | **KEEP + CONNECT + SIMPLIFY** | Preserve current leadership 360° record and underlying member data; connect it to My Journey rather than building another member database. |
| Outreach / Evangelism | **KEEP + REPAIR + CONNECT** | `outreach_contacts` remains the pre-account guest/prospect authority in Next.js. Strengthen source, visits, follow-up, claim/link, and return-guest behavior. |
| Friendship Groups | **KEEP + REPAIR + CONNECT** | Extend the existing groups/roster/join/attendance/report/prayer foundation. Do not create a second FG engine. |
| Learning | **KEEP + CONNECT + REPAIR** | Preserve current server-enforced courses/assessments/completion. Connect actual completion to Journey/Health. First Steps + ESW are the pilot priority. |
| My Journey | **KEEP + MERGE DATA SOURCES** | Keep the current Journey experience, but make it read canonical Learning/Group/Milestone facts rather than manually duplicated status fields. |
| Church Health / Analytics | **MERGE + SIMPLIFY + CONNECT** | Consolidate the overlapping `/church/health` and `/church/analytics` concepts. Do not build a third dashboard. |
| Prayer / Private Care | **KEEP + SUPPORT SCOPE** | Preserve strict privacy and verified PR #53-style reliability. Expand only when a core workflow requires it. |
| Events / basic calendar | **KEEP + SUPPORT SCOPE** | Real event data exists; keep useful calendar/event access. Advanced scheduling cannot block pilot. |
| Church schedules / personal tasks | **HIDE OR SUPPORT SCOPE UNTIL CONFIGURED** | Foundation exists but no meaningful live use was found. |
| Serve / ministries / teams | **KEEP FOUNDATION + SUPPORT SCOPE** | Configure only the Madera minimum after core flows are stable. |
| Forms / documents / receptionist-office features | **HIDE / PHASE 2 UNLESS A PILOT BLOCKER** | Foundations exist but currently have no meaningful live use; do not let office scope delay pilot. |
| Finance / fundraising | **PROTECTED — SEPARATE OWNER** | Preserve and coordinate with Finance workstream. Package 0 makes no Finance/RLS changes. |
| Business Partners | **PHASE 2** | Preserve vision and extension points; not required to prove Madera core. |
| District / network / church #2 | **PHASE 2** | Do not build expansion UI now. Maintain church-scoped ownership so expansion remains possible. |
| Kingdom Guide | **KEEP + NARROW PILOT** | Navigation, approved-resource answers, recovery guidance, and next-step help. Broader operating AI comes later. |

### Live-use signal used for support-scope decisions

Read-only live data showed substantial foundations but little real pilot usage outside events:

- Events: 14
- Care requests: 0
- Church schedules: 0
- Schedule items: 0
- Ministry applications: 0
- Ministry team members: 0
- Team assignments: 0
- Church forms: 0
- Form submissions: 0
- Member documents: 0
- Fundraising campaigns: 0
- Finance requests: 0
- Finance bills: 0

Conclusion: do not spend the Madera pilot build filling empty modules merely because they exist. Configure or expose them only when the pilot needs them.

---

# DECISION 2 — Canonical human identity / account / membership / household model

## Account-backed member identity

The current Next.js/Supabase product does **not** need another universal account-backed `Person` table.

The established account identity is the Supabase Auth user UUID, reused through:

- Supabase Auth — credential/authentication identity
- `profiles.id` — basic profile identity
- `member_private_details.user_id` — private contact/demographic details
- `church_memberships(church_id,user_id,...)` — church access + relationship state
- `member_milestones(church_id,user_id,...)` — verified church/Journey milestone facts
- Learning, Friendship Groups, attendance, serving, prayer, Journey and related member records — same user UUID

**Pilot rule:** do not introduce a second account-backed Person table merely to satisfy newer planning vocabulary.

## Pre-account guest identity

`outreach_contacts` is intentionally allowed to exist before an Auth account exists. It owns guest/prospect facts such as:

- name/contact
- normalized phone/email
- source
- stage
- follow-up owner/due date/history
- consent and communication language
- Bible-study / visit activity
- eventual `member_user_id` link

When a guest later becomes an account-backed user, the goal is to **claim/link the existing Outreach identity and history**, not create a second person.

Current Next.js join behavior already prefers a linked Outreach record and then same-church normalized phone/email candidates before creating a new linked Outreach contact.

Package 1 + Package 2 must strengthen that behavior with safe ambiguity review and ownership verification; phone/email similarity alone must never silently claim another person's record.

## Relationship state is not authorization

These concepts remain separate:

- account access state (`church_memberships.status`)
- ministry relationship (`guest`, `attendee`, `member`, etc.)
- relationship/source attribution
- technical permissions/capabilities
- actual Friendship Group membership

A QR/referral/group source does not automatically make someone a group member or grant authority.

## Household foundation

Read-only live Supabase inspection found existing church-scoped:

- `households`
- `household_members`
- household membership RLS/helper logic

Current household RLS is appropriately scoped: `manage_members` can administer households; household members can read their own household.

However, the current `household_members` model links only an already-active church `user_id`. It does **not** solve children/dependents/spouses who do not have accounts.

Live counts were 0 households / 0 household members, and no current app UI was found.

**Pilot rule:** KEEP this household foundation. Package 2 must design only the missing non-auth dependent/child representation that complements it. Do not create fake Auth accounts for minors and do not misuse Outreach contacts as child records.

## Returning / archived members

Package 2 must preserve the historical user/member/Journey record and reconnect an archived/inactive member after identity verification rather than creating a duplicate. The exact restoration rules remain a bounded Package 2 design item.

---

# DECISION 3 — Authoritative permissions model

The approved target is:

### Base church authority

- Member
- Church Admin
- Pastor

### Stackable functional responsibility

Use existing `church_roles` + `church_role_assignments` and permission keys such as:

- `manage_members`
- `manage_outreach`
- `manage_groups`
- `lead_own_group`
- `manage_learning`
- `manage_calendar`
- `manage_ministries`
- `manage_teams`
- leadership/reporting permissions
- separately protected finance permissions

### Resource scope still matters

Having a capability does not automatically expose every record. Examples:

- FG leaders operate their own group unless broader authority exists.
- Exact home addresses remain group-private.
- Pastoral care/private prayer remain separately protected.
- Finance remains separately protected.
- Church A must never see Church B private data.

## Transitional reality

Current `main` is hybrid:

- older `church_memberships.role` values such as `group_leader`, `ministry_leader`, and `minister` still exist and some routes/RLS checks rely on them;
- newer code already uses `current_user_has_church_permission(...)`, `church_roles`, and `church_role_assignments`.

**Pilot rules:**

- do not create a third role system;
- do not mass-convert legacy roles during planning;
- new package design should use capabilities + resource scope;
- preserve necessary legacy checks until equivalent behavior is verified;
- each package's acceptance test must prove UI permission and DB/RPC/RLS permission agree;
- Pastor/Admin elevation remains explicit and cannot be created by a normal custom role;
- Finance/role/RLS implementation remains coordinated with its claimed owner.

## Existing good FG permission split to preserve

Live DB helpers confirm:

- `can_manage_group` — leader, group `leader`, Pastor/Admin, or `manage_groups`
- `can_operate_group` — same plus group `assistant`

This means assistants can help operate/report without automatically receiving membership-management authority. Package 3 should build from that distinction.

---

# DECISION 4 — Duplicate / legacy / competing sources of truth

## A. Legacy spiritual fields

`member_private_details` still contains old baptism/Holy Ghost columns while current Journey/member management uses `member_milestones`.

Read-only live inspection found 14 private-detail rows and **0** populated old spiritual fields.

**Decision:** `member_milestones` is canonical for official verified baptism/Holy Ghost and other church milestone facts. New packages must not dual-write the old private-detail spiritual columns. Removal can happen later only after compatibility review.

## B. Learning completion vs milestone status — real disconnect

The Learning engine records actual verified course completion in `course_enrollments` through server-side `refresh_my_course_completion(...)`.

That RPC verifies:

- course access
- module completion
- required assessments
- required final exam
- passing score (default/required 80% or stricter)
- credential status

But My Journey currently decides:

- First Steps complete from `member_milestones.first_steps_status`
- Effective Soul Winning complete from `member_milestones.soul_winning_status`

Church Health also uses the milestone field for First Steps.

No current automatic Learning → milestone reconciliation was found.

**Decision:** this is a CONNECT/MERGE problem, not a reason to create more progress tables. Package 4/5 must define actual course completion as the primary proof for Kingdom Network-taught courses, while preserving a leadership-controlled way to record verified external/manual equivalency when appropriate.

## C. Two Church Health surfaces

Current product has both:

- `/church/health` — bilingual, capability-aware, backed by `church_health_snapshot(...)`
- `/church/analytics` — direct Pastor/Admin-gated operational dashboard with useful Needs Attention items and direct table queries

**Decision:** Package 6 consolidates them. Prefer shared canonical reporting functions/definitions and bring the useful action-oriented attention queue into one simple leadership experience. Do not build a third dashboard.

## D. Hybrid role checks

Legacy job-role checks coexist with stackable permission checks. Treat as a migration/compatibility risk per package, not a new architecture.

## E. Base44 vs Next.js duplicate implementation risk

There are now proven features in both the Next.js/Supabase repo and a separate Base44 app/sandbox. This is the biggest process-level duplication risk.

**Rule going forward:** every implementation package must choose **one Madera implementation target** before coding. The other implementation may be used as a behavior/reference asset, but the same workflow is not independently rebuilt in both stacks without an explicit migration/port decision.

Useful recent Base44 assets include:

### Friendship Group Package D behavior worth preserving/porting

Recent Base44 Package D checkpoints already hardened:

- official attendance totals derived from row-backed attendance
- duplicate same-group/date report protection
- Draft → Submitted one-way report-state integrity
- atomic submission timestamp handling
- Guest duplicate detection / Link Existing guidance
- ambiguous match fail-closed behavior
- deterministic Guest → Follow-Up verification and retry protection
- flagged-visitor review
- report/admin correction verification
- uncertain-write forced reload behavior
- bilingual Report Center / visitor recovery
- slow-phone stale-search protection
- prayer-share positive-confirmation / repeat-tap safeguards

Latest recorded Package D work remained **DONE — NEEDS RUNTIME VERIFICATION**; it is not automatically considered production-proven.

### Base44 Package E behavior worth preserving/porting

A separate Base44 Package E sandbox build already covers:

- member church + Friendship Group invite/share links
- local QR generation
- bilingual public connect card
- admin welcome-desk/front-door QR
- tracked source/referral attribution
- duplicate-safe guest capture
- accountable follow-up creation
- limited guest-account linkage
- guest journey stages
- Bible-study / First Steps interest
- consent preferences
- guest → Person/account carryover behavior
- guest analytics / cold-contact / overdue escalation concepts

Package E is a valuable implementation asset/reference for Package 1/2, but it does not replace the canonical identity/tenant/security contracts above.

**Do not throw this work away, and do not blindly copy cross-stack code. Reuse the proven behavior/invariants intentionally.**

---

# DECISION 5 — Canonical cross-system data flow

The Madera pilot follows this contract:

## Evangelism

**Guest/contact event**  
→ `outreach_contacts`  
→ structured source + interaction history  
→ follow-up owner / due action  
→ consent / preferred communication  
→ later safe link to `member_user_id`

## Onboarding / account claim

**Signup / invitation / QR**  
→ Auth account  
→ profile/private details  
→ church membership relationship  
→ safely claim/link existing Outreach history when verified  
→ household relation when appropriate  
→ never auto-grant privileged role

## Friendship Group

**Join request**  
→ DB-validated approval  
→ real `group_memberships`

**Attendance/report**  
→ report + row attendance  
→ duplicate-safe Outreach guest/return-visit activity  
→ Bible-study activity  
→ pending milestone report where required  
→ privacy-safe care/prayer action  
→ leader follow-up suggestion  
→ Church Health derived metrics

The current Next.js report already writes attendance, first-time Outreach guests and pending milestones, but it is best-effort after the report insert. Package 3 must make multi-system report processing transactionally reliable or explicitly retryable/auditable.

## Learning

**Lesson/assessment completion**  
→ server-verified course progress / credential  
→ My Journey course-based status  
→ Church Health discipleship metrics

Do not maintain separate manual completion status for the same Kingdom Network course unless it represents an explicit leadership override/external equivalency.

## My Journey

My Journey is a **read/decision layer over canonical records**, not another datastore:

- verified spiritual milestone records
- actual Learning progress
- real group membership + attendance
- serving/ministry records
- prayer/history where appropriate
- leadership development later

## Church Health

Church Health is a **derived leadership read model**, not a manual summary form.

Current secured RPCs already derive metrics from member relationships, verified milestones, Outreach, groups/reports and serving. Package 6 should extend these definitions and actionable queues instead of copying totals into new tables.

## Consequential writes

Whenever one entry affects multiple systems:

- preserve tenant scope
- preserve source/attribution
- preserve consent/privacy
- use positive success confirmation
- fail closed on uncertainty
- make retry idempotent
- keep an audit trail where records affect people, permissions, official milestones, care or leadership decisions
- require human confirmation for sensitive AI-assisted actions

---

# Friendship Group checkpoint — what already exists vs what Package 3 must repair

## KEEP

- church-scoped groups
- capacity / accepting-members behavior
- public location label separate from exact home address
- protected `group_private_details`
- group membership roles member / assistant / leader
- one-active-FG membership protection
- pending join requests and DB-controlled approval
- self check-in
- assistant operating/report authority without full management
- report storage/history
- attendance rows/history
- group prayer sharing choice
- lesson/report relationship
- pending reported-milestone verification
- scoped RLS/helper model

## REPAIR / CONNECT

- reliable atomic/retryable report cross-system processing
- structured Friendship Group guest source attribution
- duplicate-safe guest matching + return-visit history
- 1st / 2nd / 3rd visit progression
- named Bible-study records instead of aggregate-only reporting
- safe member identity selection for milestone reports
- urgent/private prayer → protected care routing
- repeated-absence care suggestions
- missing-report accountability
- full New Life report semantics
- action summary / confirmation before sensitive cross-system writes

## Real-use signal

Read-only live Supabase counts at Package 0 checkpoint:

- groups: 2
- active Friendship Groups: 2
- group memberships: 5
- group join requests: 1
- group reports: 0
- group report attendance rows: 0
- Outreach contacts with `source_group_id`: 0
- reported milestones: 1

Conclusion: the foundation is real; the weekly operating workflow still requires pilot proof.

---

# Learning checkpoint — what already exists vs what Package 5 must repair

## KEEP

- courses / modules
- required assessments
- final exams
- passing-score enforcement
- sequential prerequisite/gating machinery
- server-calculated completion
- credentials
- course sessions / attendance foundation
- First Steps published
- Effective Soul Winning published
- course pathway metadata

Live snapshot:

- courses: 20
- published: 14
- enrollments: 3
- completed enrollments: 0
- course sessions: 14
- session attendance: 0

First Steps and Effective Soul Winning were both found published in English.

## REPAIR / CONNECT

- Learning completion → Journey / milestone equivalency
- Learning completion → Church Health
- required ESW question-count/content verification from the uploaded source
- pilot-real-use verification
- EN/ES content scope where approved/available
- `course_session_attendance` authorization parity: session management accepts `manage_learning`, while attendance management still relies on legacy minister/Pastor/Admin role checks

Do not rebuild the Learning engine simply because pilot usage is currently low.

---

# Church Health checkpoint — what already exists vs what Package 6 must repair

## KEEP

`church_health_snapshot(...)` / base reporting already derive real metrics from:

- church membership relationship states
- verified member milestones
- Outreach contacts and overdue follow-up
- groups / submitted reports
- serving applications
- leadership pipeline fields

`church_reporting_period_summary(...)` already derives period-based guest visits, Bible-study interactions, verified baptisms/Holy Ghost, First Steps, FG reports and leadership approvals.

The existing `/church/health` experience is bilingual and permission-aware.

## MERGE / SIMPLIFY

The existing `/church/analytics` page has useful operational “Needs Attention” concepts but overlaps `/church/health` and uses direct/legacy access logic.

Package 6 should create one leadership experience that answers:

- who needs follow-up now?
- who stopped engaging?
- which groups have not reported?
- who is stuck in discipleship?
- which milestones need verification?
- which leadership/ministry actions need attention?

No single magic health score.

---

# DECISION 6 — Madera pilot scope boundary

## Pilot-core packages — must be planning-ready before implementation

### Package 1 — Evangelism / Guest Stewardship

Must finish the connected guest lifecycle using the current Outreach authority and reconcile proven Base44 Package E behavior.

### Package 2 — Onboarding + Identity + Invitations

Must extend current hardened join/invite/auth work, preserve same-account behavior, add safe claim/duplicate handling, use existing household foundation, and solve non-auth dependents without fake accounts.

### Package 3 — Friendship Group Operating System

Must extend current Next.js group foundation and intentionally preserve/port the strongest verified Base44 Package D behavior rather than re-discovering it.

### Package 4 — Unified Member Record + My Journey

Must connect the existing leadership 360° member record and member-facing Journey to canonical records. It should not create another person/member datastore.

### Package 5 — Learning / New Life Discipleship Pilot

Must focus on First Steps + Effective Soul Winning, connect real course completion to Journey/Health, verify assessment/content requirements, and prove real user flow.

### Package 6 — Church Health + Leader Action Center

Must consolidate the two current health/analytics concepts and operate from canonical underlying records.

## Support scope — available but cannot hold core pilot hostage

- Prayer / Private Care
- Events / basic calendar
- minimum Madera ministry/Serve configuration if required
- basic member feedback
- essential records/documents only when a core workflow requires them
- narrow Kingdom Guide

## Hide/defer unless pilot evidence promotes them

- advanced scheduling/tasks
- broad receptionist-office buildout
- large forms/document workflows
- broad fundraising expansion
- Business Partners
- district/network interfaces
- advanced AI operating actions
- large future learning library
- church #2 setup beyond maintaining tenant-safe architecture

Finance remains its own protected workstream and is neither redesigned nor casually hidden by Package 0.

---

# Implementation-target rule — Base44 credit protection

Before Package 1–6 implementation begins, each package must name:

1. the **primary Madera implementation target** (direct repo/Next.js or Base44);
2. what existing implementation is authoritative for that package;
3. what behavior from the other stack is being reused/ported;
4. what will **not** be rebuilt;
5. whether the Base44 request is sufficiently bounded to justify spending credits.

Default rule:

**Plan/audit/security/dependency work here first → use existing code first → direct repo work when safer/cheaper → use Base44 when it gives a clear implementation advantage → never spend Base44 credits asking it to rediscover product architecture we already settled.**

Do not maintain two independent Madera production authorities for the same person/group/outreach/workflow.

---

# Current release / coordination boundary

As of the final Package 0 coordination check on 2026-08-26:

- Draft PR #55 is open, draft and mergeable.
- Latest exact head inspected: `cf56b87ba9f69f6a44c1cb8390886fb8d0d595f5`.
- Kingdom Network Build #1417: SUCCESS.
- install, security/regressions, lint, and full Next.js production build: PASS.
- real-phone English + Spanish exact-build acceptance is still required.
- production deployment remains HOLD.
- PR #55 explicitly preserves separately owned Finance/RLS and Package C/other workstreams.

Package 0 does not merge or deploy PR #55.

---

# Remaining bounded risks handed to packages

These are not reasons to keep Package 0 open:

1. **Package 1:** reconcile Next.js Outreach and Base44 Package E so we keep the best behavior without two guest authorities.
2. **Package 2:** define ambiguous claim review, returning-member restoration, and non-auth dependent/child representation using the existing household foundation.
3. **Package 3:** choose/port the strongest Package D report reliability patterns; make Next.js multi-system report writes atomic/retryable if Next.js is the chosen Madera target.
4. **Package 4/5:** settle Learning credential ↔ verified training-equivalency behavior so Journey and Health cannot disagree with actual course completion.
5. **Package 5:** reconcile `manage_learning` with legacy session-attendance authority.
6. **Package 6:** consolidate duplicate Church Health/Analytics surfaces and preserve useful Needs Attention behavior.
7. **All packages:** verify capability + RLS parity while the legacy-role transition remains incomplete.
8. **All packages:** choose one implementation target before spending credits or writing competing code.

---

# Package 0 completion gate

- [x] Six exit questions answered.
- [x] Existing systems classified.
- [x] Canonical account/member identity explicit.
- [x] Outreach pre-account identity and member-link contract explicit.
- [x] Existing household foundation discovered and preserved.
- [x] Missing non-auth dependent gap isolated to Package 2.
- [x] Authoritative permission direction explicit.
- [x] Legacy-role transition risk identified.
- [x] Duplicate milestone fields classified.
- [x] Learning/Journey source-of-truth mismatch identified.
- [x] Friendship Group reuse/repair boundary identified.
- [x] Church Health duplicate surfaces identified.
- [x] Base44 prior/current implementation assets incorporated into reuse strategy.
- [x] Support scope bounded using live-use evidence.
- [x] Madera vs Phase 2 boundary explicit.
- [x] Base44 credit / dual-implementation rule explicit.
- [x] Active workstream ownership preserved.
- [x] No production write/deploy performed.

## Final Package 0 decision

**Package 0 is complete five days ahead of its Aug. 31 deadline. Stop inventorying.**

The next work is package preparation using these contracts, beginning with Package 1 Evangelism / Guest Stewardship and reconciling its existing Next.js Outreach implementation with the already-built Base44 Package E behavior before any new build request is issued.
