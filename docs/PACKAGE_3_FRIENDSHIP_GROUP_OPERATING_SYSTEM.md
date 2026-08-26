# Kingdom Network — Package 3: Friendship Group Operating System

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 3 turns the current Friendship Group foundation into the real weekly operating system for New Life:

**discover / join → roster → meeting → attendance → official report → guest follow-up → prayer/care → milestones → leader development → multiplication → Church Health.**

The goal is not to create another “small group app.” The goal is to make one Friendship Group meeting update every authorized ministry record it should affect, once, safely.

This package is grounded in:

- the current Next.js/Supabase group implementation;
- live group/RLS/schema inspection;
- the official **English FG Report — Updated 2025** and corresponding Spanish report;
- previously hardened Base44 Package D behavior;
- the Founder Vision requirement that group leaders receive scoped ministry visibility without pastor-level access.

---

# 1. Existing Supabase foundation — KEEP

The current canonical group system already has substantial real infrastructure:

- `groups`
- `group_private_details`
- `group_memberships`
- `group_join_requests`
- `group_meeting_checkins`
- `group_reports`
- `group_report_attendance`
- `reported_milestones`
- group-scoped prayer behavior
- current leader/assistant/member roster roles
- self-check-in
- one-active-Friendship-Group protection
- capacity / accepting-members safeguards
- join-request approval with database enforcement
- exact meeting-address privacy
- report history
- Church Health/reporting dependencies

Live Package 0 checkpoint showed:

- 2 groups
- 2 active Friendship Groups
- 5 group memberships
- 1 join request
- 0 submitted group reports
- 0 report attendance rows

The foundation is real; the weekly ministry workflow still needs pilot proof.

## Existing permission model to preserve

Current helper/RLS work already distinguishes:

- **manage group** authority — roster/settings/membership decisions;
- **operate group** authority — leader/assistant meeting/report operation;
- ordinary member access;
- Pastor/Admin / broader `manage_groups` authority.

Do not build a second Friendship Group role system.

---

# 2. Current implementation problems to REPAIR

## A. Report submission is not reliably orchestrated

Current `submitGroupReport` saves the main report first, then separately attempts:

- attendance rows;
- Outreach guest inserts;
- milestone reports.

Those later writes can fail while the report still exists and the UI can appear successful.

Required fix: **no silent partial ministry update.**

## B. Duplicate guests are skipped instead of stewarded

Current report guest insert treats uniqueness conflict as “duplicate guest” and moves on.

A returning person must instead:

- match/reuse the canonical Outreach contact safely;
- record a new FG visit/source interaction;
- preserve first-touch source;
- update follow-up appropriately;
- never disappear merely because the contact already existed.

Package 1 owns the duplicate-safe guest/visit contract; Package 3 must call it.

## C. Group source attribution is incomplete

Current report-created Outreach records do not reliably carry the full structured FG source/occurrence context.

Required source data includes:

- group
- meeting occurrence/date
- reported visit status where known
- reporting leader
- inviter/referrer when known.

## D. Bible studies are mostly aggregate counts

The official report tracks Bible Studies as ministry activity. When the person is known, “3 Bible studies” is not enough.

Known-person Bible-study activity should create canonical Outreach/history records while the aggregate report totals remain useful for the official report and Church Health.

## E. Current official attendance model is too simple

Current canonical report attendance is account-backed and uses `on_time / late / missing`. The official New Life report uses ministry categories:

### Current Friendship Group Attendance

- `P` — Present
- `E` — Excused
- `U` — Unexcused
- `C` — Children
- `M` — Member of Church, Not of FG
- `A` — Member of Another Group

### Guest List

- `1` — 1st Time Attending
- `2` — 2nd Time Attending
- `3` — 3rd Time Attending
- `G` — FG Guest, Not Church Member
- `Y` — Youth
- `C` — Children

These distinctions are ministry signals and must not be flattened into one attendance number.

## F. Sensitive report text is too broad

Current report code can concatenate group prayer-wall text into `group_reports.prayer_needs`.

