# Kingdom Network — Madera Pilot Post-Implementation Phases

Prepared: 2026-08-26
Status: PLANNING READY
Deployment: HOLD until Marcus approves the coordinated production release.

## Purpose

Define what happens after the September 9 implementation start so Kingdom Network does not drift from implementation into an open-ended pilot, then into uncontrolled feature expansion.

The governing principle remains: prove Madera New Life first, use real evidence, then expand.

## Phase A — Pilot-Core Implementation

Target start: 2026-09-09.

Implement the pilot-core packages in dependency order. Each package must satisfy its own planning-ready contract before implementation and its own acceptance criteria before being marked VERIFIED.

Core sequence:
1. Evangelism / Guest Stewardship Completion
2. Onboarding + Identity + Invitations
3. Friendship Group Operating System
4. Unified Member Record + My Journey
5. Learning / New Life Discipleship Pilot
6. Church Health + Leader Action Center

Package 0 — Pilot Inventory, Scope Freeze & Canonical Architecture — is a planning prerequisite, not an implementation feature package.

Every implementation package must pass:
FUNCTIONAL -> CONNECTED -> SECURE -> SIMPLE -> TESTED -> VERIFIED.

Security, tenant isolation, permissions, duplicate-person protection, error states, EN/ES critical paths, and mobile usability are package-level gates, not end-of-project cleanup.

## Phase B — Real Human Madera Pilot

Start only after the coordinated pilot candidate is verified, deployed with Marcus approval, and ready for real leadership use.

Recommended fixed evaluation window: 4 weeks of real church use.

During this window:
- no uncontrolled feature expansion
- critical security/data-integrity/permission/reliability defects are fixed immediately
- serious usability blockers are fixed when they prevent the intended workflow
- non-blocking feature requests go to backlog
- repeated confusion is treated as a product signal, not user error

### Pilot success signals

The pilot is intended to prove that real Madera leaders and members can use the system without the project team manually carrying every workflow.

Evidence should include:
- leaders consistently submit Friendship Group attendance/reports
- guest capture leads to assigned follow-up and visible outcomes
- first-time and return guests are tracked without duplicate Person records
- members can sign up/join/claim existing records without duplicate accounts
- core EN/ES flows do not dead-end
- leaders can identify overdue follow-up and missing reports
- member/Journey data updates consistently from authorized upstream workflows
- First Steps / Effective Soul Winning progress is dependable
- role, tenant, pastoral, address, and private-care boundaries hold
- users can recover from ordinary loading/read/write failures without false success or false empty states
- there are no unresolved high-severity production security or data-integrity incidents

## Phase B Feedback Channel and Triage

All pilot feedback must land in one tracked queue rather than scattered texts/chats.

Each item is triaged into:
- P0 Critical: security, privacy, permission, data loss/corruption, duplicate identity, broken auth, or workflow impossible to complete
- P1 Pilot Blocker: major usability/reliability problem that prevents normal ministry use
- P2 Improvement: useful but does not block the pilot
- Backlog / Phase 2: new feature or extension not needed to prove the Madera core

P0 and P1 may enter the active pilot fix queue. P2 and Phase 2 do not automatically interrupt the pilot.

## Pilot Proven Gate — Phase B to Phase C

The move from Phase B to Phase C requires BOTH the fixed evaluation window and this gate. Calendar alone is not enough, and the gate cannot be used to extend the pilot indefinitely.

A Madera pilot is PILOT PROVEN when all of the following are true:

1. Four-week pilot window completed, unless Marcus explicitly ends it earlier for a verified reason.
2. No open P0 security/privacy/data-integrity blocker.
3. No recurring P1 blocker prevents the primary guest, member, FG leader, class/ministry leader, or pastor/admin journeys.
4. Core workflows show real repeated use, not one successful demo.
5. Duplicate-account/person incidents are absent or contained by a verified recovery process.
6. Permission and tenant-isolation checks remain clean on the deployed pilot build.
7. English and Spanish critical flows have real-phone evidence.
8. Feedback has been triaged, and remaining requests are classified as P2, KEEP/REPAIR/HIDE, or Phase 2 rather than being left ambiguous.
9. Marcus confirms the system is useful enough to continue operating at Madera while the next phase is planned.

If the four-week window ends and the gate is not met:
- do not open broad feature work
- identify the smallest set of unresolved P0/P1 causes
- run a bounded stabilization extension with explicit exit criteria
- do not restart architecture or reopen settled pilot scope unless the failure proves a foundational defect

## Phase C — Evidence-Based Support-Scope Decisions

After the Pilot Proven Gate, revisit all support-scope areas using actual usage evidence.

Examples:
- Prayer / Private Care / Community
- Calendar / Events / My Schedule
- Serve / Ministries
- Reception / Official Records
- Finance / Fundraising
- Kingdom Guide pilot boundary
- Madera operational configuration

For each area, decide:
- KEEP as-is
- REPAIR now
- SIMPLIFY
- HIDE
- DEFER to Phase 2
- PROMOTE into next active roadmap because the pilot proved it is necessary

Do not work straight down the old package list by number if pilot evidence points elsewhere.

## Phase D — Complete the Remaining Original Roadmap

After the Madera foundation is proven, continue the original strategic roadmap areas that depend on trustworthy core data.

Priority candidates:
- Leadership Development / Timothys
- deeper Serve / leadership pipeline
- full Calendar / scheduling / conflict reduction where still incomplete
- broader Kingdom Guide / AI operating layer

The AI layer should expand only on top of reliable records and permissions. Consequential AI actions continue to require appropriate confirmation.

## Phase E — Expansion Decision

Only after Madera is Pilot Proven and the post-pilot support scope is stable should Kingdom Network consider the next expansion milestone.

Possible choices:
- second-church pilot
- multi-church setup/tenant hardening beyond the Madera proof
- sellable/licensable SaaS preparation
- district/network collaboration
- broader business/marketplace/monetization features

Expansion is a founder decision based on evidence, not an automatic next step.

## Anti-Drift Rules

- A successful pilot does not mean every feature request enters the roadmap.
- Pilot feedback is evidence, not automatic scope.
- Do not keep Phase B open forever waiting for perfection.
- Do not move to church #2 merely because the architecture allows it.
- Do not let Phase C become another inventory project; decisions must be bounded and evidence-based.
- Preserve the same security, tenant, identity, and audit contracts through every later phase.

## Relationship to Existing Plans

This document does not replace the Madera Pilot Master Plan V2 or the original 8-step roadmap.

It defines what happens after implementation begins:

Planning -> Phase A Implementation -> Phase B Real Human Pilot -> Pilot Proven Gate -> Phase C Evidence-Based Support Scope -> Phase D Remaining Core Roadmap -> Phase E Expansion Decision.
