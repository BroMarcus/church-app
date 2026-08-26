# Kingdom Network — Package 0: Pilot Inventory, Scope Freeze & Canonical Architecture

Started: 2026-08-26
Deadline: 2026-08-31
Status: IN PROGRESS — PLANNING ONLY
Deployment: HOLD

## Purpose

Package 0 exists to stop the Madera pilot from building on assumptions. It is not a feature build and it is not a complete documentation project. It ends when the project can safely answer the six bounded questions below and the pilot-core packages have enough shared contracts to proceed without predictable rework.

## Package 0 exit questions

1. What existing Kingdom Network systems are we reusing, repairing, simplifying, merging, hiding, deferring, or removing for the Madera pilot?
2. What is the canonical Person / auth account / church membership / household model?
3. Which role/capability and permission system is authoritative for member, leader, pastor/admin, finance, and platform access?
4. Where do duplicate, legacy, demo, or parallel concepts exist that could cause conflicting sources of truth?
5. How do the pilot-core packages exchange data without re-entry or unauthorized cross-system writes?
6. What is in Madera pilot scope, what remains support scope, and what is explicitly Phase 2?

When those six answers are sufficiently settled to reduce implementation risk, Package 0 ends even if additional documentation could still be written.

## Hard boundaries

- Planning only; no production data writes.
- No schema, RLS, RPC, Auth configuration, Finance ownership, or deployment changes in Package 0.
- Do not modify areas another Control Room workstream has claimed.
- Do not inventory every component merely for completeness.
- Do not design church #2, district/network UI, monetization, advanced AI actions, or Phase 2 features beyond preserving safe extension points.
- Security, identity, tenant ownership, and permissions are the areas where deeper inspection is justified.
- If further inventory is not materially reducing implementation/security risk, stop.

## Initial repository findings

### Existing pilot-facing foundations to preserve unless inspection proves otherwise

The current repository already contains substantial routes and domains rather than a blank app. Initial route inventory confirms existing areas for account/auth, business, calendar, church administration, content, directory, documents, feedback, forms, fundraising, groups, Guide/help, church health/analytics, invitations, and other church operations.

Within `/church`, existing route areas include analytics, audit, coordination, finance, forms, group growth, health, import, inbox, person invitations and invitation management, among others. Package 0 will classify these by pilot role rather than rebuilding them.

### Existing security/data-integrity work to preserve

Current migrations show prior hardening around:
- private member-detail isolation
- restricted SECURITY DEFINER execution
- tenant-scoped storage paths
- protected global profile/leadership updates
- enrollment-scoped learning progress
- privileged invitation-role preassignment prevention
- member/group/prayer/calendar foundations
- group-leader member-status controls
- group-scoped lesson authoring
- removal of broken legacy Friendship Group lesson behavior

These are evidence that the current system already has meaningful security and domain foundations. Package 0 must map and preserve them rather than invent replacement permission systems.

### Current coordinated release state

Control Room review on 2026-08-26 shows Draft PR #55 is the active combined V1 pilot reliability candidate. Its latest recorded exact head is `d334373216d9d1d5e331c353f0ed69ecfcb19c11`, with Kingdom Network Build #1102 passing dependency install, security/regression tests, lint, and the full Next.js production build. Production remains HOLD and exact-build real-phone English + Spanish acceptance is still required.

Package 0 does not replace, merge, or deploy that candidate. It treats verified work as an input to the inventory and avoids overlapping the active PR #55 reliability claim.

## Inventory decision taxonomy

Every relevant existing area receives one primary decision:

- KEEP — already suitable for pilot use with normal verification.
- CONNECT — useful and sound, but needs shared data/workflow integration.
- REPAIR — intended function is correct but incomplete/broken.
- SIMPLIFY — function is useful but the human experience is too complex.
- MERGE — overlaps another concept and should converge on one source of truth.
- HIDE — should not be exposed during the Madera pilot yet.
- DEFER — future-compatible but not needed for pilot proof.
- REMOVE — dead/demo/duplicate behavior that should not remain in the pilot path.

No item is rebuilt simply because a new package uses different wording.

## Working domain inventory — first pass