Prayer, urgent matters and pastoral-care content require explicit privacy routing rather than broad report visibility.

---

# 3. Base44 Package D behavior to preserve/port

The Base44 work is not the canonical datastore, but several behaviors are stronger than the current Next.js report path and should be intentionally ported:

- row-backed official attendance totals;
- manual totals allowed only when no real rows exist;
- one official report per group/meeting date;
- draft → submitted one-way status;
- atomic `submitted_at` with the transition;
- submitted report cannot be reopened as draft by group leadership;
- reviewed report locks guest-resolution controls;
- admin correction re-applies attendance integrity;
- correction/review audit;
- normalized Guest matching;
- exact match reuse;
- ambiguous/name-only visitor flagging;
- flagged visitor review/link-existing/create-new flow;
- positive Guest + Follow-Up verification before success;
- idempotent retry/resubmit behavior;
- uncertain save forces refresh before another consequential action;
- prayer sharing requires explicit positive success;
- English/Spanish report recovery states;
- slow-phone stale-search-response protection;
- no raw backend exception text.

These are **behavior requirements for Supabase implementation**, not permission to maintain Base44 reports in parallel.

---

# 4. Group lifecycle

Replace the overly simple “active boolean is the whole lifecycle” concept with explicit Friendship Group lifecycle meaning while preserving compatibility during migration.

Pilot statuses:

- `forming`
- `active`
- `paused`
- `multiplying`
- `archived`

Behavior:

### Forming
Visible only according to church setup rules; may accept invited/pre-launch roster but is not treated as a normal active group in public discovery/health reporting.

### Active
Normal discover/join/attendance/report lifecycle.

### Paused
History remains; no normal join/report expectation until resumed.

### Multiplying
Still operational while leadership is preparing the child group; advisory status, not automatic split.

### Archived
Historical record retained; not joinable; no new weekly report requirement.

Do not hard-delete a real group simply because it stops meeting.

---

# 5. Leader / assistant capability model

Avoid a giant assistant role that accidentally exposes everything.

Target capability behavior:

| Capability | Leader | Assistant | Pastor/Admin / manage_groups |
|---|---|---|---|
| View group roster | Yes | Yes | Yes |
| Record attendance | Yes | Yes | Yes |
| Enter guests | Yes | Yes | Yes |
| Draft report | Yes | Yes | Yes |
| Submit final report | Yes | Church-configurable / default Yes for pilot | Yes |
| View normal member contact needed for group ministry | Yes | Yes, scoped | Yes |
| View protected pastoral/private records | No by default | No | Only authorized care scope |
| Approve membership | Yes/configurable | No by default | Yes |
| Reassign/transfer member | No by default | No | Yes / configured manager |
| Change group configuration | Yes/limited | No/limited | Yes |
| Nominate potential leader | Yes | Optional | Yes |

Underlying authorization must continue using existing capability/RLS/helper logic. Display title is not authority.

---

# 6. Group discovery and location privacy

Public/member discovery should show enough to choose a group without exposing a private home:

- group name
- leader display name
- day/time
- language
- general neighborhood/city/location label
- capacity/availability state where useful

Exact home address / access notes remain in protected `group_private_details` and are visible only to:

- approved/joined group members;
- current group leadership;
- Pastor/Admin / explicit group-management authority.

A source QR/intended group does not unlock the address.

---

# 7. Join, transfer, waitlist and roster history

## Join

Keep the current request → approve/decline flow and DB-controlled membership enforcement.

## One active Friendship Group

Preserve the current guard. A person does not silently become active in two Friendship Groups.

## Transfer

Add an explicit transfer workflow rather than telling users to abandon history:

1. member/leader requests transfer;
2. current/new group context is visible to authorized managers;
3. approval closes/ends prior active membership relationship;
4. new group membership begins;
5. old attendance/report history remains attached to the original group;
6. My Journey shows current and former groups appropriately.

Distinguish:

- current FG member
- former FG member
- church member visiting another FG
- member of another FG (`A` attendance code)
- church member not assigned to this FG (`M`)
- guest/prospect.

