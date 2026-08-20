# Kingdom Network Current Verified Product Status

Snapshot date: 2026-08-20

Purpose: prevent stale roadmap items from being mistaken for unimplemented work. This snapshot is grounded in current `main`, Control Room Issue #28, the verified production release, and current open workstreams.

## Release baseline

- Current source baseline at start of Master Upgrade Phase 1: `main` commit `343bb9910dad4ed4d0bce00bdf5f4f9564cf3864`.
- Production deployment from the prior combined release was verified READY at `kingdom-network.vercel.app`.
- The post-deploy diagnostic gate passed install, security regression tests, lint, and full production build.
- Automatic Vercel Git deployment is OFF by design; the next production release remains a controlled combined deployment.

## Known verified / already-present capabilities

### Authentication / pilot access

- Public church-specific signup exists.
- English/Spanish signup and recovery paths exist.
- Password show/hide controls exist.
- Permanent church join flow exists.
- The real pilot has active accounts and memberships.
- Additional reliability hardening remains in draft PR #31 and is not yet part of the next combined release.

### Member administration

- Leadership-only 360-degree Member Record exists on `main`.
- Member-facing profile/journey screens remain separate from leadership administration.
- Role correction, profile/contact correction, class overrides, ministry application review, business verification, schedule/document/group summaries, and leadership audit history are present in the 360-degree administration work.
- Pastor assignment remains pastor-only; normal church-admin corrections are bounded.

### Learning engine

- Courses, modules, enrollments, progress, assessments, attempts, passing scores, finals, credentials/certificates, sessions, attendance, games, badges/XP, prerequisites, and learning challenges exist in the data model.
- Required assessment gating exists in the learning engine.
- Effective Soul Winning has been verified at the new assessment standard: required checkpoints contain 6 + 6 questions; required final contains 20 questions; 32/32 assessment questions have answer keys.
- Effective Soul Winning content/assessment review against the uploaded New Life source has been completed and source-accuracy notes were recorded.
- First Steps exists as structured published course content; additional source-grounded expansion/verification remains separate work.
- Classroom session and weekly-series scheduling functionality exists but still needs an authenticated combined-main smoke test before its earlier blocked status should be upgraded.

### Outreach / guest follow-up

- Guest/prospect records and source capture exist.
- Follow-up ownership/status/due dates and communication queue infrastructure exist.
- Consent-aware outreach communication infrastructure exists.
- New Life outbound email provider is not yet production-ready (`email_ready=false` at audit time), so automated communication should not be described as fully delivered until provider configuration is completed and tested.

### Join / onboarding

- Public church join and Join Center/QR foundations exist.
- Progressive onboarding direction exists.
- Current master checklist wording is stale where it still describes these as wholly unbuilt.

### Friendship Groups / scheduling / teams

- Groups, memberships, group reports, attendance/check-in structures, shared schedules, team rosters, assignments, time-off, and schedule items exist in the product/data model.
- Real pilot usage remains sparse in several operational tables; infrastructure presence is not the same as end-to-end real-world verification.
- Friendship Group reporting and ministry/team workflows should be evaluated with actual New Life records rather than more demo-only data.

### Leadership / church health

- Leadership Today / pastor/admin operational surfaces exist.
- Church-health snapshot/reporting functions exist.
- The product already separates some member, guest, and active-account counting more carefully than the stale roadmap implies.
- The Master Upgrade plan intentionally consolidates overlapping leadership dashboards instead of adding another dashboard.

### Kingdom Guide

- Kingdom Guide exists as navigation/help plus trusted church-resource search.
- Tap & Go exists as a permission-aware natural-language intent router/read layer.
- These are approved to merge into one Kingdom Guide experience in Phase 9; do not create another AI product/personality.

### Finance

- Finance foundations are substantial, including newer `finance_*` objects and legacy `church_finance_*` objects.
- Finance/Reporting/Multi-Church is an active claimed workstream.
- The approved Master Upgrade plan requires one canonical finance architecture before broader real-money adoption.
- Do not independently change finance tables, finance RLS/helpers, `church_roles`, or `church_role_assignments` while that claim is active.

## Important sparse-use areas

At the Master Upgrade audit, several operational modules had little or no real pilot data despite having schema/UI foundations. This is a product-validation signal, not proof that the feature is broken.

Examples included:

- no real group reports at audit time;
- no team assignments at audit time;
- no ministry applications at audit time;
- no direct messages at audit time;
- no prayer/care requests at audit time;
- no business listings at audit time;
- no fundraising campaigns at audit time;
- no member documents at audit time;
- no finance transactions/contributions/expenses at audit time.

The next phases should prioritize real end-to-end pilot usage and hide unconfigured modules instead of expanding breadth indiscriminately.

## Current open/held work that must be preserved

- Draft PR #31: Pilot Reliability / Backup Admin / Readiness / auth/help recovery hardening. CI is green and the PR is mergeable, but it remains a separate active workstream and must be reconciled during combined integration rather than copied independently.
- Finance / Reporting / Multi-Church Licensing: active claim on finance/role/RLS overlap.
- Learning Studio / Classroom Scheduling: existing implementation, pending authenticated combined-main smoke verification.
- Other active Control Room claims must be re-read before any overlapping write.

## Master roadmap correction

`docs/KINGDOM_NETWORK_BUILD_CHECKLIST.md` was last updated 2026-08-19 and contains items that have since been verified or partially delivered. It must not be interpreted literally without this snapshot and Control Room #28.

The approved high-level roadmap is now `docs/KINGDOM_NETWORK_MASTER_UPGRADE_PLAN.md` on the Master Upgrade Phase 1 branch. After coordinated integration, the legacy checklist should be reconciled into a status-aware execution view rather than left as a second conflicting roadmap.
