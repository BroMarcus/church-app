# Kingdom Network Master Upgrade Plan

Approved by Marcus: 2026-08-20

Status: APPROVED FOR EXECUTION

This document records the approved KN-001 through KN-126 upgrade program and the required Learning Center builder change. After this branch is integrated, this plan becomes the high-level product roadmap. `docs/KINGDOM_NETWORK_BUILD_CHECKLIST.md` remains the detailed legacy execution checklist until the Control Room coordinates its reconciliation with active workstreams.

## Operating rules

1. Execute in the Phase 1 -> Phase 11 order below.
2. Do not stop for normal reversible implementation decisions.
3. Surface items that are hard to undo, security/privacy-sensitive, create real cost, or are genuinely blocked.
4. Every workstream must use Issue #28, check current claims, and avoid overlapping claimed routes/files/database objects.
5. New work is not complete because code exists. Verify it.
6. Deployment remains controlled: verified batch -> combined PR -> green CI -> one-shot production deployment -> smoke test -> automatic deployment OFF.
7. Prefer making Kingdom Network feel simpler while preserving powerful capabilities underneath.
8. Product principle: enter information once and update every authorized place it affects.

## Required Learning Center architecture decision

Before Strategy of Jesus, Disciple Your Disciplers, First Steps expansion, or any other source curriculum is added as new structured content, ship a general-purpose in-app Class/Lesson Builder.

The builder must let authorized pastors/admins/learning leaders:

- create a class/course from scratch;
- edit course metadata and requirements;
- add, edit, reorder, and delete modules/lessons;
- add, edit, reorder, and delete assessments/questions;
- attach checkpoint quizzes/assessments to lessons;
- configure passing standards within allowed product rules;
- publish/unpublish a class;
- archive and restore a class without deleting its history;
- perform these changes inside Kingdom Network without a code deployment.

Marcus's source curriculum must be installed through this builder as the first real end-to-end proof that the builder works. Marcus will personally create/edit a class in the app during the evaluation pass before the builder is considered fully accepted.

Implications:

- KN-034 Strategy of Jesus: builder-managed content, not hardcoded content.
- KN-035 Disciple Your Disciplers: builder-managed content, not hardcoded content.
- KN-036 Teacher Dashboard: follows the builder foundation and uses the same course/class model.
- KN-080 Church templates: preloaded curriculum means installed/configured through the builder, never baked into schema/code.
- KN-121 Template marketplace: course/class templates are portable builder-managed content.

## Phase execution order

### Phase 1 - Truth, security, and release foundations

KN-001 through KN-014.

Goal: make the roadmap truthful, classify/harden sensitive database surfaces, eliminate release-environment drift, preserve the controlled deployment model, and finish the real-device auth reliability gate.

### Phase 2 - Radical simplicity

Primary items: KN-015 through KN-020 plus the navigation/empty-state/feature-visibility portions of KN-071, KN-073, KN-076 through KN-086.

Goal: role-aware navigation, fewer visible choices, one Today surface, one Leader Home, one Admin Home, progressive disclosure, and first-class English/Spanish/mobile/accessibility behavior.

### Phase 3 - Perfect member journey

Primary items: KN-021 through KN-033 and the member-facing parts of KN-037, KN-038, KN-071 through KN-075.

Goal: visitor -> account -> Start Here -> My Journey -> Learning -> Group -> Serve should feel like one guided experience.

### Phase 4 - Perfect leader journey

Primary items: KN-039 through KN-048.

Goal: Friendship Group leaders get My Group; ministry leaders get My Team; work is scoped, actionable, and simple.

### Phase 5 - Pastor/admin operating system

Primary items: KN-056 through KN-063 and KN-087 through KN-091.

Goal: one Church Today/leadership operating view, one approval inbox, strict pastoral-care boundaries, useful workflow ownership, and actionable church-health reporting.

### Phase 6 - Complete existing operational engines

Finish real-world use/verification of groups, teams, schedules, outreach, prayer, care, documents, events, business/fundraising surfaces that are enabled for the pilot. Hide unconfigured areas rather than forcing empty modules into navigation.

### Phase 7 - Learning Academy

First deliverable: the general-purpose Class/Lesson Builder described above.

Then execute KN-034, KN-035, KN-036, KN-037, KN-038 and the approved learning-library roadmap through that builder. No new curriculum should require a developer to change code.

### Phase 8 - Communication and workflows

Primary items: KN-049 through KN-055 and KN-060 through KN-063.

Goal: real email readiness, controlled SMS later, unified communication preferences, forms/workflow templates, ownership/due dates, moderation, and one communication mental model.

### Phase 9 - Kingdom Guide 2.0

Primary items: KN-064 through KN-070.

Goal: merge Guide + Tap & Go into one permission-aware assistant that can navigate, answer source-backed questions, surface operational intelligence, and perform consequential actions only with human confirmation.

Approved naming note: the current approved plan keeps the product name `Kingdom Guide` rather than renaming it to `The Prophet`, unless Marcus later overrides this decision.

