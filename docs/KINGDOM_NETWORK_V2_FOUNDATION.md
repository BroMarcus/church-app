# Kingdom Network V2 — Foundation Rules

Status: STEP 1 — FOUNDATION REVISION IN REVIEW
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
16. **Visual direction:** V2 uses the exact approved blue/gold design system listed below. The theme is centralized in V2-only tokens so it remains reversible without rewriting feature logic.
17. **Navigation before features:** The permanent member navigation decision is now approved: five bottom tabs — Home, My Group, Learn, Serve, More — with Spanish equivalents. The implementation is configuration-driven so future per-user destinations can be supported without changing the shell.
18. **Backlog discipline:** New ideas that belong to later sections are recorded in the V2 backlog/specification instead of interrupting the current section.
19. **Discovery before building:** Before each future major step, ask approximately 10–20 focused questions covering purpose, user workflow, data, permissions, actions, loading/success/empty/error states, mobile, bilingual behavior, security, and visual expectations. Go beyond 20 only when a genuinely complex or security-sensitive workflow requires it.
20. **Step 1 boundary:** Foundation work may establish the V2 branch, `/v2` shell, preview strategy, testing/data rules, navigation, design system, and documentation. It must not begin real Home, Learning, Groups, Finance, AI, or other feature implementation.

## Locked V2 design system

### Colors

- `navy-900` — `#0A1730` — app background
- `navy-850` — `#0E1D3E` — bottom navigation and input fills
- `navy-800` — `#152A4C` — card background
- `navy-700` — `#1D3563` — borders and dividers
- `gold-400` — `#E3C179` — icons, accents, active states
- `gold-500` — `#C9A253` — Kingdom Network wordmark
- `gold-600` — `#9C7B37` — dashed borders and gradient end
- `ink-100` — `#F5F1E6` — primary text
- `ink-300` — `#C6CEE0` — secondary text
- `ink-500` — `#8894B4` — muted text and inactive icons

### Typography

- Screen titles and section headings: **Cormorant Garamond**, weight 600, fallback Georgia serif.
- Body and functional UI: **Work Sans**, weights 400/500/600, fallback system UI.
- V2 should not use Inter, Roboto, or Arial for its interface styling.

### Shared component rules

- Cards: `navy-800`, 1px `navy-700` border, 14px radius, 16px padding.
- Icons: stroked SVG, 1.75 stroke width, round caps/joins, 24px viewBox convention.
- Icon tiles: 38×38px, 10px radius, `rgba(201,162,83,0.15)` fill.
- Hero: `linear-gradient(155deg, #152A4C 0%, #0E1D3E 55%, #1B1030 130%)`, soft gold top-right glow, 16px radius.
- Primary button: `linear-gradient(135deg, #E3C179, #9C7B37)`, 12px radius, 14px padding, `#1A1204` text at 600 weight.
- Minimum tap target: 44px.

## Locked branding rule

Every V2 screen uses a fixed Kingdom Network lockup at the top-left:

- crown icon in `gold-500`;
- `KINGDOM NETWORK` — 11px, 2px letter spacing, `gold-500`, weight 600;
- church name below — 12px, `ink-500`;
- an optional small church logo may be shown for contrast;
- Kingdom Network branding is not removable by individual churches in the current product direction.

Church-specific names, logos, schedules, groups, curriculum, and configuration remain tenant-specific data. The current V2 foundation preview may display New Life's name as preview copy, but feature implementations must source church-specific values from data/settings rather than hardcoding them.

## Navigation rule

Default member navigation:

**Home · My Group · Learn · Serve · More**

Spanish:

**Inicio · Mi Grupo · Aprender · Servir · Más**

The shell is configuration-driven from the beginning so tabs can eventually point to user-specific destinations. Per-user persistence is intentionally **not** connected during Step 1 because saving tab preferences is a live write workflow and must go through the normal testing/approval process first.

Customization is convenience only. A custom tab destination never grants permission to a route or record the user is not authorized to access.

See `docs/KINGDOM_NETWORK_V2_NAVIGATION.md` for the full navigation contract.

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
- any later schema/security change must be separately scoped, conflict-checked, rollback-planned, tested, and recorded in the Control Room.

## Visual reversibility rule

V2 visual design is centralized through V2-specific design tokens and reusable components. The blue/gold presentation must not be baked into V1 global styling. If Marcus later prefers the original look, the V2 presentation layer should be replaceable without rewriting feature logic.

## Navigation gate

The **navigation decision itself is APPROVED** by Marcus through the supplied Step 1 design brief.

The Step 1 foundation as a whole is still **IN REVIEW** until Marcus personally reviews and approves the updated live preview. No real feature/tab implementation begins before that approval.

## Deferred Claude Friendship Group ideas

The Groups List, Group Dashboard, weekly report, report inbox, real group data seeding, document uploads, inline editing, group guidelines, per-session roles/tasks, and related RLS/write behavior are valuable but belong to the future V2 Friendship Groups step. They are preserved in `docs/KINGDOM_NETWORK_V2_FRIENDSHIP_GROUP_SPEC.md` rather than being built prematurely.

## Deployment rule

- Kingdom Network V1 production remains protected.
- V2 may use preview deployments only for review during this evaluation period.
- A preview must pass the relevant repository checks before it is handed to Marcus for review.
- No production deployment, alias replacement, or V1-to-V2 cutover occurs without explicit Marcus approval.
