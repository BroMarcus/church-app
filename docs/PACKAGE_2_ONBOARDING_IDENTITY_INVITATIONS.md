# Kingdom Network — Package 2: Onboarding / Identity / Invitations

Prepared: 2026-08-26  
Status: **PLANNING READY**  
Canonical runtime/data authority: **Next.js + Supabase**  
Production deployment: **HOLD**

## Purpose

Package 2 makes Kingdom Network easy to enter without creating duplicate people, fake accounts, unsafe profile claims, or a second identity system.

The real Madera flow is:

**Guest/contact history → optional account creation → verified identity link → church relationship → Start Here → progressive profile/household → next useful step.**

This package extends the hardened existing Auth/join/invitation work. It does not rebuild login, password recovery, confirmation, or the canonical member model.

The earlier `ONBOARDING_IDENTITY_INVITATIONS_PACKAGE.md` remains useful product-thinking input, but this document supersedes its assumption that a new universal standalone Person record must be introduced for every human. The canonical Madera authority is now locked by `MADERA_CANONICAL_RUNTIME_DATA_AUTHORITY.md`.

---

# 1. Existing implementation to KEEP

## Current auth / entry authority

The combined V1 candidate already contains hardened behavior for:

- signup
- email confirmation
- login
- password reset/recovery
- same-account public church joining
- private invitation continuity
- stale/expired/malformed invitation recovery
- first-login Start Here
- English/Spanish recovery states
- fail-closed incomplete Auth responses
- repeat-tap / uncertain-outcome safeguards

Package 2 must preserve that work rather than replace it.

## Current routes / surfaces

- `/login`
- `/auth/callback`
- `/auth/update-password`
- `/join/[slug]`
- `/start`
- `/church/join-center`
- `/church/invites`
- account/profile settings already present in the app

## Current canonical records

### Account-backed human identity

One account-backed person is the Supabase Auth user UUID reused across:

- `profiles.id`
- `member_private_details.user_id`
- `church_memberships.user_id`
- `member_milestones.user_id`
- Learning, Friendship Group, serving, Journey and other account-backed records

Do **not** add a second account-backed Person table for the Madera pilot.

### Pre-account guest/prospect identity

`outreach_contacts` remains the pre-account guest/prospect authority until safely linked through `member_user_id`.

### Church relationship

`church_memberships` owns:

- church scope
- base role/authority
- active/inactive access state
- relationship status such as guest/attendee/member
- relationship source
- relationship verification
- display-only member title where used

### Private/member profile

- `profiles` — public/member-facing profile identity
- `member_private_details` — protected contact/birthday/anniversary/address information
- `member_milestones` — official verified spiritual/training milestone authority

### Existing household foundation

- `households`
- `household_members`

Current live household usage at Package 2 planning checkpoint: **0 households / 0 household-member rows**.

The foundation is safe to evolve before pilot household data exists, but implementation must still be migration-tested.

---

# 2. Security/data-integrity repairs discovered during planning

## A. Unsafe current Outreach auto-link shortcut

Current `handle_new_user()` and `join_public_church_existing_account(...)` can automatically attach a new/existing account to an unclaimed `outreach_contacts` record using matching email **or a phone number supplied by the user**, then select one candidate.

This is not strong enough for identity claiming.

### Required repair

- **typed/unverified phone may detect a candidate but may never auto-claim church history**;
- verified Auth email may support automatic linking only when there is exactly one safe same-church candidate;
- multiple candidates fail closed into review;
- name alone never auto-links;
- account creation may succeed without history linking when identity remains uncertain;
- no cross-church claim matching;
- the current Auth creation trigger should not silently choose a candidate merely because one sorts first.

Preferred implementation direction: remove risky history matching from `handle_new_user()` and perform history linking only through a post-authentication/verification server path with explicit certainty rules.

## B. New invitations still create legacy functional base roles

Current direct invitations allow legacy values such as:

- `group_leader`
- `ministry_leader`
- `minister`

and the account-creation trigger can write that value into `church_memberships.role`.

