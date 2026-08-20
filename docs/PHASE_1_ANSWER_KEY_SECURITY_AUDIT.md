# Phase 1 Answer-Key Security Audit

Date: 2026-08-20
Roadmap: KN-003
Status: VERIFIED CURRENT BOUNDARY / defense-in-depth RLS decision intentionally held for isolated migration design

## Tables

- `private.assessment_answer_keys`
- `private.learning_game_answer_keys`

Supabase's advisor flags both because RLS is disabled. That warning is important, but the current effective access boundary must be evaluated from both RLS and grants/functions.

## Direct table access

Observed under current production grants:

| Role | Assessment keys SELECT | Assessment keys WRITE | Game keys SELECT | Game keys WRITE |
|---|---:|---:|---:|---:|
| anon | denied | denied | denied | denied |
| authenticated | denied | denied | denied | denied |

`anon` also lacks USAGE on the private schema. `authenticated` has private-schema USAGE because private helper functions are used by RLS/application RPCs, but that does not grant direct table access.

Conclusion: **no direct client answer-key read exposure was found.**

## Functions that reference the answer-key tables

The audited functions referencing assessment/game answer keys are:

- `private.create_assessment_question_impl(...)`
- `private.grade_assessment_attempt(uuid)`
- `private.submit_assessment_attempt_impl(uuid,jsonb)`
- `private.submit_learning_game_impl(uuid,jsonb,integer)`
- `private.update_assessment_question_impl(...)`

The grading/submission helpers are not executable directly by `anon` or `authenticated` roles.

The two authoring helpers are executable by authenticated users but enforce authorization internally:

- require `auth.uid()`;
- resolve the assessment's church;
- require `minister` / `pastor` / `church_admin` or `manage_learning` permission;
- reject unauthorized users;
- update the private answer key only after authorization.

`update_assessment_question_impl` also refuses to alter an assessment after learner attempts exist and instructs the caller to create a new assessment version instead.

## Adversarial write probe

A real authenticated profile with no active church membership attempted to call `private.create_assessment_question_impl` against a real assessment.

Result: **REJECTED — `Not authorized`.**

Post-probe reconciliation found **0** rows with the test prompt, confirming no partial question/answer-key write occurred.

## Public invite probe performed during the same security pass

A random invite UUID returned no useful invite data and `validate_invite_email` returned false.

A real invite preview, called under the `anon` role, returned only:

- valid state;
- church name;
- masked email;
- invited role;
- expiration.

The email remained masked. This supports the initial classification of the invite-preview RPC as intentional bounded public metadata rather than an answer-key or member-data exposure.

## Why RLS was not enabled automatically

Enabling RLS on these two private answer-key tables without designing the exact owner/service/function execution model could break grading or authoring while adding little protection beyond the existing no-grant/private-function boundary.

The safe next step is an isolated migration with regression tests that explicitly prove:

1. learner assessment submission still grades correctly;
2. learning games still grade correctly;
3. authorized learning leaders can create/update questions and keys;
4. ordinary authenticated users cannot read/write keys;
5. anonymous users cannot read/write keys;
6. any owner/service access needed by SECURITY DEFINER functions remains intact.

Only after those policies are defined should the advisor remediation be applied.

## Current conclusion

**No active answer-key leak was found.** The outstanding item is defense-in-depth hardening, not emergency incident response.
