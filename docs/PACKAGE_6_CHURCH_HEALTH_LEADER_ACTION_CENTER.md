# Kingdom Network — Package 6: Church Health + Leader Action Center

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 6 turns the existing Church Health reporting into one trusted leadership surface that answers two questions:

1. **What is happening in the church?**
2. **Who or what needs attention now?**

It must use the same canonical records already owned by Evangelism, Onboarding, Friendship Groups, Journey, Learning, Serving and leadership development. It must not become a second manually maintained reporting database.

The pilot principle remains:

> **Enter information once. Update every authorized place that information affects.**

And Church Health must not reduce church ministry to one artificial “health score.”

---

# 1. Existing implementation — KEEP / MERGE

## KEEP `/church/health` as the canonical Church Health route

Current strengths:

- bilingual English/Spanish surface;
- role/capability-aware route access;
- one secured `church_health_snapshot(...)` RPC;
- explicit separation of formal Members, regular attendees and guest accounts;
- categories for people, new birth, discipleship, outreach, groups, serving and leadership;
- current activity-window selector;
- loading/error surfaces;
- explicit “not one magic score” design.

## MERGE useful behavior from `/church/analytics`

Current `/church/analytics` contains useful operational functionality that should not be lost:

- Friendship Group 30-day ministry pulse;
- Outreach funnel view;
- `NEEDS ATTENTION` links/counts;
- leadership-development link;
- operational signals for care, overdue Outreach, pending milestones, documents, ministry applications and team confirmations.

However `/church/analytics` currently:

- directly queries many tables independently of the secured health RPC;
- is English-only;
- uses older Pastor/Admin-only route logic;
- duplicates definitions already present in `/church/health`;
- can drift from future Package 1–5 canonical definitions.

### Decision

**Do not build a third dashboard.**

Move the useful operational behavior into `/church/health`, then retire `/church/analytics` from primary navigation. After equivalency/verification, `/church/analytics` should redirect to the canonical Health surface or remain hidden only as a temporary compatibility route.

---

# 2. Live Madera planning checkpoint

Read-only production checkpoint during Package 6 preparation:

- active church relationships/accounts: **13**
- formal members: **5**
- Outreach contacts: **8**
- overdue Outreach follow-ups: **8**
- unassigned Outreach contacts: **0**
- active groups: **2**
- submitted group reports: **0**
- pending reported milestones: **1**
- First Steps Learning credential pending milestone verification: **0**
- ESW Learning credential pending milestone verification: **0**

These values are not “targets.” They demonstrate why the pilot needs actionable queues rather than decorative charts.

---

# 3. Canonical metric contracts

Every metric must state what record defines it.

## People

### Formal Members
Source: active `church_memberships.relationship_status='member'`.

### Regular Attendees
Source: active `church_memberships.relationship_status='attendee'`.

### Guest Accounts
Source: active `church_memberships.relationship_status='guest'`.

### Relationship verification
Source: existing relationship verification fields / confidence RPC.

Do not call all app accounts “members.”

## New Birth

### Baptism verified
Source: verified `member_milestones.baptized=true` for active formal Members.

### Holy Ghost verified
Source: verified `member_milestones.holy_ghost_received=true` for active formal Members.

### Baptism + Holy Ghost verified
Derived from the same canonical verified milestone row.

Pending/self-reported group/onboarding values do not silently count as verified.

## Discipleship / Learning

For First Steps and Effective Soul Winning distinguish:

- **Learning in progress** — canonical course enrollment/progress;
- **course credential earned** — `course_enrollments.credential_earned=true`;
- **verification pending** — credential/evidence exists but official milestone has not yet been confirmed where church verification is required;
- **church milestone verified** — canonical `member_milestones` status completed;
- **historical/manual equivalency** — leadership-approved canonical equivalency with source/audit.

Package 6 must not collapse “course credential earned” and “church milestone verified” into one ambiguous count.

Timothys and later courses follow the same evidence-vs-verified-rule pattern.

## Outreach / Evangelism

After Package 1 is implemented, canonical metrics derive from `outreach_contacts` + attributed `outreach_interactions`:

- new connections;
- first-time guest occurrences;
- returning guest occurrences;
- source/channel/group/event attribution;
- active Bible-study relationships/activity;
- overdue follow-up;
- unassigned follow-up;
- stale/cold records needing re-engagement;
- guest → account/member connection.

Do not use one mutable `source` or `stage` field as a substitute for visit history when historical interactions exist.

## Friendship Groups

After Package 3 is implemented:

- active/forming/paused/multiplying/archived groups;
- current roster participation;
- attendance trend;
- first/second/third-time group guest activity;
- reports due/submitted/missing;
- groups at/near capacity;
- repeated absence care suggestions;
- multiplication-readiness signals;
- pending report actions/reviews.

Report aggregate totals remain useful, but person-level known events should come from canonical linked rows/interactions.

## Serving

Use canonical accepted ministry applications and active/confirmed team assignments according to the final Serve package contract. Do not count a merely expressed ministry interest as currently serving.

## Leadership

Use canonical leadership-development records/signals. Potential leader nominations and readiness are advisory, not appointments.

---

# 4. Leader Action Center

Church Health becomes the leadership home for **named, permission-safe next actions**.

## Action categories for the Madera pilot

### Evangelism

- overdue follow-ups;
- unassigned follow-up queue;
- identity/duplicate review pending;
- stale/cold contacts;
- guests who returned but have no documented next action.

### Onboarding / Identity

- identity links needing review;
- invitations nearing expiry / unresolved where actionable;
- onboarding started but stale;
- returning/inactive member restoration requests;
- household/account claim conflicts when authorized.

### Friendship Groups

- active group report missing after expected window;
- report downstream action needs review/failed;
- ambiguous visitor needing identity review;
- repeated unexcused absence care suggestion;
- group at/near capacity;
- group showing advisory multiplication-readiness signals.

### Journey / Learning

- course credential earned but church milestone verification pending;
- verified milestone evidence missing source/date where review is required;
- member stalled in an active course for a meaningful period;
- pathway next step lacking assignment/connection.

### Care / Prayer

- protected care requests requiring attention, but only counts/details authorized for the current viewer;
- private prayer/care content never leaks merely because the viewer can open Church Health.

### Serving / Leadership

- pending ministry applications;
- assignment confirmations overdue;
- leadership-development review due;
- potential-leader nominations awaiting leadership review.

## Action item rules

Each action needs:

- category;
- severity/priority based on church-configured operational meaning, not dramatic language;
- human-readable reason;
- age/due date;
- responsible owner when known;
- direct safe route to resolve it;
- tenant/church scope;
- underlying-record permission check.

Do not copy sensitive record contents into a broadly visible action table just for convenience.

---

# 5. Permission model

There is a difference between **seeing an aggregate metric** and **seeing named underlying people/cases**.

## Aggregate leadership health

Keep current access model where appropriate:

- Pastor / Church Admin;
- `view_leadership`;
- `manage_members` where intentionally approved.

## Named action details

Every action must respect the underlying domain authority:

- Outreach owner/group-scoped leader sees only assigned/own-group records;
- `manage_outreach` may see church-wide Outreach;
- group leader sees own-group actions only;
- member-management actions require `manage_members`/Pastor/Admin as defined;
- private care requires care-specific authority;
- Finance data does not appear merely because someone can see Church Health;
- cross-church access is always denied.

A single Church Health route must not become a permission bypass across ministry domains.

Preferred implementation: secured RPCs/views that return only action summaries the current caller is allowed to see, with direct links that re-check permission at the destination.

---

# 6. Trend model

Package 6 must support meaningful trends without copying data into a manual reporting ledger.

Required pilot windows:

- 7 days;
- 30 days;
- 90 days;
- 365 days where enough history exists.

UI can summarize week/month/quarter/year based on canonical event timestamps.

Examples:

- new guest/return guest trend;
- follow-up completed/overdue trend;
- Bible-study activity;
- FG attendance/reporting trend;
- baptism/Holy Ghost verified events;
- First Steps / ESW start, credential, verification trend;
- serving participation trend;
- leadership pipeline activity.

## Historical truth rule

Trend functions aggregate existing timestamped canonical events/records. Do not write a daily “health score” merely to create a chart unless a future reporting requirement proves snapshots are necessary.

---

# 7. Current RPC evolution

Keep `church_health_snapshot(...)` as the canonical secured summary contract, but evolve its definitions after Packages 1–5 land.

Current strengths to preserve:

- one permission gate;
- church-scoped query;
- bounded time window;
- formal member / attendee / guest separation;
- verified baptism/Holy Ghost counts;
- member-relationship confidence signal.

Current corrections needed:

### First Steps

Current RPC counts only `member_milestones.first_steps_status='completed'`.

Keep that as **verified First Steps milestone**, but add separate Learning evidence/pending-verification metrics so completed course credentials do not disappear.

### ESW

