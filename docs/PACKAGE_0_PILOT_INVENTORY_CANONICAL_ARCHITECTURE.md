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
| Public join / invitations / Start Here | KEEP + CONNECT | Feed Package 2; reconcile with canonical account/member identity, do not rebuild from zero. |
| Member / 360° member control | KEEP + CONNECT | Leadership-facing unified view already exists; preserve its underlying member records and connect Package 4. |
| Outreach / Evangelism | REPAIR + CONNECT | Package 1 authority should extend current Outreach and its account-link bridge, not create a parallel contact system. |
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

## Checkpoint 1 — Identity and authorization findings

Status: CONFIRMED FROM CURRENT `main` + approved architecture docs. No schema/RLS writes made.

### Current canonical member/account identity

The current application does **not** use a standalone universal `Person` table as the authoritative member identity. The working member identity is the Supabase Auth user UUID, reused consistently across the current member stack:

- Supabase Auth owns credentials and authentication identity.
- `profiles.id` uses that same user UUID for member-facing name/profile/privacy information.
- `member_private_details.user_id` uses the same UUID for private phone, address, birthday, anniversary, and other protected contact details.
- `church_memberships(church_id,user_id,...)` attaches that account/person identity to a church and stores access/relationship state.
- `member_milestones(church_id,user_id,...)` stores church-scoped verified Journey/milestone facts.
- Learning, Friendship Group membership/attendance, serving, prayer, Journey, and leadership member-control surfaces already key their member records to this same user UUID.

For the Madera pilot, **do not introduce a second account-backed Person table merely to match newer planning language**. Reuse this established identity path unless Package 2 proves that non-auth household/dependent records require a separate bounded person/dependent abstraction.

### Pre-account Outreach identity and claim bridge

`outreach_contacts` is intentionally capable of existing before a person has a Kingdom Network account. It stores guest/prospect identity, source, stage, follow-up, consent, and interaction history. When an account later joins:

1. prefer an Outreach record already linked by `member_user_id`;
2. otherwise attempt same-church normalized email/phone matching;
3. link the matched Outreach record by setting `member_user_id` to the existing Auth/member UUID;
4. preserve Outreach history, source, follow-up, and consent information;
5. if no Outreach record matches, create a new Outreach contact linked to the account and assign follow-up.

This is the current bridge between pre-account evangelism and account-backed member records. Package 1 and Package 2 should strengthen this bridge rather than replace it with a second guest/member identity system.

### Relationship status is not authorization

`church_memberships` currently contains separate concepts that must remain separate:

- `role` / permission authority answers what the account may do;
- `status` answers whether church access is active/pending/inactive/etc.;
- `relationship_status` describes ministry relationship such as guest/attendee/member progression;
- `relationship_source` records how that church relationship began.

A person being a `guest` in relationship status must never imply elevated or reduced technical authority beyond the explicit access model. Likewise a referral/source must not become group membership or privileged access.

### Household / guardian gap

No current `household` or `guardian` implementation was found in the repository. Household/family is an approved roadmap gap (KN-028), not an existing system to reuse.

Package 0 will **not** invent that schema. Package 2 must make a bounded decision for spouse/child/dependent records with these constraints:

- do not use Outreach contacts as fake child/spouse member records;
- do not create fake Auth accounts for children/dependents;
- preserve guardian/privacy boundaries;
- adults may later claim their own account-backed identity;
- any new non-auth person/dependent entity must be justified by actual household/onboarding needs and designed for safe future church isolation.

### Authorization is currently hybrid — target is already approved

The approved target authorization model is:

- base church authority: `member`, `church_admin`, `pastor`;
- stackable functional responsibilities through `church_roles` + `church_role_assignments`;
- granular permission keys such as `manage_members`, `manage_outreach`, `manage_groups`, `lead_own_group`, `manage_learning`, `manage_calendar`, `manage_ministries`, `manage_teams`, and separately protected finance permissions;
- resource-level scope remains required after a permission is granted.

Current production/main is genuinely transitional: legacy `church_memberships.role` values such as `group_leader`, `ministry_leader`, and `minister` still exist and some routes branch directly on them, while newer code already checks `current_user_has_church_permission(...)` and uses real stackable `church_roles` / `church_role_assignments`.

Package 0 decision:

- **do not create a third role system**;
- **do not mass-convert legacy roles during pilot planning**;
- use the existing permission/capability system where it already exists;
- preserve necessary legacy checks during transition until parity is proven;
- new pilot packages should be designed toward base authority + functional responsibility rather than adding more job titles to base access;
- Pastor/Admin elevation remains separate, explicit, audited, and not grantable through a custom functional role;
- Finance/role/RLS implementation ownership remains coordinated with the active Finance/roles workstream.

