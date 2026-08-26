# Kingdom Network — Onboarding, Identity & Invitations Package

Prepared: 2026-08-26
Status: PLANNING READY — implementation waits until the current Evangelism package is verified and released into the coordinated integration queue.
Deployment: HOLD

## Purpose

This package defines the next Kingdom Network workstream after Evangelism: a source-aware, duplicate-safe, bilingual onboarding system that writes into one unified person/member record rather than creating disconnected records.

The goal is simple: a guest, member, spouse, youth, leader invitee, event attendee, or Friendship Group contact should be able to enter Kingdom Network with very little friction while the church preserves referral/source history, prevents duplicate records, protects identity, and routes the person into the correct next step.

## Core architectural rule

Onboarding is not its own disconnected database island. It is an entry point into the same unified person record used by Evangelism, Friendship Groups, Learning, Serving, Households, Journey, Pastoral Care, and Church Health.

Information should be entered once and reused everywhere the user is authorized to see it.

## Package outcomes

When this package is complete, Kingdom Network should support:

- General church join link and permanent church QR.
- Source-aware links/QR codes for events, Friendship Groups, leaders, outreach campaigns, and other approved contexts.
- First-touch and later-touch attribution.
- Referral tracking such as "invited by [leader]" without confusing referral with actual group membership.
- Existing-person/profile claim flow.
- Duplicate detection before creating a new profile.
- Safe verification before profile claiming or merging.
- Returning/archived member reconnection.
- Progressive bilingual onboarding in English and Spanish.
- Household/family linking without creating fake login accounts.
- Minor/youth handling with guardian linkage and church-configurable policy.
- Communication preference and consent capture.
- Onboarding lifecycle/status tracking.
- Member-safe registration that never allows self-assignment of privileged church roles.
- Soft profile-completion prompts without forcing pastorally sensitive information.
- A structure that can later accept SMS keyword entry without making paid SMS infrastructure part of the core pilot.

---

# 1. Source-aware links and QR codes

## Supported source contexts

Every public join link/QR should use the same underlying signup experience while preserving context metadata.

Initial source types:

- General church
- Sunday/service
- Friendship Group
- Event
- Outreach activity
- Leader referral
- Ministry/community referral
- Manual/admin invite

## Suggested source metadata

Each entry context should be able to carry or resolve:

- church_id
- source_type
- source_label
- source_context_id where applicable
- referring_user_id/person_id where applicable
- intended_group_id where applicable
- event_id where applicable
- campaign/outreach identifier where applicable
- source_created_at

Do not expose internal IDs in a way that permits cross-church tampering. Public tokens/slugs must resolve server-side and be scoped to one church.

## Attribution rules

Preserve two concepts separately:

### First-touch attribution
The earliest reliable source that introduced the person to Kingdom Network/the church funnel. This should not be overwritten by later joins.

### Latest/current-touch attribution
The latest relevant source or invitation that brought the person back into an active workflow.

Example:
- First captured at Outreach in May.
- Later invited by Marcus to a Friendship Group in August.
- First-touch remains Outreach.
- Latest-touch becomes Marcus / Friendship Group.

## Referral is not membership

A group/leader QR may preselect or recommend a Friendship Group, but scanning it must not automatically make the person an approved group member.

Track separately:

- invited_by
- intended_group
- requested_group
- approved/actual group membership

Actual membership follows Friendship Group rules and leadership approval where required.

---

# 2. Unified identity/person record contract

Before implementation, confirm the existing canonical person/member model and lock the minimum fields needed by every downstream system.

The person record should represent a human being even if that person does not yet have a login account.

Minimum identity/contact concepts:

- canonical person ID
- church_id / tenant scope
- first name
- last name
- preferred name if supported
- normalized phone
- normalized email
- birth date or age-related data when voluntarily supplied/required by policy
- preferred language
- membership/relationship state
- linked auth user/account ID when claimed
- household relationship references
- active/archived status
- created source / first-touch source
- latest relevant source
- consent/contact preferences

A login account is an access credential linked to a person record. It is not the person record itself.

---

# 3. Claim-your-profile flow

## Why it exists

Leaders will often create lightweight guest/member records before the person creates an account. Later signup must attach the new account to the existing person instead of creating another person.

## Safe flow

