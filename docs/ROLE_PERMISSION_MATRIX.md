# Kingdom Network — Role / Permission Matrix

This is the intended product-level permission model. Database RLS/policies remain the enforcement source of truth.

Legend:

- **Own** — own records only
- **Group** — records for groups the user leads/assists
- **Ministry** — records for ministries the user manages
- **Church** — authorized local church scope
- **Aggregate** — counts/summary only, no underlying private identities
- **None** — no automatic access

## Local church roles

| Area | Member | Group Leader | Ministry Leader | Minister | Pastor | Church Admin |
|---|---|---|---|---|---|---|
| Own profile/privacy | Own | Own | Own | Own | Own | Own |
| Church Directory | Member-visible | Member-visible | Member-visible | Member-visible | Church | Church |
| Private member contact/admin data | Own | Own | Own | Own | Church | Church |
| Verified member milestones | Own read | Own read | Own read | Own read | Church manage | Church manage |
| Community feed | Church participate | Church participate | Church participate | Church participate | Church moderate | Church moderate |
| Private messages | Participant | Participant | Participant | Participant | Participant | Participant |
| Reported-message evidence | Own reports | Own reports | Own reports | Own reports | Church review | Church review |
| Public Prayer/Testimony | Church participate | Church participate | Church participate | Church participate | Church participate | Church participate |
| Pastoral Care | Own | Own | Own | Own | Church review | Church review |
| Group discovery | Church | Church | Church | Church | Church | Church |
| Group private address | Group membership | Group | Group membership | Group membership | Church | Church |
| Group roster | Group / church-visible rules | Group manage | Group / church-visible rules | Group / church-visible rules | Church | Church |
| Group join requests | Own | Group review | Own | Own | Church | Church |
| Group reports | None | Group | None | None | Church | Church |
| Learning Center | Own | Own | Own | Own | Own | Own |
| Learning Studio | None | None | None | Church authoring | Church authoring | Church authoring |
| Learning leadership scorecards | None | None | None | Limited/feature-defined | Church | Church |
| Resource Library | Member-visible | Member-visible / upload by policy | Ministry/leader | Authoring | Church | Church |
| Outreach | Own/assigned | Expanded leader scope | Expanded leader scope | Church-authorized | Church | Church |
| Ministry opportunities | Apply | Apply | Ministry manage | Church-authorized | Church | Church |
| Team assignments | Own | Own | Ministry manage | Church-authorized | Church | Church |
| Calendar / RSVP | Church read/own RSVP | Church read | Local event manage | Local event manage | Church manage | Church manage |
| Documents | Own | Own | Own | Feature-defined | Church review | Church review |
| Official Updates | Read | Read | Read | Create/manage | Create/manage | Create/manage |
| Fundraising | Read/participate as designed | Read | Ministry/feature-defined | Church-authorized | Church manage | Church manage |
| Church invitations | None | None | None | None | Church | Church |
| Church data imports/exports | None | None | None | None | Church | Church |
| Audit history | None | None | None | None | Church | Church |
| Pilot readiness | None | None | None | None | Church | Church |

## District Admin

District Admin is a role attached to an active membership in a church that belongs to the district.

Allowed district-level capabilities:

- District settings
- District-wide events
- District-wide updates
- Aggregate church counts/health metrics
- Public church/discovery information within the district

District Admin does **not** automatically receive:

- Other churches' member rosters
- Other churches' private member contact details
- Pastoral Care records
- Private messages
- Member document files
- Outreach private notes
- Friendship Group private home addresses
- Local audit history
- Local member-management tools

## Organization Admin

Organization Admin is attached to an active membership in a church that belongs to the organization.

Allowed organization-level capabilities:

- Organization settings
- Organization-wide events
- Organization-wide updates
- Aggregate district/church health counts
- Organization/district/church hierarchy information

Organization Admin does **not** automatically receive local private records.

## Finance Admin

Finance functionality is intentionally incomplete in the current Alpha. The presence of a `finance_admin` role does not mean every finance feature is built or that finance permissions should be inferred broadly.

Future finance rules should follow least privilege and should not be mixed into ordinary church-admin exports or member profiles.

## Messaging rule

No role, including Pastor, Church Admin, District Admin or Organization Admin, receives blanket access to direct-message threads.

A pastor/church admin may review **only a specifically reported message snapshot** and associated report metadata.

## Pastoral Care rule

Pastoral Care is local-church scoped. District/organization hierarchy does not grant access.

## Learning/credential rule

A member may complete learning activity, but leadership-controlled verified milestones/qualifications remain separate from self-completed progress where verification is required.

## Future feature checklist

Before granting a role access to a new feature, answer:

1. What tenant owns this record?
2. Is access individual, group, ministry, church, district or organization scoped?
3. Does an upper hierarchy genuinely need row-level details, or only aggregate metrics?
4. Is this record sensitive enough to require a special workflow instead of inherited access?
5. Can the rule be enforced in RLS/constraints/triggers rather than only hidden UI?
6. Does the change accidentally create a back door around an existing privacy promise?
