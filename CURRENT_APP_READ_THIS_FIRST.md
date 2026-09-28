# STOP — CURRENT ONE KINGDOM APP IS IN BASE44

**Current product source of truth:** Base44 app `6a8b3494945c37375d00b91c`

This GitHub repository is **not** the current One Kingdom application source. Its application code is the older Next.js + Supabase implementation and is kept only for history, reference, documentation, migrations, tests, the Build Checklist, and Control Room coordination.

## Before doing any One Kingdom product work

1. Open the canonical Base44 app first.
2. Inspect the current Base44 source and live workflow before coding.
3. Use GitHub Issue #28 and `docs/KINGDOM_NETWORK_BUILD_CHECKLIST.md` for coordination.
4. Do **not** implement a current product feature in this repository unless Marcus explicitly starts a migration/reconciliation task.
5. Do **not** deploy the legacy GitHub/Vercel/Supabase application as current One Kingdom.

## "Already built but not implemented" rule

A capability is not considered finished merely because code, an entity, a function, or a component exists.

Use these exact statuses:

- **PLANNED** — idea/workflow approved, not built.
- **EXISTS / NOT CONNECTED** — code/entity/function/component exists, but the real user cannot reach or use it end to end.
- **CONNECTED / NEEDS VERIFICATION** — reachable in the canonical Base44 app and wired to real data/permissions, but human acceptance is still pending.
- **VERIFIED / LOCKED** — real workflow passed human acceptance plus the standing final inspection gate.

Never describe **EXISTS / NOT CONNECTED** as done, completed, or implemented.

Before building a replacement, inspect Base44 for existing hidden/disconnected capability. If good work already exists, connect and finish it rather than duplicate it.