This conflicts with the approved authority direction: safe base membership + stackable functional responsibility/capability.

### Required repair

- new onboarding/invitation flows do not create new legacy job-role base authority;
- public join creates safe base `member` authority;
- known-leader invitation can preserve **intended responsibility** as non-authorizing context if useful;
- after account activation, Pastor/Admin assigns approved responsibilities through the existing role/permission system;
- existing legacy-role accounts are preserved during transition; Package 2 does not mass-convert them;
- Pastor/Admin/Finance/Platform authority can never be self-selected through public onboarding.

Coordinate shared role/RLS implementation with the active owning workstream.

## C. Onboarding completion currently lives only in Auth metadata

The hardened Start Here flow positively verifies `user_metadata.onboarding_completed` and `preferred_language` before showing success. Preserve that safety until the replacement is proven.

However Auth metadata is not a good long-term church-scoped leadership workflow source.

### Required repair

Add a small church-scoped onboarding state to `church_memberships`, for example:

- `onboarding_status`: `started | identity_review | in_progress | completed`
- `onboarding_started_at`
- `onboarding_updated_at`
- `onboarding_completed_at`

Invited/expired/redeemed states remain owned by invitation records. “Stalled/abandoned” should normally be derived from dates rather than permanently labeling a person abandoned.

Auth `onboarding_completed` may remain temporarily as a compatibility/routing cache while pages are migrated to the canonical membership state. Do not create two long-term authorities.

---

# 3. Canonical identity contract

## Account-backed person

Supabase Auth UUID remains the canonical account-backed identity.

A login is a credential/access identity. Related church history is linked to that UUID only after the appropriate verification boundary is met.

## No-account guest

Use `outreach_contacts` for evangelism/guest history. Do not create a fake Auth user or fake `profiles` row.

## No-account household member

A child, spouse, parent or other family member who does not yet have an account belongs to the **household relationship domain**, not Outreach and not a fake Auth account.

Package 2 should evolve the existing `household_members` model so the household relationship row can exist before an Auth account is linked.

This is intentionally **not** a universal second Person table.

---

# 4. Household / family model for no-account people

## Current limitation

Today `household_members`:

- requires `user_id`;
- uses `(household_id, user_id)` as its primary key;
- requires that user to already have an active same-church membership;
- is written only by `manage_members` authority.

That cannot represent a real child/spouse without an account.

## Approved Package 2 direction

Evolve the existing relationship table instead of adding a parallel household system.

Implementation design:

- give each household-member relationship a stable row `id`;
- allow `user_id` to be nullable for an unclaimed/no-account family member;
- keep a partial uniqueness rule for `(household_id, user_id)` when a real account is linked;
- for an unclaimed row, store only the minimum identity needed for the family relationship, such as:
  - first name
  - last name
  - preferred name when useful
  - birth date when voluntarily supplied/needed for age policy
  - relationship role
  - one current guardian/primary-contact user reference for the pilot when needed
  - claim status / claimed timestamp
- when the person later verifies/claims an account, attach `user_id` to the existing relationship row instead of creating a second family member;
- once `user_id` exists, `profiles` / `member_private_details` become canonical for the account-backed person’s personal data;
- the household row remains the family relationship/history record.

## Member-safe household writes

Do not open raw household tables to broad member writes.

Use narrow server/RPC actions so an authenticated adult can:

- create their own household if none exists;
- add a limited unclaimed spouse/child/family member;
- invite an adult household member to claim their own account;
- edit only safe household relationship fields they are allowed to manage.

Pastor/Admin / `manage_members` retains broader management authority.

## Privacy

- one adult does not gain unrestricted access to another adult’s private profile merely because they share a household;
- unclaimed child/dependent data is visible only to authorized guardian/household adults and appropriate church leadership;
- no household relation grants leader/admin/Finance authority;
- no family entry automatically becomes a Friendship Group member;
- exact birth date and guardian data are protected information.

## Initial youth posture

For the Madera pilot, independent minor login is **not required**.

