# Kingdom Network V2 — Foundation Rules

Status: STEP 1 — FOUNDATION IN PROGRESS
Branch: `kingdom-network-v2`
Development namespace: `/v2`
Production: HOLD

## Purpose

Kingdom Network V2 is a protected, section-by-section rebuild path beside Kingdom Network V1. It exists so each part of the product can be defined, built, tested, reviewed, and personally approved before work moves to the next part.

V2 does **not** replace V1 unless Marcus later chooses it. V1 remains preserved while V2 is evaluated.

## Founder-approved operating rules

1. **Name:** Kingdom Network V2.
2. **Protect V1:** V2 work does not change V1 simply because V2 is being built. Any V1 change requires an explicit reason and approval/coordination.
3. **Reuse only after review:** Strong V1 code, database structures, auth logic, permissions, course logic, or components may be reused only after they are inspected and judged appropriate for V2.
4. **Repository:** V2 stays in `BroMarcus/church-app` on its own long-lived branch: `kingdom-network-v2`.
5. **Route isolation:** V2 development pages live under `/v2` until a later migration decision.
6. **Preview review:** V2 uses isolated Vercel Preview deployments for review. Production must not be replaced or changed by V2 work.
7. **Preview cadence:** Produce a new review preview after a small related batch of visible changes, not after every tiny edit.
8. **Founder acceptance:** A section is not complete until Marcus personally reviews the live preview and approves it.
9. **Approved-section stability:** Approved sections are treated as mostly locked. They may be revisited only for necessary fixes, security issues, or dependencies.
10. **Real church data:** V2 may read authorized real church data so the product can be evaluated realistically.
11. **No unapproved live writes:** V2 must not edit or delete real church records until the specific write workflow has been tested and approved.
12. **Write testing:** Use clearly labeled test users and test records for create/edit/delete testing before any live-write approval.
13. **Role testing:** Every major section must be evaluated as New Member, Existing Member, Leader, and Pastor/Admin where applicable.
14. **Bilingual from day one:** English and Spanish are developed together for every section.
15. **Mobile first:** Phone experience is designed and approved first; tablet and desktop must also be complete before final section approval.
16. **Visual direction:** V2 uses the blue/gold direction Marcus previously chose from Claude while preserving the ability to return to the original V1 look. The exact prior Claude palette is not currently preserved in the retrieved project material, so V2 styling must use centralized/reversible design tokens rather than scattering hard-coded theme decisions across features.
17. **Navigation before features:** Permanent top-level V2 navigation must be agreed before individual feature/tab implementation begins.
18. **Backlog discipline:** New ideas that belong to later sections are recorded in the V2 backlog instead of interrupting the current section.
19. **Discovery before building:** Before each future major step, ask approximately 10–20 focused questions covering purpose, user workflow, data, permissions, actions, loading/success/empty/error states, mobile, bilingual behavior, security, and visual expectations. Go beyond 20 only when a genuinely complex or security-sensitive workflow requires it.
20. **Step 1 boundary:** Foundation work may establish the V2 branch, `/v2` shell, preview strategy, testing/data rules, navigation planning, and documentation. It must not begin real Home, Learning, Groups, Finance, AI, or other feature implementation.

## Section completion standard

A V2 section moves through this sequence:

**DEFINED → FUNCTIONAL → CONNECTED → SECURE → SIMPLE → MOBILE → BILINGUAL → TESTED → PREVIEWED → MARCUS APPROVED**

Passing build checks alone does not make a section complete.

## V2 work rhythm

For each major section:

1. Discovery questions.
2. Written decision summary.
3. Confirm exact scope and explicit non-scope.
4. Inspect relevant V1 work for safe reuse.
5. Build only that section.
6. Run focused tests plus security/static/build gates.
7. Create isolated Vercel Preview after a small related batch passes.
8. Marcus reviews the live preview.
9. Fix feedback within the same section.
10. Marcus approves the section.
11. Lock the section except for necessary fixes/dependencies.
12. Only then begin discovery for the next section.

## Data safety rule

Until a specific V2 write workflow is approved:

- authorized reads from real church data are allowed;
- real member/church records are not edited or deleted by V2;
- write behavior uses clearly disposable/test records;
- no new Supabase schema, RLS, RPC, migration, or production-data change is implied by Step 1;
- any later schema/security change must be separately scoped, conflict-checked, tested, and recorded in the Control Room.

## Visual reversibility rule

V2 visual design must be centralized through V2-specific design tokens/components. Blue/gold styling must not be baked into V1 global styles. If Marcus later prefers the original look, the V2 presentation layer should be replaceable without rewriting feature logic.

## Navigation gate

Top-level V2 navigation is **not yet approved**. Step 1 cannot be marked complete until the navigation model is discussed and accepted. No real feature/tab implementation begins before that decision.

## Deployment rule

- Kingdom Network V1 production remains protected.
- V2 may use preview deployments only for review during this evaluation period.
- A preview must pass the relevant repository checks before it is handed to Marcus for review.
- No production deployment, alias replacement, or V1-to-V2 cutover occurs without explicit Marcus approval.
