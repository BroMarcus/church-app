# Kingdom Network Release Readiness — 2026-08-20

Target: one controlled pilot release from PR #34 after all hard deployment gates below pass.

This is a deployment-readiness matrix, not a claim that every long-term KN-001–KN-126 idea is finished. Long-term marketplace/network/native-app ambitions remain non-blocking unless explicitly promoted into the pilot release.

## Hard deployment gates

A production release is allowed only when all of these are true:

- [ ] PR #34 is mergeable against current `main`.
- [ ] Final PR #34 GitHub Actions gate passes dependency install, security regression tests, lint and production build.
- [x] New Learning Builder migration compiled successfully in a production-schema rollback transaction; rollback verified clean.
- [x] New Forms/Workflow/Feature Settings migration compiled successfully in a production-schema rollback transaction; rollback verified clean.
- [ ] Final migration/advisor review finds no new critical security blocker.
- [ ] Production database application is explicitly authorized by Marcus.
- [ ] PR #34 merge is explicitly authorized by Marcus.
- [ ] One Vercel production deployment is explicitly authorized by Marcus.
- [ ] Post-deploy smoke test passes login, home, Start Here, Learning/Class Builder, Groups, Calendar, Join, Forms and leadership access.
- [ ] Automatic Git deployment is confirmed OFF again after the controlled release.

## Phase 1 — Truth, security and release foundations

Status: **READY WITH CONFIGURATION/MANUAL HOLDS**

Implemented/verified in the candidate:
- live roadmap/status snapshot and authorization model;
- SECURITY DEFINER, answer-key, Storage and authenticated-outsider audits;
- public join navigation isolation;
- Node 22 runtime alignment;
- PR #31 auth/login/join/password-reset/readiness reliability reconciled with regression tests;
- controlled deployment discipline retained.

Non-code holds:
- Supabase leaked-password protection is still a plan/configuration decision;
- `pg_net` public-schema advisor debt is documented and must not be changed with an unsafe relocation;
- final English/Spanish real-phone auth gauntlet remains a human acceptance test.

## Phase 2 — Radical simplicity

Status: **READY FOR RELEASE CANDIDATE**

- server-resolved role-aware navigation;
- consolidated More menu;
- public signup has no member navigation;
- church-controlled optional feature switches;
- unfinished/disabled modules can disappear from normal navigation without deleting their data;
- universal Library umbrella and permission-aware search reduce duplicate destinations.

## Phase 3 — Member journey

Status: **READY FOR PILOT RELEASE / MANUAL PHONE PROOF REQUIRED**

Existing member journey, Start Here, profile, Learning, Groups and Serve flows are preserved. The release candidate adds duplicate-account prevention, safe existing-account church join, bilingual recovery help and Kingdom Guide account assistance. Final real-device signup -> confirmation -> Start Here -> sign-out/in -> existing-account join -> password-reset proof remains required.

## Phase 4 — Leader journey

Status: **READY FOR PILOT RELEASE**

Existing Friendship Group and Team tools remain the operational engines. The release candidate does not create duplicate leader systems. Role-aware navigation keeps leader tools scoped and the new Teacher Dashboard uses the existing Learning session/attendance model.

New Life ministry/team population and real roster content are configuration/data readiness, not a code deployment blocker.

## Phase 5 — Pastor/admin operating system

Status: **READY FOR PILOT RELEASE**

Existing Church Today/leadership/health/care/admin surfaces are preserved. The new Church Work Inbox gives leaders one entry point for actionable work while drilling into the existing care, document, ministry and outreach systems. Pastoral/private records remain in their specialized permission boundaries.

## Phase 6 — Existing operational engines

Status: **READY WITH OPTIONAL PROVIDER CONFIGURATION**

Groups, teams, schedules, outreach, prayer, care, documents, events, business and fundraising foundations already exist. Church feature switches allow unconfigured optional areas to stay out of normal navigation.

External Outreach email remains disabled until a sender/secret is configured. SMS remains intentionally later. Neither should block a code release when the UI correctly treats them as unconfigured.

## Phase 7 — Learning Academy

Status: **CODE READY / LIVE ACCEPTANCE REQUIRED AFTER DEPLOY**

