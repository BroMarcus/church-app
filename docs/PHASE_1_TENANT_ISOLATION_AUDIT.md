# Phase 1 Tenant Isolation Audit

Date: 2026-08-20
Roadmap: KN-007
Status: VERIFIED FOR AUTHENTICATED OUTSIDER BASELINE / multi-church two-tenant acceptance test still required before network rollout

## Test method

A real authenticated profile that currently has **no active church membership** was used as an adversarial outsider identity.

The database session was reduced to the normal `authenticated` Postgres role and the JWT `sub` claim was set to that outsider user ID. No production rows were created, modified, or deleted.

The outsider then attempted to read New Life Madera data for church:

`0b9b1af8-ecce-49a3-a4de-8b9c487ff678`

## Direct RLS results

Visible rows for the outsider:

- `church_memberships`: **0**
- `outreach_contacts`: **0**
- `care_requests`: **0**
- `member_documents`: **0**
- `group_private_details`: **0**
- `finance_contributions`: **0**
- `finance_expenses`: **0**
- private Storage objects across `church-setup`, `group-lesson-assets`, `learning-assets`, `member-documents`, `resource-library`: **0**

Result: **PASS**. The signed-in outsider could not directly enumerate the tested New Life private/operational data.

## Permission-helper results

For the same outsider and New Life church:

- `current_user_has_church_permission(..., 'manage_members')`: **false**
- `current_user_can_view_finance(...)`: **false**
- `current_user_in_household(random/foreign household)`: **false**

Result: **PASS**.

## SECURITY DEFINER rejection test

The outsider called:

`public.church_directory_members(New Life church_id)`

The RPC rejected the request with:

`Church membership required`

Result: **PASS**. The SECURITY DEFINER wrapper did not bypass the membership boundary when supplied a real foreign church ID.

## What this proves

This test is stronger than merely inspecting RLS definitions because it executes queries under the same `authenticated` database role and JWT user identity used by application clients.

It demonstrates that an authenticated account outside New Life cannot currently read the tested New Life membership, outreach, care, document, group-private, finance, or private-storage data and cannot use the tested directory RPC to bypass membership checks.

## What this does not yet prove

Kingdom Network currently has one real church tenant. Before a multi-church rollout, repeat this test with **two fully populated isolated church tenants** and authenticated users in each tenant, including:

- Church A member -> Church B people/profile data
- Church A group leader -> Church B group/private reports
- Church A ministry leader -> Church B teams/schedules
- Church A pastor/admin -> Church B pastoral care
- Church A finance role -> Church B finance
- Church A learning leader -> Church B private learning assets/authoring
- guessed Storage paths between tenants
- direct RPC calls with a real foreign `church_id`, `user_id`, group, document, finance record, and journey record

That final two-tenant matrix is required before multi-church production expansion, but it does not block the current single-church pilot.
