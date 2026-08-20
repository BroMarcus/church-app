# Phase 1 Security Architecture Audit

Date: 2026-08-20
Project: Kingdom Network / New Life Madera pilot
Supabase project: `jfusmsbccuvqyipcwbbw`
Status: READ-ONLY AUDIT COMPLETE; security-sensitive mutations intentionally not applied in this audit commit.

This document is the KN-002/KN-003/KN-004/KN-005 security checkpoint for the approved master upgrade plan. It records observed production state and the next safe remediation decisions. It does not authorize blind changes to production.

## Executive summary

The database is not generally exposed to anonymous or ordinary authenticated users. Important protections are already present: all inspected SECURITY DEFINER functions have explicit `search_path` configuration; application roles cannot create objects in `public`; private assessment/game answer-key tables are not selectable by `anon` or `authenticated`; and the five anonymous public RPCs are narrowly focused on signup/invite preview behavior.

The remaining security work is mostly defense-in-depth and permission-surface reduction, not evidence of an active data leak.

## SECURITY DEFINER inventory

Production inventory at audit time:

- SECURITY DEFINER functions in `public` + `private`: **192**
- Public SECURITY DEFINER functions: **52**
- Public functions executable by `anon`: **5**
- Public functions executable by `authenticated`: **44**
- Private functions executable by `anon`: **19**
- Private functions executable by `authenticated`: **42**
- SECURITY DEFINER functions missing an explicit `search_path`: **0**

The 19 private functions executable by `anon` are all trigger-returning functions. They cannot be invoked as ordinary business RPCs in the same way normal functions can, but their grants are broader than necessary and should be reviewed/revoked where safe.

Of the 42 private functions executable by `authenticated`, 19 are trigger-returning functions and 23 are non-trigger helpers. The 23 non-trigger helpers are primarily permission predicates and assessment-question management helpers. Their exposure should be reduced to the minimum needed by RLS/public wrapper functions.

### Private non-trigger helpers currently executable by authenticated users

- `can_approve_finance`
- `can_manage_finance`
- `can_manage_group`
- `can_manage_member_private_details`
- `can_manage_member_tasks`
- `can_message_target`
- `can_operate_group`
- `can_view_finance`
- `can_view_member`
- `create_assessment_question_impl`
- `delete_assessment_question_impl`
- `group_join_request_manager`
- `has_church_permission`
- `has_church_role`
- `has_finance_permission`
- `has_group_role`
- `is_church_member`
- `is_district_admin`
- `is_district_member`
- `is_organization_admin`
- `is_organization_member`
- `pastor_finance_access`
- `update_assessment_question_impl`

Finance helpers are owned by the active Finance / Reporting / Multi-Church workstream and must not be changed independently.

## Anonymous public RPCs

The five anonymous SECURITY DEFINER RPCs are:

1. `get_invite_preview(uuid)`
2. `get_public_friendship_group_join(text, uuid)`
3. `get_public_signup_status()`
4. `get_public_signup_status_for_church(text)`
5. `validate_invite_email(uuid, text)`

Initial code review classification: **INTENDED PUBLIC SURFACE**, pending adversarial tests.

Why:

- signup-status functions return church/signup availability metadata;
- group-join preview returns only public church/group/signup availability data;
- invite preview delegates to a private implementation and returns masked email/role/expiration information;
- invite email validation returns a boolean rather than the stored email.

All five have explicit search paths. `anon` and `authenticated` cannot create objects in the `public` schema, which materially reduces search-path shadowing risk for the one function whose path is `public`.

Required next verification:

- enumerate/random UUID probing must not reveal private invite data;
- invite preview must remain masked;
- public signup/group functions must never return private member data;
- rate-limit/abuse controls should be considered for high-volume probing.

## Authenticated public RPCs

There are 44 public SECURITY DEFINER functions executable by authenticated users. A heuristic code review shows the large majority either:

- directly check `auth.uid()`,
- call a private authorization helper,
- or explicitly reject unauthorized requests.

Examples include directory, church-health, invitation, relationship, prayer, baptism, reporting, and finance operations.

This audit does **not** treat authenticated executability itself as a vulnerability. Each function must be classified based on whether it enforces the same tenant/role boundary that its UI expects.

### Functions requiring special coordinated review

