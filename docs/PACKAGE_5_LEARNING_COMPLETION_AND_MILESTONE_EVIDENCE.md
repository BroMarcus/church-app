# Kingdom Network — Package 5: Learning Completion / Milestone Evidence

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 5 makes Learning, My Journey, the 360° Member Record, leadership qualification and Church Health agree on what “completed” means without erasing the difference between:

- completing a Kingdom Network course;
- earning a course credential;
- leadership verifying that course as the church’s official milestone;
- leadership accepting historical/external equivalent training;
- a member merely self-reporting prior completion.

The core rule is:

> **Learning evidence is objective course evidence. Church milestones are verified church facts. The system connects them, but does not pretend they are the same thing when church verification is still required.**

---

# 1. Existing Learning engine — KEEP

Current canonical Learning infrastructure already includes:

- `courses`
- `course_modules`
- `course_module_progress`
- `course_assessments`
- `assessment_questions`
- `assessment_attempts`
- `course_enrollments`
- `badges` / `member_badges`
- admin override evidence on enrollments
- server-side assessment grading
- server-side prerequisite enforcement
- course-passing-score enforcement
- course completion recalculation through `refresh_my_course_completion(...)`
- protection against members directly spoofing course progress/credentials

Do not create a second course-completion database.

---

# 2. Current live course checkpoint

## Effective Soul Winning

Live Madera state at Package 5 planning:

- published course
- 4 modules
- 3 required assessments
- all 3 required assessments published
- 1 required published final exam
- checkpoint 1: 6 questions
- checkpoint 2: 6 questions
- final exam: 20 questions
- current assessment audit says all three meet the required 5–10 checkpoint / 20–25 final standards
- 0 current enrollments / 0 credentials at the read-only checkpoint

### Conclusion

The Build Checklist item saying Effective Soul Winning still needs assessment expansion is **stale**. Before the checklist is marked complete, implementation verification should still prove the actual learner flow and source/content quality, but question-count expansion itself is no longer outstanding.

## First Steps

Live Madera state:

- published course
- 17 modules
- 18 required `course_assessments`
- question counts meet the current standard
- **0 required `course_assessments` are currently published**
- **0 published required final exams**
- 1 current enrollment
- 0 credentials

Under current `refresh_my_course_completion(...)`, a credential requires:

- all modules complete according to required-assessment/module rules;
- required published assessments passed;
- at least one required published final;
- final score meeting the course passing score.

Therefore the published First Steps course **cannot currently earn a normal Learning credential through the generic completion engine** while its required assessments/final remain unpublished.

---

# 3. First Steps has a second legacy/special assessment path

The live database also contains:

- `first_steps_assessment_submissions`
- `submit_first_steps_official_assessment(...)`
- `review_first_steps_official_assessment(...)`

This path accepts two manually reviewed checkpoint submissions with 20 / 21 required answers.

Current read-only checkpoint:

- 0 First Steps official-assessment submissions
- no current application-code caller was found in the repository search during planning

### Package 5 decision

Do **not** let this become a second independent First Steps completion authority.

Before implementation, classify it as one of:

1. **legacy/orphaned path to retire**, or
2. **supplemental instructor-reviewed evidence/practicum**, if church leadership still wants it.

The preferred pilot direction is:

- generic Learning course/assessment engine owns online course credentialing;
- any separate instructor-reviewed First Steps worksheet/checkpoint is supplemental evidence, not a competing credential engine;
- verified church milestone remains in `member_milestones` after leadership acceptance.

No existing table/function is deleted during planning. Removal/deprecation requires implementation review and migration safety proof.

---

# 4. Three layers of completion

Package 5 explicitly separates three layers.

## Layer A — Learning progress

Examples:

- enrolled
- module progress
- checkpoint attempt
- checkpoint passed
- final attempted/passed
- course credential earned

Authority: Learning tables/functions.

## Layer B — Completion evidence

Evidence answering **why** a church milestone might be accepted:

