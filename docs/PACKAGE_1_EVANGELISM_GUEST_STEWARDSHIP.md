# Kingdom Network — Package 1: Evangelism / Guest Stewardship

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 1 completes the Madera New Life guest lifecycle without building a second guest system:

**Invite / connection → capture → source history → accountable follow-up → return visits → Bible study / First Steps interest → safe account/member link → retention / re-engagement signals → Church Health.**

The existing Next.js/Supabase Outreach system is already substantial. This package is primarily **KEEP + CONNECT + REPAIR + VERIFY**, not a ground-up Evangelism rebuild.

Base44 Package E is used as a behavior/UX reference only. Canonical guest, follow-up, identity, Journey and reporting records remain in Supabase.

---

# 1. Existing implementation map

## KEEP — current Next.js / Supabase authority

### Pilot routes / UI

- `/outreach`
- `/outreach/[contactId]`
- `/outreach/communications`
- existing public `/join/[slug]` account/join flow
- Church Join Center / QR tooling
- church invitation administration

### Canonical data

- `outreach_contacts` — pre-account guest / prospect authority
- `outreach_interactions` — calls, texts, visits, invitations, Bible studies, service attendance, prayer, follow-up and notes
- `church_invites` — direct account/church invitations; already supports `outreach_contact_id`
- `church_signup_settings`
- `public_signup_registrations`
- `church_memberships` — account-backed church relationship / membership state
- `profiles` / `member_private_details` — account-backed member profile/private details
- `member_milestones` — official church-verified spiritual/training milestones
- existing communication queue/templates and notification infrastructure

### Existing automation / data-integrity work

Current Outreach already has:

- quick guest/contact capture
- normalized phone/email fields
- duplicate prevention indexes
- stage progression
- assigned follow-up owner
- default follow-up due date
- interaction history
- service-attendance progression
- Bible-study progression
- communication language
- channel-specific consent / opt-out
- member link via `member_user_id`
- church-scoped unique linked-member protection
- consent-aware communication queueing
- English/Spanish guest thank-you, Bible-study, re-invite and First Steps templates
- hourly overdue follow-up reminder processing
- owner reminder at due time
- Pastor/Admin escalation after 24 hours overdue
- audit logging
- secured Church Health/reporting reads that already consume Outreach data

Read-only live checkpoint during Package 1 preparation:

- Outreach contacts: **8**
- linked to member accounts: **8**
- Outreach interactions: **0**
- contacts with `source_group_id`: **0**
- contacts with follow-up due: **8**
- stored acquisition source currently: **all `leader_entry`**

This proves the table foundation is real but the source/visit/history lifecycle is not yet being exercised as intended.

## Existing indexes / protections to preserve

Current database protections include:

- one Outreach contact per linked church member (`church_id + member_user_id` when linked)
- normalized phone/email duplicate indexes
- church/stage/source/follow-up indexes
- interaction contact/church/time indexes
- one open direct church invite per church/email

Do not weaken those protections while adding better source-aware capture.

---

# 2. Base44 Package E behavior worth porting

The connected Base44 implementation was inspected directly. Preserve these **behavioral invariants** in the canonical system where they improve the pilot:

### Invite / source behavior

- active church members can share a non-privileged church connection link;
- a Friendship Group connection link can only be created for a group the user actually belongs to/leads/administers;
- kiosk/front-door and campaign links are leadership/admin tools;
- active links for the same inviter/context can be reused rather than constantly generating duplicates;
- source/referrer/group/campaign context is preserved;
- invitation/referral never grants church membership or privileged access.

### Public connection card

- EN/ES from the first screen;
- minimal first step: first name + phone and/or email;
- optional last name;
- preferred language;
- Bible-study interest;
- First Steps interest;
- optional non-confidential prayer request;
- explicit contact-channel consent;
- successful connection does not claim to make someone an official member;
- account creation is an optional next step, not required for guest capture.

### Duplicate / retry behavior

- normalize phone/email server-side;
- exact same-church match can reuse an existing active guest record;
- multiple possible matches fail closed for human review;
- a retry does not create a second follow-up for the same source occurrence;
- source/campaign counters must not inflate on resubmission;
- guest-to-member conversion preserves guest history;
- account conflicts fail closed rather than reassigning ownership.

### Follow-up UX