## Capacity / waitlist

Use existing `capacity` / `accepting_members` foundation.

When full:

- do not over-enroll through UI or direct call;
- offer waitlist/interest or nearby available groups;
- Pastor/Admin can see demand as a multiplication signal.

A simple waitlist is useful but may be implemented after core join/report integrity if it threatens pilot timing.

---

# 8. Meeting occurrences

Recurring group schedule and one actual meeting occurrence are separate concepts.

A group may normally meet Tuesday at 7 PM but have:

- this-week-only time change;
- church-wide combined meeting;
- outreach night;
- fellowship/special event;
- cancellation.

Package 3 should represent occurrence exceptions without overwriting the normal recurring schedule.

The report belongs to the actual occurrence/date.

---

# 9. Official New Life report contract

The digital report must preserve the ministry meaning of the current 2025 paper form rather than reducing it to a few KPI boxes.

## Header

- Leader
- Assistant
- Topic
- Date
- Time
- Urgent Matters

## Vision casting / group formation

- Vision Statement: “Be A 21st Century Book Of Acts Church” — Yes/No
- Mission Statement: “Leading People Into A Totally Committed Christian Life” — Yes/No
- New Life Motto: “Every Member Is A Minister” — Yes/No
- The Four Friendship Group Goals — Yes/No
- The In-Home Group Meeting Guidelines — Yes/No

## Attendance

Structured rows using the official `P/E/U/C/M/A` member/church attendance categories.

## Multiplication

- multiplication date / target
- prospect(s)

## Guest list

Structured rows using `1/2/3/G/Y/C`, with safe link to canonical Outreach when identifiable.

## Shared Meeting Responsibilities

Capture responsibility assignment among Leader / Assistant / Member for:

- Ice Breaker
- Edification
- Worship
- Goals/Guidelines

## Evangelism

- Bible Studies day
- Weekly Prayer Day
- Upcoming FG Events — date/time/title/context

## Vision Objectives

Yearly goal + current for:

- Bible Studies
- Holy Ghost
- Baptisms
- Restored

These report objectives are ministry plan/summary values. They do not overwrite person-level verified records.

## Praise Reports

- reported by
- praise/testimony text
- optional approved sharing outside leadership/group report

## Prayer Requests

- requested by
- request
- explicit privacy/sharing choice before routing elsewhere

## Group Leader’s Comments

Normal group-ministry notes only. Do not encourage confidential counseling/pastoral case material in broad report notes.

---

# 10. Report data design

Do not add dozens of unrelated one-off columns merely because the paper form has many boxes.

Keep query-critical/report-critical facts as typed columns and use structured JSONB for bounded report sections where appropriate.

Recommended evolution:

## `group_reports`

Keep/add typed fields for:

- group
- meeting occurrence/date/time/type
- submitted/reviewed status
- submitted by / submitted at
- reviewed by / reviewed at
- topic
- official totals
- lesson/topic reference
- multiplication target/prospect summary
- report version / corrected timestamp where needed

Structured sections may hold:

- vision-casting checks
- responsibilities
- vision objectives
- upcoming events
- praise report entries
- non-sensitive leader comments

Sensitive prayer/care text should be routed to protected domain records, not treated as ordinary JSON report content merely for convenience.

## Official status lifecycle

- `draft`
- `submitted`
- `reviewed`

Rules:

- leader/assistant may edit draft;
- submission is one-way for group leadership;
- reviewed is leadership/admin-controlled;
- correction after submission/review is authorized and audited;
- report cannot silently revert backward;
- one canonical report per group/meeting occurrence/date.

---

# 11. Attendance data design

Current `group_report_attendance.user_id` is required and current status values are `on_time/late/missing`. That does not represent the official report.

Package 3 should evolve the canonical attendance entry so one report row can safely represent:

- account-backed church member (`user_id`)
- canonical Outreach guest (`outreach_contact_id`)
- no-account household child/dependent when Package 2 provides a stable household-member relationship id
- unidentified one-time visitor name when necessary
- anonymous/unidentified child count when individual capture is not appropriate.