Add equivalent canonical ESW start/credential/verified metrics.

### Outreach

Replace “recent records” as the only reach signal with interaction/source/visit metrics once Package 1 creates canonical history.

### Groups

Current metrics count active groups and report rows. Expand to expected vs submitted/missing report behavior, attendance/guest trends and Package 3 lifecycle states.

### Serving

Align final definition with Serve package, not only accepted applications.

### Leadership

Add actionable pipeline/readiness signals after canonical leadership-development work is stable.

---

# 8. Simplified Health UI

The Health page should answer in this order:

## A. Needs Attention Now

Top of page. Small number of actionable queues with counts and safe direct links.

Examples:

- 8 overdue follow-ups;
- 1 milestone to verify;
- 2 groups missing this week’s report;
- 1 identity review needed.

Do not dump every zero-value category at the top.

## B. People & Connection

- Members / attendees / guest accounts;
- new/return guests;
- source funnel;
- follow-up completion/overdue.

## C. Discipleship Journey

- baptism/Holy Ghost verified;
- First Steps start / credential / verification;
- ESW start / credential / verification;
- Bible-study activity;
- people stalled / next-step gap.

## D. Friendship Groups

- participation;
- attendance;
- reporting consistency;
- guest movement;
- capacity/multiplication signals.

## E. Serve & Leadership

Only reliable configured signals; hide empty/unconfigured clutter during initial pilot.

## F. Trends

Simple time-window comparisons. Do not overwhelm a low-tech leader with a BI dashboard.

---

# 9. “Needs attention” severity

Avoid alarm fatigue.

Suggested simple levels:

- **Now** — genuinely overdue or unresolved operational item;
- **Soon** — approaching due date / follow-up window;
- **Watch** — trend/signal worth observing but no immediate action.

Do not label someone a spiritual risk or unhealthy person algorithmically.

Pastoral judgment stays human.

---

# 10. Empty / incomplete-data honesty

Health must distinguish:

- true zero;
- no data entered;
- feature not configured;
- permission-hidden;
- data still syncing/processing;
- read error.

Examples:

- `0 Friendship Group reports` with 2 active groups and an expected meeting is meaningful;
- `0 Timothys participants` when Timothys is not yet configured should be displayed as “Not configured,” not as ministry failure;
- a user without private-care permission should not see “0 private care items” if the real reason is “not authorized to view.”

Never turn a failed query into a false zero.

---

# 11. Church Health and Packages 1–5

## Package 1 — Evangelism

Supplies canonical contact, visit/source history, follow-up owner/due/status, Bible-study interactions and member linkage.

## Package 2 — Onboarding

Supplies canonical onboarding state, identity-review queue and returning-member review states.

## Package 3 — Friendship Groups

Supplies lifecycle, expected occurrences, official attendance/reporting, report actions/reviews, absence signals and multiplication indicators.

## Package 4 — My Journey

Defines source-aware unified member read behavior and next-step logic.

## Package 5 — Learning

Defines Learning credential evidence, canonical completion and milestone-verification synchronization.

Package 6 must consume those contracts. It must not independently invent replacements.

---

# 12. Implementation slices

## Slice A — metric contract reconciliation

- preserve current secured snapshot RPC;
- add source/evidence semantics from Packages 1–5;
- remove stale/ambiguous metric labels;
- add ESW and Learning pending-verification metrics;
- add tests proving formal Member vs attendee vs guest distinction.

## Slice B — permission-safe Leader Action Center

- build secured action-summary RPC(s)/view(s);
- return only action categories/records current caller is allowed to see;
- add direct safe resolution links;
- no sensitive-detail duplication.

## Slice C — merge `/church/analytics`

- move useful ministry pulse / funnel / Needs Attention behavior into Health;
- use shared canonical RPC contracts;
- bilingual critical UI;
- hide/redirect duplicate analytics route after equivalency verification.

## Slice D — trend aggregation

- canonical event-time queries;
- 7/30/90/365-day windows;
- simple comparisons/trend lines;
- no manual health-score storage.

## Slice E — pilot simplification

- hide unconfigured sections;
- show true empty vs not configured vs permission-hidden vs error;
- mobile/low-tech layout;
- EN/ES.

## Slice F — real-human verification

- Pastor/Admin;
- Outreach leader;
- Friendship Group leader;
- leadership viewer with limited capabilities;
- cross-church denial;
- exact Madera action counts reconcile to source records.

---

# 13. Explicit non-goals

