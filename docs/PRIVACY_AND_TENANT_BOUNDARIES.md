# Kingdom Network — Privacy & Tenant Boundaries

This document records the privacy rules the product architecture must preserve as Kingdom Network grows from one pilot church into a multi-tenant platform.

## Tenant hierarchy

Kingdom Network → Organization → District → Local Church → Ministry / Group → Member

Higher hierarchy does **not** automatically mean broader access to every lower-level record.

## Local Church is the primary private-data boundary

The following records remain scoped to the local church unless a future feature creates a deliberate, auditable escalation workflow:

- Member private contact/account details
- Leadership-verified member milestones
- Pastoral-care requests and pastoral notes
- Private one-to-one messages
- Private member documents / certificate files
- Outreach private notes and prayer requests
- Friendship Group private meeting addresses and access instructions
- Church membership administration
- Local audit history
- Local ministry qualification/application review

District and Organization administrators do not receive automatic row-level access to those records.

## District access

District administrators may receive:

- District identity/settings administration
- Aggregate church metrics
- District-wide events
- District-wide announcements
- District-level public church discovery information

District aggregate metrics may include counts such as active members, groups and events. Aggregate access must not expose the underlying member identities.

## Organization access

Organization administrators may receive:

- Organization identity/settings administration
- Aggregate district metrics
- Organization-wide events
- Organization-wide announcements
- Organization/district/church hierarchy information

Organization aggregate metrics must not provide an automatic path into local member rosters or private records.

## Event scope

Every event must belong to exactly one tenant scope:

1. Local Church, or
2. District, or
3. Organization

The database enforces exactly one non-null event scope. Event visibility and RSVP visibility follow that scope.

## Private messaging

- A direct conversation is participant-only.
- Pastors/church admins do not have a universal private-message inbox.
- Members may block other members.
- Member messaging preferences are enforced in the database.
- If a participant reports a message, leadership receives a snapshot of that specific reported message plus the report reason.
- Reporting does not expose the surrounding private thread.

## Pastoral Care

- A care request is readable by its requester and authorized local pastoral/church administration.
- Pastoral notes are not part of the public Prayer/Testimony Wall.
- Pastoral Care is excluded from church bulk CSV export by default.
- A member’s personal-data export may include care records that the member’s own account is authorized to read.

## Prayer & Testimony Wall

- Public prayer requests and testimonies are local-church community content.
- Members choose to share them with the church.
- Public prayer requests may receive the shared `praying` reaction.
- Prayer authors may mark a public prayer request answered.
- Private/sensitive prayer needs should use Pastoral Care instead.

## Groups

Public/discovery group data may include:

- Name
- Type
- General area
- Day/time/frequency
- Language
- Capacity / accepting-members state

Private group data may include:

- Exact home address
- Gate/access instructions
- Private group reports

Private group details are member/leader/local-admin scoped, not public discovery information.

## Member profiles

Member-controlled profile settings include:

- Directory visibility
- Contact-email visibility
- Verified-credential visibility
- Learning-trophy visibility
- Direct-message preference

Authentication/login email remains separate from the member-facing contact email.

## Learning credentials vs gamification

Verified church credentials and fun learning trophies are different concepts.

- Verified credentials represent church-recognized preparation/readiness.
- Learning trophies/XP/streaks/games encourage study.
- Baptism, receiving the Holy Ghost, prayer, giving, holiness, attendance and other spiritual/salvation milestones are not game points.

## Resource authority

Kingdom Guide and Resource Library must preserve source authority. Sources are not treated as equally authoritative.

Typical authority order:

1. Official Organization / Assembly source
2. District source
3. Local Church approved/current curriculum
4. Ministry / leader resource
5. Legacy / reference material

Legacy material may inform future lesson development but must not silently appear as current approved teaching.

## Data exports

Church-wide operational CSV exports are pastor/church-admin only.

Bulk church exports intentionally exclude by default:

- Private message bodies
- Pastoral-care records
- Group private home addresses/access instructions
- Uploaded private document file bytes

Member personal-data export is account-specific and does not become a route into other members’ data.

## Development rule

When adding a feature, ask first:

> What is the narrowest tenant and role that genuinely needs this data?

Prefer explicit access grants over inheritance from a higher title. Database RLS/triggers/constraints should enforce the important boundary rather than relying only on hidden UI controls.