Each row stores the official attendance/guest code and source occurrence.

Do not create fake member accounts for children or one-time visitors just to satisfy a foreign key.

## Self check-in relationship

`group_meeting_checkins` remains a useful pre-report signal.

At report time:

- valid present check-in pre-fills `P` for a roster member;
- leader/assistant can correct the official code;
- absent roster people are resolved to `E/U` according to leader knowledge/church policy;
- official report row is the ministry attendance record;
- raw check-in timestamp remains history, not the official attendance category itself.

## Totals

If row-backed attendance exists:

- official totals are server-derived from rows;
- separate editable totals are locked;
- reviewed corrections recalculate them server-side.

Manual totals are allowed only for a genuinely row-less historical/special report where individual attendance was not recorded.

---

# 12. Guest / return-visit integration with Package 1

A group report does not insert Outreach contacts independently anymore.

For each identifiable visitor:

1. send church/group/occurrence/name/contact data to the Package 1 duplicate-safe resolver;
2. exact safe candidate → reuse canonical Outreach contact;
3. no candidate with sufficient identity → create canonical Outreach contact;
4. ambiguous/name-only case → preserve report row and create `needs_review` action, not a random duplicate;
5. append FG visit interaction with source group + occurrence + reported `1/2/3/G/Y/C` code;
6. create/update one accountable follow-up under Package 1 rules;
7. return canonical contact/follow-up ids to the report processing result.

A repeat visitor is a new **visit**, not a new **person**.

---

# 13. Reliable one-report → many-system action layer

Package 3 must eliminate silent partial writes.

Recommended canonical pattern: a **report action/outbox ledger** saved with the official report.

Conceptual `group_report_actions` rows:

- report id
- church id
- group id
- deterministic source key/idempotency key
- action type
- status: `pending | completed | needs_review | failed`
- result target ids where safe
- bounded error/recovery code
- processed/reviewed timestamps

Action types can include:

- `outreach_visit`
- `guest_followup`
- `bible_study_activity`
- `reported_milestone`
- `prayer_route`
- `care_route`
- `absence_followup_suggestion`
- later leadership/multiplication signals.

## Submission guarantee

The report, official attendance rows and intended downstream action ledger must be committed as one reliable server operation.

Downstream processing may produce `completed` or `needs_review`, but it cannot disappear silently.

Leader sees a clear result such as:

> Report submitted. 12 attendance records saved. 2 guest follow-ups connected. 1 visitor needs review.

If save certainty is unknown, lock the editor and reload/reconcile before offering another submit.

---

# 14. Baptism / Holy Ghost integration

Keep the existing good pattern:

- Pastor/Admin / authorized verified-record manager can update official milestone records;
- group leader/assistant reporting a baptism/Holy Ghost creates a pending `reported_milestones` item when verification is needed;
- do not silently overwrite `member_milestones`.

Improve identification:

- prefer safe selection of known member/Outreach identity;
- free-text name is allowed only when identity is unknown and remains pending review;
- no fuzzy/name-only auto-link.

The official report aggregate count and the person-level pending milestone must reconcile without requiring every count to have a known person in the same moment.

---

# 15. Bible study integration

The official report keeps aggregate Bible Study objectives/counts.

When a known person is receiving a study:

- create/append canonical Outreach Bible-study interaction;
- preserve lesson/progress if available;
- do not create duplicate Bible-study records from retries;
- person-linked activity later feeds Journey/Church Health as appropriate.

Unknown/aggregate-only counts remain report metrics without inventing people.

---

# 16. Prayer / urgent matters / praise privacy

## Prayer Requests

For each digital request, ask the submitter/leader for the intended scope where appropriate:

- Friendship Group
- leadership/pastoral team
- private pastoral care

Route to the existing protected `prayer_requests` / care system according to privacy choice.

Do not copy a private request into broad report text.

## Urgent Matters

“Urgent Matters” should not become a giant unprotected report textarea.

