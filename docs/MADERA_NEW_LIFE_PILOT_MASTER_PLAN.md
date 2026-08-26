# Kingdom Network — Madera New Life Pilot Master Plan

Prepared: 2026-08-26
Status: PLANNING READY — scope freeze for pilot preparation
Deployment: HOLD

## 1. Purpose

This document is the working game plan for Marcus + ChatGPT + Base44 to finish Kingdom Network for a real Madera New Life pilot without wasting Base44 credits, rebuilding existing systems, or expanding scope before the current approved system is coherent.

The immediate goal is not to finish every long-term Kingdom Network idea. The immediate goal is to make one local church — Madera New Life Apostolic Church — able to safely and confidently use the core Kingdom Network ministry operating system with real leaders and members.

Future multi-church, network, monetization, district, advanced AI, marketplace, and other extension points remain designed-for, but they do not block the Madera pilot unless required for safe tenant isolation or future compatibility.

## 2. Pilot scope freeze

Effective for this planning cycle:

- Do not add new feature areas to the pilot roadmap merely because they are interesting.
- New ideas are captured in backlog/future notes only unless they solve a current pilot blocker.
- Finish, connect, simplify, and verify what already exists or is already approved.
- Reuse existing V1 routes, components, tables, policies, workflows, migrations, and verified work whenever they are sound.
- Reuse useful concepts from prior Kingdom Network prototypes only after mapping them to the current canonical data model; do not copy demo-only behavior or create parallel systems.
- Do not create second versions of Person, member, Friendship Group, outreach, learning, care, finance, calendar, or permission concepts when the existing system can be extended safely.
- Production remains HOLD until a coordinated pilot candidate passes the defined gates and Marcus explicitly approves deployment.

## 3. The operating model: who does what

### Marcus
Founder / ministry authority / final product decision-maker.

Marcus should primarily provide:
- real New Life ministry rules
- what leaders actually do today
- what members need to understand
- what should remain private
- whether a workflow feels simple enough
- acceptance/rejection of prepared packages
- real-phone pilot testing and final deployment approval

Marcus should not be required to spend hours manually coordinating technical details that ChatGPT can inspect or document.

### ChatGPT
Product architect / technical coordinator / package planner / repo reviewer / QA planner.

ChatGPT should do as much zero-Base44-credit work as possible:
- inspect repository and current implementation
- inspect Build Checklist and Control Room before meaningful work
- map existing routes/tables/components before proposing new ones
- identify duplicate/overlapping systems
- prepare implementation packages
- define permissions, data contracts, edge cases, error states, mobile/Spanish requirements, and acceptance criteria
- review Base44 output and repo changes
- identify exact corrections instead of asking Base44 to diagnose itself repeatedly
- coordinate workstreams and record meaningful status in Control Room
- preserve future multi-church compatibility without prematurely building future network features

### Base44
Implementation accelerator, not the product brain.

Use Base44 primarily when its builder can efficiently implement an already-approved package or a bounded UI/workflow change.

Do not spend Base44 credits on open-ended brainstorming, repeated redesign, architecture discovery, "what should we build?", or self-review that ChatGPT/repo inspection can do first.

## 4. Base44 credit gate

Before any Base44 build request, all five questions must be answered YES:

1. Is this required for the current approved Madera pilot package?
2. Has ChatGPT inspected the existing implementation and confirmed what can be reused?
3. Is the package specification stable enough that Base44 will not be asked to invent the product while coding?
4. Can the work be batched into one coherent implementation request rather than several small prompts?
5. Is Base44 materially better/faster for this implementation than direct repo work or another zero-credit path?

If any answer is NO, do not spend Base44 credits yet.

### Base44 prompt rule

A Base44 implementation prompt should contain:
- exact package goal
- existing systems to reuse
- files/entities/workflows that must be preserved
- explicit non-goals
- permission boundaries
- data-flow expectations
- EN/ES + mobile requirements
- loading/empty/error/success states
- no-new-duplicate-system rule
- no paid integration unless explicitly approved
- required verification report after implementation

