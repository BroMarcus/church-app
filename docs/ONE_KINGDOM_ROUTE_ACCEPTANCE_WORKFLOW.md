# One Kingdom Route-by-Route Acceptance Workflow

Status: **FOUNDER-LOCKED WORKING METHOD**
Approved by Marcus: 2026-09-24

## Purpose
This is the default way One Kingdom should be inspected, improved, verified, and locked from the beginning of the app to the end.

The working style to preserve is the one Marcus approved during the live onboarding → Friendship Groups walkthrough:
**walk the real app like a human → use screenshots/visual proof → fix a small area → run final inspection → lock it → move to the next area.**

Do not replace this with giant redesign batches, broad unverified cleanup, or endless reopening of finished screens.

## Default execution rhythm
1. **Start at the beginning of the real user journey.**
2. **Choose one route/workflow and one primary role at a time.**
3. **Walk the actual experience** on the real app/preview rather than judging only from code.
4. **Use screenshots as visual acceptance evidence** for the states that materially matter.
5. **Record friction before changing things.**
6. **Fix in a small, controlled batch** without drifting into unrelated areas.
7. **Run technical verification** for the affected frontend/backend/security dependencies.
8. **Run the full Standing Final Inspection Gate** from `docs/KINGDOM_NETWORK_BUILD_CHECKLIST.md`.
9. **Retest the human workflow.**
10. **Protect the accepted behavior with regression coverage where practical.**
11. **Mark the route/workflow VERIFIED and LOCKED.**
12. **Move to the next route in journey order.**

## Route Acceptance Card
Before meaningful work on a route/workflow, record:
- User/role being tested
- Route/workflow
- User's intended action
- Canonical data that should be read/written
- Permissions that should allow or deny the action
- What counts as PASS
- Important mobile/Spanish/device states
- Explicit out-of-scope items or dependencies

Keep this small. It is meant to prevent scope drift, not create bureaucracy.

## Route Acceptance Ledger
Maintain one shared progress ledger covering the app from front door to deepest administration.

Minimum fields:
- Journey order
- Route/workflow
- Applicable roles
- Status: NOT STARTED / IN PROGRESS / NEEDS MARCUS / VERIFIED / LOCKED
- Mobile
- Desktop
- Spanish where applicable
- Permissions/security
- Speed status
- Important state coverage
- Regression coverage
- Visual evidence
- Verified checkpoint/commit
- Remaining blocker
- Exact next route

The ledger should answer "where are we?" without requiring Marcus or another workstream to reconstruct prior chats.

## Screenshot / visual evidence standard
Use screenshots intentionally, not as a photo dump. Capture the smallest useful proof set for the workflow, typically:
- Primary mobile screen
- Important interaction/success/error/empty state when relevant
- Desktop only when materially different
- Spanish when that workflow supports Spanish
- Restricted-role/access result when permission behavior is important

Screenshots support human acceptance; they do not replace backend/security verification.

## Manual acceptance → automated protection
When Marcus manually approves a golden-path workflow:
- treat the approved behavior as the product contract;
- add or strengthen regression coverage for that exact flow where practical;
- use browser end-to-end coverage for high-value user journeys as the suite grows;
- do not rely on manual rechecking of every locked flow after every unrelated change.

Automation protects accepted behavior; Marcus should not have to repeatedly rediscover the same regressions.

## LOCK rule
A LOCKED route/workflow is not casually redesigned, refactored, or "improved."

Reopen only for:
- a verified regression;
- a security/privacy/data-integrity issue;
- a shared dependency change that materially affects it;
- a real-world usability failure;
- or explicit Marcus direction.

If reopened, rerun the relevant final-inspection and regression checks before relocking.

## CI / automated quality gate direction
As the automated suite grows, pull requests and integration work should fail visibly when required tests, lint, build, or other release-gate checks fail. A green review should mean the required checks truly passed, not merely that the workflow completed.

Do not treat CI as a substitute for Marcus's human acceptance of important UX. CI protects the locked contract; the live walkthrough decides whether the product actually feels right.

## Performance rule
Performance is part of completion, not cleanup.

Use the standing **Speed: CLEAR / NEEDS OPTIMIZATION / BLOCKED** requirement. As measurement improves, establish explicit budgets for important loads/actions so slow creep is caught automatically rather than by feel alone.

## End-of-batch Resume Packet
At the end of each meaningful batch, record:
- LOCKED / VERIFIED area
- What changed
- What was tested
- Speed status
- Visual/manual evidence
- Regression coverage
- Checkpoint/commit
- Remaining blocker, if any
- **Exact next route/workflow**

This is the handoff between chats/workstreams and prevents rediscovery.

## Journey-order principle
Default to moving from the beginning of One Kingdom toward deeper roles and operations rather than hopping randomly around the product.

Representative order:
**Public / Join → Login / Onboarding → Member Home → My Journey → Friendship Groups / Community → Events / Schedule → Learning → Serving → Leader workspaces → Teacher/Class → Ministry Leader → Secretary/Finance where applicable → Pastor/Admin → Platform Owner.**

Exact ordering may shift when a critical security/data-integrity issue must take priority, but the visual end-to-end journey remains the organizing spine.

## Quality philosophy
The goal is not to mark pages "done" quickly. The goal is to leave each accepted area genuinely finished enough that the team can safely stop touching it and move forward.

**Walk → Screenshot → Find friction → Fix small batch → Verify technically → Human retest → Speed check → Regression protection → LOCK → Record → Next.**
