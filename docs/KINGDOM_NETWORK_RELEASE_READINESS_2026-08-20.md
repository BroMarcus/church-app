# Kingdom Network Release Readiness — 2026-08-20

Target: one controlled pilot release from PR #34 after Marcus gives the explicit production authorization at the bottom of this document.

This is a deployment-readiness matrix, not a claim that every long-term KN-001–KN-126 idea is finished. Long-term marketplace/network/native-app ambitions remain non-blocking unless explicitly promoted into the pilot release.

## Hard deployment gates

Pre-deploy technical gates:

- [x] PR #34 is mergeable against current `main`.
- [x] Final PR #34 GitHub Actions gate passes dependency install, security regression tests, lint and production build — run #844 on head `defbe423677c3ca5619271f341208bfba67b3b51`.
- [x] New Learning Builder migration compiled successfully in a production-schema rollback transaction; rollback verified clean.
- [x] New Forms/Workflow/Feature Settings migration compiled successfully in a production-schema rollback transaction; rollback verified clean.
- [x] Production preflight confirms neither migration is partially applied and no target Builder/Form/Feature objects currently collide.
- [x] Final Supabase security/performance advisor review completed. No new critical release-stopping finding was identified; known advisor debt is classified below.
- [x] Vercel production project is healthy/READY. Repository `engines.node = 22.x` overrides the project-level 24.x selection according to current Vercel documentation, matching the green GitHub CI runtime without a separate production-setting mutation.
- [x] Current production runtime error review found no crash cluster; the only 24-hour error group was invalid login credentials.
- [x] Automatic Git deployment remains intentionally controlled; no release-candidate deployment has been triggered.

Authorization/deploy gates — intentionally still open:

- [ ] Production database application is explicitly authorized by Marcus.
- [ ] PR #34 merge is explicitly authorized by Marcus.
- [ ] One Vercel production deployment is explicitly authorized by Marcus.

Post-deploy verification gates:

- [ ] Smoke test passes login, home, Start Here, Learning/Class Builder, Teacher Dashboard, Groups, Calendar, Join, Forms and leadership access.
- [ ] English/Spanish real-phone signup, confirmation, sign-out/sign-in, existing-account join and password-reset gauntlet passes.
- [ ] Marcus personally creates/edits a test class in Class Builder.
- [ ] Runtime error check shows no release-created crash/error cluster.
- [ ] Automatic Git deployment is confirmed OFF again after the controlled release.

## Phase 1 — Truth, security and release foundations

Status: **READY WITH NON-BLOCKING CONFIGURATION/MANUAL HOLDS**

Implemented/verified in the candidate:
- live roadmap/status snapshot and authorization model;
- SECURITY DEFINER, answer-key, Storage and authenticated-outsider audits;
- public join navigation isolation;
- Node 22 runtime alignment;
- PR #31 auth/login/join/password-reset/readiness reliability reconciled with regression tests;
- controlled deployment discipline retained.

Non-code holds:
- Supabase leaked-password protection is still a plan/configuration decision and must not silently trigger a paid-plan change;
- `pg_net` public-schema advisor debt is documented and must not be changed with an unsafe relocation;
- final English/Spanish real-phone auth gauntlet remains a post-deploy human acceptance test.

## Phase 2 — Radical simplicity

Status: **READY FOR PILOT RELEASE**

- server-resolved role-aware navigation;
- consolidated More menu;
- public signup has no member navigation;
- church-controlled optional feature switches;
- unfinished/disabled modules can disappear from normal navigation without deleting their data;
- universal Library umbrella and permission-aware search reduce duplicate destinations.

## Phase 3 — Member journey

Status: **READY FOR PILOT RELEASE / POST-DEPLOY PHONE PROOF REQUIRED**

Existing member journey, Start Here, profile, Learning, Groups and Serve flows are preserved. The release candidate adds duplicate-account prevention, safe existing-account church join, bilingual recovery help and Kingdom Guide account assistance. Final real-device signup -> confirmation -> Start Here -> sign-out/in -> existing-account join -> password-reset proof remains required immediately after the controlled release.

## Phase 4 — Leader journey

Status: **READY FOR PILOT RELEASE**