1. User enters phone/email during signup.
2. System checks normalized identifiers within the same church/tenant.
3. If no safe candidate exists, continue with new-person creation.
4. If a possible match exists, offer a neutral "We may already have a profile for you" path.
5. Verify ownership/control of the matching phone/email or use an approved church-admin review path.
6. After verification, link the auth account to the existing person record.
7. Preserve historical source, attendance, outreach, learning, notes, and other related records.
8. Record the claim/link event in audit history.

## Important security rule

Phone/email similarity alone must never automatically grant access to an existing profile.

Possible match != verified identity.

## Ambiguous matches

If multiple records match or the information is incomplete:

- do not auto-merge
- create a duplicate-review/admin task
- allow the user to continue with a safe temporary state only if it will not expose another person's private information

---

# 4. Duplicate detection and merge protection

## Pre-create checks

Before creating a new person profile, compare within the same church against:

- normalized phone
- normalized email
- existing pending signup registrations
- archived/inactive person records
- invited/unclaimed profiles

Name alone should not be treated as a reliable identity key.

## Duplicate handling outcomes

- Exact safe match -> offer claim flow.
- Possible/ambiguous match -> review state.
- Archived returning member -> welcome-back/reconnect flow.
- No match -> create new person/profile.

## Merge rules

Merges should:

- require authorized review when identity is uncertain
- retain source and activity history
- preserve the canonical person ID chosen for the survivor record
- re-point allowed related records safely
- avoid deleting ministry/history records merely to clean duplicates
- create an audit event describing what was merged

No irreversible production merge should happen without explicit permissions and a safe recovery strategy.

---

# 5. Returning / archived member flow

Kingdom Network should recognize a person who previously attended or was archived.

Suggested flow:

"It looks like you may already have history with this church. Welcome back."

Then:

- verify identity
- reconnect to the existing person record
- preserve prior Journey, attendance, classes, group history, service history, and authorized notes
- restore/reopen relationship status according to church rules
- create a re-engagement/follow-up event for the appropriate leader when useful

Do not create a fresh record that erases the person's prior history.

---

# 6. Onboarding lifecycle/state machine

Track onboarding explicitly so leadership knows where people are getting stuck.

Suggested states:

- invited
- signup_started
- possible_match
- identity_verification_required
- identity_verified
- profile_claimed
- profile_created
- onboarding_in_progress
- active
- abandoned
- expired_invitation
- declined_invitation
- duplicate_review_required
- archived_returning_member

Exact DB implementation may use enums/status fields or related workflow records; avoid unnecessary tables if current structures already cover these concepts.

## Leadership use

Authorized leaders should be able to see a simple queue such as:

- 4 people invited but not started
- 2 started but did not finish
- 1 duplicate/profile claim needs review
- 3 completed onboarding this week

This should later feed Church Health and follow-up reporting.

---

# 7. Signup experience

## Front-door requirements

The first page should be extremely simple and bilingual.

Required at first step only:

- first name
- last name
- phone and/or email
- language selection
- source context is captured automatically when present

Do not force a large church profile questionnaire before account creation.

## Progressive completion

After initial entry, invite the person to add more information in small groups.

Possible prompts:

- birthday
- spouse/family
- Friendship Group interest
- baptism status
- Holy Ghost status
- First Steps / class history
- ministry interests
- preferred contact method

Allow skip/"share later" on optional fields.

For baptism/Holy Ghost, support church-approved choices such as:

- Yes
- No
- Unsure
- Prefer to answer later

Do not present spiritual milestones as a required technology gate.

## Completion indicator

A gentle profile progress indicator may be useful, but the product should emphasize next useful actions rather than chasing 100% completion.

Example:

"You're ready to get started."

Then one contextual suggestion at a time.

No disruptive nagging popups.

---

# 8. Household-aware onboarding

## Add family without forcing accounts

During onboarding, allow a user to indicate:

- spouse
- child
- parent/guardian
- other household relationship as church policy permits

Creating a family relationship should create/link Person records, not automatically create independent auth accounts.

Adults may later claim their own profiles.

Children may remain linked records under appropriate guardian/church access until independent login is allowed.

## Household matching

When adding a spouse/family member:

- check for an existing person before creating another
- preserve household relationships separately from authentication
- keep private information scoped correctly; one household member should not automatically receive unrestricted access to another adult's protected information

---

# 9. Minors / youth front-door policy

Design this now even if independent minor accounts are not enabled during the first pilot.

Minimum concepts:

- age/date-of-birth awareness where provided
- parent/guardian relationship
- guardian contact information
- guardian consent when policy requires it
- church-configurable minimum age for independent account access
- restricted treatment of sensitive/private data
- no privileged role self-assignment
- safe youth communication/contact policies