- one global “church health score”;
- predictive spiritual judgment;
- AI deciding who is faithful/unfaithful;
- Finance data inside general Church Health without Finance permission;
- copying private pastoral text into dashboard action rows;
- a third analytics dashboard;
- a new reporting datastore for data already canonical elsewhere;
- district/network benchmarking before local pilot proof;
- advanced BI/export builder;
- automated leadership appointment;
- paid communication providers.

---

# 14. Acceptance criteria

## FUNCTIONAL

- one canonical Health route loads reliably;
- leaders see current metrics from canonical records;
- Needs Attention shows actionable counts/items;
- time windows work;
- action links open the correct underlying workflow;
- duplicate `/church/analytics` functionality is merged/redirected only after equivalency is proven.

## CONNECTED

- Outreach metrics come from Package 1 records/interactions;
- onboarding/identity-review signals come from Package 2;
- FG reporting/attendance/missing-report signals come from Package 3;
- Journey and Learning completion/verification states agree with Packages 4/5;
- care/serving/leadership links point to their canonical domains;
- no manually re-entered summary values are required.

## SECURE

- cross-church Health access denied;
- aggregate access follows approved leadership permissions;
- named action details obey underlying domain permissions;
- FG leader cannot use Health to browse unrelated Outreach/member/care records;
- private care/prayer text never leaks via general Health;
- Finance remains invisible without Finance authority;
- failed permission/read is not rendered as a misleading zero.

## SIMPLE

- top question answered: “What needs attention today?”;
- no duplicate dashboards in navigation;
- no magic score;
- obvious member/attendee/guest distinction;
- configured sections prioritized; empty future modules do not dominate;
- EN/ES critical states;
- phone/tablet usable.

## TESTED

Focused proof includes:

- formal Member/attendee/guest definitions;
- verified vs pending milestone counts;
- Learning credential vs milestone verification counts;
- first/return guest history once Package 1 exists;
- overdue/unassigned follow-up;
- missing/paused/cancelled FG report cases;
- action permission filtering;
- private-care denial;
- Finance leakage denial;
- cross-church denial;
- not-configured vs zero vs read-error states;
- trend window boundaries;
- `/church/analytics` equivalency before redirect;
- lint/build/security regression gate.

## VERIFIED

Real Madera exact-candidate proof:

- Pastor/Admin opens Health on phone in English and Spanish;
- displayed core counts reconcile to source records;
- overdue Outreach count opens the correct real people;
- pending milestone count opens the real review queue;
- group report status reflects real expected/submitted data after Package 3;
- Learning credential/pending-verification/verified state is not contradictory;
- limited leader sees only permitted actions;
- cross-church user is denied;
- zero/not-configured/error states are truthful;
- no duplicate primary analytics dashboard remains.

Only then is Package 6 VERIFIED / eligible for combined release handling.

---

# 15. Implementation path / Base44 credit decision

## Primary target

**Direct Next.js + Supabase.**

Reason:

- canonical Health RPC/data already live there;
- the most important work is permission-safe aggregation across canonical records;
- Base44 cannot become a second reporting authority;
- no greenfield builder work is necessary to start.

## Base44

Existing Base44 dashboards may be inspected for visual simplicity if useful, but **no new Base44 Builder prompt is required to begin Package 6 implementation**.

---

# 16. Planning-ready gate

- [x] Existing `/church/health` audited.
- [x] Existing `/church/analytics` audited.
- [x] Duplicate dashboard decision settled.
- [x] Current Health RPC/base definitions audited.
- [x] Live Madera planning counts checked read-only.
- [x] Canonical metric sources defined.
- [x] Learning evidence vs verified milestone distinction defined.
- [x] Package 1–5 interfaces defined.
- [x] Leader Action Center categories defined.
- [x] Aggregate vs named-action permission boundary defined.
- [x] Trend approach defined without new manual truth store.
- [x] Empty/not-configured/error honesty defined.
- [x] EN/ES/mobile simplicity defined.
- [x] Acceptance criteria written through VERIFIED.
- [x] Direct repo implementation path chosen.
- [x] Base44 credit gate resolved: no new prompt needed initially.
- [x] No live schema/RLS/data/deployment change performed during planning.

## Final Package 6 decision

**PACKAGE 6 IS PLANNING READY.**

Implementation should keep `/church/health` as the canonical bilingual leadership surface, merge the useful Needs Attention/ministry-pulse behavior from `/church/analytics`, consume canonical Packages 1–5 records, expose permission-safe named next actions, add trustworthy trends, and remove duplicate/ambiguous reporting definitions rather than creating another dashboard.
