# One Kingdom — Pre-Launch Package 7/8 Execution Plan

Updated: 2026-08-28

## Purpose
Prepare the One Kingdom Base44 pilot for a small private Madera launch while preserving verified work, minimizing overlap, keeping normal use Free-tier friendly, and giving pilot users a clear view of the larger product vision.

## Operating rule
Work in small coordinated slices. Do not mark launch work PREVIEW VERIFIED until it has been personally opened and tested in the actual Base44 preview.

## Package 7A — Critical Launch Cleanup + Vision Preview

### Goals
1. Reconcile only critical/high pilot findings already discovered by QA workstreams.
2. Remove or hide obsolete demo/POC surfaces that should not be exposed to pilot users.
3. Verify One Kingdom naming/identity/account consistency on pilot-facing surfaces.
4. Add a low-cost dashboard vision preview for planned modules without pretending unfinished modules are usable.

### Dashboard vision preview
Add a polished `Coming Soon in One Kingdom` section using the existing blue/gold/celestial visual system. It should be informational only and must not create backend/runtime-credit activity.

Initial roadmap modules:
- Church Office / Secretary
- Fundraising
- Camps & Conferences
- Giving & Finance
- Ministry Scheduling
- Official Records
- Forms Center
- Member Care
- Reports & Church Health expansion
- Multi-Church / Network

Show only a small selection on the main dashboard so the pilot does not feel cluttered. The cards must be visibly labeled `Coming Soon` and non-clickable unless a real route already exists and is intentionally released.

### Technical guardrails
- No new Base44 AI/agent/email/SMS runtime usage.
- No finance, church-role, RLS, multi-tenant, Learning, or Friendship Group backend changes in this slice.
- No destructive schema/data changes.
- Preserve mobile-first layout and existing dashboard customization.
- Preserve existing One Kingdom blue/gold/celestial design language.
- English-first is acceptable for this purely informational first slice; bilingual support should follow the app's current language architecture when that architecture is available on the dashboard.

## Package 7B — Final Launch Verification
No new feature building. Verify the release candidate end-to-end as Member, Leader, Teacher, Admin, Pastor/Platform Owner. Include signup/login/account linking, dashboard/navigation, groups, guests/follow-up, learning/classes, profile/journey, administration, Spanish/English where supported, logout/login, and mobile usability.

Statuses:
- BUILD VERIFIED — code/build checks pass.
- USER VERIFICATION NEEDED — requires Marcus or a live role/account in preview.
- PREVIEW VERIFIED — personally opened in actual preview and confirmed visible/clickable/working.

## Package 8A — Pilot Feedback
Do not duplicate active Feedback work. Reconcile and verify the existing feedback implementation. Target pilot behavior:
- Problem / Suggestion / Question
- Description
- User / role / page / timestamp when safely available
- Status: New → Reviewing → Fixed → Verified
- Platform Owner review surface

Keep this small; no full help-desk system before pilot evidence requires it.

## Pilot launch gate
Package 7A criticals reconciled + Package 7B preview verification + Package 8A feedback path verified → Marcus approves private Madera pilot.

## Post-launch product learning
Pilot feedback and repeated confusion become roadmap signals. Keep product fixes separate from cosmetic preference unless repeated use demonstrates real friction.