Recommended initial pilot posture:

Create/link child/youth Person records through households and leader/admin workflows first. Enable independent youth accounts only when guardian and permission rules are verified.

Do not invent legal requirements inside the product; make the church/organization policy configurable and get legal review before claiming statutory compliance.

---

# 10. Language

Language selection must be visible at the first public join screen.

Initial supported languages:

- English
- Spanish

Every critical state must be bilingual:

- join page
- invalid/expired source link
- possible existing profile
- verification prompt
- signup success
- error/retry state
- invitation status
- household/minor guidance
- consent/contact preferences

Store preferred language on the person/account so downstream Evangelism, Learning, and communication flows can use it.

---

# 11. Communication consent and preferences

Onboarding should capture simple, human-readable communication preferences without making signup feel like a legal form.

Possible choices:

- Text message
- Email
- Phone call
- App notification

Store enough history to know:

- what channel was allowed/declined
- when the choice was recorded
- source/context of the consent when needed

All automated Evangelism/Onboarding messages must respect existing consent and provider configuration.

Do not make consent to optional marketing-style communication a requirement for church access.

---

# 12. Roles and permissions

Registration may create/claim a person/member account, but public signup must never allow a person to self-assign privileged roles.

Protected roles/access include, at minimum:

- Pastor
- Church Admin
- Finance Admin
- Leader roles that expose other people's records
- Platform Owner / network-level administration

A leader invitation may carry an intended/requested assignment, but activation of privileged authority must still pass the existing church role/permission system.

The permission boundary must be identical whether onboarding occurs through:

- QR
- link
- leader invite
- event signup
- admin claim
- future SMS entry

---

# 13. Invitation management

Authorized leaders/admins should be able to create invitations appropriate to their scope.

Suggested invitation types:

- General church join
- Specific person invitation
- Friendship Group invitation
- Event invitation
- Ministry/community invitation
- Leadership/account activation invitation (privileged assignment still requires authorization)

Invitation records should support:

- church scope
- inviter
- intended context
- created time
- expiration where appropriate
- accepted time
- declined/expired state
- linked resulting person/account when completed

Permanent general church QR/link should not depend on a short-lived person-specific invitation token.

---

# 14. SMS keyword entry — deferred optional layer

Desired future experience:

Text a keyword such as JOIN to a church number -> receive a secure join link -> continue through the same onboarding pipeline.

Do not make this required for the core pilot because it introduces:

- provider dependency
- recurring/usage cost
- opt-out handling
- messaging consent requirements
- delivery failure behavior

Pilot solution:

- QR -> web onboarding
- leader texts/shares the web link manually -> web onboarding

Later paid/runtime feature:

- SMS keyword -> same web onboarding context

The core onboarding package must work fully without paid SMS infrastructure.

---

# 15. Integration with Evangelism

Onboarding and Evangelism must meet at the same person/contact identity.

When an outreach contact signs up:

- match/claim the existing contact/person
- preserve first-touch source
- record signup as a new interaction/touch
- retain referring leader/group/event context
- close or advance appropriate Evangelism follow-up stage
- avoid creating a second person

When a new public signup has no prior outreach record:

- create the unified person record
- create the appropriate Evangelism/connection history entry if church workflow expects it
- assign initial follow-up only according to configured church rules

Onboarding must not silently erase or replace Evangelism source history.

---

# 16. Integration with Friendship Groups

Source-aware group QR/link behavior:

- remember invited-by leader
- remember intended/requested group
- create or match the person
- do not auto-grant group membership unless the church explicitly configures an approved auto-join policy
- place appropriate join/request item into the Friendship Group workflow

After approval, the actual group membership becomes canonical and is visible in the unified person/member record.

---

# 17. Integration with My Journey / member record

Onboarding answers should write to the canonical member/person data model only when the user is permitted to report/update that field.

Pastorally sensitive or church-verified milestones should preserve the distinction between:

- self-reported
- leadership reviewed/verified
- unknown/unsure

Do not convert a self-reported signup answer into a leadership-verified church fact unless the current milestone model explicitly supports that transition.

---

# 18. Privacy, tenant isolation and audit

Every lookup, match, invitation, claim and merge must be scoped by church/tenant unless explicitly designed for approved network behavior.

Public endpoints must never reveal whether an arbitrary email/phone belongs to a named church member beyond the minimum safe language needed to complete verification.

Sensitive operations to audit:

- invitation created
- invitation accepted
- existing profile claimed
- account linked/unlinked
- duplicate merge approved
- archived member restored/reconnected
- privileged role assignment requested/approved
- guardian relationship created/changed where appropriate

Follow existing Kingdom Network fail-closed behavior when Auth, membership, or tenant authorization is uncertain.

---

# 19. UX states that must exist

Every main onboarding path must have:

- loading state
- invalid/expired link state
- church signup disabled state
- temporary server/read failure retry state
- possible existing profile state
- verification-required state
- duplicate-review state
- successful completion state
- signed-in existing-account path
- safe cancellation/back navigation
- English and Spanish messaging
- mobile-first layout

No dead ends.

---

# 20. Suggested implementation slices

## Slice A — Schema/contract audit and lock

Before adding UI fields:

- inventory existing person/member/auth/outreach/household/signup/invitation structures
- decide canonical person identity
- identify which existing columns can be reused
- identify missing source attribution, claim status, invitation and guardian/household concepts
- verify tenant/RLS boundaries
- document migration plan before applying schema changes

Deliverable: approved data contract + migration plan.

## Slice B — Source-aware invitation context

- general church link/QR
- leader/group/event source context
- first-touch/latest-touch persistence
- inviter/intended group metadata

## Slice C — Duplicate detection + claim flow

- normalized identifier matching
- safe verification
- existing person claim
- ambiguous duplicate review queue
- archived returning member flow

## Slice D — Progressive bilingual signup

- minimal first step
- EN/ES
- preferences/consent
- profile continuation
- gentle completion prompts

## Slice E — Household/minor support

- add/link spouse/children
- guardian relationship
- youth account policy gates

## Slice F — Admin/leader invitation management

- create/share invitations
- view status
- resend/revoke/expire where appropriate
- invitation acceptance history

## Slice G — End-to-end cross-system validation

Validate real flows:

1. brand-new first-time guest from general QR
2. guest already entered in Evangelism claims profile
3. leader-specific referral QR
4. Friendship Group QR and join request
5. event QR source attribution
6. duplicate phone/email attempt
7. archived former member returns
8. spouse/household entry
9. minor/guardian path
10. Spanish signup
11. signed-in user joins church
12. temporary backend/Auth failure
13. public link for disabled signup
14. invitation expired/revoked

---

# 21. Acceptance criteria

This package is not complete until all of the following are true:

- A new person can join from a general church QR/link on mobile.
- Context-specific QR/link attribution is preserved.
- First-touch attribution is not overwritten by later touches.
- Referral/intended Friendship Group is separate from actual group membership.
- Existing Evangelism/person records are detected before duplicate creation.
- Claiming a profile requires verification or authorized review.
- Archived people can reconnect without losing history.
- Login accounts link to Person records rather than replacing them.
- Public signup cannot self-grant privileged roles.
- EN/ES critical flows are functional.
- Household relationships do not create fake accounts automatically.
- Minor/guardian policy is safely represented.
- Contact preferences/consent are stored and honored by downstream automation.
- Loading, error, invalid-link, success and retry states work on mobile.
- Tenant isolation/RLS tests pass.
- Security regression tests pass.
- Lint passes.
- Production build passes.
- Real-phone English acceptance passes.
- Real-phone Spanish acceptance passes.
- No production deployment occurs without Marcus's combined-deployment approval.

---

# 22. Out of scope for the first implementation batch

Unless separately approved, do not let this package expand into:

- paid SMS keyword infrastructure
- advanced marketing campaigns
- network-wide identity federation between churches
- automatic privileged role assignment
- irreversible bulk duplicate merges
- full legal/compliance claims for youth/minor policy
- redesign of unrelated Finance or role/RLS systems
- full Friendship Group operating-system build (only onboarding handoff into it)
- Church Health redesign beyond exposing onboarding data needed by existing reporting

---

# 23. Handoff to the following package

Once Onboarding/Identity/Invitations is VERIFIED, the next major package should be the Friendship Group operating system.

That package should treat the weekly report as a connected workflow rather than a digital copy of paper:

- auto-populate known attendance
- guest entries create/match Evangelism contacts
- Bible-study activity updates the correct records
- baptism/Holy Ghost reports create appropriate milestone updates/review items
- urgent matters/prayer needs route to authorized pastoral workflows
- praise reports may optionally be proposed for Community sharing
- the system produces a leader-facing list of follow-up actions before final submission

The unified person record created/claimed during onboarding is the identity foundation that makes those cross-system updates reliable.