A youth/child may exist as an unclaimed household member under guardian/church authority. Independent youth accounts can be enabled later only after guardian, communication, privacy and access rules are verified.

Do not claim legal compliance beyond configured church policy and appropriate legal review.

---

# 5. Source-aware entry without confusing source and membership

Package 1 owns public guest capture/source history. Package 2 owns account creation/claim.

When a person arrives from a source-aware context, preserve:

- original acquisition source in Outreach;
- later signup/account creation as a new interaction/touch;
- inviter/referrer where known;
- intended Friendship Group/event/campaign context;
- actual church membership separately;
- actual Friendship Group membership separately.

A QR/link may recommend a group. It cannot approve the roster.

`church_memberships.relationship_source` describes how the account relationship began (for example public join or private invitation). It is not a substitute for detailed Outreach acquisition history.

---

# 6. Safe account claim / history-link flow

## Direct private invitation linked to Outreach

Current `church_invites` already supports `outreach_contact_id`.

Preferred safe path:

1. leadership creates a direct person/account invitation tied to the known Outreach contact;
2. invite is bound to church + intended email + expiry;
3. user signs up/signs in with the same account/email;
4. Auth verification/recovery succeeds;
5. server validates invitation is still valid and belongs to the same church/contact;
6. link `outreach_contacts.member_user_id` to the verified account;
7. preserve all Outreach history;
8. audit the link.

Do not redeem/link merely from an arbitrary public identifier.

## Public account creation after guest capture

Preferred path:

1. guest already exists in Outreach from Package 1;
2. guest chooses “Create my Kingdom Network account”;
3. carry only an opaque server-resolved claim context into signup;
4. create/confirm the Auth account;
5. after a verified session exists, validate the claim context plus verified account identity;
6. unique verified-email same-church match may link safely;
7. phone-only or ambiguous match becomes `identity_review` instead of auto-linking;
8. account/church access continues safely without exposing someone else’s history.

The public claim context itself grants no church role, group membership, private address access or pastoral access.

## No prior Outreach contact

If no existing contact matches after the safe verification boundary:

- keep the new account/profile/church relationship;
- create one linked Outreach contact if the church workflow expects every new guest account in the stewardship funnel;
- assign follow-up according to Package 1 rules;
- do not fabricate prior source/visit history.

---

# 7. Ambiguous identity review

Possible match is not verified identity.

If multiple same-church candidates exist or phone-only similarity is the only evidence:

- do not merge/link automatically;
- do not reveal candidate names/private details to the public user;
- set the account/church onboarding state to `identity_review` or equivalent;
- create a small church-scoped review item for authorized leadership;
- let the user continue with safe non-sensitive account access where appropriate;
- review links the correct history only after confirmation.

Implementation may use a narrow `identity_link_reviews` workflow table if existing structures cannot safely represent the queue. That table is workflow metadata, **not another Person record**.

Review fields should be limited to:

- church
- account/user id
- candidate Outreach ids or server-resolved evidence
- reason
- status
- created/reviewed timestamps
- reviewed by
- resolution

Only authorized member-management/identity reviewers see candidate details.

---

# 8. Returning / inactive member

Current existing-account public join correctly refuses to silently reactivate an inactive prior church membership. Preserve that fail-closed principle.

Improve the human experience:

- detect the same existing account;
- say the church already has previous history rather than encouraging a second account;
- give a clear “request restoration / contact church” action;
- preserve Journey, Learning, attendance, groups, serving and historical records;
- leadership reviews whether to restore active church access;
- prior privileged authority is not blindly restored just because the member returns.

For the pilot, this can use a small durable reactivation request/notification workflow or an existing member-management review surface. Do not make a new account the workaround.

---

# 9. Invitation model

## Permanent public church entry

The permanent church QR/link remains separate from person-specific invitation expiry.

It may create a guest account relationship but never privileged authority.

## Direct person invitation

Reuse `church_invites` for known-person account invitation/activation.

Package 2 changes the role behavior:

- new direct account invitation grants only safe base member authority;
- intended leadership responsibility may be stored/displayed as non-authorizing context if needed;
- Pastor/Admin assigns functional responsibilities after the account is active/verified;
- Finance/Platform/Pastor/Admin authority cannot be embedded in public onboarding.

## Friendship Group / event / leader links

Use the non-privileged source context from Package 1 / Package 3 rather than turning every share link into an account-role invitation.

---

# 10. Progressive bilingual onboarding

## First step

Keep initial account/join friction low:

- first name
- last name
- email for account creation
- password / normal Auth requirements
- optional phone
- language
- required source context resolved automatically

No giant church questionnaire before account access.

## Start Here

After account/church relationship:

- confirm language;
- explain that the person is connected to the church;
- show one obvious next action;
- optionally continue profile now;
- allow “do this later” on non-required questions.

## Progressive profile prompts

Small, contextual groups such as:

- contact/profile completion
- birthday
- marriage/household
- baptism / Holy Ghost self-report
- Friendship Group interest/request
- First Steps / learning history
- ministry interests / skills

Do not force sensitive spiritual or household questions to reach Home.

No disruptive repeated popups. Use contextual prompts and My Journey / profile completion suggestions.

---

# 11. Self-reported vs verified milestones

Do not write onboarding answers directly into official verified fields.

## Baptism / Holy Ghost

Member choices may include:

- Yes
- No
- Unsure
- Prefer to answer later

Store self-report distinctly from official verified `member_milestones.baptized` / `holy_ghost_received` facts.

Preferred implementation: add self-report status/timestamp fields within the existing milestone domain rather than resurrecting the legacy `member_private_details` spiritual columns or creating a competing milestone table.

Example concepts:

- `baptism_self_report_status`
- `baptism_self_reported_at`
- `holy_ghost_self_report_status`
- `holy_ghost_self_reported_at`

“Unsure” can create a discipleship/follow-up signal; it is not an official negative church record.

## First Steps / Effective Soul Winning

Actual completion remains verified through Learning / approved manual equivalency. Onboarding may ask about history to help leadership review, but a member cannot self-certify official completion.

---

# 12. Preferred language / communication preferences

Critical onboarding states are bilingual from the first screen.

Initial languages:

- English
- Spanish

Preferred language should become structured canonical account/profile data rather than living only in transient UI state. Auth metadata may remain a compatibility cache while canonical profile/member storage is introduced.

Communication consent/preferences should reuse existing Outreach/account settings where possible. Do not create duplicate consent authorities.

Automated communications remain provider- and consent-aware; paid SMS/email is not required for core onboarding.

---

# 13. Onboarding leadership view

Authorized leadership should see a small actionable queue, not an Auth-admin console.

Examples:

- invitations still open
- accounts started but not finished
- identity links needing review
- inactive returning member requests
- people who completed onboarding recently

Do not display private Auth/provider details or raw backend errors.

This later feeds Church Health “needs attention” rather than creating a second reporting system.

---

# 14. Real Madera role flows

## New guest with no account

Package 1 connect card → optional Create Account → email confirmation → safe history link → Start Here → Home → optional profile/household.

## Existing Outreach contact

Create account through linked invitation or safe claim context → verified identity → same Outreach history connected → no duplicate guest/member.

## Existing account opening church link

Sign in with the same account → join church safely → no second account → Start Here / appropriate existing-member path.

## Returning inactive member

Same account recognized → no public auto-reactivation → clear restoration request/review → history preserved.

## Parent / household adult

Complete own account → create household → add child/spouse without fake Auth account → invite adult spouse to claim later if desired.

## Child/youth

Exists as protected household member without independent login for initial pilot; no fake email/account required.

## Leader invitee

Receives normal safe account invitation → joins as base member → authorized church leader assigns actual responsibility/permissions after connection.

## Pastor/Admin

Reviews invitations, identity ambiguity, returning-member restoration and household/member issues with church-scoped authority.

---

# 15. Failure / uncertainty states

Every critical route must support:

- loading
- signup disabled/paused
- invalid/expired/revoked invite
- account already exists
- confirmation required
- forgot/reset password
- existing-account church join
- identity review pending
- returning inactive member
- failed/uncertain save
- retry after temporary backend failure
- completed
- English/Spanish
- mobile/private-browser reality

Rules:

- read failure is not “no account/no profile/no invitation”;
- write uncertainty is not success;
- never encourage a second account to escape an error;
- safe join/invitation context survives recoverable Auth flows;
- no raw provider/database text to ordinary users.

---

# 16. Package 1 interface

Package 1 owns guest stewardship; Package 2 owns account identity.

Required handoff:

- Package 1 returns/maintains canonical Outreach contact + source/history;
- Package 2 links that contact to verified account UUID;
- signup creates a new attributed interaction, not a replacement first source;
- unresolved identity stays safely unlinked until review;
- source/referrer/intended group survives account creation;
- actual group membership remains Package 3.

---

# 17. Package 3 / Journey / Learning interface

## Friendship Groups

- intended group from a source link may preselect a join request;
- it never inserts roster membership without the group approval rules;
- exact home address remains hidden until approved/joined authority allows it.

## My Journey

- profile and self-report data feed the canonical Journey view;
- verified milestones remain distinct;
- returning member keeps history.

## Learning

- First Steps/ESW history asked during onboarding is not official completion unless verified by canonical Learning/manual-equivalency rules.

---

# 18. Implementation slices

## Slice A — identity-link security repair

- remove phone-only auto-claim from account creation/join;
- unique verified-email linking only after appropriate verification;
- ambiguous same-church match → identity review;
- regression tests for cross-church/phone spoof/ambiguous cases;
- preserve PR #55 Auth reliability behavior.

## Slice B — base-role invitation repair

- stop issuing new legacy functional base roles through invitations;
- invite as base member;
- preserve intended responsibility as non-authorizing context only if needed;
- coordinate with shared role/RLS owner.

## Slice C — canonical onboarding state

- add church-scoped onboarding state/timestamps to membership;
- migrate Start Here routing/read behavior safely;
- keep Auth metadata compatibility until proven;
- add preferred-language canonical storage if needed.

## Slice D — progressive profile + self-report

- small optional profile steps;
- self-report baptism/Holy Ghost separate from verified official facts;
- follow-up signal for `Unsure` where useful;
- no giant required form.

## Slice E — household/no-account family

- evolve `household_members` relationship identity;
- allow unclaimed row safely;
- narrow own-household server actions;
- guardian/primary-contact privacy;
- adult claim flow;
- youth independent login remains deferred unless separately verified.

## Slice F — returning/inactive member

- clear same-account restoration request path;
- no automatic privileged-role restoration;
- preserve history.

## Slice G — leader/admin review + human proof

- identity review queue;
- invitations/onboarding state;
- returning request;
- EN/ES mobile flow;
- security and tenant proof.

---

# 19. Explicit non-goals

- network-wide universal identity federation
- a second standalone Person database
- fake Auth accounts for children
- paid SMS keyword onboarding
- legal/compliance guarantees
- automatic privileged-role restoration
- automatic group membership
- bulk irreversible duplicate merges
- Finance/RLS redesign
- full Friendship Group OS
- full Church Health redesign
- advanced AI onboarding actions

These do not block the Madera pilot.

---

# 20. Acceptance criteria

## FUNCTIONAL

- new person can create account and join church;
- existing account can join without duplicate account;
- direct invite works;
- existing Outreach history can link safely after verification;
- ambiguous/phone-only match does not auto-claim;
- Start Here state persists canonically;
- household can contain a no-account child/spouse;
- adult household member can later claim/link without duplicate family row;
- returning inactive member gets a real restoration path.

## CONNECTED

- Outreach source/history survives signup;
- `member_user_id` links one canonical history after verification;
- church relationship is separate from source/referral;
- intended FG remains a request/context, not membership;
- self-report flows into Journey without faking verified milestones;
- official Learning completion remains separate from onboarding claims;
- Church Health can derive onboarding/identity-review/stalled states from canonical data.