### Base44 correction rule

After Base44 implements:
1. ChatGPT reviews the result first.
2. ChatGPT creates one consolidated correction list.
3. Base44 receives one targeted correction batch when practical.
4. Avoid back-and-forth cosmetic micro-prompts unless a problem blocks usability.

## 5. Architecture rules for every pilot package

Every package must preserve these contracts:

### One human, one canonical identity
A person exists independently of whether they have a login. Outreach, onboarding, groups, learning, serving, households, care, and reporting should connect to the same human identity rather than making separate people.

### Enter once, update authorized places
Do not make leaders re-enter the same event in multiple modules. A report, signup, attendance record, milestone, or guest entry should create authorized downstream effects where appropriate.

### Tenant-ready even while piloting one church
Every church-owned record must remain scoped in a way that can safely support additional churches later. Do not expose or globally couple Madera data just because Madera is the only active pilot church.

### Permission before convenience
Members, group leaders, assistants, ministry leaders, pastors/admins, finance users, and platform/network roles must remain separated. Exact home addresses, pastoral care, prayer privacy, finance, and leadership observations require scoped access.

### Simple front end, powerful back end
Normal members should not see the complexity required by administrators. Use progressive disclosure and plain language.

### English + Spanish on critical paths
At minimum, signup/onboarding, recovery, primary navigation, Friendship Groups, core learning, help/retry states, and the main pilot flows must not strand Spanish users.

### Fail closed
Backend, authorization, membership, or RLS uncertainty must not become false success, false empty data, or guessed permissions.

## 6. Pilot definition: what Madera actually needs

The Madera pilot is ready when the following human journeys work together on real phones and real accounts.

### New person / guest
First contact -> captured once -> follow-up owner/action -> return visit/history -> invitation/join -> account/profile claim without duplication -> next step -> Friendship Group/class/other connection.

### Existing member
Sign in -> simple Home -> see next useful action -> profile/Journey -> group -> learning -> events/schedule -> prayer/care -> serving where applicable.

### Friendship Group leader / assistant
Open own group -> roster -> attendance -> guests -> weekly report -> prayer/urgent matters -> follow-up actions -> report history -> no unrelated private church data.

### Ministry / class leader
See authorized roster/progress -> teach/manage real New Life content -> record appropriate completion/attendance -> know what action is needed next.

### Pastor / church admin
Know who is new, who needs follow-up, where people are stuck, which reports are missing, which milestones require review, which groups need attention, which people are developing, and where operational action is needed — without exposing private information to the wrong users.

## 7. Existing assets to preserve and build on

The current repo already contains substantial foundations. The pilot plan should extend rather than replace them where verified:

- authentication, signup, confirmation, password recovery
- church joining and invitation foundations
- Start Here / first-login flow
- role-aware navigation and simplified Home work
- member/member-control foundations and 360-degree member record work
- outreach / evangelism foundations
- Friendship Groups: browse/join, portal, attendance, roster, reports, lessons, prayer hardening
- learning engine, courses, assessments, attempts, completion, credential logic
- First Steps and Effective Soul Winning course foundations
- Church Health / analytics foundations
- Kingdom Guide foundations
- Private Care / prayer privacy foundations
- forms/workflows foundations
- calendar/events/scheduling foundations
- serve/teams/ministry foundations
- finance/fundraising foundations, isolated by permission
- business directory foundations
- Church Builder / Fresh Church Setup foundations
- bilingual/recovery/security regression work

Any existing implementation is reusable only if it passes the current package's permission, data-integrity, simplicity, and integration requirements.

## 8. Pre-ready package queue for Madera pilot

All packages should be prepared before large new implementation begins. During package preparation, do not make production changes. Each package should identify existing reusable assets, missing work, dependencies, test matrix, and Base44/direct-code recommendation.