| Domain | Initial decision | Package 0 focus |
|---|---|---|
| Auth / login / recovery | KEEP + VERIFY | Preserve current hardened auth authority and same-account recovery behavior. |
| Public join / invitations / Start Here | KEEP + CONNECT | Feed Package 2; reconcile with canonical Person/account model, do not rebuild from zero. |
| Member / 360° member control | KEEP + CONNECT | Candidate leadership-facing source for Package 4; confirm canonical Person/member boundaries. |
| Outreach / Evangelism | REPAIR + CONNECT | Package 1 authority should extend current Outreach, not create a parallel contact system. |
| Friendship Groups | KEEP + REPAIR + CONNECT | Package 3 extends current group/attendance/report/prayer foundations and existing scoped permissions. |
| Learning | KEEP + REPAIR | Preserve courses/assessments/completion; pilot scope First Steps + ESW first. |
| Church Health / analytics | CONNECT + SIMPLIFY | Must read canonical records and surface action rather than duplicate summary entry. |
| Prayer / Private Care | KEEP + VERIFY | Preserve confidentiality boundaries; support scope unless a core workflow depends on it. |
| Calendar / scheduling | KEEP + SUPPORT SCOPE | Reuse foundation; do not let advanced scheduling block core pilot. |
| Serve / ministries | KEEP + SUPPORT SCOPE | Configure only what Madera needs after core paths are stable. |
| Forms / documents / office operations | CLASSIFY | Determine pilot minimum vs hidden/Phase 2; do not create duplicate finance/document systems. |
| Finance / fundraising | PROTECTED / SEPARATE OWNER | Do not modify in Package 0; only map boundaries and pilot visibility. |
| Business / district / network expansion | DEFER / PHASE 2 | Preserve extension points; not a Madera pilot blocker. |
| Kingdom Guide | KEEP + NARROW PILOT | Navigation/help/approved resources/next-step assistance; advanced operating AI later. |

These are provisional classifications until the relevant canonical contracts are checked. Package 0 is allowed to change a classification when evidence requires it, but not to expand the domain list for speculative features.

## Canonical contracts to settle before exit

### A. Human identity

Working rule: one human should have one canonical church-scoped Person/member identity independent of login credentials. Auth is an access account linked to the human record, not a second human record.

Need to confirm from the current implementation:
- authoritative profile/person table(s)
- relationship between auth user, profile/person, and `church_memberships`
- whether guest/outreach records already reference the same identity or require a safe handoff
- archived/returning-member behavior
- duplicate/merge authority and audit path

### B. Church / tenant ownership

Working rule: every church-owned record must resolve to one church/tenant, directly or through a safely scoped parent relationship. Madera-first does not justify global/unscoped member or ministry records.

Need to confirm:
- direct `church_id` ownership vs inherited ownership by membership/group/course/etc.
- public join lookup boundaries
- leader group scope
- sensitive care and exact-address boundaries
- any global/shared tables that could leak tenant-specific data later

### C. Roles and capabilities

Working rule: reuse the current authoritative role/RLS system. Package 0 must not create another permission layer.

Need to map:
- ordinary member permissions
- Friendship Group leader/assistant scope
- ministry/class leader scope
- Pastor / Church Admin distinction
- Finance permissions owned by the Finance workstream
- Platform/network owner scope
- which titles are display labels versus actual authority

### D. Cross-system event ownership

Pilot-core systems must exchange facts through canonical records/events rather than copying fields into parallel tables.

Target integration contract:
- guest capture -> canonical person/contact + source/history + follow-up
- onboarding/claim -> existing canonical person where verified
- FG attendance/report -> attendance/history + guest/evangelism + Bible-study/milestone/care suggestions with proper confirmation/verification
- learning completion -> canonical Journey/member progress
- Church Health -> derived/read model from underlying records, not manual duplicate totals

Consequential or sensitive writes must preserve verification and permission boundaries.

## Known coordination constraints

- Finance / Reporting / Multi-Church Licensing remains a separate claimed workstream. Package 0 maps that boundary only.
- Draft PR #55 currently owns combined V1 pilot reliability around auth/join/Guide/Start Here and must not be overwritten.
- Friendship Group implementation is not claimed by Package 0; only architecture/inventory is being prepared.
- Production deployment remains HOLD.

## Package 0 next inspection order

1. Canonical identity/member/account structures and current join/outreach handoff.
2. Role/capability/RLS authority map.
3. Friendship Group data and permission relationships.
4. Learning -> member/Journey relationships.
5. Church Health source-data map.
6. Support-scope classification for care/calendar/serve/forms/office/finance visibility.

Stop once the six exit questions are answerable with enough confidence to prepare the pilot-core packages safely.

## Package 0 completion gate

Package 0 is READY only when:
- the six exit questions are answered in this document or linked package artifacts
- canonical identity and tenant ownership are explicit
- authoritative permission/role boundaries are explicit
- pilot-core cross-system dependencies are mapped
- known duplicate/legacy risks are classified
- pilot vs support vs Phase 2 scope is explicit
- unresolved issues are listed as bounded implementation risks rather than hidden uncertainty
- no active workstream ownership was violated

Target completion remains 2026-08-31. The deadline is a scope-control mechanism, not an invitation to keep inventorying until then if the exit questions are settled earlier.
