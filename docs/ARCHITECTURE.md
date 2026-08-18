# Kingdom Network — Architecture Overview

## Product purpose

Kingdom Network combines:

- Church social network
- Discipleship / Learning Center
- Church operating system
- Outreach CRM
- Ministry qualification and serving
- Groups and reporting
- Events and schedules
- Member records and verified milestones
- Resource library
- Pastoral care
- Fundraising tracking
- Multi-level organization/district/local-church networking

The pilot tenant is New Life Madera. The architecture is designed to grow beyond one church without rewriting the product around a single congregation.

## Application stack

- Next.js App Router
- TypeScript
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Row Level Security (RLS)
- Vercel deployment
- GitHub source control

## Tenant hierarchy

```text
Kingdom Network
└── Organization
    └── District
        └── Local Church
            ├── Ministries
            ├── Groups
            ├── Courses / Resources
            └── Members
```

The hierarchy is organizational. It is not an automatic private-data inheritance chain. See `PRIVACY_AND_TENANT_BOUNDARIES.md`.

## Core identity model

### Auth user

Supabase Auth owns the authentication identity.

### Profile

`profiles` contains member-facing profile data and privacy preferences.

### Private member details

`member_private_details` contains account/contact data that is not treated as a public member profile.

### Church membership

`church_memberships` connects a user to a local church and defines the church role/status.

### Verified milestones

`member_milestones` is leadership-controlled. Members do not self-award verified spiritual/training milestones.

## Role families

Local church roles currently include:

- member
- group_leader
- ministry_leader
- minister
- pastor
- church_admin
- finance_admin
- district_admin
- organization_admin

Role permission should be scoped to the feature. A higher-sounding title must not become an accidental universal private-data permission.

## Member experience modules

### Home

Personalized launch surface:

- Church branding/welcome
- My Next Step
- Upcoming responsibilities
- Featured events
- Module navigation
- Official updates
- Community feed

### Directory / Profiles

Church-visible member profiles with member-controlled visibility options.

### Messages

Participant-only private member messaging with blocking and message-specific reporting.

### Community

Local-church social feed with comments and church-appropriate reactions.

### Prayer & Testimony

Public-to-the-local-church prayer requests and testimonies, separate from private Pastoral Care.

### Pastoral Care

Private requester + authorized local pastoral/admin workflow.

## Discipleship and learning

### Learning Center

Supports:

- Course pathways
- English / Spanish courses
- Curriculum versions
- Prerequisites
- Lessons
- Classroom sessions
- Attendance
- Assessments
- Secure answer keys
- Completion rules
- Credentials
- XP / levels / streaks
- Weekly challenges
- Learning games
- Learning trophies

### Learning Studio

Leadership authoring surface for courses, lessons, files and assessments.

### Resource Library

Current, draft, legacy, reference and retired resources with authority/source metadata.

### Kingdom Guide Beta

Current Beta provides:

- Product navigation
- Trusted Resource Library search
- Visible authority/status labels

It intentionally does not fabricate doctrinal answers. Generative AI should be added only after a provider, retrieval model, citation behavior and privacy boundary are explicitly designed.

## Groups

Supports:

- Group discovery
- Public/general meeting information
- Private meeting address/access instructions
- Member roster
- Leader / assistant roles
- Join requests
- Capacity and accepting-members rules
- Meeting reports
- Attendance/outreach metrics

## Outreach

Pipeline stages include:

```text
New Contact → Invited → Guest → Bible Study → Regular Attendee
→ Baptized → Holy Ghost → First Steps → Connected → Serving
```

Supports:

- Follow-up ownership
- Follow-up due dates
- Bible-study progress
- Prayer request
- Interaction timeline
- Duplicate prevention
- Outreach-to-member account bridge

Outreach-to-member conversion uses an email-bound church invitation and preserves the Outreach history after the person becomes a member.

## Serving / Ministry

Supports:

- Ministry definitions
- Requirements
- Member eligibility against verified milestones/training
- Applications
- Leadership review
- Team assignments
- Confirmation/decline workflow

## Calendar and events

Unified event table supports exactly one scope per event:

- local church
- district
- organization

Features include:

- Local timezone conversion
- RSVP
- Featured event state
- Flyer image
- Audience label
- Registration/details URL

## Communications

### Official Updates

Local-church leadership announcements separated from the social feed.

Optional `notify_members` creates in-app notifications to active members.

### District Updates

District-level announcements scoped to district members.

### Organization Updates

Organization-level announcements scoped to organization members.

## Notifications

In-app notification center for events such as:

- Team assignments
- Ministry application status
- Document verification
- Credentials
- Direct messages
- Group join requests
- Official updates
- Pastoral care
- Message moderation reports

Opening a notification marks it read before navigating.

## Documents

Private member document vault with:

- Storage metadata
- Verification status
- Expiration tracking
- Leadership review
- Signed/private file access

Bulk church exports include document metadata, not private file bytes.

## Fundraising

Campaign and goal tracking without payment processing in the current Alpha.

## Administration

### Church Admin

- Member roles/status
- Verified records
- Secure invitations
- Needs Attention queue
- Audit history
- Church analytics
- Church branding/settings

### District Admin

- Aggregate church metrics
- District settings
- District updates
- District events

No automatic cross-church private record access.

### Organization Admin

- Aggregate district metrics
- Organization settings
- Organization updates
- Organization events

No automatic local-church private record access.

## Data portability

### Church Export Center

Pastor/church-admin CSV exports for practical operational datasets.

### Church Import Center

Staged CSV import:

```text
Upload → Parse → Validate → Review → Process Ready Rows
```

Current import types:

- Outreach Contacts
- Member Invitations

### Member My Data

Signed-in members can download a structured personal JSON export.

## Security architecture

Important controls include:

- RLS on public application tables
- SECURITY DEFINER helpers kept narrow/private
- Immutable ownership/scope triggers on sensitive tables
- Database constraints for cross-record integrity
- Sanitized leadership audit history
- Protected answer keys
- Participant-only messages
- Aggregate-only district/organization metrics
- Column privilege restrictions on trusted relationship fields

## Deployment state

GitHub `main` is source of truth.

Vercel deployment visibility/build cadence has occasionally been blocked by project/account build-rate limits. Infrastructure throttle should not be mistaken for a source compile failure.

Before broader pilot:

- Confirm stable production deployment
- Set Supabase Auth production Site URL / redirects
- Enable leaked-password protection
- Run the Pilot Readiness dashboard
- Test with a small controlled member group