### Package 0 — Pilot Inventory, Scope Freeze & Canonical Architecture

Purpose: stop building on assumptions.

Prepare:
- complete route/functionality inventory
- current tables/RPC/RLS concepts by domain
- current open/verified PR/workstream inventory
- duplicate/legacy/demo flow map
- canonical Person/member/account contract
- church_id/tenant ownership map
- role/capability map
- shared cross-system event map
- exact Madera pilot in-scope / hidden / deferred features

Output:
- one architecture map
- one "reuse / repair / retire / defer" list
- no implementation yet

This package must be approved before any package is allowed to invent a new core table or parallel workflow.

### Package 1 — Evangelism / Guest Stewardship Completion

Purpose: make first contact and follow-up reliable.

Include:
- fast guest/contact capture
- source + visit history
- first-touch/latest-touch attribution
- follow-up owner/action/due date/history
- Bible-study and First Steps next-step flows
- missed-follow-up visibility/escalation
- communication consent/provider-safe behavior
- duplicate prevention
- handoff into canonical Person/onboarding

Reuse current Outreach implementation first.

### Package 2 — Onboarding + Identity + Invitations

Already planning-ready on `planning/onboarding-identity-invitations`.

Purpose:
- source-aware links/QRs/invites
- duplicate detection
- claim existing profile
- returning member reconnection
- canonical Person/account linkage
- progressive EN/ES onboarding
- households and minors/guardians
- communication preferences/consent
- privileged-role protection

Implementation prerequisite: Package 0 canonical identity decision and Package 1 handoff contract.

### Package 3 — Friendship Group Operating System

Already planning-ready on `planning/friendship-group-operating-system`.

Purpose:
- directory/status/privacy
- join/approve/transfer/waitlist
- leader/assistant capabilities
- roster
- attendance
- guest progression
- real New Life weekly report
- prayer/urgent routing
- absence follow-up
- milestone/report verification
- missing-report accountability
- potential leaders / multiplication / lineage
- reliable cross-system updates

Reuse PR/workstream work around existing Groups; never create a parallel FG system.

### Package 4 — Unified Member Record + My Journey Connection

Purpose: turn existing member data into one understandable person journey.

Include:
- canonical personal/contact/household data
- church relationship/membership state
- baptism/Holy Ghost reported vs verified state
- First Steps / ESW / future Timothys progress
- Friendship Group history
- ministry/serving interests and history
- training/qualifications/documents
- outreach/referral history where authorized
- personalized "what should I do next?"
- member self-service vs leader verification rules
- global people search for authorized leaders

Reuse existing 360-degree Member Record and milestone/learning/group systems rather than recreating them.

### Package 5 — Learning / New Life Discipleship Pilot

Purpose: make the classes Madera actually uses dependable before expanding the library.

Pilot focus:
- First Steps
- Effective Soul Winning
- only other courses specifically required for current New Life pilot roles

Include:
- verified lesson source mapping
- checkpoint/final rules
- sequential gating
- resume/progress
- completion/credentials
- teacher/admin visibility
- member record/Journey updates
- EN/ES where pilot content exists/required

Do not spend pilot time building a massive future course library.

### Package 6 — Church Health + Leader Action Center

Purpose: leadership action, not vanity dashboards.

Use the connected data from Packages 1–5 to show:
- first-time/return guests
- overdue follow-up
- Bible studies
- onboarding drop-off
- active members/group connection
- attendance trends
- missing FG reports
- reported/verified milestones
- First Steps/ESW progress
- repeated absences
- groups needing attention
- potential leaders
- simple actionable queues

No single spiritual/church "score."

### Package 7 — Prayer, Private Care, Announcements & Community Pilot Polish

Purpose: make existing connection/care features safe and understandable.

Include:
- prayer privacy levels
- private pastoral care boundaries
- praise/testimony share consent
- official church announcements separated from member community content
- simple member-facing community experience
- no engagement-addiction mechanics
- notifications only where provider/cost strategy permits

