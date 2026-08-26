# Kingdom Network — Package 4: Unified Member Record / My Journey

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 4 makes every authorized Kingdom Network screen tell the same story about one member without creating a new “master profile” table.

The member-facing question is:

> **Where am I in my journey, what has actually happened, and what should I do next?**

The leadership-facing question is:

> **What is this person’s verified church record, current engagement, training, group/serving history, and next ministry need?**

Both views must read the same canonical facts with different permission scopes.

This package preserves the existing 360° Member Record already implemented and READY FOR COMBINED DEPLOYMENT. It does not replace that workstream.

---

# 1. Existing canonical facts — KEEP

## Identity / profile

- Supabase Auth UUID — account-backed identity
- `profiles` — member-facing identity/profile
- `member_private_details` — protected contact/address/birthday/anniversary information
- `church_memberships` — church relationship, base access, relationship state/source, title

## Spiritual / discipleship record

- `member_milestones` — official verified baptism, Holy Ghost, First Steps, ESW, Timothys, training and other church-record milestone snapshot
- `reported_milestones` — pending leader-reported baptism/Holy Ghost events awaiting verification

## Learning

- `course_enrollments`
- `course_module_progress`
- `assessment_attempts`
- `member_badges`
- course/admin override evidence

## Friendship Groups

- `group_memberships`
- `group_report_attendance`
- group history / report records

## Evangelism / outreach

- `outreach_contacts`
- `outreach_interactions`
- canonical historical source/follow-up record

## Ministry / serving / leadership

- ministry applications / team assignments
- current church role/permission assignments
- `leadership_development_reviews`
- related audited leadership records

## Prayer / care / documents / business / schedule

Existing domain tables remain the authority for their own data. Package 4 does not copy them into a giant member row.

---

# 2. Current implementation finding

The existing member-facing `/journey` and leadership 360° Member Record already share `member_milestones` for verified spiritual/training facts.

That is good and should be preserved.

The main inconsistency is **not identity**. It is **derived status/provenance**.

Example:

- Learning can show that a First Steps course credential was earned;
- `member_milestones.first_steps_status` may still say `not_started` until leadership verifies/accepts it;
- My Journey currently decides Foundation completion from the milestone field;
- the Learning Scorecard separately shows the course credential and tells leadership it is ready for verification.

Those facts are not necessarily contradictory, but the UI currently makes them look contradictory.

Package 4 fixes the read contract. Package 5 fixes Learning/milestone synchronization/evidence.

---

# 3. One-record principle

Do **not** create a new canonical `person`, `member_master`, `journey_status`, or duplicated “summary” datastore that becomes another write authority.

Instead:

1. each domain keeps its canonical fact;
2. Package 4 defines one reusable **member journey read contract**;
3. that contract derives human-readable states from canonical facts;
4. member and leadership UIs render different authorized subsets of the same contract;
5. Church Health later aggregates those same facts rather than reading a second manually-maintained summary.

Implementation may use a reusable server helper and/or secured database view/RPC where beneficial, but it must remain **derived**, not a second write authority.

---

# 4. Canonical journey state vocabulary

For any milestone/training item, avoid only `done / not done` when the underlying evidence is richer.

Useful derived display states:

- `not_started`
- `in_progress`
- `course_completed_pending_verification`
- `verified_completed`
- `historical_equivalency_verified`
- `self_reported_pending_review`
- `reported_event_pending_verification`
- `waived` where church policy permits
- `expired` for time-limited safety training
- `not_applicable` where appropriate

These are **derived/display states**. Do not casually add all of them as competing status columns to every table.

---

# 5. New Birth read contract

## Baptism

Canonical official facts:

- `member_milestones.baptized`
- `baptism_date`
- date precision
- officiant/church/pastor details where authorized

Possible additional evidence:

- member self-report from Package 2
- pending `reported_milestones`
- legacy/Base44 reconciliation candidate

Member-facing Journey should distinguish:

- Verified baptism
- Reported / awaiting verification
- Self-reported / awaiting review
- Not recorded / unsure

Leadership 360° may see the review evidence according to permission.

No Base44 conflict is reconciled automatically; Marcus personal approval is required per the Founder Review Lock.

## Holy Ghost

Same pattern:

- verified official record
- reported pending verification
- member self-report pending review
- not recorded / unsure

Do not collapse “not verified” into “No” unless an authorized record explicitly says No.

---

# 6. Learning / training read contract

For each church-recognized training milestone such as First Steps or Effective Soul Winning, Package 4 renders at least two concepts:

### Learning evidence

- not enrolled
- enrolled/in progress
- credential earned in Kingdom Network
- historical/manual course-equivalency evidence

### Official church milestone