- clear overdue / due today / due this week views;
- named owner;
- next action + next follow-up date;
- leadership escalation visibility;
- cold / stale guest visibility;
- source and funnel analytics based on real records.

These are requirements for the Supabase implementation, not authorization to maintain Base44 Guest/FollowUp as a parallel authority.

---

# 3. Canonical data ownership

## `outreach_contacts` owns

The current contact row remains the canonical pre-account guest/prospect summary:

- church
- current name/contact
- normalized phone/email
- first/original acquisition source
- current stage
- assigned follow-up owner
- follow-up due / last contacted
- consent / preferred language
- Bible-study interest/current lesson summary
- optional non-confidential prayer request
- eventual `member_user_id`

## `outreach_interactions` owns history

Repeated ministry events must become interaction/history rows instead of overwriting the original source.

Package 1 implementation should extend the interaction contract as needed so a touch can carry structured attribution such as:

- source type
- source group id
- event/occurrence id where applicable
- referrer/inviter user id where appropriate
- reported visit ordinal / source-specific status where applicable
- idempotency/source occurrence key for system-generated interactions

**Original source stays original. Later touches are history.** “Latest source” should normally be derivable from the latest attributed interaction rather than maintained as a second competing truth field.

## No second Guest table

Do not add a separate canonical `guests` table in Supabase while `outreach_contacts` already owns the pre-account human relationship.

## Account/member handoff

When an Outreach contact later creates/claims an account:

- link the existing contact to `member_user_id` after safe identity verification;
- preserve source/history/follow-up records;
- do not create another Outreach contact for the same linked church member;
- church relationship/membership state remains in `church_memberships`;
- official milestones remain in `member_milestones`;
- Package 2 owns the account claim / identity-verification UX.

---

# 4. Source-aware connection contract

## Source types required for pilot

At minimum support structured attribution for:

- church/front door
- church service
- personal/member invitation
- Friendship Group
- event/campaign
- outreach/evangelism effort
- leader/manual entry

Future sources may be added without changing the identity model.

## Source context is not authorization

A source link may identify:

- church
- inviter/referrer
- intended Friendship Group
- campaign/event
- language

It must **not** grant:

- church membership
- Friendship Group membership
- leader/admin role
- Finance access
- private home-address access
- pastoral/private-record access

## Public source-link implementation boundary

Current `church_invites` is an account-invitation structure with role/contact/redeem semantics. Do not casually repurpose it as a reusable public member-share token if that would mix privileged account invitation behavior with non-privileged guest capture.

Implementation should first audit whether a safe existing source-context mechanism can be reused. If not, add the **smallest church-scoped opaque source-link/context contract** necessary for reusable public guest capture. The token resolves server-side; clients must not be trusted to submit arbitrary church/group/referrer ids.

Package 2 retains authority over direct account invitations and `/join` account creation/recovery.

---

# 5. Public guest capture flow

## Human flow

**Scan/tap connection link**  
→ resolve safe church/source context  
→ show EN/ES minimal connect card  
→ first name + phone/email  
→ optional interests/language/contact consent  
→ submit once  
→ server performs duplicate-safe resolution  
→ create/reuse canonical Outreach contact  
→ append attributed interaction  
→ create/update one accountable follow-up action  
→ success: “You’re connected; someone from the church can follow up.”  
→ optional **Create / claim my Kingdom Network account** handoff to Package 2

No account is required to become a captured guest/prospect.

## Required UX states

- loading/resolving source link
- invalid/inactive link
- church intake paused
- submitting
- confirmed success
- exact existing-contact reuse without exposing private record details
- ambiguous possible match → neutral “we need a leader to help match your record” path
- uncertain save → do not invite immediate resubmission; reload/check status first
- offline/connection interruption recovery where practical
- English and Spanish on every critical state

## Privacy language

The public form should request only the minimum information needed for connection. It should not encourage people to enter confidential pastoral, abuse, financial, immigration, medical, or other sensitive case details into a general Outreach note/prayer field. A person needing private pastoral help should be routed to the protected care pathway.

---

# 6. Duplicate-safe capture / visit progression

## Match rules

Server-side, church-scoped only:

1. a verified existing `member_user_id` link wins when applicable;
2. normalized exact phone/email may identify a candidate Outreach contact;
3. one strong candidate may be reused;
4. multiple strong candidates fail closed for staff review;
5. name alone is never sufficient to silently merge identities;
6. no cross-church match/claim is permitted.