Reuse existing Prayer, Private Care, Community/communication foundations.

### Package 8 — Calendar, Events, My Schedule & Basic Tasks

Purpose: give Madera one dependable place for church time commitments.

Pilot include:
- services/events
- Friendship Group meetings/exceptions
- classes
- ministry practices/meetings
- leader assignments where already supported
- member My Schedule
- simple church schedule view for authorized leaders
- conflict visibility for obvious conflicts

Advanced automation, broad external calendar integrations, and expensive notification providers can wait.

### Package 9 — Serve / Ministries / Leadership Pipeline Minimum

Purpose: connect people to actual Madera ministry without building the full future leadership SaaS.

Pilot include:
- real New Life ministry/team configuration
- ministry interests
- leaders
- basic qualification/training links
- join/apply/approve flow where needed
- serving state/history
- potential leader / assistant signals from Friendship Groups
- simple leadership pipeline view

Timothys full curriculum can remain a later package if the actual approved curriculum is not yet available, but the data model must allow it.

### Package 10 — Admin / Reception / Official Records Pilot Minimum

Purpose: preserve the already-approved church-office direction without letting it delay ministry pilot unnecessarily.

Prepare and classify:
- baptism/dedication/other official records
- document upload/storage/reference workflow
- receipts/reimbursements/payment requests/approvals
- cleaning/operations scheduling
- church forms/work inbox

During package review, mark each item:
- required for Madera leadership pilot
- useful but can remain hidden/limited
- later office expansion

Reuse Forms, Documents, Finance and workflow foundations where possible.

### Package 11 — Finance / Fundraising Pilot Boundary

Purpose: prevent finance from becoming either a security risk or a launch blocker.

Finance already has separate claimed/security-sensitive work. For Madera pilot:
- preserve tenant isolation and separate finance permissions
- verify any finance area that will be visible to real users
- hide/disable unfinished or confusing finance functionality rather than pretending it is ready
- fundraising may be included only if stable and actually needed for pilot
- payment processor/integration expansion is deferred unless explicitly approved

### Package 12 — Kingdom Guide / AI Pilot Boundary

Purpose: keep AI useful without making advanced AI the pilot bottleneck.

Pilot-level AI should focus on:
- navigation/help
- church-approved resource lookup
- "what should I do next?" from connected Journey data
- leader help finding existing records/actions within permission boundaries

Defer until after core workflows are stable:
- broad autonomous actions
- voice-driven consequential writes
- expensive third-party AI/runtime integrations
- proactive mentor nudges that are not required for pilot

All consequential actions must require human confirmation.

### Package 13 — Madera Data Setup & Real Configuration

Purpose: remove demo assumptions and configure New Life truth.

Include:
- real church identity/settings
- real leaders and approved roles
- real Friendship Groups
- real classes/courses used in pilot
- real ministries/teams used in pilot
- actual group schedules/meeting privacy
- real church policies needed by workflows
- remove or clearly isolate demo/test data

Do not bulk-import sensitive production data until permission/data contracts are approved and the import is reversible/tested.

### Package 14 — Whole-System Simplification Pass

Purpose: evaluate the packages together before implementation/release becomes fragmented.

Review the complete proposed experience and cut:
- duplicate screens
- duplicate navigation destinations
- unnecessary forms/fields
- redundant dashboards
- features that do not help the Madera pilot
- tech/admin jargon visible to normal users
- repeated data entry

Confirm that each role has a small number of obvious next actions.

### Package 15 — Integration, Security & Human Pilot Acceptance

Purpose: one coordinated pilot candidate.

Required:
- fresh integration plan against current main
- reconcile overlapping PRs by intent
- full security/regression suite
- lint/type/build
- RLS/RPC/role verification
- cross-church isolation proof where applicable
- no duplicate-account/person proof
- English + Spanish real-phone tests
- loading/empty/error/retry testing
- New member flow
- Existing member flow
- FG leader/assistant flow
- Ministry/class leader flow
- Pastor/admin flow
- no dead buttons or demo-only promises on pilot-facing routes
- pilot feedback capture