- not verified
- verified complete
- waived/equivalent where church policy permits

Member-facing wording should be human and non-confusing.

Example when credential exists but milestone is not yet verified:

> **First Steps course complete — church verification pending**

Do not show “Not started” in that case.

When both are complete:

> **First Steps — verified complete**

When leadership manually verifies prior historical completion:

> **First Steps — historical completion verified**

Package 5 owns the actual evidence/mapping/sync mechanics.

---

# 7. Friendship Group / belonging read contract

My Journey should distinguish:

- current active Friendship Group
- role in current group
- pending join request
- transfer pending
- former group history
- attendance history
- visitor attendance in another group

Current “any `group_memberships` row means Connection complete” is too simple once transfers/archive/history exist.

Derived connection state should prefer **current active membership** while preserving former group history in details.

Do not expose another group’s private home address through Journey history.

---

# 8. Evangelism / connection history

A member who began as a guest keeps that historical Outreach record after account linking.

Member-facing Journey may show a gentle connection history such as:

- first connected date/source when appropriate
- Friendship Group connection
- Bible-study history
- invitations/next steps relevant to the person

Do not expose staff-only notes, internal follow-up comments, private pastoral details, or another person’s referral metadata.

Leadership 360° may see broader ministry history only according to Outreach/member-management permission.

---

# 9. Serving / ministry read contract

Distinguish:

- ministry interest/application
- accepted service role
- active assignment
- former service history
- qualifications still needed

A member should not appear “Serving complete” merely because a stale application exists.

Current Journey logic can continue to use accepted application/active assignment as evidence, but Package 4 should define which records count as current vs historical.

---

# 10. Leadership development read contract

Do not equate a title, course completion, or “potential leader” nomination with actual leadership authority.

Member-facing Journey may show:

- Timothys / leadership training progress
- approved development track
- qualifications complete/missing where appropriate

Leadership 360° may show:

- leadership-development review state
- pastoral approval status
- faithfulness review
- track
- current functional permissions/roles

Software never appoints a leader.

---

# 11. Profile / household read contract

Package 2 owns household/no-account-family mechanics.

Package 4 shows:

- member-editable profile facts
- protected private facts only to the owner/authorized leader
- household relationships appropriate to the viewer
- no automatic unrestricted adult-to-adult private-data sharing

A member can update permitted profile information without gaining authority to edit verified church records.

---

# 12. “What should I do next?” logic

My Journey should not use a rigid universal checklist that treats every person identically.

Use canonical facts to recommend one useful next action.

Pilot priority examples:

1. incomplete onboarding/profile when it blocks useful ministry connection;
2. unresolved baptism/Holy Ghost self-report/verification need;
3. First Steps not begun/in progress;
4. no Friendship Group connection;
5. ESW / Bible-study training;
6. serving/ministry discovery;
7. leadership development when appropriate;
8. current unfinished course or assigned ministry action.

The order may be church-configurable later, but Madera gets a clear initial pathway.

Never imply spiritual worth is a score.

---

# 13. Member-facing vs leadership-facing views

## Member-facing My Journey

May show:

- own profile
- own verified milestones
- own self-reports/pending review states
- own course progress/credentials
- own group/attendance history
- own ministry/service history
- own prayers/history according to privacy
- own next step

Must not show:

- private leadership notes
- other people’s data
- internal pastoral review notes
- hidden role/security data beyond appropriate display

## Leadership 360° Member Record

Preserve current READY FOR COMBINED DEPLOYMENT implementation.

May show additional authorized domains such as:

- verified record editing
- course override/evidence
- group/service history
- business/document/leadership panels
- member audit history

Authority remains governed by existing permissions/RLS.

Package 4 should reuse its components/data contract where practical rather than build a competing record center.

---

# 14. Global people search

The Build Checklist requires fast people search by useful ministry facts.

Package 4 scope includes the **search contract**, but not a giant search-engine project.

Pilot filters should support, where authorized:

- name
- phone/email for appropriate staff
- relationship status
- Friendship Group
- ministry/service
- First Steps / ESW / Timothys status
- baptism / Holy Ghost verification status
- Bible-study teacher qualification
- onboarding/review needs

Search results must obey the same privacy/tenant rules as opening the underlying member record.

Do not index confidential pastoral-case text into broad people search.

---

# 15. Provenance / evidence requirement

Package 4 requires Package 5 to preserve **why** a training milestone is considered complete.

Minimum provenance concepts:

- Kingdom Network course credential
- leadership-verified historical/manual equivalency
- leadership manual correction
- reported event awaiting verification
- legacy/import candidate awaiting review

A single `completed` flag with no source is not enough for long-term multi-church use.

This provenance should be reusable for future Timothys, Bible college, safety training and church-specific classes.