The current unique indexes remain a final data-integrity guard, not the entire UX.

## Return visits

Do not treat a returning guest as “duplicate, skip.”

A repeat visit should:

- reuse the canonical Outreach contact;
- append a new attributed interaction/visit occurrence;
- preserve original acquisition source;
- update `last_contacted_at` / follow-up timing where appropriate;
- advance the relationship stage only according to explicit rules;
- allow Church Health to derive first-time vs returning behavior from history.

## 1st / 2nd / 3rd Friendship Group visit

Package 3’s New Life attendance/report code distinguishes first-, second-, and third-time guests. Package 1 must accept those source occurrences without creating new people.

The reported ordinal belongs on the visit/attendance interaction. Do not make an editable lifetime counter the only source of truth.

---

# 7. Follow-up ownership and permissions

## Follow-up eligibility

An active church member may invite someone without automatically receiving access to that guest’s contact/prayer details.

Default pilot authority:

- Pastor / Church Admin: church-wide according to approved authority;
- `manage_outreach`: church-wide Outreach management;
- assigned follow-up owner: the specific contacts assigned to them;
- Friendship Group leader/authorized assistant: group-sourced contacts for the group they actually operate, plus specifically assigned contacts;
- ordinary inviter/member: referral attribution only unless separately assigned/authorized.

## Current RLS repair required

Current live `outreach_contacts` / interaction RLS includes legacy broad church-wide read paths for `group_leader`, `ministry_leader`, and `minister` roles.

That does **not** match the scoped-leader target and must be repaired before the package is SECURE.

Target:

- `created_by` remains audit/source metadata and should not by itself create broad ongoing access for a public inviter;
- manual quick-add may assign the creator to the contact if they are an eligible follow-up owner;
- a group leader sees group-sourced/assigned Outreach they are responsible for, not the whole church pipeline;
- Pastor/Admin or `manage_outreach` sees church-wide data;
- tenant/church isolation remains mandatory.

**Implementation warning:** this RLS/capability area overlaps the active Finance/shared role-RLS workstream. Coordinate before changing shared role helpers/policies. Package 1 must extend the existing permission system, not create another one.

## Assignment rules

Recommended pilot default:

- Friendship Group source → group leader or configured group follow-up owner; inviter remains attribution;
- eligible outreach leader/pastor/admin personal invite → inviter may be assigned;
- ordinary member invite → configured Outreach owner/queue, not automatic private-data access to inviter;
- kiosk/campaign → configured church Outreach owner/queue;
- no eligible owner → clearly visible unassigned queue; do not silently pretend follow-up is assigned.

---

# 8. Follow-up lifecycle

Preserve the current due-date automation and make it visible/simple:

**New connection**  
→ owner assigned  
→ first follow-up due (default 24h unless church workflow overrides)  
→ interaction logged  
→ next action / next due date  
→ overdue owner reminder  
→ leadership visibility after threshold  
→ continue / pathway / connected / inactive / re-engagement

A retry or repeated source submission must not create duplicate open follow-up work for the same occurrence.

The system should make “who needs attention now?” obvious without requiring leaders to inspect every guest record.

---

# 9. Bible Study / First Steps / milestone boundaries

## Bible study

Bible-study interactions belong in Outreach history while the person is in the guest/prospect lifecycle. Package 3 can create these from named Friendship Group activity; Learning/Journey may later surface them as ministry history.

Do not represent a Bible study only as an aggregate report number when the person is known.

## First Steps

Interest/invitation is an Outreach event. Actual First Steps enrollment/completion belongs to Learning / canonical training records.

Outreach may advance its relationship stage based on canonical Learning/member facts, but it does not create a competing completion truth.

## Baptism / Holy Ghost

A guest/member self-report may be recorded as self-report context, but it never silently writes the official verified `member_milestones` record.

Package 3’s pending reported-milestone pattern remains the preferred path when a leader reports a new baptism/Holy Ghost event that requires verification.

---

# 10. Communications / cost boundary

Core Package 1 must work without paid SMS/email/AI services.

Keep:

- in-app task/notification behavior;
- consent/preferred-language records;
- queue/template infrastructure;
- native phone Share / Copy Link where useful;
- local QR rendering where implemented.

