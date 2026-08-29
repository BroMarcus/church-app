# One Kingdom — Commercialization Roadmap

Updated: 2026-08-28

## Goal
Move One Kingdom from a private Madera pilot to a secure, repeatable, sellable multi-church SaaS product without sacrificing the local-church operating experience.

## Lane 1 — Pilot product quality
- Launch hardening
- Real-user feedback
- Mobile simplicity
- Bilingual usability
- Reliable member/leader/admin workflows

## Lane 2 — Commercial readiness
### Package 9 — Multi-Church Isolation
Every tenant-owned record must be scoped to a church. Validate Church A cannot read/write Church B data across UI, functions, entities, and admin surfaces.

### Package 10 — Church Onboarding
Create church → establish Church Owner/Admin → configure branding/settings → invite team → guided launch checklist.

### Package 11 — Plans & Entitlements
Church subscription plan, status, enabled modules, usage/limits if needed, trial/past-due/canceled/suspended states, configurable plan-feature mapping.

### Package 12 — Billing
Use an established payment processor. Subscription activation, renewal, failed-payment handling, cancellation, receipts/invoices, entitlement synchronization, audit trail.

### Package 13 — Platform Owner Business Console
Platform-owner-only sales/business dashboard: churches, trials, paying accounts, plan, subscription status, MRR/ARR, revenue history, past due, cancellations, leads/demos/trials, account lifecycle, support/feedback trends, product usage signals. Minimize unnecessary access to church pastoral/member data.

### Package 14 — Public Sales Website
Home, product story, features, how it works, pricing, demo/request form, vision/about, FAQ, login/get started. Sell outcomes: guest follow-up, discipleship visibility, group leadership, training, member care, administration, reporting.

### Package 15 — Sales System
Lead → Demo → Trial → Follow-up → Subscription → Onboarding → Customer Success. Include demo church, sales presentation, short demo script, pricing sheet, trial flow, onboarding material, pastor/admin quick-start guide.

### Package 16 — Production Release Readiness
Privacy policy, terms, account/data deletion, security review, backup/recovery, billing testing, tenant-isolation testing, mobile testing, onboarding testing, support process, app-store release requirements.

## Release progression
Private Madera Pilot → Invited Church Beta → Paid Early Access → Public Release.

## Product principles
- Church-level subscription rather than requiring every member to pay.
- Keep the app free to install/access where appropriate; entitlement comes from the church subscription.
- Normal church usage should remain as close to zero Base44 runtime-credit dependence as practical.
- Configuration beats church-specific code forks.
- No second real church until tenant isolation is verified.
- Platform Owner tools manage the business relationship; church leaders manage their own church.
