# Phase 1 Storage Security Audit

Date: 2026-08-20
Status: READ-ONLY VERIFIED / no storage policy mutations applied

This is the KN-008 storage checkpoint for the approved Master Upgrade plan.

## Bucket classification

### Intentionally public read buckets

- `church-branding` — public church logo/branding images
- `event-assets` — public event images
- `member-avatars` — public avatar images

Public read is intentional for these media types. Write/delete access remains authenticated and scoped.

### Private buckets

- `church-setup`
- `group-lesson-assets`
- `learning-assets`
- `member-documents`
- `resource-library`

No blanket public read policy was found for these private buckets.

## Policy findings

### Church setup

Path model begins with church ID.

Read/upload/delete requires an active membership in the church encoded in the object path and base role `pastor` or `church_admin`.

Assessment: **properly church-scoped for the intended setup/admin use case.**

### Church branding

Public read is intentional.

Insert/update/delete requires the church ID in the first path segment and pastor/church-admin authority for that church.

Assessment: **appropriate public-read / leadership-write model.**

### Event assets

Public read is intentional.

Write/delete requires the church ID in the first path segment plus an authorized church leadership role.

Assessment: **appropriate public-read model.** Future authorization normalization should migrate these role checks to the canonical functional-permission model without weakening tenant scope.

### Member avatars

Public read is intentional.

Insert/update/delete requires the first path segment to equal `auth.uid()`.

Assessment: **owner-scoped writes, public-read by design.**

### Group lesson assets

Path is church / group / uploading-user scoped.

Read requires the requested group to belong to the church encoded in the path and the caller to be a group member/leader or authorized church learning leader.

Insert validates church ID, group ID, uploader ID and authorized group/learning leadership.

Update is limited to the storage object owner. Delete is limited to owner or pastor/church-admin for the group's church.

Assessment: **strong group/church path validation.**

### Learning assets

First path segment is church ID.

Read requires active church membership via `private.is_church_member`.

Write/delete requires learning-capable leadership for that same church.

Assessment: **properly church-scoped.**

### Member documents

Object path is owner-user scoped rather than church-ID scoped.

Read is permitted when either:

- first path segment equals the current user's ID; or
- an associated `member_documents` database record exists and the caller is pastor/church-admin of that record's church.

Insert is owner-only. Delete is owner-only while preventing deletion of an object still referenced by a document record.

Assessment: **privacy-oriented and tenant-aware through document metadata.** This path model is different from other buckets but is not inherently unsafe. Future tenant-adversarial tests should confirm a leader from another church cannot use a guessed storage path without a matching authorized `member_documents` row.

### Resource library

Path begins with church ID and uploader ID.

Read requires an associated `media_assets` row whose `church_id` matches the path. Member access requires the asset to be approved for members and the caller to belong to that church; leadership/media managers receive broader church-scoped access.

Insert/update/delete require church-scoped leadership/media authority and uploader/metadata checks.

Assessment: **strong metadata + path + tenant enforcement.**

## Cross-cutting observations

1. The private buckets are not protected merely by being marked private; they also have explicit object policies.
2. Church/group IDs are validated against relational data on the most sensitive shared-content buckets.
3. Public-read buckets contain asset types that are expected to render publicly and do not contain pastoral/member-document content.
4. Several policies still encode legacy base roles such as `group_leader`, `ministry_leader`, and `minister`. KN-006 authorization normalization should eventually express these through the canonical base-role + stackable-functional-permission model, but that work must coordinate with the active Finance/roles workstream.
5. No storage-policy mutation is warranted solely from this read-only audit.

## KN-008 status

**VERIFIED at policy-design level.**

Remaining acceptance test before multi-church rollout: authenticated adversarial tests using two isolated church tenants must prove that guessed paths and foreign `church_id` values cannot cross the storage boundary.