### Phase 10 - Differentiators

Primary items: KN-101 through KN-121.

Goal: church-native discipleship operating system, voice-to-work, knowledge brain, leadership pipeline, Business Partners, church-to-church sharing/discovery, and builder-backed templates.

### Phase 11 - Final QA and release evaluation

Primary technical items: KN-092 through KN-100 plus complete route/role/device/language/accessibility/privacy/error/empty-state/load verification across the entire approved product.

Long-term items KN-122 through KN-126 remain intentionally deferred unless the earlier phases prove the need.

---

# Approved backlog

## Foundation / security / release

- **KN-001** Rebuild the roadmap into a truthful live source of truth.
- **KN-002** Complete the SECURITY DEFINER function audit and classify every exposed function.
- **KN-003** Add defense-in-depth protection for private assessment/game answer keys.
- **KN-004** Enable leaked-password protection.
- **KN-005** Review and move/harden `pg_net` outside the public schema where appropriate.
- **KN-006** Finalize one authorization model: base membership role plus stackable functional roles, never silent Pastor/Admin elevation.
- **KN-007** Perform adversarial multi-tenant isolation tests.
- **KN-008** Perform full Storage security/path isolation sweep.
- **KN-009** Choose one canonical finance architecture and retire/deprecate the duplicate model.
- **KN-010** Rebase/reconcile PR #31 feature-by-feature; do not blindly merge it.
- **KN-011** Complete real-device English/Spanish authentication gauntlet.
- **KN-012** Remove authenticated/member navigation from public signup routes.
- **KN-013** Align Node/toolchain behavior across CI and Vercel.
- **KN-014** Preserve controlled one-shot deployment discipline.

## Navigation and simplicity

- **KN-015** Create role-aware navigation.
- **KN-016** Hide unfinished or church-disabled modules.
- **KN-017** Consolidate the large More menu into understandable groups.
- **KN-018** Make Today the main operational surface.
- **KN-019** Create one Leader Home.
- **KN-020** Create one Admin Home.

## Onboarding

- **KN-021** Permanent church-specific QR/join link and downloadable launch assets.
- **KN-022** Progressive onboarding.
- **KN-023** Separate new-believer and existing-member onboarding paths.
- **KN-024** Existing-person/account reconciliation wizard.
- **KN-025** Friendly duplicate-account recovery.

## Member Journey

- **KN-026** Make My Journey the heart of the member experience.
- **KN-027** Every journey step answers: where am I, what is next, why it matters, what do I do now.
- **KN-028** Household/family experience.
- **KN-029** Contextual profile completion instead of meaningless percentage completion.
- **KN-030** Clear member-reported / leader-verified / official-record status distinctions.

## Learning Center

- **KN-031** Finish complete English/Spanish Learning UI.
- **KN-032** Unified Learner Home.
- **KN-033** Course pathways above a raw course catalog.
- **KN-034** Strategy of Jesus courses, installed through the Class/Lesson Builder.
- **KN-035** Disciple Your Disciplers leadership academy, installed through the builder.
- **KN-036** Teacher Dashboard built on the same configurable course/class model.
- **KN-037** Classroom and self-paced progress converge into one transcript/journey.
- **KN-038** Certificate center.

## Friendship Groups

- **KN-039** My Group leader command center.
- **KN-040** Replace paper Friendship Group reporting end-to-end.
- **KN-041** Missing-member attention and simple check-in workflow.
- **KN-042** Group-leader scoped mini-pastor permissions.
- **KN-043** Group multiplication pathway.

## Ministries / Serving

- **KN-044** Populate actual New Life ministries.
- **KN-045** My Team leader command center.
- **KN-046** Serving pipeline: interested -> applied -> reviewed -> training -> qualified -> scheduled -> active.
- **KN-047** Configurable qualification rules.
- **KN-048** Availability, accept/decline, time-off, and replacement handling.

## Communication / Community

- **KN-049** Configure real outbound email readiness.
- **KN-050** Controlled SMS integration later with consent/cost/quiet-hour controls.
- **KN-051** Unified communication center organized by audience, not infrastructure jargon.
- **KN-052** Unified notification preferences.
- **KN-053** Quiet hours and digest options.
- **KN-054** Keep Community relational; do not turn it into an engagement-addiction feed.
- **KN-055** Strong moderation/reporting tools.

## Pastoral Care

- **KN-056** Keep pastoral-care data separate from ordinary profile data.
- **KN-057** Formal pastoral-care permission tiers.
- **KN-058** Sensitive-record audit trail.
- **KN-059** Plain-language member privacy explanation before submission.

## Forms and workflows

- **KN-060** Lightweight general-purpose Forms engine.
- **KN-061** Reusable workflow templates.
- **KN-062** One approval inbox.
- **KN-063** Owner, status, next action, and due date wherever work exists.

## Kingdom Guide