- Finance mutations/read models (`activate_finance_budget`, `decide_finance_request`, `finance_*`, `pastor_finance_snapshot`, `pay_finance_bill`, `submit_finance_request`, `void_finance_*`) — coordinate with Finance workstream.
- `configure_resend_email_provider` — sensitive because it accepts/stores provider credentials; confirm only authorized church admins can call it and secrets remain in Vault rather than ordinary tables/logs.
- `process_church_import_batch` — verify admin permission and strict `church_id` scope.
- `update_group_member_status` — verify group-scoped leadership cannot mutate unrelated members.
- `review_shared_journey_entry` — verify reviewer is authorized for the target church/member and private entries cannot be enumerated.
- directory/relationship/health RPCs — verify cross-church IDs are rejected even when callers supply arbitrary UUIDs.

## Private assessment/game answer keys

Tables:

- `private.assessment_answer_keys`
- `private.learning_game_answer_keys`

Observed state:

- RLS is currently disabled on both tables.
- `anon` has no SELECT privilege on either table.
- `authenticated` has no SELECT privilege on either table.
- `anon` has no private-schema USAGE.
- `authenticated` has private-schema USAGE, but still lacks direct table SELECT/WRITE grants on the answer-key tables.

Conclusion: **No direct answer-key read exposure was found for app roles in this audit.**

However, Supabase's database advisor flags the lack of RLS as critical defense-in-depth debt. Do not blindly run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` without confirming every grading/authoring path, because enabling RLS with no suitable policies can break legitimate server-side operations.

Approved direction for KN-003:

1. preserve direct grant denial for app roles;
2. add explicit tests that `anon`/`authenticated` cannot read or mutate answer-key tables;
3. inventory every function that reads/writes the answer-key tables;
4. then choose either:
   - RLS enabled with narrowly scoped service/owner behavior, or
   - a documented private-schema/no-grant model with automated regression checks if RLS would not add meaningful protection in the actual execution model.

No RLS mutation was applied during this read-only audit.

## `pg_net`

Observed:

- extension: `pg_net`
- version: `0.20.4`
- extension schema: `public`
- `extrelocatable = false`

Supabase advisor warns about the extension being installed in `public`, but this installed extension cannot simply be moved with a normal relocatable-extension command.

Approved direction for KN-005:

- do not attempt an ad-hoc `ALTER EXTENSION ... SET SCHEMA`;
- verify Supabase's supported reinstall/migration path and current `net`-using communication functions first;
- treat the existing placement as documented debt until a supported non-destructive path is confirmed.

## Leaked-password protection

Supabase Auth advisor reports leaked-password protection is disabled.

Approved direction for KN-004: enable the Auth leaked-password/HIBP protection setting.

Current connector does not expose an Auth-configuration mutation for this setting, so this remains a configuration action to perform through an authorized Supabase management surface. This is a security configuration change and should be smoke-tested with signup/password-reset afterward.

## Public schema creation privileges

Observed:

- `anon` CREATE on `public`: false
- `authenticated` CREATE on `public`: false

This is good and should remain enforced, especially because some SECURITY DEFINER functions use `search_path=public` or `public, private`.

## KN-002 classification model

Every SECURITY DEFINER function will be classified into one of four buckets:

1. **Public-safe** — intentionally callable without authentication and returns only bounded public/masked data.
2. **Authenticated-safe** — intentionally callable by signed-in users and performs internal tenant/role/self authorization.
3. **Privileged/internal** — should only be callable by owner/service/triggers; revoke ordinary app-role EXECUTE.
4. **Needs redesign** — authorization is ambiguous, duplicated, or too broad.

For each callable public function, verification must cover:

- arbitrary foreign `church_id` / `user_id` input;
- inactive membership;
- ordinary member;
- scoped group/ministry leader;
- church admin/pastor;
- cross-church target;
- error output does not leak private data;
- `search_path` remains explicit;
- no app role has CREATE on trusted schemas used in `search_path`.

## Security changes intentionally not applied here

Because these touch security/privacy and/or overlap active workstreams, this audit did not silently:

- enable RLS on answer-key tables;
- revoke EXECUTE from private/public functions;
- change finance RPC grants;
- change church role/permission functions;
- reinstall/move `pg_net`;
- change Auth leaked-password configuration;
- alter live RLS policies.

Those changes should be made as isolated migrations/config changes with focused regression tests and Control Room coordination.
