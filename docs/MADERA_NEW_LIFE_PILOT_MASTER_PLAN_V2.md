# Kingdom Network — Madera New Life Pilot Master Plan V2

Prepared: 2026-08-26
Status: PLANNING READY — scope frozen for pilot preparation
Deployment: HOLD

## 1. Purpose

This is the tightened operating plan for Marcus + ChatGPT + Base44 to finish Kingdom Network for a real Madera New Life pilot without burning Base44 credits, rebuilding existing systems, or letting planning become another form of endless scope growth.

The immediate goal is one church: Madera New Life Apostolic Church, using the core system safely and confidently with real leaders and members.

Future multi-church, district, network, monetization, marketplace, advanced AI, and other extension points remain designed-for, but they do not block the Madera pilot unless required for safe tenant isolation or future compatibility.

## 2. Hard planning deadlines

Planning is time-boxed. Perfect preparation is not the goal; sufficient preparation to avoid expensive rework is.

### Package 0 deadline
- Start: 2026-08-26
- Hard stop: 2026-08-31
- Deliverable: inventory + canonical architecture + pilot scope map
- If a low-risk area cannot be fully inventoried by the deadline, mark it UNKNOWN/DEFERRED and move on.

### Core pilot package-prep deadline
- Hard stop: 2026-09-07
- By this date the pilot-core implementation packages must be planning-ready enough to compare together.
- Any package still too vague to implement safely is reduced to a smaller pilot minimum or moved to Phase 2.

### Whole-system review
- Date: 2026-09-08
- Review all pilot-core packages together for overlap, duplicate screens, duplicated data, conflicting permissions, unnecessary fields, missing connections, and Base44/direct-code ownership.

### Implementation start
- No later than 2026-09-09, assuming no critical security/architecture blocker is discovered.
- Phase 2 planning may continue, but it must not delay pilot-core implementation.

## 3. Scope freeze applies to planning and building

During both package prep and implementation:
- Do not add new pilot feature areas merely because they are interesting.
- New ideas go to backlog/future unless they solve a proven pilot blocker.
- Do not reopen settled package decisions unless new repo/security/human-test evidence proves them unsafe or unusable.
- Reuse current V1 routes, tables, components, policies, migrations, and verified work whenever sound.
- Reuse useful concepts from prior Kingdom Network work only after mapping them into the current canonical architecture.
- Do not create second Person, member, Friendship Group, outreach, learning, care, calendar, finance, or permission systems.

## 4. Production policy during planning

The current production app is not a feature-development playground during package prep.

Allowed during the planning window:
- urgent security fixes
- production break/failure fixes
- data-integrity fixes
- critical auth/recovery fixes
- narrowly scoped reliability fixes already claimed/coordinated in Control Room

Not allowed merely because planning discovered an idea:
- new feature implementation
- broad redesign
- schema expansion without an approved package
- independent deployments
- changes to another workstream's claimed area

Production remains HOLD for coordinated release work until Marcus explicitly approves a combined deployment.

## 5. Who does what

### Marcus
Founder / ministry authority / final product decision-maker.

Marcus primarily supplies real Madera ministry rules, privacy expectations, usability judgment, package approval, real-phone feedback, and final deployment approval.

### ChatGPT
Product architect / technical coordinator / package planner / repo reviewer / QA planner / direct-code worker when appropriate.

ChatGPT should do as much zero-Base44-credit work as possible:
- inspect repo + Build Checklist + Control Room before meaningful work
- inventory existing systems
- inspect and reuse prior Kingdom Network work
- define data/permission/integration contracts
- create package specs
- identify what should be reused, repaired, merged, hidden, deferred, or removed
- implement directly in GitHub when that is safer/faster than Base44
- review Base44 changes before another Base44 correction prompt is spent
- consolidate corrections
- coordinate and record significant status

### Base44
Implementation accelerator, not exclusive implementer and not product architect.

Base44 is used when its builder is materially better/faster for a bounded, approved package or UI/workflow implementation. This is not a new platform pivot; Base44 remains one tool in the implementation stack. ChatGPT/direct repo work may implement parts or entire packages when that avoids credits or reduces risk.

## 6. Base44 credit gate

Before any Base44 prompt, all five must be YES:
1. Is this required for the approved Madera pilot package?
2. Has ChatGPT inspected what already exists and what can be reused?
3. Is the requirement stable enough that Base44 is not being asked to invent the product while coding?
4. Can the work be batched into one coherent prompt rather than several small iterations?
5. Is Base44 materially better/faster than direct repo work for this task?

If any answer is NO, do not spend the credit yet.

After Base44 implements:
1. ChatGPT reviews first.
2. ChatGPT creates one consolidated correction list.
3. Send one correction batch when practical.
4. Avoid cosmetic micro-prompts unless usability is blocked.

## 7. Security is a gate on every package