Offer:

- normal group-operational note, or
- **Send privately to pastoral care**.

The private path creates/links a protected care item with authorized access.

## Praise Reports

Praise/testimony can remain in report history. Publishing to the community/church requires explicit approval/consent; report submission alone is not consent to broadcast it.

---

# 17. Attendance-based care suggestions

Repeated absence should create a **suggested care/follow-up action**, not spam or automatic pastoral judgment.

Pilot rule can be church-configurable; reasonable initial behavior:

- 2–3 consecutive unexcused/missed regular meetings → suggest leader check-in;
- leader can dismiss, snooze or record contact;
- known excused absence should not trigger the same concern;
- Church Health can surface persistent disengagement only from canonical attendance history.

Do not label a person spiritually “unfaithful” from an algorithm.

---

# 18. Missing-report accountability

For active groups with an expected occurrence:

- report due after the normal meeting window;
- leader/assistant gets a gentle reminder;
- after a church-configured delay, overseer/Pastor/Admin can see “report missing”;
- paused/cancelled/special exception occurrences do not create false overdue reports;
- submitting later resolves the missing-report state.

No paid SMS is required; in-app/leader dashboard reminders are sufficient for pilot.

---

# 19. Multiplication, lineage and leader development

## Multiplication is advisory

Kingdom Network may surface “this group may be ready to multiply” based on signals such as:

- attendance trend
- capacity pressure
- stable assistant leader
- nominated potential leader
- guest/return growth
- reporting consistency

The system does **not** appoint leaders or split groups automatically.

Human church leadership decides timing and appointments.

## Lineage

When a group multiplies:

- preserve parent → child group relationship;
- preserve original group history;
- record multiplication date;
- new child group receives its own roster/schedule/report history.

Do not rewrite the original group into the new group and lose lineage.

## Potential leader / Timothys bridge

A group leader may submit a non-authorizing “potential leader” nomination/signal.

Do not grant a role automatically and do not expose confidential pastoral leadership-review notes.

Use the existing leadership-development domain as the downstream authority; if a narrow nomination queue is needed, it should feed that domain rather than create a second leadership system.

## Leader succession

If the leader changes, the group remains the same group.

Preserve:

- group history
- previous reports
- membership history
- leadership change audit/term history

Do not create a new group merely because leadership changed.

---

# 20. Communication audience

Group communication audiences should derive from the canonical roster rather than a duplicate manual contact list.

Future actions can include:

- message my group
- message assistants
- contact people absent this week
- contact current guests assigned to the group

Provider-specific SMS/email/push delivery is not required in Package 3. The roster-derived audience contract belongs here; paid delivery can come later.

---

# 21. Mobile / poor-connection behavior

V1 requirement:

- fast phone-first attendance/report UI;
- local in-progress draft recovery where practical;
- double-submit protection;
- uncertain-result reload/reconciliation;
- no raw backend errors;
- English/Spanish critical states.

True conflict-safe full offline synchronization is **designed-for-later**, not a hard V1 gate unless real Madera pilot evidence proves it is necessary.

Do not spend weeks building a complex offline engine before leaders demonstrate the need.

---

# 22. Church Health output

Package 3 supplies canonical data for Package 6 to derive:

- active/paused/forming groups
- group participation
- attendance trends
- first/second/third/return guest activity
- groups at/near capacity
- missing reports
- Bible-study activity
- pending baptism/Holy Ghost reports
- repeated absence care suggestions
- multiplication signals
- leadership pipeline signals

Do not create a separate manually-entered FG health dashboard.

---

# 23. Real human flows

## Member

Find group → see general location/day/time → request to join → approval → exact address becomes available → attend/check in → see appropriate group/prayer/lesson information.

## Visiting church member

Attend another group without becoming its roster member → official attendance code reflects `M` or `A` context as appropriate → current group membership does not silently change.

## Guest

Attend without account → leader captures minimal identity → Package 1 resolves/reuses Outreach → follow-up assigned → 1st/2nd/3rd visit history preserved → optional account onboarding later.