- **KN-064** Merge Kingdom Guide and Tap & Go into one assistant.
- **KN-065** Keep the name Kingdom Guide unless Marcus later overrides.
- **KN-066** Persistent Ask Kingdom Guide action.
- **KN-067** Permission-aware AI actions.
- **KN-068** Human confirmation for consequential actions.
- **KN-069** Source-backed Bible/church answers with authority/source distinctions.
- **KN-070** Operational questions for authorized leaders.

## Product / UX consolidation

- **KN-071** One universal permission-aware search.
- **KN-072** Natural-language search.
- **KN-073** Consolidated Calendar with Mine / Church / My Team / Leadership views.
- **KN-074** Events and Calendar use one event ecosystem.
- **KN-075** Event registration/check-in after the event model is stable.
- **KN-076** One Library umbrella for Resources, Media, and Documents navigation.
- **KN-077** Human empty states instead of raw no-record states.
- **KN-078** Church-controlled feature switches.
- **KN-079** Church Builder becomes a guided low-tech wizard.
- **KN-080** Church templates install configurable builder-managed content rather than hardcoded curriculum.
- **KN-081** Plain-language settings; no database/provider jargon for normal admins.
- **KN-082** Full accessibility pass.
- **KN-083** Central translation architecture.
- **KN-084** Spanish as a true first-class product.
- **KN-085** Mobile-first admin forms.
- **KN-086** Progressive disclosure instead of a separate simple-mode product.

## Analytics / leadership intelligence

- **KN-087** Who needs attention instead of vanity scores.
- **KN-088** Weekly Pastor Brief.
- **KN-089** Trend charts only when actionable.
- **KN-090** Analytics filters by ministry/group/leader/time.
- **KN-091** Keep donor-level finance out of ordinary church-health/engagement views.

## Technical quality

- **KN-092** Add missing foreign-key indexes where real access patterns justify them.
- **KN-093** Optimize RLS auth-function initialization patterns.
- **KN-094** Consolidate overlapping permissive RLS policies where semantics permit.
- **KN-095** Do not remove indexes solely because current pilot traffic has not used them.
- **KN-096** Query-budget / N+1 / over-fetching audit.
- **KN-097** Structured application logging.
- **KN-098** Production monitoring/alerts.
- **KN-099** Backup/restore drill.
- **KN-100** Consolidate Vercel projects after dependencies/domains are verified.

## Competitive enhancements

- **KN-101** Group finder.
- **KN-102** Smart serving recommendations with human choice.
- **KN-103** Check-in where New Life actually needs it.
- **KN-104** Background-check/training integrations rather than building screening.
- **KN-105** Established giving/payment provider integration rather than building payment processing.
- **KN-106** Year-end giving statements once real contribution data is in use.
- **KN-107** Custom report builder later.
- **KN-108** Personalized weekly digest.
- **KN-109** PWA/installable mobile experience before native apps.
- **KN-110** Content scheduling.

## Kingdom Network differentiators

- **KN-111** Own the Discipleship Operating System category.
- **KN-112** Personalized spiritual journey.
- **KN-113** Kingdom Guide as permission-aware church operating intelligence.
- **KN-114** Voice-to-church-work with human verification.
- **KN-115** Leadership pipeline with pastoral final judgment.
- **KN-116** Source-backed church knowledge brain.
- **KN-117** Church Health as ministry intelligence focused on people falling through cracks.
- **KN-118** Member-owned Business Partners with member priority and clearly labeled sponsored listings later.
- **KN-119** Opt-in church-to-church resource sharing.
- **KN-120** Cross-church events/discovery without private member-data sharing.
- **KN-121** Builder-backed template marketplace.

## Long-term / deliberately deferred

- **KN-122** Native iOS/Android apps only after mobile-web demand proves the need.
- **KN-123** Advanced district/organization administration later.
- **KN-124** Privacy-safe aggregated network benchmarking later.
- **KN-125** Expanded gamification carefully; never turn spiritual life into a leaderboard.
- **KN-126** Full public website builder is not a priority; integrate existing websites first.

---

## Consolidations approved

- Kingdom Guide + Tap & Go -> Kingdom Guide.
- Pastor Center + Leadership + Coordination + Health -> one Leader Home / Church Today experience.
- Calendar + My Calendar + Shared Schedules -> Calendar with role-aware views.
- Resources + Media + Documents navigation -> Library umbrella with separate permissions underneath.
- Alerts + alert settings -> Notifications Center.
- Parallel finance schemas -> one canonical Finance architecture.
- Progress/journey displays -> My Journey as canonical member pathway.
- Group leader report/roster/tools -> My Group.
- Ministry roster/schedule/tools -> My Team.

## Explicit avoid/remove rules

Do not add another dashboard, role system, finance ledger, AI personality, payment processor, email/SMS transport layer, addictive social algorithm, advanced facility management system, full accounting package, premature network complexity, meaningless gamification, developer jargon for normal church admins, or public navigation to church-disabled/unconfigured modules.

Do not use giving amount or raw app activity as a spiritual-health score.

## Product identity

Kingdom Network should aim to be the church discipleship operating system: know your people, help each person take the next step, and equip leaders to shepherd them.
