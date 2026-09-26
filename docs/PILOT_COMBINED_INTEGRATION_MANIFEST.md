# Kingdom Network Pilot Combined Integration Manifest

Updated: 2026-08-22

## Purpose

This is the safe integration map for the current pilot-reliability queue. It exists because several draft PRs were built from the same `main` and some intentionally touch the same routes. A green PR by itself does **not** mean the PRs can be merged one after another without reconciliation.

Production deployment remains **HOLD** until Marcus approves one combined deployment.

## Non-negotiable release rules

1. Integrate into a fresh release branch from the then-current `main`; do not deploy individual draft PRs.
2. Preserve real production data. No cleanup, reset, seed, migration, RLS, Auth-config, or paid-service change is part of this manifest.
3. Do not touch Finance/role/RLS objects owned by the Finance workstream.
4. Do not merge V2 PR #46 into the V1 pilot release. V2 remains behind its founder-preview approval boundary.
5. Resolve overlapping files by **intent**, not by “ours/theirs” wholesale conflict resolution.
6. After the combined tree exists, rerun the full Kingdom Network release gate on the combined head.
7. Automated green CI is necessary but not sufficient. Complete the real-phone English + Spanish proof before calling the pilot accepted.

## Current pilot PR queue and intended value

| PR | Area | Keep for combined release | Integration note |
|---|---|---|---|
| #31 | backup admin + early auth/readiness/Guide hardening | **Selective** | Preserve unique Backup Admin safeguards and any help-knowledge additions not superseded below. Do not blindly merge its older auth/readiness/Guide files. |
| #36 | login/signup/confirmation/reset/join/Start Here | **Yes — auth authority** | Treat as the current authority for overlapping auth/login/join/start files unless a newer coordinated auth PR explicitly supersedes it. |
| #40 | first-login recovery + global error/loading + feedback | **Yes, with Home reconciliation** | `src/app/page.tsx` overlaps #50. Preserve #40 global error/loading/feedback work, but reconcile Home into #50's newer simplified Home. |
| #41 | account Security/Privacy/Notifications | **Yes** | Isolated account-settings hardening; keep fail-closed reads, safe bilingual statuses, and pending actions. |
| #44 | Fresh Church Setup / Church Builder | **Yes** | Keep retry-safe unpublished draft behavior, upload safeguards, fail-closed reads, and Spanish presentation. |
| #49 | invitation admin / Join Center | **Yes** | Keep fixed bilingual statuses, verified revoke, pending actions, newest-invite guidance, and Spanish QR target. |
| #50 | simplified blue/gold Home + mobile navigation | **Yes — Home/nav authority** | Treat as current authority for `src/app/page.tsx`, layout/theme/mobile nav. Re-apply any unique #40 Home recovery intent during reconciliation. |
| #51 | Kingdom Guide reliability | **Yes — Guide authority** | Treat as current authority for Guide resource/membership fail-closed behavior. Preserve #31 help-knowledge additions separately if still absent. |
| #52 | Pilot Readiness + Phone Proof | **Yes — readiness authority** | Treat as current authority for readiness pages. Preserve unique #31 Backup Admin work separately; do not restore #31's older readiness page wholesale. |
| #53 | Private Care / Help | **Yes** | Isolated pilot hardening; keep safe errors, fail-closed reads, bounded writes, verified updates, pending actions, and bilingual recovery. |

Friendship Group PRs #42/#43/#45 are separately verified/queued and should be integrated under their owning Friendship Groups coordination plan. They are not rewritten by this manifest. Finance remains separately owned. V2 #46 remains excluded from V1 integration.

## Known overlap map — manual reconciliation required

### A. PR #31 ↔ PR #36 — authentication core

Overlapping files include:
- `src/app/auth/callback/route.ts`
- `src/app/auth/update-password/page.tsx`
- `src/app/join/[slug]/actions.ts`
- `src/app/login/actions.ts`
- `src/app/login/page.tsx`
- auth/pilot regression tests

**Rule:** use #36 as the auth-flow authority. Confirm the combined result still contains the important #31 intent: existing-account join context survives recovery, duplicate-account warnings remain, callback destinations are allowlisted/canonicalized, provider text is not exposed, and Spanish recovery is preserved. Do not restore older #31 implementations over #36.

### B. PR #31 ↔ PR #51 — Kingdom Guide

Overlap: `src/app/guide/page.tsx`.

**Rule:** use #51 as Guide-page authority. Separately inspect #31's `src/lib/help-knowledge.ts`; preserve confirmation-email, existing-account church join, duplicate-account prevention, and password-recovery guidance if those entries are not already present on the combined tree.

### C. PR #31 ↔ PR #52 — Pilot Readiness

Overlap: `src/app/church/readiness/page.tsx`.

**Rule:** use #52 as readiness authority. Keep #52's fail-closed readiness state and build/site-bound bilingual phone proof. Preserve #31's unique Backup Admin files independently; do not use #31's older readiness page as conflict resolution.

### D. PR #40 ↔ PR #50 — Home

Overlap: `src/app/page.tsx`.

**Rule:** use #50 as the visual/navigation/Home authority, then explicitly verify that the combined Home still preserves #40's first-login recovery intent:
- a signed-in but genuinely unconnected account gets a clear safe path instead of a loop;
- the user is told to keep the same account and use the newest church invite/join link;
- a membership-read failure is not mistaken for a real unconnected account;
- Spanish recovery remains Spanish;
- no raw provider/database error is displayed.

