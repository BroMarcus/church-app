# Kingdom Network — Madera Pilot Planning-Ready & Fallback Rules

Prepared: 2026-08-26
Status: ACTIVE PLANNING GOVERNANCE
Applies to: Madera New Life pilot-core package preparation
Production: HOLD except critical security/reliability/auth/data-integrity fixes already allowed by the master plan

## Purpose

Remove judgment-call ambiguity from the September planning deadline and prevent Package 0 or any other package from expanding indefinitely.

A package is not "planning-ready" because the team feels good about it. It is planning-ready only when the checklist below is satisfied.

## Planning-ready checklist — required for every pilot-core package

A pilot-core package is PLANNING READY only when all of the following are true:

1. **Existing implementation mapped**
   - Relevant current routes, tables, RPCs, RLS/policies, components, open PR/workstream overlap, and reusable prior Kingdom Network assets are identified.
   - Each major existing piece is classified KEEP / CONNECT / REPAIR / SIMPLIFY / MERGE / HIDE / DEFER / REMOVE.

2. **Canonical data ownership settled**
   - The package states which canonical records it reads/writes.
   - It does not invent a duplicate Person/member/group/outreach/learning/care/finance/calendar/permission concept without explicit architectural approval.
   - Cross-system write expectations are named.

3. **Permissions and security defined**
   - Member, leader/assistant, pastor/admin, finance/platform scopes are defined where applicable.
   - Tenant/church isolation is preserved.
   - Sensitive data boundaries are explicit.
   - Fail-closed behavior is defined for auth/membership/RLS/read uncertainty.

4. **Dependencies and interfaces identified**
   - Upstream dependencies are named.
   - Downstream systems affected are named.
   - Required handoff contracts are explicit enough that another package does not have to guess.

5. **Human workflow and simplicity defined**
   - The real Madera user flow is written for the relevant roles.
   - Mobile-first and English/Spanish critical states are accounted for.
   - Loading, empty, error, retry, success, and no-dead-end behavior are included where applicable.

6. **Acceptance criteria written**
   - The package has concrete FUNCTIONAL -> CONNECTED -> SECURE -> SIMPLE -> TESTED -> VERIFIED acceptance criteria.
   - It includes the minimum real-user tests needed before READY FOR COMBINED DEPLOYMENT.

7. **Implementation path chosen**
   - The package says what should be done by direct repo work vs. Base44.
   - Any Base44 work has a bounded goal, reuse instructions, explicit non-goals, and a credit-saving batch strategy.

8. **Scope is bounded for pilot**
   - Required pilot scope is separated from designed-for-later scope.
   - New ideas that do not solve a pilot blocker are moved to Phase 2/backlog instead of expanding the package.

If any item above is missing, status is NOT READY and the missing item must be stated explicitly.

## Package 0 anti-stall rule

Package 0 is an inventory and contract-setting exercise, not a perfect documentation project.

Package 0 is DONE when it is sufficient to answer these questions safely:
- What existing systems are we reusing?
- What canonical Person/account/household and church-ownership model are we building on?
- What permission model is authoritative?
- What overlaps/duplicates must be merged, hidden, or deferred?
- What cross-system interfaces must the pilot-core packages honor?
- What is definitely in scope for Madera and what is not?

Package 0 is NOT required to:
- document every component line-by-line;
- fully redesign support-scope modules;
- solve Phase 2 architecture in detail;
- create speculative future schemas;
- perfect every naming inconsistency before implementation.

If further inventory work is not reducing implementation or security risk, stop.

## Deadline behavior

### August 31 — Package 0 deadline
If Package 0 is not perfect but the canonical identity, tenant ownership, permissions, overlap map, and pilot scope are sufficiently settled to prevent unsafe duplication, mark it PLANNING READY WITH OPEN NOTES and move on.

Only a true blocker may extend Package 0:
- unresolved canonical identity that would cause duplicate people;
- unresolved tenant/RLS boundary that risks cross-church leakage;
- conflicting authoritative permission systems;
- unknown production data ownership that makes implementation unsafe.

Cosmetic completeness, future-phase questions, or optional module inventory do not qualify for an extension.

### September 7 — pilot-core package deadline
Implementation start does **not** automatically slip because one package is late.

Use this rule:

- If a late package blocks the safe data contract or security of a ready package, shrink it to the minimum blocking contract and finish only that part before implementation.
- If it does not block another ready package, implementation begins on the ready packages while the late package is either:
  - reduced to minimum pilot scope,
  - moved to support scope,
  - hidden for pilot, or
  - deferred to Phase 2.

The default decision is **do not move the September 9 implementation start date**.

A schedule slip requires one of these reasons:
- critical security or tenant-isolation blocker;
- canonical Person/account conflict affecting multiple packages;
- production data-integrity risk;
- an unavoidable dependency that would cause near-certain rework if implementation started.

Any slip must be documented in the Control Room with the exact blocker and smallest safe new date.

## Decision authority

- ChatGPT is responsible for applying the planning-ready checklist objectively, identifying missing criteria, enforcing anti-stall rules, and recommending SHRINK / SUPPORT / HIDE / DEFER when a package is late.
- Marcus remains final decision-maker on product scope and may override a deferral or date change.
- Base44 does not decide package readiness or architecture. It implements bounded approved work.

## September 8 whole-system review

The review is a dependency and simplification pass, not a reopening of product ideation.

Allowed outcomes:
- keep as planned;
- merge overlapping package work;
- simplify a flow;
- cut a nonessential pilot feature;
- defer to Phase 2;
- identify a true implementation blocker.

Not allowed:
- adding unrelated new feature areas;
- reopening settled architecture without evidence of a real conflict;
- expanding support-scope modules just because they could be useful.

## Base44 go/no-go rule

Before a Base44 implementation request is sent, the package must be PLANNING READY under this document and the Base44 credit gate in the Madera New Life Pilot Master Plan must pass.

If direct repo work can safely accomplish the task with lower cost/less duplication, use direct repo work instead.

## Bottom line

The purpose of planning is to remove expensive uncertainty, not to achieve perfect documentation.

When planning stops reducing risk, implementation starts.
