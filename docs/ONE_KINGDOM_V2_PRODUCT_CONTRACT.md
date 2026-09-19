# One Kingdom V2 — Product & Build Contract

## Product promise

**Know every person. Clarify every next step. Let nobody be forgotten.**

One Kingdom is not a collection of church software modules. It is a church operating system that connects people, discipleship, care, groups, learning, ministry, schedules, outreach, records, reporting, and leadership follow-through around one continuous member story.

## Build rule

Routine One Kingdom V2 engineering is code-first and must not depend on Lovable AI generation.

- GitHub is the source of truth for application code and history.
- Next.js is the application framework.
- Supabase is the data, authentication, storage, realtime, and authorization layer.
- Vercel provides branch previews and deployment.
- Lovable is an optional visual/agent workspace, not the owner of the product.
- Do not invoke Lovable credit-consuming creation or edit actions unless the owner explicitly authorizes that use.

## Migration rule

The Base44 One Kingdom OS remains the behavior and product-reference source while V2 is built. Do not mechanically port Base44 platform code.

For each domain:

1. Preserve the proven user workflow, terminology, permissions, and business rules.
2. Preserve person and church history; never solve migration by dropping continuity.
3. Rebuild platform-specific behavior using the custom Next.js/Supabase architecture.
4. Improve information architecture, speed, phone usability, accessibility, and leadership follow-through where the existing implementation is weak.
5. Verify tenant isolation and role scope before calling a workflow ready.
6. Preview on a branch before any production promotion.

## Non-negotiable product principles

### Person continuity

A person should have one continuous story across guest, member, leader, training, group, ministry, care, outreach, and archived states. Conversions and lifecycle changes must preserve history.

### Responsibility engine

Anything that needs human follow-through should be assignable, visible, due-aware, and closable. The system should make it difficult for a guest, member, prayer need, training requirement, request, or leadership responsibility to disappear silently.

### Role-first experience

Members, group leaders, ministry leaders, ministers, admins, and pastors should see the same One Kingdom system through the lens of what they are responsible for. Ministry titles do not silently grant authority.

### My Today

The daily home for action: assignments, classes, alerts, follow-ups, care, approvals, and upcoming responsibilities.

### My Journey

A clear discipleship and participation path that can combine self-reported milestones with verified church records and training completions without confusing the two.

### Leadership visibility

Leadership should be able to answer: Who needs attention? What is overdue? What is growing? What is stalled? What was completed? Who owns the next action?

### Church Health

Reporting should lead to action rather than vanity metrics. Every metric should help leadership understand people, discipleship, care, engagement, ministry, or follow-through.

## Security rules

- Every church-owned record must be tenant-scoped.
- RLS is required on exposed Supabase tables.
- Authorization is based on trusted membership/role/permission records, never editable user metadata.
- Prayer, pastoral care, official records, children-related data, and sensitive member information require explicit privacy boundaries.
- Guest conversion must not accidentally grant church authority.
- Platform-owner authority and church-level authority remain separate.
- Privileged mutations require server-side authorization and auditable activity history.

## UX rules

- Phone-first without making desktop feel like a stretched phone screen.
- Home is a command center, not a feature directory.
- Primary mobile navigation begins with **Home, Today, Journey, Groups, More**.
- Progressive disclosure: show the next useful action before showing every possible tool.
- Plain church language over software language.
- Preserve English/Spanish capability as the product expands.
- Fast perceived navigation; avoid unnecessary loading boundaries and duplicate fetches.
- Empty states must tell the user what happens next.

## Migration order

1. One Kingdom shell, branding, Home, mobile navigation.
2. My Today and responsibility/attention model.
3. Person continuity, People, Guests, conversion, archive/re-engagement.
4. My Journey and verified milestones.
5. Friendship Groups and leader reporting.
6. Learning, classes, training records, compliance renewals, certificates.
7. Prayer and pastoral care privacy tiers.
8. Unified schedules, ministry teams, assignments, attendance.
9. Outreach, Bible studies, follow-up and guest pipelines.
10. Admin Center, official records, forms, office workflows.
11. Church Health, reporting, leadership dashboards.
12. Subscription/tenant provisioning, plan controls, billing integration and launch hardening.

## Release standard

A feature is not “done” because code exists. It is ready only when the branch build passes, the live preview works on phone and desktop, role boundaries are verified, the workflow is understandable without explanation, and no known launch-blocking regression remains.