Do not choose one entire Home file merely because Git reports a conflict.

### E. PR #31 tests vs later tests

Older source-shape assertions may fail after intentional later hardening. Preserve the **behavioral guarantee**, not stale implementation syntax. If an old test conflicts with a newer safe implementation, update the test to assert the current security/reliability outcome rather than weakening the code to satisfy old source text.

## Recommended integration sequence

The sequence below minimizes conflict and establishes the newest authority before final reconciliation:

1. Create fresh combined-release branch from current `main`.
2. Integrate isolated #41 Account settings hardening.
3. Integrate isolated #44 Fresh Church Setup / Church Builder hardening.
4. Integrate isolated #49 invitation-admin / Join Center hardening.
5. Integrate #36 auth/login/join/Start Here as auth authority.
6. Integrate #50 simplified Home/layout/navigation as Home/nav authority.
7. Reconcile #40: keep global error/loading/feedback files; manually port only unique Home recovery intent into the #50 Home.
8. Integrate #51 as Kingdom Guide authority.
9. Integrate #52 as Pilot Readiness authority.
10. Integrate #53 Private Care hardening.
11. Reconcile #31 **selectively**: Backup Admin files + any still-missing help-knowledge behavior only. Do not overwrite #36/#51/#52 authority files.
12. Integrate separately owned Friendship Group batches under their owner’s conflict plan.
13. Integrate Finance only through the Finance owner; never resolve role/RLS conflicts casually.
14. Run combined automated release gate.
15. Deploy only to an approved preview/test environment for runtime proof; production remains HOLD.
16. Complete the bilingual real-phone acceptance matrix below.
17. Only after exact-build evidence is green should the combined release be eligible for Marcus-approved production deployment.

## Combined automated release gate

All must pass on the **exact combined head**:

- dependency install
- security/regression suite
- lint
- full Next.js production build
- no unresolved conflict markers
- no accidental new migration/schema/RLS/Auth-config files
- no accidental V2 feature merge into V1
- no Finance role/RLS changes outside the Finance owner’s approved integration
- PR/release branch is mergeable with current `main`

A previously green individual PR does not satisfy this gate after combination.

## Required real-phone pilot acceptance

Run on the exact deployed preview/build and record PASS/FAIL in both English and Spanish.

### Account and onboarding
- New account → signup → confirmation email → Start Here → Home.
- Sign out → sign back in with the same account.
- Existing account opens newest church join link → joins without creating a duplicate account.
- Unconfirmed account recovery/resend uses the newest email and returns safely.
- Forgot password → reset password → sign in; if started from church join, intended join context survives.
- Expired/old/replaced confirmation or invitation links fail safely and tell the user what to do next.

### Invitation/admin
- Join Center English QR opens English join flow.
- Join Center Spanish QR opens Spanish join flow.
- Create invitation once on a slow phone; repeat tap is blocked while pending.
- Revoke an open invitation and verify a real row changed before success is shown.
- Returning users are told to keep the same account.

### First-login simplicity
- Normal member sees only member-safe navigation.
- Signed-in/unconnected account keeps recovery navigation without leader/admin tools.
- Membership/permission read failure fails closed rather than granting or inventing access.
- Start Here, Kingdom Guide, Help/Feedback, and language switch are easy to find.

### Kingdom Guide
- English and Spanish account-help searches work for password reset, missing confirmation email, existing-account join, and duplicate-account prevention.
- Resource-read failure shows retry guidance, not “no resources.”
- Membership-read failure shows safe recovery, not a false “no church” state.

### Fresh Church Setup / Church Builder
- Admin uploads harmless test material.
- Setup Inbox loads or fails closed; a read failure never looks like “no files.”
- Recommendation can be reviewed and approved once.
- Result opens as an **unpublished** draft in Course Builder.
- Retry does not create a duplicate draft.
- Spanish admin can understand the plan without mutating stored plan data.

### Private Care
- Member creates a private request once; pending state blocks double tap.
- Member history loads or fails closed; read failure never looks like “no requests.”
- Member can withdraw an eligible request.
- Authorized pastor/admin can assign/update status; success requires a real changed in-church request.
- Ordinary members cannot see the pastoral queue.

## Stop-the-release conditions

Stop integration/runtime testing and record a blocker if any of these occur:

- duplicate user account is required or encouraged for an existing member;
- raw Supabase/database/Auth/provider text reaches a normal user;
- a failed read is displayed as a legitimate empty/zero state that changes guidance;
- Spanish flow falls into an English-only dead end;
- ordinary member sees leader/admin-only data or actions;
- church A can see church B data;
- password reset or confirmation loses a valid intended church join destination;
- setup approval publishes curriculum automatically;
- a slow/repeated tap creates duplicate consequential records;
- combined branch introduces unowned Finance role/RLS changes, schema changes, production writes, or costs;
- real-phone evidence was collected against a different site/build than the release candidate.

## Pilot-ready definition

The V1 pilot is not “ready” because many draft PRs are individually green. It is ready only when:

1. the intended pilot batches are reconciled into one combined candidate without losing later safety behavior;
2. the exact combined head passes the full automated gate;
3. the exact deployed candidate passes the required English + Spanish real-phone flows with designated test accounts;
4. no stop-the-release condition remains open; and
5. Marcus explicitly approves the combined production deployment.
