# Kingdom Network V2 — Friendship Groups Specification Backlog

Status: SAVED FOR FUTURE V2 FRIENDSHIP GROUPS STEP · NOT IMPLEMENTED IN STEP 1
Source: Marcus-supplied Claude Navigation & Design System Brief, reconciled with Kingdom Network V2 safety/product rules.

## Why this document exists

The Claude brief contains strong Friendship Group product ideas, but Step 1 is limited to foundation/navigation/design-system work. This document preserves the useful Groups requirements so they are not lost or prematurely mixed into the foundation batch.

Before implementation, the V2 Friendship Groups step will still run its own focused 10–20 question discovery, inspect the strongest existing V1 Groups work for reuse, conflict-check active workstreams, and verify database/security implications.

## Core hierarchy — locked direction

There are two distinct screens:

### Groups List

A church-wide group directory/browse surface.

### Group Dashboard

The workspace for one specific group after the user opens it.

Group-specific operational tools — weekly report, attendance, roster, lessons, prayer, schedule, guidelines, session roles/tasks — belong only inside the Group Dashboard, never at the church-wide directory level.

The V2 implementation should build on the existing Kingdom Network `groups` system after inspection. Do **not** create a duplicate `friendship_groups` data model simply because the church-facing experience is called Friendship Groups.

## Groups List target experience

- Fixed Kingdom Network/church branding lockup.
- Screen title `Groups` plus a church-specific count/subtitle sourced from real data.
- `New` action available only when the signed-in user has a church-configurable permission that allows creating a group. It must not be available merely because someone can see the directory.
- Filter chips such as All / Friendship / Youth / College & Career. Group types must be configurable per church rather than hardcoded to these four forever.
- One card containing group rows.
- Row concept: 38px circular initials/avatar, leader display name(s), group type, and navigation affordance.
- The user's own group may be pinned first with a subtle `rgba(201,162,83,0.08)` wash and `Mine` badge.
- A prospective member should be able to see enough approved public meeting information — day/time and a safe/general place description — to decide whether to join.
- Exact private home addresses must not be disclosed to unaffiliated browsers unless the church's approved privacy policy explicitly allows it.
- Joining may support self-request/self-join according to church policy; authorized leaders/admins may assign members according to permission.
- Directory counts/metadata must be sourced through privacy-safe database behavior; do not bypass roster RLS merely to show counts.

## Pilot group seed candidates

The Claude brief supplied these six pilot groups:

| Leaders | Group type |
| --- | --- |
| Marcus & Jessica Kelting | Friendship Group |
| Jerryl & Yolanda King | Youth Group |
| Jacob & Mari Majia | Friendship Group |
| Ish & Sophie Adame | Friendship Group |
| Sam & Irias Agulair | Friendship Group |
| Jacob & Anna Amaro | College & Career Group |

These are **seed candidates, not Step 1 writes**. Before any live insertion:

- verify spelling, identities, church membership, group type, leader authorization, schedules, and whether records already exist;
- use real editable tenant-scoped records, never hardcoded UI content;
- test the exact create/edit write workflow with disposable records first;
- avoid duplicates with existing V1/live Groups data.

Every licensed church creates/manages its own groups and group types.

## Group Dashboard target experience

### Hero

- Eyebrow such as `FRIENDSHIP GROUP PORTAL`, localized appropriately.
- Group name in Cormorant Garamond.
- Group-specific framework/guidelines content. For New Life this may include the Four G's: `Grow in God · Grow Together · Grow Leaders · Grow Groups.` The framework must be stored/configurable per group/church, not hardcoded platform-wide.
- Meeting inset showing approved day/time/place information.

### Quick Actions

Target presentation is a two-column grid of icon cards rather than a horizontal rail/settings list.

Candidate actions from Claude:

- Weekly Report
- Attendance
- Roster
- Lessons
- Prayer Wall
- New Group

`New Group` must appear only when the user has the appropriate church-configurable create permission. It should not imply that every group leader can create unlimited groups by default.

### This Week

A summary card should surface the small number of things a leader needs now, such as attendance progress, report status, current/next lesson, prayer/follow-up attention, and session assignments.

## Weekly Report target

Potential stack:

1. Context card — group, week/date, meeting day/time/place.
2. Attendance — counts and/or person-level attendance connected to the actual roster model.
3. Highlights & Testimonies.
4. Prayer Requests.
5. Needs / Concerns.
6. Attachments — documents and photos, subject to storage/file policy.
7. Send To — configurable default recipient with per-report override where authorized.
8. Primary `Send Weekly Report` action.
9. Report History — saved reports with date/status/summary and full-detail access.

### Required safety/product corrections

- Prayer text must **not automatically become group-wall content merely because it appears in a report**. The submitter must make an explicit privacy/share choice, and existing prayer privacy rules must be preserved.
- Reports are persistent records, not fire-and-forget messages.
- The report's recipient role/title must be configurable per church/group. Do not hardcode `Pastor` or another title.
- In-app delivery and direct email delivery have different privacy/consent/audit implications and must be designed/tested before implementation.
- Duplicate submission protection/idempotency is required.
- Cross-system updates should happen once from authoritative records rather than duplicating entry.

## Collective report inbox

Authorized recipients/admins may need a collective inbox for received weekly reports across groups. Access must be permission-based and tenant-scoped. Ordinary group leaders must not gain visibility into other groups' reports simply because such an inbox exists.

## Attachments

Future report/lesson/resource upload surfaces should support approved document and image types where useful.

Before implementation:

- define allowed MIME types/extensions and size limits;
- sanitize filenames;
- use tenant/group-scoped storage paths;
- enforce storage/database authorization;
- prevent arbitrary executable uploads;
- provide upload, processing, success, failure, and deletion states;
- clarify retention and who may download sensitive group documents.

## Group privacy and authority

Database enforcement is mandatory.

Target principle:

- an ordinary group leader/assistant sees and operates only within groups they are authorized to lead;
- ordinary members see only member-safe information for groups they may access;
- one group's private roster, reports, attendance, prayer needs, lessons/private documents, and private meeting details are not visible to another ordinary group leader;
- authorized pastor/church-admin/platform oversight may intentionally have broader visibility according to church roles and RLS;
- all access remains tenant-scoped by church and group;
- UI hiding alone is never the security boundary.

## Leader-created groups

Strong idea, with an authorization correction:

- churches can enable trusted roles/people to create their own group;
- creation permission is configurable per church;
- a secure server/database function should re-check identity, active church membership, create permission, tenant, and duplicate/eligibility rules;
- do not broadly loosen `groups` RLS to accomplish self-create;
- creation should be atomic where practical: group + leader relationship + approved private details;
- limits/review/approval policy can vary by church.

The existing V1 `lead_own_group` approach and secure create RPC are candidates for future reuse after V2 review, not automatic imports.

## Inline editing

Leaders should be able to edit appropriate group content without losing context where that improves simplicity. Inline editing must still have:

- explicit permission checks;
- clear edit/save/cancel states;
- pending/double-submit protection;
- validation;
- success/error feedback;
- auditability for important records;
- no exposure of fields the user may not edit.

Roll out first in the future V2 Friendship Group Dashboard, then evaluate app-wide use rather than forcing it everywhere blindly.

## Per-group configurable content

Each group may eventually need:

- rules/guidelines/framework content;
- meeting schedule and approved location visibility;
- prayer tracking;
- weekly/session roles and tasks, such as prayer leader or host;
- lesson/current curriculum assignment;
- default report recipient;
- group type/category;
- leader/assistant assignments;
- approved member join behavior.

These values belong to church/group configuration, not hardcoded platform behavior.

## Design contract for the future Groups step

Use the locked V2 tokens from `docs/KINGDOM_NETWORK_V2_FOUNDATION.md`:

- Cormorant Garamond headings;
- Work Sans functional copy;
- exact navy/gold/ink palette;
- 14px cards with 16px padding;
- 38px icon tiles;
- 44px minimum tap targets;
- fixed Kingdom Network/church branding lockup;
- EN/ES together from the start;
- mobile-first approval before desktop completion.

## Not implemented by Step 1

Step 1 does **not**:

- create `/v2/groups` feature screens;
- seed or alter real group records;
- add/edit Supabase tables, functions, policies, storage, or migrations;
- write tab preferences;
- build reports, inboxes, uploads, joining, attendance, roster, lessons, or prayer workflows.

Those require their owning V2 step, discovery questions, conflict review, write/RLS testing, preview verification, and Marcus approval.