Only after this package is VERIFIED can the candidate be presented for Marcus-approved production deployment.

## 9. What is NOT required to block the Madera pilot

These remain future-compatible but should not delay local-church pilot unless they solve a current blocker:

- adding church #2
- network/district collaboration UI
- paid sponsorship/business monetization
- full subscription/billing SaaS engine
- giant learning library
- full Timothys curriculum without approved source material
- advanced AI voice actions
- proactive AI mentor nudges
- true offline sync unless real pilot connectivity proves it necessary
- external social/media integrations
- advanced marketing SMS automation
- district report exports without actual forms/requirements
- marketplace/resource exchange
- extensive gamification

## 10. Package preparation template

Every pre-ready package should contain the same sections:

1. Purpose / ministry problem
2. Pilot user stories
3. Existing implementation inventory
4. Reuse list
5. Repair list
6. Retire/hide list
7. Missing functionality
8. Canonical data model / ownership
9. Permission matrix
10. Cross-system writes/reads
11. EN/ES requirements
12. Mobile/low-tech requirements
13. Loading/empty/error/success states
14. Security/privacy/RLS risks
15. Future extension points
16. Explicit non-goals
17. Implementation slices
18. Base44 vs direct-code recommendation per slice
19. Test matrix
20. Definition of done

No package is implementation-ready until these are answered enough to avoid builder guesswork.

## 11. Recommended working sequence from today

### Phase A — planning only
1. Freeze new pilot scope.
2. Prepare Package 0 inventory/architecture.
3. Complete pre-ready packages 1–15.
4. Review all packages together for overlap and simplification.
5. Remove or defer anything that is not necessary for Madera pilot.
6. Produce one final pilot implementation sequence and dependency map.

### Phase B — implementation
Implement in dependency-safe batches. Preferred sequence:
1. canonical identity/data contract changes that downstream packages require
2. Evangelism completion
3. Onboarding/Identity/Invitations
4. Friendship Group OS
5. Unified Member Record/My Journey integration
6. Learning New Life pilot completion
7. Church Health/leader action center
8. remaining care/community/calendar/serve/admin pilot items that survived simplification
9. real Madera configuration

Base44 should only receive package-bounded work that passed the credit gate.

### Phase C — system reconciliation
Before production:
1. evaluate all implemented packages as one human experience
2. remove duplicate/extra UI
3. verify cross-system data movement
4. verify permissions and privacy
5. run real-phone EN/ES testing
6. fix pilot blockers in consolidated batches
7. create one combined release candidate

### Phase D — Madera pilot
1. founder/admin acceptance
2. leadership pilot with a small real group
3. collect feedback through the system
4. fix repeated confusion/critical bugs
5. expand to more Madera leaders/members only after the core flows prove stable

## 12. Success criteria

Madera pilot is successful when:

- a guest is captured once and not forgotten
- follow-up ownership is visible
- a person can join/claim an account without duplicate records
- a leader can run a Friendship Group week from a phone
- the paper FG report is replaced without adding more work
- member milestones and learning progress live in one Journey
- leaders can see actionable church-health needs
- members know what to do next
- sensitive care/finance/address information stays private
- Spanish and low-tech users can recover from mistakes/failures
- the system feels simpler than the collection of paper, texts, spreadsheets, and scattered apps it replaces

The pilot is not judged by how many future features are visible.

## 13. Standing future-thinking rule

For every current decision, ask two questions:

1. What is the simplest correct solution for Madera New Life today?
2. Does this solution preserve a clean path to Network -> Church -> Ministry/Group -> Household -> Member later?

Do not build the future prematurely, but do not make a local shortcut that forces a future rewrite when a modest, clean abstraction can avoid it.

This is the balance Kingdom Network should follow going forward.