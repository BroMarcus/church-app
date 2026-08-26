# Madera Pilot — Canonical Runtime & Data Authority

Decision date: 2026-08-26  
Status: **APPROVED — ARCHITECTURE LOCKED FOR MADERA PILOT**  
Production deployment: **HOLD**

## Decision

For the Madera New Life pilot, **Next.js + Supabase is the single canonical runtime and data authority for the shared pilot-core system**.

The connected Base44 Kingdom Network app remains valuable, but it is **not a second authoritative production datastore for Madera people, guests, groups, learning, Journey, or Church Health**.

Base44 is treated as a reusable implementation asset and reference for strong behavior, UX, low-tech/mobile patterns, bilingual flows, and already-developed workflow ideas. Those behaviors may be intentionally ported into the canonical Next.js/Supabase system.

## Why this decision exists

The pilot-core packages share the same humans and ministry events. If Evangelism writes one authoritative Guest in Base44 while Onboarding, Learning, Journey, or Church Health writes/reads separate authoritative Supabase records, Kingdom Network would have two sources of truth for the same person and the same ministry journey.

That would recreate the already-observed Learning-vs-My-Journey mismatch across the entire platform and would force ongoing cross-platform reconciliation.

The current evidence supports Next.js/Supabase as canonical because it already contains the more mature Madera tenant/RLS, Auth, Outreach automation, Learning engine/content, Church Health reporting, member records, events, and coordinated release/verification infrastructure.

## Rule that this supersedes

Package 0 previously said each pilot package must choose one Madera implementation target before coding. That rule remains useful for choosing **where implementation work is performed**, but it may not be interpreted to allow separate pilot-core data authorities.

The superseding rule is:

> **All shared Madera pilot-core records and cross-system facts converge on Next.js/Supabase. A package may use Base44 to prototype, inspect, or accelerate a bounded implementation, but Base44 must not become a parallel authoritative datastore for that shared workflow.**

## Canonical ownership

### Next.js / Supabase owns

- Auth identity and account recovery
- account-backed member identity
- church membership / relationship state
- private member details
- official verified milestones
- Outreach / pre-account guest history
- follow-up state and interactions
- Friendship Group membership, attendance, reporting and connected ministry events
- Learning progress, completion and credentials
- My Journey derived state
- Church Health / leadership reporting
- events and other pilot-core church-owned records
- authorization, RLS, tenant isolation and audit contracts

### Base44 may provide reusable behavior/reference

Examples already worth preserving include:

- Person-without-login concept for future/non-auth dependents
- source-aware church / Friendship Group / campaign invite patterns
- local QR generation and bilingual public connect-card UX
- normalized phone/email duplicate detection
- fail-closed ambiguous identity review
- retry-safe Guest → Follow-Up creation
- guest journey-stage UX and source analytics concepts
- New Life Friendship Group report modeling
- row-backed official attendance totals
- duplicate-report prevention
- submitted-report locking and correction audit patterns
- flagged visitor review and verified Follow-Up recovery
- slow-phone / uncertain-outcome / bilingual recovery patterns

These are **behavioral assets**, not permission to create a second Madera source of truth.

## Migration / reconciliation rule

Any real information that exists in Base44 but is not represented in canonical Supabase must follow an explicit reconciliation path:

1. Match to an existing canonical identity when safely possible.
2. Never create a duplicate person merely because Base44 has its own Person id.
3. Safe non-sensitive profile facts may be reviewed for carryover.
4. Conflicting facts require human review.
5. Baptism, Holy Ghost, training completion, leadership qualification, permissions, pastoral records, and other consequential facts may not silently overwrite canonical verified records.
6. Historical/source information should be preserved where useful and lawful rather than discarded.
7. Demo/test records are not migrated into real Madera records.
8. Base44 source data is retained until reconciliation is signed off; no destructive cleanup is part of this decision.

## Package implications

### Package 1 — Evangelism
Use `outreach_contacts` / related Supabase records as canonical. Preserve/port the strongest Base44 Package E invite, source, duplicate-safe capture, Follow-Up, and recovery behavior.

### Package 2 — Onboarding / Identity / Invitations
Use Supabase Auth + canonical member/profile/church-membership contracts. Reuse the useful Base44 non-auth Person/dependent concept as a design reference without creating a parallel account-backed Person authority.

### Package 3 — Friendship Groups
Use canonical Supabase group/attendance/report records. Preserve/port proven Base44 Package D certainty, idempotency, New Life report, guest-resolution, and mobile/EN-ES behavior.

### Package 4/5 — Journey / Learning
Use real Supabase Learning completion and verified milestone records. Resolve the existing completion-equivalency disconnect in one canonical system.

### Package 6 — Church Health
Read only canonical underlying Supabase records; do not reconcile live Base44 totals into a second health model.

## Base44 credit rule after this decision

Before spending a Base44 credit on pilot-core work, the request must be bounded and must answer:

- What exact canonical Next.js/Supabase outcome will this help produce?
- What existing Base44 behavior are we reusing instead of re-inventing?
- Why is Base44 materially faster/better for this bounded task?
- How will the result avoid creating a second authoritative datastore?

If those answers are not clear, do not spend the credit.

## Safety / deployment

This decision is architectural/planning only. It does not migrate, delete, merge, publish, deploy, change RLS, change Auth, or modify live production records.

Production remains **HOLD** until Marcus approves the coordinated combined deployment and required verification is complete.
