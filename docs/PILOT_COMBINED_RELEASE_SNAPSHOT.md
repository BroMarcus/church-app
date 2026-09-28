# Kingdom Network Pilot Combined Release Snapshot

Snapshot refreshed: 2026-08-26

This file pins the exact draft PR authority inputs used for reconciliation and records the latest verified combined V1 pilot checkpoint. Production deployment remains **HOLD**. These SHAs are integration inputs, not permission to merge or deploy individually.

## Core pilot queue

| PR | Area | Exact reviewed head | Authority / integration role |
|---|---|---|---|
| #31 | Backup Admin + early auth/readiness/Guide hardening | `e245c419ec63bccf698a8e177ad91113f3df2b52` | Selective preservation only; Build #825 succeeded |
| #36 | Login/signup/confirmation/reset/join/Start Here | `4fca3253c888cf3515d4b23096126c9d871d42f7` | Auth authority |
| #40 | First-login recovery + global error/loading/feedback | `ec46c40caf7029cac4e2d54b986a085c43afd95c` | Preserve unique global recovery; reconcile Home into #50 |
| #41 | Account Security/Privacy/Notifications | `f097c2c6ada5308188c95d98dcc8ecf133691e5f` | Isolated account-settings hardening |
| #44 | Fresh Church Setup / Church Builder | `db6cd5db0686b89f584a09b6ef15e14a0164036e` | Fresh Setup authority for this pilot batch |
| #49 | Invitation admin / Join Center | `4d87205609ac69e5d1c7e4eaba995edc85d95fd9` | Invitation-admin authority |
| #50 | Simplified Home + blue/gold mobile navigation | `bbf9ada6e0b32d47ab153b1ae8738cf2a8d97a03` | Home/navigation authority |
| #51 | Kingdom Guide reliability | `430c8726d9c06e16430a5d1a918c0c7d54592eb6` | Guide-page authority |
| #52 | Pilot Readiness + exact-build bilingual Phone Proof | `feb88ce48a9e489f971415c934b820c4f7ec3281` | Readiness authority |
| #53 | Private Care / Help | `15b3aaa5420926fdb8d1a0f33ada20dc6d03694a` | Isolated Private Care hardening |

All ten authority inputs above were separately reviewed before the combined candidate was assembled. Their exact SHAs remain pinned so drift is visible rather than silently absorbed.

## Current combined V1 candidate checkpoint

- Draft PR: #55 `Combined V1 pilot candidate — auth, onboarding, Guide, Builder, readiness`
- Branch: `automation/combined-v1-pilot-candidate`
- Exact verified implementation head: `01232604d5bfe1faf244320903b75d20e0b288b8`
- Kingdom Network Build #1413: **SUCCESS** — dependency install, security/regression suite, lint, and full Next.js production build all passed on that exact head.
- PR #55 remained draft + mergeable and 349 commits ahead / 0 behind `main` at this checkpoint.
- Production deployment remains on hold.

### Current certainty and low-tech protections

The combined candidate refuses to treat incomplete or malformed backend responses as successful user outcomes:

- password sign-in requires a real authenticated user and session before invitation redemption, church-return routing, onboarding inference, or Home;
- signup requires an Auth user before showing `account created`; confirmation-required signup may still legitimately have no session;
- public church-link signup now also requires an actual Auth user before reporting account creation;
- the modern PKCE callback requires both user and session before treating confirmation/recovery as verified;
- the token-hash verification path requires both user and session before password recovery or private-invitation redemption;
- password update requires Auth to return the updated user before Kingdom Network shows completion or begins post-reset sign-out cleanup;
- existing-account public church joining requires the RPC `already_member` value to be an actual boolean before choosing the already-joined vs newly-joined Start Here success state;
- incomplete Auth or join success payloads fail closed into bilingual retry/help paths instead of inventing a success state;
- safe private-invite and `/join/*` context remains attached to retry/recovery paths where appropriate;
- diagnostics remain bounded and do not expose raw provider exception text.

### Fresh Church Setup upload safety