External SMS/email delivery may be enabled later only when intentionally configured, consent-aware, cost-controlled and verified. Lack of a paid provider may not break guest capture or leader follow-up.

---

# 11. Church Health interface

Package 1 must provide canonical events that Package 6 can derive into metrics such as:

- new connections / first-time guests
- returning guests
- source/channel effectiveness
- overdue follow-up
- no-owner follow-up
- Bible-study activity
- First Steps interest/invitation
- guest → account/member connection
- inactive/cold contacts needing re-engagement

Do not create a separate manual Evangelism dashboard database. Church Health reads canonical contacts/interactions/relationships.

---

# 12. Real Madera role flows

## Member / inviter

Invite/share church or a group they actually belong to → see confirmation that the link is ready/shared → does **not** automatically gain access to private guest details.

## Friendship Group leader / assistant

Capture or receive a group guest → see only group-scoped/assigned guest follow-up → log contact / Bible study / return visit → hand off to wider Outreach/Pastor when needed.

Assistant access follows Package 3’s capability model and must not expand to church-wide Outreach merely because the title says Assistant.

## Outreach leader

See assigned/church-wide pipeline according to `manage_outreach` → triage unassigned and overdue contacts → reassign → log interactions → see source/next action.

## Pastor / Church Admin

See church-wide Outreach health and escalations → resolve ambiguous identities/assignments → review serious follow-up gaps → hand off to private care where needed.

## Guest

No login required to connect. Minimal EN/ES form. Clear success. Optional later account handoff without losing guest history.

---

# 13. Implementation slices

## Slice A — contract + security reconciliation

- confirm current `main` / combined candidate dependencies;
- coordinate shared RLS/role ownership;
- define scoped Outreach read/update rules;
- identify exact source-link mechanism without reusing privileged invite semantics unsafely;
- add focused regression tests before changing policy.

## Slice B — source-aware guest capture

- non-privileged church/member/group/campaign source context;
- public EN/ES connect card;
- minimal intake + consent/language/interests;
- normalized exact-match resolution;
- fail-closed ambiguous review;
- positive/uncertain save behavior.

## Slice C — interaction/source history

- extend structured interaction attribution;
- preserve original source;
- record return/source occurrences idempotently;
- expose clear guest history.

## Slice D — accountable follow-up

- safe owner-selection rules;
- one retry-safe follow-up action per capture occurrence;
- unassigned queue;
- overdue/today/upcoming presentation;
- preserve existing cron reminder/escalation behavior.

## Slice E — FG / event / onboarding interfaces

- Package 3 calls the duplicate-safe contact+visit contract rather than inserting guests independently;
- Package 2 safely links/claims existing Outreach contact after identity verification;
- event/campaign context flows into interactions;
- source/referral never grants membership.

## Slice F — pilot simplicity + proof

- mobile-first pass;
- English/Spanish critical states;
- loading/empty/error/uncertain/retry;
- real leader/member/admin/guest flows;
- security/tenant proof;
- build/lint/regression gate.

---

# 14. Explicit non-goals for Package 1

- paid SMS/email provider rollout
- AI-generated outreach conversations
- advanced marketing automation
- CRM-style mass campaigns
- network-wide cross-church prospect sharing
- automatic privileged role assignment
- automatic church/group membership from a source link
- pastoral-case intake inside general Outreach notes
- rebuilding Auth / `/join`
- creating a second Guest/Person datastore
- migrating Base44 live records automatically

Those items do not block the Madera pilot.

---

# 15. Acceptance criteria

## FUNCTIONAL

- guest can be captured manually or from a valid public source context;
- phone or email is enough for public connection;
- exact match reuses a canonical contact when safe;
- ambiguous match does not silently merge/create duplicates;
- owner/next action/due date work;
- interactions can be logged;
- return visit creates history, not a second person;
- guest can later hand off to Package 2 account flow.

## CONNECTED

- source attribution reaches the canonical Outreach record/history;
- FG guest attendance/report uses the same duplicate-safe Outreach contract;
- Bible-study activity becomes person-linked interaction when known;
- First Steps interest/invite does not fake course completion;
- linked member retains Outreach history;
- Church Health can derive first/return/follow-up/source metrics from canonical records.

## SECURE

