# Madera New Life Pilot — Whole-System Reconciliation Review

Prepared: 2026-08-26  
Checkpoint target: 2026-09-08  
Status: **COMPLETE EARLY — READY FOR FOUNDER REVIEW / IMPLEMENTATION PREP**  
Production deployment: **HOLD**

## Why this review exists

The pilot-core packages were intentionally prepared before implementation so Kingdom Network could be evaluated as **one connected ministry system**, not as seven individually impressive but conflicting features.

This review asks:

- Do the packages share one canonical identity/data model?
- Does each fact have one authoritative owner?
- Do permissions line up across domains?
- Are there duplicate routes/tables/workflows that should be merged or hidden?
- Are the package dependencies ordered safely?
- Is there anything we should cut before implementation?

---

# 1. Planning checkpoint result

Required pilot-core planning set:

- Package 0 — Inventory + Canonical Architecture: **COMPLETE**
- Package 1 — Evangelism / Guest Stewardship: **PLANNING READY**
- Package 2 — Onboarding / Identity / Invitations: **PLANNING READY**
- Package 3 — Friendship Group Operating System: **PLANNING READY**
- Package 4 — Unified Member Record + My Journey: **PLANNING READY**
- Package 5 — Core Learning Completion + Milestone Evidence: **PLANNING READY**
- Package 6 — Church Health + Leader Action Center: **PLANNING READY**

Therefore the **2026-09-07 planning-ready deadline is met early**.

---

# 2. Canonical architecture — PASS

The packages now agree on one Madera runtime/data authority:

> **Next.js + Supabase owns canonical pilot-core records. Base44 remains reusable behavior/UX/reference, not a parallel production authority.**

## Canonical human/relationship model

- Auth UUID — account-backed identity
- `profiles` — public/member-facing profile
- `member_private_details` — protected personal/contact data
- `church_memberships` — church relationship, base access state, lifecycle
- `outreach_contacts` — pre-account guest/prospect history
- household domain — family relationships / no-account dependents
- `member_milestones` — official verified church milestones
- Learning tables — course/module/assessment/credential evidence

No package introduces a second general Person/Guest/Member authority.

---

# 3. Cross-package ownership contract

## Identity / Guest

### Package 1 owns

- guest/prospect capture
- original source
- attributed visit/touch history
- follow-up owner/due/history
- Bible-study Outreach interactions

### Package 2 owns

- account creation/verification
- account-to-existing-history claim/link
- invitation/account onboarding
- household/no-account family relationship claim
- returning inactive account restoration request

### Boundary

Guest capture never requires account creation. Account creation never erases Outreach history.

---

## Friendship Groups

### Package 3 owns

- group lifecycle
- roster/join/transfer
- protected exact location
- official attendance
- weekly report
- report downstream action ledger
- group-level missing-report/absence/multiplication signals

### Boundary

Package 3 does not create independent Guest people. It calls Package 1’s duplicate-safe guest/visit contract.

Package 3 can report baptism/Holy Ghost, but official verification remains in `member_milestones`.

---

## Learning / Journey

### Package 5 owns

- canonical Learning engine evidence
- module/checkpoint/final requirements
- credential issuance
- historical/manual-equivalency evidence rules
- source-aware synchronization into official milestone verification workflow

### Package 4 owns

- unified member-facing/leadership read model
- next-step interpretation
- human-readable distinction between self-report, Learning evidence, verification pending and verified church record

### Boundary

My Journey does not calculate a second course-completion truth.

---

## Church Health

### Package 6 owns

- secured aggregation
- trend views
- permission-safe named action queues
- one canonical leadership health surface

### Boundary

Church Health does not write source ministry facts and does not keep a manual duplicate metrics database.

---

# 4. Implementation dependency order

Package numbers describe planning scope, not a requirement to implement numerically.

The safer implementation order is:

1. **PR #56 — secure Outreach account claim hotfix**
2. **Package 1 — Evangelism / Guest Stewardship**
3. **Package 2 — Onboarding / Identity / Invitations**
4. **Package 3 — Friendship Group Operating System**
5. **Package 5 — Core Learning completion/evidence**
6. **Package 4 — Unified Member Record / My Journey**
7. **Package 6 — Church Health / Leader Action Center**

## Why Package 5 precedes Package 4 implementation

My Journey consumes Learning evidence. Finalizing Learning’s course/equivalency contract first prevents Journey from being implemented against a temporary completion definition and immediately rewritten.

The original founder roadmap remains intact; this is a technical dependency refinement, not a product-direction change.

---

# 5. Shared-permission coordination risk

## Current issue

Finance / Reporting / Multi-Church Licensing still has an active Control Room claim over:

- `church_roles`
- `church_role_assignments`
- finance permission helpers/RLS
- overlapping shared role/RLS areas.

Package 1 and Package 2 require permission/security repairs, but they must **not** create a second role system or overwrite Finance work.

## Implementation rule

Where possible:

- use existing `current_user_has_church_permission(...)` / private permission helpers;
- change only domain-specific Outreach/onboarding policies/functions;
- do not modify `church_roles` / `church_role_assignments` without coordination;
- if a shared helper change is genuinely necessary, stop that slice and coordinate through Control Room while continuing non-overlapping package work.

This does **not** move the implementation start date. It only gates the overlapping slice.