Release candidate includes the required general-purpose Class/Lesson Builder:
- create a church-owned class from scratch;
- edit/reorder/delete draft lessons;
- lesson-attached/course assessments;
- secure answer-key question create/edit/reorder/delete;
- publish/unpublish;
- archive/restore;
- history protection after learner progress/attempts;
- source-assisted extraction remains draft-only and human-reviewed;
- stackable `manage_learning` permission;
- Teacher Dashboard using existing sessions, attendance and enrollment data.

Required acceptance after this code reaches the live app:
1. Marcus personally creates and edits a test class in Class Builder.
2. Source curriculum is installed through the Builder instead of hardcoded schema/code.
3. Strategy of Jesus and Disciple Your Disciplers can then be expanded through that builder-backed workflow.

The source-curriculum population is therefore a content acceptance step, not a reason to keep the Builder code undeployable.

## Phase 8 — Communication and workflows

Status: **CORE CODE READY / EXTERNAL TRANSPORT OPTIONAL**

Release candidate adds:
- reusable church Forms engine;
- workflow templates;
- member form submissions;
- owner/status/next-action/due-date/leader-note work state;
- unified Work Inbox;
- church feature switches.

Existing communication engine remains consent-aware. Resend/custom SMTP setup is a separate provider/configuration action and is not silently enabled by this release.

## Phase 9 — Kingdom Guide

Status: **PILOT GUIDE READY; CONSEQUENT AI ACTIONS DEFERRED**

Kingdom Guide remains the single approved assistant identity in navigation. It provides bilingual normal-language app/account help and source-aware church-resource search. Tap & Go is not promoted as a competing daily destination.

Autonomous consequential AI actions remain deferred until confirmation/audit controls are mature; that does not block the current pilot release.

## Phase 10 — Differentiators

Status: **FOUNDATIONS PRESENT; ADVANCED NETWORK FEATURES NON-BLOCKING**

Existing differentiators include My Journey, Church Health, leadership/member records, Business Partners, source-backed resources and cross-system ministry data. Advanced voice-to-work, template marketplace, broader cross-church discovery and network-scale intelligence remain roadmap work and are not pilot deployment blockers.

## Phase 11 — Final QA and release evaluation

Status: **IN PROGRESS — THIS IS THE CURRENT GATE**

Required before production authorization:
- final PR CI green;
- final Supabase advisor review;
- release candidate remains mergeable;
- no uncoordinated Finance/RLS overlap;
- production migration list is exact and additive;
- deployment lock remains controlled.

Required immediately after the one-shot deploy:
- unauthenticated `/login` and root redirect smoke;
- authenticated member Home/Start Here/My Journey/Learning/Groups/Calendar;
- leader/admin Church/Inbox/Forms/Class Builder/Teacher Dashboard;
- public and existing-account church join;
- password recovery;
- English/Spanish phone walkthrough;
- runtime error check;
- verify automatic Git deployment OFF.

## Production migration set for this release candidate

New and not yet applied:
1. `20260820211000_learning_builder_lifecycle.sql`
2. `20260820213500_forms_workflows_feature_settings.sql`

Both are additive and have individually compiled against the live production schema inside rollback transactions. No production data/schema change from those verification transactions persisted.

## Explicitly non-blocking broader-pilot items

These should be completed before a much wider rollout, but should not be confused with a failing code release:
- trusted backup church admin;
- leaked-password protection if the Supabase plan/cost decision permits it;
- custom Supabase Auth SMTP if higher email capacity is needed;
- Resend sender/secret when church Outreach email is intentionally enabled;
- full two-populated-tenant adversarial acceptance test before multi-church scale;
- real New Life ministry/team configuration and content population;
- Marcus Class Builder hands-on acceptance and builder-backed source curriculum loading.

## Release decision

When the hard gates are green, the exact production authorization should be:

> Apply the two approved release-candidate migrations, merge PR #34 to `main`, deploy Kingdom Network once to Vercel, run the post-deploy smoke tests, and restore/verify automatic Git deployment OFF.

Until Marcus gives that production authorization, deployment remains HOLD.