## Assistant leader

Open own group → attendance → enter visitors → draft/report according to configured submit capability → no church-wide membership/pastoral access.

## Group leader

Manage roster/join requests → attendance → report → guest follow-up → absence suggestions → prayer/care routing → multiplication/potential-leader signals.

## Pastor/Admin

View all groups according to authority → overdue/missing reports → review/correct reports → resolve flagged visitor/milestone issues → oversee transfers/capacity/multiplication → protected care stays protected.

---

# 24. Implementation slices

## Slice A — schema/RLS/report contract lock

- reconcile current group tables and helpers;
- coordinate any shared role/RLS overlap;
- add lifecycle/status compatibility plan;
- design official attendance identity/code model;
- design report status/action ledger;
- regression tests before migration.

## Slice B — group lifecycle / leader-assistant / location

- statuses
- leader/assistant capabilities
- schedule/occurrence exception model
- exact-address privacy
- capacity/accepting members.

## Slice C — roster / join / transfer

- current join approval
- transfer flow/history
- waitlist if timing allows
- member vs visitor distinctions.

## Slice D — official attendance

- P/E/U/C/M/A + 1/2/3/G/Y/C
- self-check-in prefill
- account/Outreach/household/unidentified identity support
- server-derived totals.

## Slice E — full 2025 EN/ES weekly report

- header / vision casting
- responsibilities
- multiplication
- evangelism
- objectives
- praise
- prayer
- comments
- drafts/submission/review/correction.

## Slice F — reliable cross-system processing

- report + attendance + action ledger one reliable submission
- Package 1 Guest/Follow-Up integration
- Bible studies
- reported milestones
- no silent partial success
- flagged review/retry.

## Slice G — privacy/care/accountability

- prayer scopes
- urgent/private care routing
- absence care suggestions
- missing-report reminders/escalation.

## Slice H — multiplication / lineage / leadership signals

- advisory readiness
- parent-child lineage
- leader succession history
- Timothys/leadership nomination bridge.

## Slice I — history / Church Health / real phone proof

- report history/trends
- Church Health canonical reads
- Leader/Assistant/Pastor/Member/Guest QA
- EN/ES mobile proof.

## Later only if pilot proves need

- Prophet voice/text report parsing with human confirmation
- true conflict-safe offline sync
- advanced group communication providers.

---

# 25. Explicit non-goals

- a second Group/Guest database in Base44
- automatic leader appointment
- automatic group multiplication
- automatic pastoral judgments from attendance
- paid communication provider requirement
- full offline sync before pilot evidence
- network-wide group discovery across churches
- exposing exact home addresses publicly
- putting private care notes in general reports
- using report aggregates to silently overwrite verified person records
- broad Finance/shared role-RLS redesign.

---

# 26. Acceptance criteria

## FUNCTIONAL

- active group can be found/joined;
- leader/assistant can take attendance;
- official attendance codes work;
- draft report can be saved;
- one report per occurrence/date;
- submit works once;
- report cannot revert backward;
- history loads;
- Pastor/Admin can review/correct;
- transfer preserves prior history.

## CONNECTED

- guest row resolves through Package 1 rather than independent insert;
- repeat guest creates visit history, not duplicate person;
- one follow-up per source occurrence;
- known Bible study becomes interaction;
- baptism/Holy Ghost creates pending verified workflow, not canonical overwrite;
- privacy-selected prayer/care routes correctly;
- Church Health reads the resulting canonical records;
- household child can be represented without fake account when Package 2 support is live.

## SECURE

- church A cannot see/modify church B group data;
- ordinary member cannot see exact home address before approved membership;
- assistant cannot access church-wide roster/pastoral/private content;
- former leader loses operating authority while report history remains;
- group inviter/source does not grant membership;
- private prayer/urgent matters do not leak into broad report text;
- potential leader nomination grants no authority;
- role/RLS/UI checks agree.

## SIMPLE