---

# 6. Duplicate/competing systems to merge or retire

## Church Health

- KEEP `/church/health`
- MERGE useful `Needs Attention` / ministry pulse behavior from `/church/analytics`
- HIDE/REDIRECT `/church/analytics` after equivalency proof

Do not maintain both as separate authorities.

## First Steps completion

- KEEP generic Learning course/assessment/credential engine as preferred credential authority
- treat separate `first_steps_assessment_submissions` manual-review path as LEGACY/SUPPLEMENTAL until explicitly justified
- do not let both independently mean “First Steps complete.”

## Spiritual milestones

- KEEP `member_milestones` as official verified authority
- do not reuse legacy duplicate baptism/Holy Ghost fields in `member_private_details` as canonical
- self-report/pending reports remain evidence, not verified truth.

## Base44

- KEEP proven behavior as reference
- do not continue parallel Madera production records there for pilot-core facts.

---

# 7. Pilot scope cuts / bounded support scope

These existing/future areas must not delay pilot-core implementation.

## KEEP / SUPPORT — do not expand broadly now

### Prayer / Private Care
Keep existing hardened privacy/care foundation and connect Package 3 routing where needed. Do not redesign the whole pastoral-care product during pilot-core build.

### Events / basic calendar
Keep existing working event/calendar foundation. Full scheduling/conflict/task operating system remains later unless real pilot use blocks leaders.

### Kingdom Guide
Keep the current narrow navigation/trusted-resource assistance needed for pilot. Full autonomous/voice operating layer remains later.

### Community / Announcements
Keep only stable existing functionality. No new social-network scope during pilot-core implementation.

## HIDE / DEFER if unconfigured or empty

- advanced Serve/Teams workflows beyond pilot need
- Forms/Workflow builder if no real Madera process depends on it yet
- Member Document Vault expansion
- Business Partners expansion
- advanced fundraising surfaces
- receptionist-office expansion
- broad official-record office system beyond records required by pilot
- complex cleaning/operations scheduling
- district/network collaboration
- church #2 provisioning UX

The underlying future-capable architecture remains. The pilot UI should not display impressive empty modules that confuse leaders.

## FINANCE

Finance remains isolated and separately owned. It does not block pilot-core implementation and cannot be modified casually by this workstream.

---

# 8. Base44 credit decision across pilot core

Packages 1–6 all reached the same conclusion:

> **No new Base44 Builder prompt is required to begin initial implementation.**

Reason:

- canonical records and server security live in Next.js/Supabase;
- the current gaps are mostly integration, security, reliability and simplification;
- existing Base44 Package C/D/E work already provides the behavioral reference worth preserving.

Base44 credits are reserved for a bounded task only when it is demonstrably faster/better and the result will still land in the canonical system.

---

# 9. Security gates across implementation

Every package must pass before moving to VERIFIED:

- tenant isolation
- least-privilege role/capability access
- no phone-only/ambiguous identity claim
- no self-granted privileged role
- no private home-address leak
- no pastoral/private-care leak
- no self-issued verified milestone/credential
- no silent partial report write
- no false success/false empty on backend failure
- EN/ES critical recovery
- mobile real-human flow
- automated test/lint/build release gate.

Security is not deferred to a final package.

---

# 10. Implementation batch strategy

Avoid one giant months-long branch and avoid deploying after every small fix.

Recommended:

## Batch A — Front Door / Identity

- PR #56 hotfix
- Package 1
- Package 2

Verify the real flow:

**guest captured → follow-up → account claim → Start Here → same human/history**

## Batch B — Friendship Group ministry engine

- Package 3

Verify:

**join → roster → attendance → report → guest/follow-up → milestone/prayer/action routing**

## Batch C — Learning / Journey truth

- Package 5
- Package 4

Verify:

**course progress → credential evidence → church verification/equivalency → My Journey / 360° agreement**

## Batch D — Leadership visibility

- Package 6

Verify:

**canonical records → truthful metrics/trends → named permission-safe action queues**

Each batch may be READY FOR COMBINED DEPLOYMENT while production remains HOLD until Marcus approves the coordinated release.

---

# 11. Sep 7 / 8 / 9 checkpoint status

## Sep 7 — all pilot-core package specs planning-ready

**PASS EARLY — achieved 2026-08-26.**

## Sep 8 — whole-system reconciliation

**PASS EARLY — this document.**

No unresolved architecture contradiction currently requires moving the implementation date.

## Sep 9 — implementation start

**READY TO START ON OR BEFORE THE DEADLINE once the pre-implementation security gate is handled.**

PR #56 is the only intentionally elevated pre-package hotfix. It must receive founder review/approval before merge/production apply.

Non-overlapping implementation prep/work may continue while shared role/RLS coordination remains gated.

---

# 12. Go / no-go conclusion

## Architecture
**GO**

## Pilot-core package planning
**GO**

## Whole-system compatibility
**GO**

## Base44 credit strategy
**GO — direct repo first; no new Base44 credits required initially**

## Production deployment
**NO-GO / HOLD** until explicit Marcus approval and verified release candidate.

## Immediate implementation prerequisite

**PR #56 security hotfix requires exact-change/test walkthrough and Marcus approval before merge/apply.**

After that gate, implementation begins in the dependency order defined above without reopening broad product planning.