Security/RLS/permissions are not deferred to the final integration package.

Every package must pass a package-level safety gate before it is considered implementation-complete:
- church_id/tenant ownership verified
- RLS/RPC/authorization impact reviewed
- ordinary-member vs leader/admin scope verified
- no new cross-church exposure
- no duplicate identity creation path
- no sensitive field/address/pastoral/finance leakage
- consequential writes auditable where appropriate
- failed/uncertain authorization reads fail closed
- no parallel permission model introduced

The final Integration/Security package repeats the full-system proof; it does not replace package-level security verification.

## 8. Architecture rules for every pilot package

### One human, one canonical identity
A person exists whether or not they have a login. Outreach, onboarding, groups, learning, serving, household, care, and reporting connect to the same human identity.

### Enter once, update authorized places
No repeated data entry when one ministry event can safely update multiple systems.

### Madera first, tenant-ready underneath
Build one church's real workflow now, but keep every church-owned record safely scoped for later church expansion.

### Permission before convenience
Private home addresses, care, prayer, finance, leadership observations, and sensitive records require scoped access.

### Simple front end, powerful back end
Normal members should see a small number of obvious actions.

### English + Spanish on critical paths
No Spanish dead ends in pilot-critical flows.

### Fail closed
Backend uncertainty must not become false success, false empty data, or guessed permissions.

## 9. Reconcile the old 8-step roadmap with this plan

The earlier 8-step order remains the product build spine:
1. Evangelism
2. Onboarding / Identity / Invitations
3. Friendship Group Operating System
4. Church Health / Reporting
5. My Journey / Member Record expansion
6. Leadership / Timothys
7. Calendar / Scheduling / Serve
8. Kingdom Guide AI

This master plan does not replace that spine. It adds the preparation, existing-system reuse, Learning, configuration, simplification, security, and release gates needed to execute it safely.

Where sequencing differs, dependency wins. The canonical Person/Member contract is locked in Package 0 before Evangelism/Onboarding writes into it, and core Learning is prepared before Church Health because Church Health reads learning progress.

## 10. Pilot-core packages — must be ready by 2026-09-07

Only these packages must be sufficiently prepared before the 2026-09-08 whole-system review.

### Package 0 — Inventory + Canonical Architecture
Hard deadline: 2026-08-31.

Classify every meaningful current area as KEEP, CONNECT, REPAIR, SIMPLIFY, MERGE, HIDE, DEFER, REMOVE, or UNKNOWN.

Lock:
- canonical Person/member/account/household contract
- church_id ownership map
- current role/capability map
- cross-system event/write map
- current route/system inventory
- existing PR/workstream preservation map
- pilot in-scope vs Phase 2

### Package 1 — Evangelism / Guest Stewardship
Finish the current work and connect fast guest capture, source/visit history, attribution, follow-up ownership, Bible-study/First Steps next steps, overdue follow-up, duplicate prevention, and canonical Person/onboarding handoff. Reuse current Outreach first.

### Package 2 — Onboarding + Identity + Invitations
Planning package already exists. Confirm it against Package 0 and current code before implementation. Includes source-aware QR/links/invites, claim-profile, duplicate detection, returning-member reconnection, progressive EN/ES onboarding, households/minors, consent, and privileged-role protection.

### Package 3 — Friendship Group Operating System
Planning package already exists. Reconcile with current FG PR/workstream work; do not replace it. Includes directory/status/privacy, join/approve/transfer, leader/assistant capabilities, roster, attendance, guest progression, real New Life report, prayer/urgent routing, absence follow-up, missing-report accountability, milestone verification, potential leaders/multiplication/lineage, and cross-system updates.

### Package 4 — Unified Member Record + My Journey
Connect existing 360-degree member work to contact/household truth, relationship state, reported/verified milestones, group history, authorized outreach history, First Steps/ESW progress, ministry/serving history, qualifications/documents, personalized next step, and member-vs-leader edit rules.

### Package 5 — Core Learning for Madera Pilot
Pilot scope only: First Steps, Effective Soul Winning, and only other course content required for the first Madera pilot. Include source mapping, checkpoint/final rules, sequential gating, resume/progress, credentials, teacher/admin visibility, and Journey integration. Large learning library is Phase 2.

### Package 6 — Church Health + Leader Action Center
Read Packages 1–5; do not create manual duplicate summary data. Show actionable signals: first/return guests, overdue follow-up, Bible studies, onboarding drop-off, group connection/attendance trends, missing FG reports, reported/verified milestones, First Steps/ESW progress, repeated absences, groups needing attention, and potential leaders. No single church-health score.

## 11. Pilot-support packages — bounded decisions, not blockers to implementation start

These do not have to become full feature packages before implementation begins. Each gets a bounded KEEP/REPAIR/HIDE/PHASE 2 decision.