- phone-first attendance is faster than paper re-entry;
- report follows the familiar New Life form language/order;
- row-backed totals calculate automatically;
- missing/ambiguous guest clearly says what needs review;
- success summarizes what was updated;
- EN/ES no critical dead ends;
- leader can answer “what do I do next?” at every stage.

## TESTED

Automated/focused proof includes:

- group lifecycle state restrictions;
- capacity enforcement;
- join approval transaction;
- transfer / one-active-FG guard;
- exact-address RLS;
- assistant operate vs manage denial;
- P/E/U/C/M/A totals;
- 1/2/3/G/Y/C guest handling;
- duplicate same-date report;
- submitted→draft denial;
- reviewed correction recalculation;
- exact guest match;
- ambiguous/name-only visitor review;
- retry/idempotency;
- downstream action failure visible/recoverable;
- milestone remains pending verification;
- prayer visibility;
- cross-church denial;
- former leader denial;
- missing-report exception for paused/cancelled occurrence;
- EN/ES states;
- lint/build/security regression gate.

## VERIFIED

Real Madera proof on exact candidate:

- member requests group and is approved;
- member sees address only after approval;
- assistant records attendance and drafts/submits according to configured permission;
- leader records official attendance from real phone;
- first-time guest creates/reuses canonical Outreach and follow-up;
- returning guest advances visit history without duplicate;
- name-only/ambiguous guest lands in review;
- report includes actual New Life form sections in EN/ES;
- report submitted once; repeated tap/retry does not duplicate report/follow-up;
- Pastor/Admin reviews/corrects and audit remains;
- prayer/private urgent item respects privacy;
- baptism/Holy Ghost remains pending until verified;
- missing report reminder works;
- transfer preserves history;
- group leader cannot see unrelated church-wide guest/member data;
- exact head passes automated release gate.

Only then is Package 3 VERIFIED / eligible for combined release handling.

---

# 27. Implementation path / Base44 credit decision

## Primary target

**Direct Next.js + Supabase.**

Reason:

- canonical groups/member/outreach/health data already live there;
- strong RLS/join/address foundations already exist;
- Base44 has excellent report/reliability behavior but must not become a second data authority;
- the hardest remaining work is transactional/reliability/security integration, which belongs at the canonical database/server boundary.

## Base44 reuse

Use existing Package D code/checkpoints as implementation evidence for:

- report state machine
- official attendance integrity
- duplicate report protection
- Guest/Follow-Up certainty
- flagged visitor review
- correction audit
- slow-phone/EN-ES recovery.

**No new Base44 Builder prompt is required to begin Package 3 implementation.**

---

# 28. Planning-ready gate

- [x] Current routes/tables/report code mapped.
- [x] Official 2025 New Life form semantics incorporated.
- [x] Canonical data authority settled.
- [x] Existing RLS/capability model preserved.
- [x] Assistant-leader boundary defined.
- [x] Group lifecycle defined.
- [x] Location privacy defined.
- [x] Join/transfer/capacity behavior defined.
- [x] Official attendance-code model defined.
- [x] Report draft/submitted/review lifecycle defined.
- [x] Reliable cross-system action model defined.
- [x] Package 1 Guest/Follow-Up handoff defined.
- [x] Bible-study/milestone/privacy boundaries defined.
- [x] Missing-report/absence-care behavior defined.
- [x] Multiplication/lineage/succession/leadership signals defined.
- [x] Mobile/EN-ES/offline boundary defined.
- [x] Acceptance criteria written through VERIFIED.
- [x] Direct repo implementation path chosen.
- [x] Base44 credit gate resolved: no new prompt needed initially.
- [x] Pilot scope bounded.
- [x] No live schema/RLS/data/deployment change performed during planning.

## Final Package 3 decision

**PACKAGE 3 IS PLANNING READY.**

Implementation should extend the existing Supabase Friendship Group foundation, digitize the real 2025 New Life report, use official attendance categories, route guests through Package 1, make report cross-system processing auditable/idempotent, protect prayer/care/address data, and intentionally port the strongest verified Base44 Package D reliability behavior into the single canonical Madera system.