- Kingdom Network course credential
- documented historical/external completion
- authorized manual equivalency
- approved instructor-reviewed supplemental assessment/practicum
- legacy/import candidate awaiting review

Authority: a small canonical evidence/provenance contract.

## Layer C — Official church milestone

Examples:

- First Steps verified complete
- Effective Soul Winning verified complete
- Timothys verified complete
- Bible-study teacher approved

Authority: `member_milestones` / appropriate approved qualification domain.

A member cannot self-write Layer C.

---

# 5. Evidence/provenance contract

The current `member_milestones` row has statuses/dates and a row-level `verified_by`, but does not cleanly preserve **why each individual milestone is complete**.

Package 5 should add a reusable evidence model rather than dozens of one-off `*_source` columns.

Recommended concept: `member_milestone_evidence`.

Minimum fields:

- `id`
- `church_id`
- `user_id`
- `milestone_key`
- `evidence_type`
- `source_id` where applicable
- `source_label` / external description where applicable
- `status`: `pending | verified | rejected | superseded`
- `occurred_on` / completion date where known
- `created_by`
- `created_at`
- `verified_by`
- `verified_at`
- bounded review notes

Example `evidence_type` values:

- `kingdom_network_course_credential`
- `manual_historical_equivalency`
- `instructor_reviewed_assessment`
- `admin_course_override`
- `legacy_import_candidate`

Do not put pastoral/private case notes in this table.

## Uniqueness / idempotency

For deterministic system evidence such as a course credential, prevent duplicate evidence for the same member/course/credential occurrence.

Manual historical evidence may have more than one source but should be clearly auditable.

---

# 6. Course → milestone mapping

Do not hardcode every future church’s discipleship program directly into My Journey.

Package 5 should support a small church-scoped mapping between an approved course and the milestone it can satisfy.

Recommended concept: `learning_milestone_mappings`.

Fields/concepts:

- church
- course id
- milestone key
- active
- verification policy
- optional effective curriculum version

Verification policies:

- `leadership_review_required` — default for Madera pilot
- future `trusted_auto_verify` only if a church intentionally configures it and security/semantics support it

### Madera pilot

Recommended mappings:

- First Steps course → `first_steps`
- Effective Soul Winning → `soul_winning`

Both default to **leadership review required**.

That means earning a credential automatically creates trusted evidence / “ready for verification,” but does **not** silently set the official milestone complete.

---

# 7. Course credential rules

The generic Learning engine remains the authority for a Kingdom Network credential.

A learner earns the credential only through the existing protected recalculation logic when all required conditions are satisfied.

Do not allow:

- client-side `progress=100` to earn credential;
- direct member update of `credential_earned`;
- bypassing required assessments by editing module progress;
- unpublished/incomplete final requirements to accidentally count as complete;
- a Journey/milestone update to manufacture a Learning credential.

Leadership admin override remains available only through the existing audited course-override mechanism and must preserve override reason/actor/time.

---

# 8. Course credential → evidence → milestone flow

For a mapped course:

1. learner completes the Learning requirements;
2. `refresh_my_course_completion(...)` confirms `credential_earned=true`;
3. system creates/reuses deterministic `kingdom_network_course_credential` evidence;
4. My Journey displays **course complete — verification pending** if official milestone is not yet complete;
5. leadership 360° shows the evidence ready for review;
6. authorized reviewer accepts/rejects the evidence;
7. acceptance updates the corresponding official `member_milestones` field/date with audit/provenance;
8. My Journey displays **verified complete**;
9. Church Health uses the same distinction.

A retry cannot create duplicate evidence or duplicate milestone audit events.

---

# 9. Historical/manual equivalency

Real members may have completed First Steps, ESW, Bible college or other training before Kingdom Network existed.

Do not force them to retake a course merely so the software has data.

Authorized leadership can create a historical-equivalency evidence record containing:

- program/course name
- approximate/exact completion date when known
- source/document/reference when available
- reviewer
- reason/notes

On verification, the church milestone may become completed without manufacturing a Learning credential.