Existing Friendship Group and Team tools remain the operational engines. The release candidate does not create duplicate leader systems. Role-aware navigation keeps leader tools scoped and the Teacher Dashboard uses the existing Learning session/attendance/enrollment model.

New Life ministry/team population and real roster content are configuration/data readiness, not a code deployment blocker.

## Phase 5 — Pastor/admin operating system

Status: **READY FOR PILOT RELEASE**

Existing Church Today/leadership/health/care/admin surfaces are preserved. The new Church Work Inbox gives leaders one entry point for actionable work while drilling into the existing care, document, ministry and outreach systems. Pastoral/private records remain in their specialized permission boundaries.

## Phase 6 — Existing operational engines

Status: **READY WITH OPTIONAL PROVIDER CONFIGURATION**

Groups, teams, schedules, outreach, prayer, care, documents, events, business and fundraising foundations already exist. Church feature switches allow unconfigured optional areas to stay out of normal navigation.

External Outreach email remains disabled until a sender/secret is configured. SMS remains intentionally later. Neither blocks this code release while the UI treats them as unconfigured.

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

The source-curriculum population is a content acceptance step, not a reason to keep the Builder code undeployable.

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

Status: **PRE-DEPLOY TECHNICAL GATE PASSED — WAITING ONLY FOR PRODUCTION AUTHORIZATION**

Verified before authorization:
- PR #34 current head is mergeable;
- GitHub Actions run #844 is SUCCESS on the current head;
- security regression tests, lint and full Next.js production build pass together;
- exact two-migration release set identified and individually compiled against production schema with clean rollback;
- production preflight shows no partial application/collision;
- Supabase advisors reviewed with no newly discovered critical release blocker;
- Vercel current production is READY and package Node 22 override matches CI;
- current production runtime errors show only invalid-login attempts, not a crash cluster;
- no uncoordinated Finance/RLS rewrite was introduced.

Required immediately after the one-shot deploy:
- unauthenticated `/login` and root redirect smoke;
- authenticated member Home/Start Here/My Journey/Learning/Groups/Calendar;
- leader/admin Church/Inbox/Forms/Class Builder/Teacher Dashboard;
- public and existing-account church join;
- password recovery;
- English/Spanish phone walkthrough;
- Marcus Class Builder hands-on acceptance;
- runtime error check;
- verify automatic Git deployment OFF.

## Production migration set for this release candidate

New and not yet applied:
1. `20260820211000_learning_builder_lifecycle.sql`
2. `20260820213500_forms_workflows_feature_settings.sql`

Both are additive and have individually compiled against the live production schema inside rollback transactions. Production preflight on 2026-08-20 confirmed the target `courses.archived_at`, Builder RPC, `church_forms`, `church_form_submissions`, and `church_feature_settings` objects do not currently exist, so the release is not entering a half-applied or colliding state.

## Advisor baseline — accepted for this pilot release

Known security/configuration debt, not newly introduced by PR #34:
- leaked-password protection disabled;
- `pg_net` installed in `public` and not safely relocatable ad hoc;
- two RPC-only/public-signup tables have RLS enabled without direct policies;
- intentionally callable public/authenticated SECURITY DEFINER RPCs are flagged generically by the advisor and require per-function authorization review rather than blanket revocation.

Known performance debt, not a pilot blocker:
- unindexed foreign-key opportunities;
- RLS auth-function init-plan optimization opportunities;
- overlapping permissive-policy optimization opportunities;
- many indexes reported unused under current pilot traffic.

Do not remove indexes simply because pilot traffic has not used them, and do not refactor Finance/RLS objects outside their active workstream solely to clear advisor counts before this release.

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

**Technical status: READY FOR CONTROLLED PRODUCTION DEPLOYMENT.**

The only remaining pre-deploy gate is Marcus's explicit production authorization for the database migrations, merge and one-shot Vercel deployment.

Exact authorization:

> Apply the two approved release-candidate migrations, merge PR #34 to `main`, deploy Kingdom Network once to Vercel, run the post-deploy smoke tests, and restore/verify automatic Git deployment OFF.

Until Marcus gives that production authorization, deployment remains HOLD.
