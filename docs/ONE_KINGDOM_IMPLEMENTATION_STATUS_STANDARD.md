# One Kingdom Implementation Status Standard

This document exists to eliminate the recurring problem where a feature is described as "already made" even though the user cannot actually use it.

## Canonical product

Current One Kingdom development happens in Base44 app `6a8b3494945c37375d00b91c`.

GitHub application code is legacy/supporting reference unless Marcus explicitly starts a migration or reconciliation task.

## Required feature statuses

Every meaningful feature/workflow must use one of these statuses:

### PLANNED
The requirement is approved, but implementation has not been completed.

### EXISTS / NOT CONNECTED
Some technical pieces already exist — for example an entity, function, component, route, migration, backend helper, or old screen — but the real user cannot complete the workflow in the canonical app.

This is **unfinished work**.

### CONNECTED / NEEDS VERIFICATION
The feature is reachable from the correct role's real navigation/workflow, reads/writes canonical records, enforces permissions, and supports the expected human flow. Human Preview/device acceptance is still pending.

### VERIFIED / LOCKED
The real workflow passed human acceptance and the standing Final Inspection Gate: functionality, canonical data, security/permissions, mobile/responsive behavior, states, speed, resilience, accessibility/language, diagnostics/privacy, realistic scale/device sanity, and regression retest.

## Forbidden completion language

Do not call a feature **done**, **complete**, **implemented**, **finished**, or **working** when it is only:
- code in a file,
- a backend function with no reachable UI,
- an entity/table with no workflow,
- a component not mounted in the live path,
- a route not reachable from the proper user experience,
- a feature present only in legacy GitHub code,
- a feature present only in a branch/checkpoint,
- a feature with fake/demo data instead of canonical records,
- a feature that requires Marcus to hunt for a hidden page,
- a feature that has not passed permission or human-flow checks.

Use **EXISTS / NOT CONNECTED** instead.

## Connection-first rule

Before creating anything new:

1. Inspect the canonical Base44 app for existing entities, functions, components, routes, and workflows.
2. Determine whether the feature already exists but is disconnected.
3. Reuse and connect solid existing work before creating a replacement.
4. Remove or retire duplicate pathways only after the canonical workflow is verified.
5. Record the exact source of truth.

## Definition of CONNECTED

A feature is CONNECTED only when all applicable items are true:

- The correct user can discover it naturally from the app.
- The entry button/link actually works.
- The workflow uses canonical data, not a duplicate source.
- Save/update actions persist correctly.
- Related screens update from the same record.
- Role/tenant/privacy rules are enforced.
- Loading, empty, success, retry, error, and restricted states are intentional.
- Mobile and English/Spanish behavior are handled where applicable.
- There is no dead-end "looks finished but does nothing" state.
- The next human action is obvious.

## Worker reporting format

Every completion report should state:

**Status:** PLANNED / EXISTS-NOT-CONNECTED / CONNECTED-NEEDS-VERIFICATION / VERIFIED-LOCKED

**User entry point:** exact screen/path/action a real user takes.

**Canonical data:** entities/functions/records used.

**What was connected:** what previously existed but was not reachable/wired.

**Verification:** tests plus human Preview/device proof.

**Remaining gap:** anything still preventing VERIFIED / LOCKED.

## Product rule

For One Kingdom, **written code is inventory; connected workflow is product**.