### Support A — Prayer / Private Care / Announcements / Community
Preserve hardened privacy/reliability work. Pilot requirement is safety + usability, not full community expansion.

### Support B — Calendar / Events / My Schedule / Basic Tasks
Use current foundations. Only what Madera needs for pilot should be exposed.

### Support C — Serve / Ministries / Leadership Minimum
Configure actual Madera ministries and basic qualification/interest/serving flow. Full Timothys can be Phase 2 if approved curriculum is not ready.

### Support D — Admin / Reception / Official Records
Do not require the whole receptionist/office vision before pilot. Classify each item as required now, limited/hidden for pilot, or Phase 2.

### Support E — Finance / Fundraising Boundary
Preserve existing isolated finance work. If not verified for pilot, hide it rather than making it a launch blocker. Do not casually touch Finance RLS/roles.

### Support F — Kingdom Guide / AI Pilot Boundary
Pilot AI = navigation/help, approved resource lookup, next-step help from real Journey data, and leader help within permissions. Defer broad autonomous actions, voice consequential writes, proactive mentor nudges, and expensive integrations until core workflows are stable.

### Support G — Madera Data Configuration
Real church, leaders, groups, classes, ministries, schedules, policies. Remove/isolate demo assumptions.

## 12. Whole-system review — 2026-09-08

Before implementation starts, compare the pilot-core packages and support boundaries together.

Cut or merge:
- duplicate screens
- duplicate navigation destinations
- duplicate tables/concepts
- repeated data entry
- redundant dashboards
- non-pilot fields
- jargon visible to members
- competing permission systems
- features that look impressive but do not help a Madera workflow

Confirm the intended end-to-end human paths before coding the next large package.

## 13. Implementation order after 2026-09-08

Unless Package 0 reveals a security dependency requiring adjustment:
1. Finish/verify Evangelism
2. Onboarding + Identity + Invitations
3. Friendship Group OS
4. Unified Member Record / My Journey connection
5. Core Learning completion/integration
6. Church Health + Leader Action Center
7. Pilot-support minimums only where needed for the real test group
8. Whole-system simplification polish
9. Combined pilot candidate + real-phone acceptance

This is the detailed execution form of the earlier 8-step roadmap, not a competing roadmap.

## 14. Definition of implementation-ready package

A package is ready to build when it has:
- exact pilot purpose
- existing assets to reuse
- non-goals
- canonical data owner/source of truth
- cross-system writes/reads
- role/permission matrix
- tenant/RLS impact
- EN/ES requirements
- mobile UX
- loading/empty/error/success states
- data migration need or explicit no-migration decision
- acceptance tests
- Base44 vs direct-code recommendation
- known dependencies/blockers

It does not need every future enhancement designed.

## 15. Definition of package done

A package is not done because screens exist.

FUNCTIONAL -> CONNECTED -> SECURE -> SIMPLE -> TESTED -> VERIFIED

Before marking a package verified:
- security gate passed
- lint/type/build/regression checks pass where applicable
- affected RLS/RPC behavior checked
- mobile checked
- EN/ES checked on critical paths
- empty/loading/error/retry states checked
- relevant human flow checked
- no duplicate records/concepts introduced
- significant work recorded in Control Room

## 16. Final pilot acceptance

One coordinated Madera candidate must pass:
- exact combined build
- full security/regression gate
- TypeScript/lint/build
- tenant and permission proof
- duplicate identity/account proof
- English + Spanish real-phone proof
- new person flow
- existing member flow
- Friendship Group leader/assistant flow
- class/ministry leader flow
- pastor/admin flow
- no pilot-facing dead/demo buttons
- no false empty/success states
- no sensitive-data leakage
- pilot feedback path

Production deployment remains HOLD until Marcus explicitly approves the combined deployment.

## 17. What cannot block the Madera pilot

Unless one of these solves a real pilot blocker, defer it:
- church #2
- district/network collaboration UI
- paid sponsorship/business monetization
- subscription/billing SaaS engine
- giant learning library
- full Timothys without approved source curriculum
- advanced AI voice/autonomy
- proactive AI mentor nudges
- true offline sync unless pilot proves it necessary
- external social/media integrations
- advanced marketplace/resource exchange
- network-level analytics

## 18. Anti-stall rule

If planning a package is not materially reducing implementation risk, stop planning and move forward.

If a package cannot be made implementation-ready by the planning deadline, choose one:
1. shrink it to a safe pilot minimum,
2. hide existing unfinished functionality,
3. defer it to Phase 2.

Do not extend the entire pilot timeline to perfect a non-critical package.

## 19. Working success metric

The goal is not 100% of Kingdom Network. The pilot threshold is:

A real Madera New Life leader can capture a person, follow up, onboard them without duplication, connect them to a Friendship Group and discipleship path, record ministry activity once, and leadership can see what action is needed next — securely, simply, and on a real phone.

Everything beyond that can grow from a stable foundation.