### Verified milestone reporting pattern to preserve

The current Friendship Group/member-control work already provides a good canonical pattern for sensitive spiritual milestones:

- Pastor/Church Admin or an appropriately authorized verified-record manager may update official `member_milestones` within church scope;
- a normal Friendship Group leader reporting baptism/Holy Ghost does **not** silently overwrite the official record;
- the report creates a pending `reported_milestones` item for Pastor/Admin verification when the official milestone is not already confirmed.

Package 3 should reuse this pattern for FG report cross-system actions.

### Checkpoint 1 bounded implementation risks

1. Legacy job roles and stackable permissions coexist. Each pilot package must identify which current route/RPC/RLS checks it relies on and avoid assuming KN-006 migration is already complete.
2. There is no general non-auth Person/household entity today. Package 2 must decide the smallest safe household/dependent model without destabilizing the established account-backed member stack.
3. Outreach matching by email/phone is useful duplicate prevention but must not become unsafe auto-claim logic when identifiers are ambiguous. Account ownership/verification remains required.
4. Existing member-control UI still has some direct Pastor/Admin route checks even while underlying management actions can use `manage_members`; Package 4 should reconcile experience with the authoritative capability model rather than adding another access rule.

## Canonical contracts to settle before exit

### A. Human identity — checkpoint status: MOSTLY SETTLED

Current Madera-pilot rule:

- account-backed church members use the established Auth UUID across `profiles`, private details, membership, milestones, learning, groups, Journey, and other member records;
- Outreach remains the pre-account guest/prospect record and links to the account-backed identity through `member_user_id` when safely claimed;
- no new universal Person table is introduced during Package 0;
- household/dependent support is a Package 2 bounded architecture decision because the current repo has no household model.

Still to resolve before Package 2 implementation:
- exact archived/returning-member restoration rules;
- ambiguous duplicate/claim review workflow;
- smallest safe non-auth household/dependent representation.

### B. Church / tenant ownership

Working rule: every church-owned record must resolve to one church/tenant, directly or through a safely scoped parent relationship. Madera-first does not justify global/unscoped member or ministry records.

Confirmed so far:
- `church_memberships`, Outreach, member milestones, groups, reports, care/prayer, role assignments, and major operational records use church-scoped ownership;
- local church remains the primary private-data boundary;
- exact Friendship Group home addresses, Outreach private notes/prayer, private member details, care, documents, and local audit data must not leak upward to district/network scope;
- public join resolves a specific enabled church and the browser cannot choose arbitrary elevated access.

Still to inspect:
- inherited tenant ownership in Learning and Church Health source queries;
- any support-scope tables that are global/shared and need explicit pilot handling.

### C. Roles and capabilities — checkpoint status: TARGET SETTLED, TRANSITION RISKS MAPPED

Authoritative direction is the approved base-authority + stackable-functional-role model. Current implementation remains hybrid for compatibility.

Package rules:
- no new role framework;
- new package requirements should be expressed as capabilities + resource scope;
- legacy role checks may remain only where current verified behavior depends on them;
- package verification must prove UI and database/RPC authorization agree;
- sensitive care and finance permissions remain separate from generic `manage_members`;
- Group Leader/assistant access remains group-scoped unless another explicit capability broadens it.

### D. Cross-system event ownership

Pilot-core systems must exchange facts through canonical records/events rather than copying fields into parallel tables.

Target integration contract:
- guest capture -> Outreach contact + source/history + follow-up;
- onboarding/claim -> safely link existing Outreach history to the account-backed member identity where verified;
- FG attendance/report -> canonical attendance/history + guest/evangelism + Bible-study/milestone/care actions with proper confirmation/verification;
- learning completion -> canonical Journey/member progress;
- Church Health -> derived/read model from underlying records, not manual duplicate totals.

Consequential or sensitive writes must preserve verification and permission boundaries.

## Known coordination constraints

- Finance / Reporting / Multi-Church Licensing remains a separate claimed workstream. Package 0 maps that boundary only.
- Draft PR #55 currently owns combined V1 pilot reliability around auth/join/Guide/Start Here and must not be overwritten.
- Friendship Group implementation is not claimed by Package 0; only architecture/inventory is being prepared.
- Production deployment remains HOLD.

## Package 0 next inspection order

1. ~~Canonical identity/member/account structures and current join/outreach handoff.~~ CHECKPOINT COMPLETE.
2. ~~Role/capability/RLS authority map.~~ TARGET + transition risks mapped; detailed per-package use remains implementation work.
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