- uploads remain locked after a confirmed save until Setup Inbox refreshes, preventing slow-phone duplicate uploads;
- metadata-write failure attempts storage cleanup before allowing retry, and uncertain cleanup tells the user not to upload the same file again yet;
- filename extension is required even when the browser reports a MIME type;
- when browser MIME is present it must match the approved extension (PDF/Word/PowerPoint/text/JPEG/PNG/WebP) instead of merely being independently allowlisted;
- the normalized accepted MIME is used for storage metadata;
- pilot testers are warned not to upload real member records, private pastoral notes, finance files, passwords, or access codes.

### Read-only runtime audit

A Vercel runtime-error audit was performed without changing production data or configuration:

- latest 24-hour window: **no runtime errors found**;
- this does **not** replace exact-build phone acceptance because PR #55 is not independently deployed.

## Separately coordinated queues

These are deliberately not absorbed blindly into the core pilot reconciliation:

| PR | Area | Exact reviewed head | Boundary |
|---|---|---|---|
| #42 | Friendship Group pilot reliability | `689fab8111a999cabcf197e65661a1621079043e` | Integrate under Friendship Groups ownership/conflict plan |
| #43 | Friendship Group report + roster hardening | `a59a5c4df8b9faef938c09fbb679d1d5128d0817` | Integrate under Friendship Groups ownership/conflict plan |
| #45 | Friendship Group prayer hardening | `9186aa96f39cc2a8c9035c3e693ab8ad827a711b` | Integrate under Friendship Groups ownership/conflict plan |
| #46 | V2 Step 1 foundation | `e728526fcadeeec7ae49888a6262dfe96090e7fe` | **Exclude from V1 combined pilot release** pending founder preview acceptance |

Finance / Reporting / Multi-Church Licensing and Package C Leadership Hub / Unified Scheduling remain separately claimed. No combined-release worker may resolve Finance, role, RLS, schema, scheduling, or leadership conflicts by casually choosing a side.

## Drift rule

Before building or approving the combined candidate:

1. Re-fetch every intended authority PR head.
2. If any SHA differs from this snapshot, stop treating the old snapshot as current for that PR.
3. Review the new diff and CI result before updating a pinned SHA.
4. Re-run the combined integration regression after any snapshot change.
5. Never substitute a branch name alone for an exact commit SHA in pilot acceptance evidence.
6. Any new commit on PR #55 creates a new exact head and requires a fresh Kingdom Network Build before READY status is restored.

## Combined-candidate gate

The combined candidate must still satisfy the full integration manifest. At minimum:

- exact combined head passes dependency install, security/regression tests, lint, and the full Next.js production build;
- no unresolved merge-conflict markers remain;
- no unowned Finance/role/RLS/schema/Auth-config or Package C scheduling/leadership changes appear;
- V2 code is absent from the V1 pilot candidate;
- newest auth/Home/Guide/Readiness authorities survive reconciliation;
- English and Spanish real-phone acceptance is performed against the exact deployed combined build;
- existing-account joining does not require or encourage duplicate accounts;
- password recovery preserves a valid intended church join destination;
- confirmation/recovery callback failures must not label an uncertain 429/5xx/transport failure as an expired newest link;
- Auth success paths must not continue unless the required user/session state is actually present;
- **private invitation → existing account** is tested as one continuous path: direct sign-in applies the invitation to the same account, forgot-password recovery preserves the invitation through reset/sign-in, and unconfirmed-email resend/confirmation returns the same account to finish invitation redemption;
- private-invite failure must fail closed without a half-finished membership and must not sign the member out of unrelated devices;
- replaced/revoked/used invitation recovery clearly directs the tester to the newest valid invitation without exposing tokens or raw technical errors;
- public church-link signup must not report `account created` from an incomplete Auth success payload;
- existing-account church join must not report success from a malformed RPC result;
- Fresh Church Setup produces an unpublished retry-safe draft rather than publishing automatically;
- Setup Inbox rejects mismatched extension/MIME combinations before storage writes;
- consequential actions remain protected from slow-phone double submission;
- no release-stop condition from `PILOT_COMBINED_INTEGRATION_MANIFEST.md` remains open.

## Human acceptance note

Automated CI and a clean runtime-audit window are necessary but not sufficient. The release remains blocked on real-phone English + Spanish proof against one exact deployed PR #55 build, including public/private same-account joining, confirmation/password recovery, simplified Start Here, Kingdom Guide, Fresh Church Setup upload/review, and the combined private-invitation recovery chain above. Do not record PASS from separate individually tested pieces if the end-to-end continuity was not actually exercised.