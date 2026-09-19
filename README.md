# LEGACY / SUPPORTING — DO NOT USE AS CURRENT ONE KINGDOM APP SOURCE

**Status verified: 2026-09-18**

The current One Kingdom application is the Base44 app:

- Product: **One Kingdom OS**
- Base44 App ID: `6a8b3494945c37375d00b91c`
- Canonical current code: Base44 internal Git repository, branch `main`
- Current backend: Base44 entities + Base44 functions

This GitHub repository is **not** the current One Kingdom application source. It contains the older Next.js + Supabase generation of Kingdom Network / One Kingdom, plus valuable historical documentation, migrations, test material, the Build Checklist, and the active Control Room coordination history.

## Rule for future development

Do not make current One Kingdom feature changes here unless Marcus explicitly starts a migration/reconciliation project.

For current One Kingdom work:

1. Open Base44 app `6a8b3494945c37375d00b91c`.
2. Read the current Base44 source first.
3. Use this repository's Build Checklist and Control Room for coordination/reference.
4. Do not deploy this legacy GitHub/Vercel/Supabase stack as though it were the current application.

## Legacy stack

This repository's application code uses Next.js + Supabase and historically deployed through Vercel. The legacy production URL `kingdom-network.vercel.app` belongs to this generation.

Nothing in this repository should be deleted until legacy dependencies, branches, deployments, OAuth callbacks, domains, and historical records are fully reconciled.