- church A cannot read/write church B Outreach;
- ordinary inviter cannot see private guest data merely because they shared a link;
- FG leader sees only own-group/assigned Outreach unless broader permission exists;
- Pastor/Admin / `manage_outreach` scope is explicit;
- ambiguous identity fails closed;
- public source context cannot self-grant membership/group/role/access;
- consent and preferred language are preserved;
- sensitive pastoral/private details are not routed through broad Outreach access;
- RLS/UI/RPC authority agree.

## SIMPLE

- guest can connect on a phone without an account;
- minimal first screen;
- EN/ES no dead ends;
- success explains what happens next;
- member can share a link without understanding CRM concepts;
- leader sees “needs attention” rather than a giant form;
- uncertain outcomes tell the user not to duplicate the action.

## TESTED

Automated/focused proof must include:

- source-context tampering denied;
- expired/inactive/invalid source link;
- exact phone match;
- exact email match;
- multiple candidate ambiguity;
- repeat submission idempotency;
- one follow-up per occurrence;
- source history preserved on return visit;
- member invite does not grant guest-data access;
- FG leader church-wide denial + own-group allowance;
- cross-church denial;
- member account link preserves history;
- no official milestone overwrite from self-report;
- failed/uncertain write does not show false success;
- EN/ES critical-state checks;
- lint/build/security regressions pass.

## VERIFIED

Real-human Madera proof on the exact candidate:

- ordinary member shares church link;
- FG leader shares own-group link;
- unauthorized member cannot create another group’s scoped link;
- guest opens link on phone in English and Spanish and submits once;
- existing guest returns through another valid source without duplicate person creation;
- leader sees and completes assigned follow-up;
- overdue follow-up appears/escalates as designed;
- Pastor/Admin sees church-wide pipeline;
- group leader cannot browse unrelated Outreach;
- guest later starts account/onboarding and the same Outreach history remains linked;
- no false success / false empty state / raw provider error.

Only after these pass can Package 1 be called **VERIFIED** / eligible for combined release handling.

---

# 16. Implementation path / Base44 credit decision

## Primary implementation target

**Direct Next.js/Supabase repo work.**

Reason:

- canonical data already lives there;
- current Outreach automation/RLS/reporting is more mature there;
- moving the feature authority to Base44 would create a second guest/member system;
- the missing work is mostly connection/security/idempotency rather than builder-heavy greenfield UI.

## Base44 usage

**No new Base44 Builder prompt is required to begin Package 1 implementation.**

Use the already-built Package E code as a behavior/UX reference. Only spend a future Base44 credit if a narrowly defined UI/prototyping task is materially faster there and the result is explicitly being ported into canonical Next.js/Supabase without creating a second data authority.

---

# 17. Dependencies / handoffs

## Upstream

- Package 0 canonical identity / permission contracts
- `MADERA_CANONICAL_RUNTIME_DATA_AUTHORITY.md`
- current combined auth/join reliability work
- active shared role/RLS ownership coordination

## Downstream

- **Package 2:** account claim, returning member, invitations/onboarding
- **Package 3:** FG guest/visit/report cross-system processing
- **Package 4:** member-facing Journey reads linked canonical history as appropriate
- **Package 5:** First Steps / ESW actual completion
- **Package 6:** guest/follow-up/source/retention health metrics

Package 1 owns guest stewardship; it does not absorb those downstream packages.

---

# Planning-ready gate

- [x] Existing implementation mapped.
- [x] Canonical data ownership settled.
- [x] Base44 prior work reconciled as behavior/reference, not second authority.
- [x] Permissions/security target defined.
- [x] Current broad Outreach RLS risk explicitly identified.
- [x] Dependencies/interfaces named.
- [x] Guest/member/leader/admin human flows defined.
- [x] Mobile + EN/ES + uncertainty states defined.
- [x] Acceptance criteria written through VERIFIED.
- [x] Direct repo implementation path chosen.
- [x] Base44 credit gate resolved: no new prompt needed for initial implementation.
- [x] Pilot scope bounded; non-goals deferred.
- [x] No live data/schema/RLS/Auth/deployment change performed during planning.

## Final Package 1 decision

**PACKAGE 1 IS PLANNING READY.**

Implementation should use the current Next.js/Supabase Outreach foundation, repair scoped permissions, add source-aware duplicate-safe public connection and visit history, preserve accountable follow-up automation, and port the strongest proven Base44 Package E behavior without creating a second Madera Guest/Person authority.
