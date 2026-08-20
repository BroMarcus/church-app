# Kingdom Network Authorization Model

Status: APPROVED TARGET ARCHITECTURE
Date: 2026-08-20
Related roadmap item: KN-006

This document defines the authorization model Kingdom Network should converge toward. It is intentionally architecture-first: current production contains legacy base roles plus newer stackable church roles. Schema/RLS changes must be coordinated with the active Finance/roles workstream rather than applied independently.

## Principle

**Identity authority and job responsibility are different things.**

A user should have one base church-access role that answers, "What level of authority does this account fundamentally have in this church?" Then the user may have zero or more functional roles that answer, "What church work is this person authorized to perform?"

Functional roles must never silently elevate the base authority level.

## Base church-access roles

Target canonical base roles:

### Member

Normal authenticated church participant.

A Member can receive stackable functional roles but does not become a church administrator merely because they lead a ministry, group, class, or finance function.

### Church Admin

Trusted operational administrator for one church.

Can manage broad church configuration and ordinary member administration within documented boundaries. Cannot assign or manufacture pastoral spiritual authority merely through a custom functional role.

### Pastor

Highest local-church application authority in the base role hierarchy.

Pastor-only actions remain explicitly pastor-only where the product intends that distinction.

## Stackable functional roles

Examples:

- Friendship Group Leader
- Friendship Group Coordinator
- Ministry Leader
- Minister
- Teacher / Learning Leader
- Finance Admin
- Finance Approver
- Outreach Leader
- Care Team member / Pastoral Care Leader
- Communications Manager
- Media Manager
- Calendar/Scheduling Manager

A church can eventually define additional functional roles by selecting approved permission keys.

## Permission keys

Functional roles resolve to granular permission keys such as:

- `view_leadership`
- `manage_members`
- `manage_groups`
- `lead_own_group`
- `manage_ministries`
- `manage_teams`
- `manage_learning`
- `manage_calendar`
- `manage_outreach`
- `manage_media`
- `view_finance`
- `manage_finance`
- `approve_finance`
- `request_finance`

Sensitive domains such as pastoral care should use dedicated permission keys and scope checks rather than borrowing broad member-management access.

## Authorization evaluation order

For any protected action:

1. Authenticate the user.
2. Resolve active membership for the target `church_id`.
3. Reject inactive/missing membership.
4. Apply Pastor/Church Admin base-role override only where that action explicitly allows it.
5. Resolve active functional-role assignments for the same church.
6. Compute granted permission keys.
7. Apply resource-level scope:
   - own record;
   - own Friendship Group;
   - own ministry/team;
   - assigned pastoral-care case;
   - specific finance scope;
   - church-wide where permission explicitly grants it.
8. Enforce the same rule in the database/RPC layer, not only the UI.
9. Audit consequential leadership actions.

## Non-negotiable guardrails

- A functional role cannot assign `pastor` or `church_admin` base authority.
- Custom role JSON cannot contain magic values that bypass normal authorization.
- Church A role assignments never authorize Church B resources.
- UI visibility is convenience only; RLS/RPC/server-action authorization is the security boundary.
- Sensitive pastoral-care access is not implied by ordinary `manage_members` access.
- Finance access is explicit and separately auditable.
- A Group Leader sees only the people/data needed to shepherd authorized groups unless another permission broadens scope.
- Ministry leaders see only the people/data needed for their ministry/team unless another permission broadens scope.
- Software can indicate leadership readiness but cannot appoint spiritual leaders.

## Current-state migration note

Production currently uses both base membership values such as `group_leader`, `ministry_leader`, and `minister` and newer `church_roles` / `church_role_assignments` permission records.

Migration must be gradual:

1. document every route/RLS/RPC currently checking legacy base roles;
2. map each legacy job role to functional permissions;
3. dual-read during transition where necessary;
4. prove parity with regression tests;
5. migrate assignments;
6. remove legacy job-role branching only after no route/RLS/function depends on it.

Do not mass-convert roles in production in one unverified migration.

## UI model

Normal users should see human labels, not permission keys.

Example administration flow:

**Base access:** Member

**Responsibilities:**
- Friendship Group Leader
- Teacher

The UI can explain exactly what each responsibility allows. Promotion to Church Admin/Pastor should be a visibly separate high-risk action with explicit confirmation and audit logging.

## Acceptance criteria for KN-006

KN-006 is fully complete when:

- one canonical helper resolves base + functional permissions;
- all important server actions/RPCs/RLS policies use equivalent authorization semantics;
- legacy job roles are migrated or deliberately retained with documented compatibility;
- cross-church tests pass;
- escalation tests prove custom roles cannot grant Pastor/Admin authority;
- role changes are audited;
- role-aware navigation derives from this same capability model rather than maintaining a separate set of guesses.