---

# 16. Church Health interface

Package 6 should aggregate the same derived canonical states used by My Journey.

Examples:

- First Steps enrolled vs credential earned vs verified complete
- ESW enrolled vs credential earned vs verified complete
- baptism/Holy Ghost reported vs verified
- active group membership vs historical group membership
- serving interest vs active assignment
- leadership training vs actual approved leader

Do not have Church Health invent separate completion definitions.

---

# 17. Implementation slices

## Slice A — shared journey read contract

- inventory facts currently rendered by `/journey` and 360° Member Record;
- define canonical source for each displayed field;
- centralize derived state logic;
- remove contradictory “not started” displays where stronger evidence exists.

## Slice B — New Birth/self-report/reported-event states

- verified vs self-reported vs pending reported milestone;
- safe member-facing wording;
- no automatic conflict reconciliation.

## Slice C — Learning milestone evidence display

- consume Package 5 training evidence/provenance;
- show credential pending verification distinctly;
- show historical equivalency distinctly.

## Slice D — current vs historical group/service relationships

- active current relationship drives current state;
- historical records remain visible in detail.

## Slice E — next-step engine

- one clear next action;
- contextual rather than generic percentage-chasing;
- bilingual EN/ES.

## Slice F — people search contract / leadership integration

- add authorized filters without exposing protected fields;
- reuse 360° Member Record route as the leadership destination.

## Slice G — real-human verification

- member self-view
- leader/admin 360° view
- bilingual phone flow
- compare the same person across Journey, Learning, Groups and leadership record for consistency.

---

# 18. Explicit non-goals

- new universal Person/member-master datastore
- copying every domain table into a Journey table
- one “discipleship score”
- exposing confidential pastoral notes in Journey/search
- automatically approving leadership
- automatically reconciling Base44 spiritual/training conflicts
- replacing the existing 360° Member Record
- rebuilding Package 2 identity or Package 3 groups.

---

# 19. Acceptance criteria

## FUNCTIONAL

- member sees one coherent Journey from canonical records;
- leadership sees the same verified facts in 360° record;
- course credential pending verification is not shown as `not_started`;
- reported baptism/Holy Ghost is not shown as verified;
- current group is distinct from former group history;
- active serving is distinct from old applications;
- next step changes from real data.

## CONNECTED

- Package 1 Outreach history survives into member context after linking;
- Package 2 self-report/onboarding state appears correctly;
- Package 3 group attendance/history appears correctly;
- Package 5 Learning evidence maps correctly;
- Package 6 can reuse the same definitions.

## SECURE

- member sees only own authorized records;
- group/outreach/private/pastoral records respect their own scopes;
- leadership 360° remains manage-members protected;
- people search does not leak private contact or care data;
- cross-church access denied;
- no Journey UI grants authority.

## SIMPLE

- member can answer “where am I?” and “what’s next?” without understanding internal tables/statuses;
- pending verification is understandable;
- no contradictory cards;
- EN/ES critical states;
- no giant profile-completion nagging.

## TESTED / VERIFIED

Prove on the exact candidate:

- no-record member
- partially onboarded member
- First Steps enrolled but not complete
- credential earned but milestone pending
- historical/manual equivalency
- verified baptism/Holy Ghost
- pending reported milestone
- active group vs former group
- active serving vs old application
- leader-development state
- member cannot access leadership-only record
- cross-church denial
- EN/ES phone flow
- lint/build/security regression gate.

Only then is Package 4 VERIFIED / eligible for coordinated release handling.

---

# 20. Implementation path / Base44 decision

**Primary target: Next.js + Supabase.**

Base44 may inform member-profile/Journey UX ideas, but no new Base44 data authority is needed.

**No new Base44 Builder prompt is required to begin Package 4 implementation.**

---

# Planning-ready gate

- [x] Existing My Journey implementation inspected.
- [x] Existing 360° Member Record inspected/preserved.
- [x] Canonical source table mapped by domain.
- [x] No-new-master-table rule locked.
- [x] Learning-vs-milestone mismatch isolated.
- [x] Pending/self-report/verified states defined.
- [x] Group/service current-vs-history distinction defined.
- [x] Next-step contract defined.
- [x] People-search boundary defined.
- [x] Package 1/2/3/5/6 interfaces defined.
- [x] Founder conflict-review lock preserved.
- [x] Acceptance criteria defined through VERIFIED.
- [x] No live data/schema/RLS/deployment change made during planning.

## Final Package 4 decision

**PACKAGE 4 IS PLANNING READY.**

The unified member record is not a new table. It is one consistent, permission-aware read contract across canonical Supabase facts, with the existing 360° Member Record preserved as the leadership control center and My Journey as the member-facing roadmap.