My Journey should display this distinctly as historical/verified completion.

## Founder reconciliation lock

For any Base44 → Supabase conflicting First Steps, ESW, training, Bible-study qualification, Timothys or leadership fact, **Marcus personally reviews and explicitly approves the specific reconciliation before the evidence or milestone is written canonically**.

No automatic migration acceptance.

---

# 10. First Steps implementation decision

Before publishing its 18 generic assessments, implementation must perform a content/flow verification pass.

Required checks:

- every required assessment maps to the intended module/class;
- checkpoint sequencing is correct;
- final is truly the intended final;
- passing score is correct;
- learner cannot bypass sequence;
- answers/explanations have been reviewed against the approved First Steps source/church teaching;
- question counts remain 5–10 per required class/checkpoint and 20–25 final;
- mobile EN/ES behavior is clear where translation exists;
- credential recalculation succeeds only after the intended complete sequence.

Do not publish all assessments merely because the counts are valid.

## Special First Steps assessment path

Because `first_steps_assessment_submissions` currently has no submissions and no located app caller, it should remain unused until explicitly reconciled.

Preferred implementation:

- either mark the special path deprecated/legacy after dependency proof, or
- repurpose it as optional instructor-reviewed supplemental evidence with a clear label.

It may not independently mark the course credential or official milestone complete without going through the new evidence/review contract.

---

# 11. Effective Soul Winning implementation decision

Question-count expansion is already satisfied.

Package 5 remaining ESW work is:

- verify learner sequence end-to-end;
- verify content/questions against the uploaded **ESW & Supplements 2024 — FINAL** source and approved church teaching;
- verify 80% or configured stricter passing rule;
- verify final locked until checkpoints pass;
- verify credential earned only after full requirements;
- map credential to `soul_winning` milestone evidence;
- keep Bible-study teacher approval separate from simply completing ESW.

## Bible-study teacher qualification

`member_milestones.bible_study_teacher_status` remains a separate qualification.

ESW completion may be required evidence, but it does not automatically mean “Approved Bible Study Teacher.”

Practicum/leadership approval remains a human-controlled qualification step.

---

# 12. Timothys and future courses

The same evidence/mapping system should support:

- Timothys
- School of Pastors
- Bible college
- safety training
- sexual-harassment training
- church-specific courses
- future multi-church curriculum mappings

Do not create a custom synchronization mechanism for every course.

Time-limited training can include expiration in its own official milestone/qualification record while the course credential itself remains historical evidence that training was once completed.

---

# 13. Member / leadership UX

## Member Learning Center

Show:

- current course
- progress
- next lesson/checkpoint
- locked reason
- final status
- credential earned

After credential:

> **Course complete. Your church milestone is awaiting verification.**

when review is required.

## My Journey

Uses Package 4 derived states:

- in progress
- course complete / verification pending
- verified complete
- historical equivalency verified

## Leadership 360°

Show:

- Learning scorecard
- credential evidence
- historical/manual evidence
- reviewer controls
- resulting verified milestone

Do not require leaders to manually compare multiple tabs and guess which is authoritative.

---

# 14. Church Health interface

Package 6 must distinguish:

- enrolled
- actively progressing
- credential earned
- milestone awaiting verification
- verified milestone complete
- historical equivalency complete

This allows questions such as:

- “How many people are currently in First Steps?”
- “Who finished the course but still needs leadership verification?”
- “How many members have verified First Steps completion?”

Do not collapse all three into one count.

---

# 15. Implementation slices

## Slice A — learning/evidence schema contract

- evidence table
- course→milestone mapping
- RLS/permissions
- idempotency
- audit rules.

## Slice B — completion evidence emission

- when canonical course credential is earned, emit/reuse evidence;
- do not auto-verify by default;
- retry-safe.

## Slice C — leadership verification workflow

- show pending evidence in 360° record;
- accept/reject;
- update milestone atomically/audited;
- no member self-approval.

## Slice D — My Journey synchronization

