# One Kingdom Legacy Environment Archive

Verified: 2026-09-18

## Canonical current application

Current One Kingdom development happens only in Base44 app `6a8b3494945c37375d00b91c`.

This repository and the environments below are legacy/supporting references unless Marcus explicitly starts a migration or retirement task.

## GitHub

- Repository: `BroMarcus/church-app`
- Status: KEEP — SUPPORTING / LEGACY APPLICATION CODE
- Purpose now: Control Room, historical documentation, Build Checklist, legacy Next.js/Supabase history and migration reference.
- Do not use its app code as the current One Kingdom implementation.

## Vercel

Legacy projects discovered:

- `kingdom-network` — legacy production project; still responds at `kingdom-network.vercel.app`; KEEP TEMPORARILY until domain/auth/dependency retirement is verified.
- `kingdom-network-app` — deployment paused; ARCHIVE CANDIDATE.
- `kingdom-network-mcp-test` — deployment paused; ARCHIVE CANDIDATE.
- `kingdom-network-prod-test` — deployment paused; ARCHIVE CANDIDATE.
- `kingdom-network-alpha-live` — deployment paused; ARCHIVE CANDIDATE.

Do not deploy any of these as the current One Kingdom application.

## Supabase

- Visible project ref: `xocuemeavvsgjclnjsiu`
- Name: `supabase-fuchsia-paddle`
- Status when audited: INACTIVE
- Classification: LEGACY / VERIFY BEFORE RETIREMENT
- No Supabase dependency was found in the current Base44 One Kingdom source.

## Branches

The legacy GitHub repository contains many historical agent/automation/preview/workstream branches. They are intentionally left untouched for now because branch deletion is destructive and some have unique/unmerged work or historical Vercel deployments.

Future cleanup rule:
1. prove no active dependency;
2. preserve unique work/history;
3. archive/retire only after verification;
4. delete only with explicit Marcus approval.

## Current development rule

For normal One Kingdom work, ignore legacy GitHub application code, Vercel projects, and Supabase unless a task explicitly concerns migration/retirement. Read and change the Base44 canonical app first.