## SECURE

- typed phone alone cannot claim existing Outreach history;
- multiple candidates fail closed;
- church A account cannot claim church B history;
- public source link cannot grant membership role/group/private address;
- invitation cannot create new legacy/privileged base authority;
- household adult cannot read another adult’s protected private details merely because of household relation;
- minor/unclaimed family data is protected;
- Auth/membership/read uncertainty fails closed;
- no raw provider error shown;
- identity/review actions are audited.

## SIMPLE

- one account only;
- minimal first signup;
- no forced giant profile;
- clear “we may already know you” language without revealing private facts;
- clear returning-member path;
- easy add-family experience;
- English/Spanish on every critical state;
- user always knows the next step.

## TESTED

Automated/focused proof includes:

- new signup
- existing account public join
- duplicate-account warning
- confirmation resend
- forgot/reset password with join context
- unique verified-email Outreach link
- spoofed phone does not link
- multiple-candidate ambiguity
- cross-church claim denial
- expired/revoked invite
- invitation base-role restriction
- Start Here save certainty
- canonical onboarding-state persistence
- household create/add/claim
- adult household privacy
- minor/no-account behavior
- returning inactive member
- no official milestone overwrite from self-report
- EN/ES critical states
- lint/build/security regression gate.

## VERIFIED

Real-phone Madera proof on exact candidate:

- new user EN/ES: join → confirmation → Start Here → Home;
- sign out/in same account;
- existing account opens newest church link and joins without duplicate;
- existing Outreach guest creates account and keeps history;
- phone-only possible match does not steal/link history;
- ambiguous identity lands in safe review;
- parent adds child without fake account;
- adult spouse claim preserves one household relation;
- inactive returning member gets restoration path;
- normal new invitee cannot obtain leader/admin authority from invitation;
- Pastor/Admin can resolve review with correct audit;
- no false success/empty state or provider text.

Only then is Package 2 VERIFIED / eligible for combined release handling.

---

# 21. Implementation path / Base44 credit decision

## Primary target

**Direct Next.js + Supabase work.**

Reason:

- Auth and canonical identities already live there;
- the strongest current join/recovery hardening is there;
- identity security must be enforced at the Supabase/RLS/RPC boundary;
- moving onboarding authority to Base44 would create a second account/person system.

## Base44 reuse

Use Base44 as design evidence for:

- Person-without-login concept → adapted into no-account household relationship rows;
- progressive member profile concepts;
- Guest/account handoff UX;
- low-tech bilingual patterns.

**No new Base44 Builder prompt is needed to begin Package 2 implementation.**

---

# 22. Planning-ready gate

- [x] Existing auth/join/invite implementation mapped.
- [x] Canonical account-backed identity locked.
- [x] Pre-account Outreach authority locked.
- [x] Unsafe phone/ambiguous auto-link identified and repair defined.
- [x] Legacy invitation-role conflict identified and repair defined.
- [x] Church-scoped onboarding state defined.
- [x] No-account household/child approach defined without universal Person table.
- [x] Returning-member behavior defined.
- [x] Self-report vs verified milestone boundary defined.
- [x] Package 1/3/4/5/6 interfaces defined.
- [x] Member/guest/parent/leader/admin human flows written.
- [x] EN/ES/mobile/error/uncertainty states covered.
- [x] Acceptance criteria written through VERIFIED.
- [x] Direct repo implementation path selected.
- [x] Base44 credit gate resolved: no new prompt needed initially.
- [x] Pilot scope bounded.
- [x] No production data/schema/RLS/Auth/deployment change performed during planning.

## Final Package 2 decision

**PACKAGE 2 IS PLANNING READY.**

Implementation must preserve the verified PR #55 Auth/recovery foundation, remove unsafe account-history auto-linking, stop new legacy functional-role preassignment, introduce church-scoped onboarding state, and extend the existing household relationship model for no-account family members without creating another canonical Person database.