- Package 4 states consume Learning + evidence + official milestone;
- remove contradictory cards.

## Slice E — First Steps assessment reconciliation

- verify 18 generic assessments/content/sequence;
- reconcile/deprecate the special two-submission path;
- publish only after source/flow verification;
- prove credential end-to-end.

## Slice F — Effective Soul Winning proof

- no question-count rebuild needed;
- source/content verification;
- learner sequence/final/credential proof;
- milestone evidence mapping.

## Slice G — historical equivalency / reconciliation review

- leadership manual evidence;
- founder review lock for Base44 conflicts;
- no fake Learning credential.

## Slice H — exact-candidate human QA

- member learner
- teacher/reviewer
- Pastor/Admin
- Journey comparison
- Church Health dependency proof.

---

# 16. Explicit non-goals

- replacing the Learning engine
- letting member milestones mint credentials
- automatically verifying every course credential as a church milestone
- forcing historical members to retake training
- letting course completion appoint leaders
- auto-approving Bible-study teacher status
- auto-reconciling Base44 training conflicts
- publishing unreviewed First Steps tests merely because counts pass
- building the entire future course library in Package 5.

---

# 17. Acceptance criteria

## FUNCTIONAL

- required assessments gate correctly;
- final gate works;
- credential recalculation works;
- mapped credential creates one evidence row;
- leadership can verify evidence into official milestone;
- historical equivalency works without fake credential;
- Journey displays the correct combined state.

## CONNECTED

- Learning → evidence → milestone → Journey → Church Health uses one chain;
- First Steps and ESW use the same reusable mapping/evidence architecture;
- Bible-study teacher qualification remains separate;
- 360° Member Record shows evidence and official state.

## SECURE

- member cannot set credential/milestone/evidence verified;
- course progression protections remain;
- reviewer authority is church-scoped;
- cross-church evidence/milestone access denied;
- admin override stays audited;
- Base44 conflicts require Marcus approval before write.

## SIMPLE

- learner understands course progress;
- “course complete / verification pending” is clear;
- leadership has one obvious review action;
- historical completion does not force retaking;
- no contradictory Journey state.

## TESTED / VERIFIED

Prove:

- checkpoint pass/fail
- next-module lock
- final lock
- credential issuance
- duplicate/retry evidence idempotency
- leadership accept/reject
- historical equivalency
- member self-approval denial
- cross-church denial
- First Steps full intended sequence after publication decision
- ESW 6/6/20 learner flow
- Journey/360° consistency
- EN/ES critical states
- lint/build/security release gate.

Only then is Package 5 VERIFIED / eligible for coordinated release handling.

---

# 18. Implementation path / Base44 decision

**Primary target: Next.js + Supabase.**

No Base44 runtime or second Learning authority is needed.

Base44 may remain a UX/reference source only.

**No new Base44 Builder prompt is required to begin Package 5 implementation.**

---

# Planning-ready gate

- [x] Live Learning schema/functions inspected.
- [x] Credential authority confirmed.
- [x] Enrollment anti-spoof protection confirmed.
- [x] ESW live assessment standard audited: 6/6/20 and compliant.
- [x] First Steps live assessment publication gap identified.
- [x] Special First Steps submission path identified and bounded.
- [x] Evidence/provenance model defined.
- [x] Course→milestone mapping defined.
- [x] Historical equivalency defined.
- [x] Bible-study teacher qualification separated.
- [x] Founder conflict-review lock preserved.
- [x] Package 4/6 interfaces defined.
- [x] Acceptance criteria defined through VERIFIED.
- [x] No live schema/course publication/data/deployment change made during planning.

## Final Package 5 decision

**PACKAGE 5 IS PLANNING READY.**

The next implementation should keep the existing secure Learning engine, add reusable milestone evidence/provenance, make official milestone verification explicit, reconcile the unused First Steps special assessment path, verify/publish the intended First Steps assessment sequence, and treat ESW question-count expansion as already satisfied while still requiring source/content and end-to-end learner verification.
