# Kingdom Network Build Checklist

Updated: 2026-08-19

## Mission
Kingdom Network is a church growth, discipleship, leadership-development, communication, and organization system. The product should help the church reach people, follow up consistently, disciple them, train leaders, coordinate schedules, preserve each member's spiritual journey, and give pastors/admins reliable real-time church-health information.

Core operating rule: **Enter information once. Update every authorized place that information affects.**

---

## P0 — Pilot-critical: make existing functions truly usable

- [ ] Audit every pilot-facing page/button/action and remove dead, demo-only, confusing, or duplicate flows.
- [ ] Simplify member Home so it emphasizes only the few actions that matter now; move secondary features under More/Guide.
- [ ] Make member navigation role-aware and keep leader/admin complexity out of normal member screens.
- [ ] Verify permissions so members, group leaders, ministry leaders, pastors/admins, and platform admins only see appropriate data.
- [ ] Add pilot feedback capture and use repeated confusion as a product-fix signal.

## P0 — Learning engine

- [ ] Enforce 5–10 questions on required checkpoint/section tests.
- [ ] Enforce 20–25 questions on required final exams.
- [ ] Enforce sequential gating: learner cannot access the next locked section until the prior required checkpoint is passed.
- [ ] Keep 80% as the default passing score; allow authorized church leadership to set stricter scores per course.
- [ ] Ensure passing a required module test marks that section complete in backend progress.
- [ ] Ensure final exam remains locked until all required checkpoints are passed.
- [ ] Ensure course credential/certificate is issued only after all required checkpoints + final are passed.
- [ ] Expand Effective Soul Winning checkpoint tests from 4 questions each to 5–10.
- [ ] Expand Effective Soul Winning final from 8 questions to 20–25.
- [ ] Verify Effective Soul Winning lesson content against uploaded New Life materials and Scripture.
- [ ] Build a reusable course-builder pattern so all future courses use the same lesson → checkpoint → continue → final model.
- [ ] Add clear progress/resume state: current lesson, next test, locked sections, final status.
- [ ] Make "Resume course" available from Home and The Prophet.

## P0 — Evangelism / guest capture / follow-up

- [ ] Create a dedicated Evangelism section with searchable guest/prospect list.
- [ ] Support first-time guest capture with minimum friction: first name, last name, phone and/or email.
- [ ] Support guest capture from church, Friendship Group, outreach, event, or leader entry.
- [ ] Add visit/source history so each guest record shows where/when they connected.
- [ ] Add follow-up status, owner, next action, due date, and history.
- [ ] Add automated first-visit thank-you communication.
- [ ] Add automated re-invite workflow.
- [ ] Add Bible-study follow-up workflow.
- [ ] Add First Steps invitation workflow.
- [ ] Add missed-follow-up reminders for leaders.
- [ ] Add escalation/visibility when no leader follow-up has happened by the expected time.
- [ ] Keep automated communication configurable and permission/consent aware.
- [ ] Prevent duplicate people when a guest later creates an account; allow claiming/merging an existing guest record.

## P0 — Easy onboarding / invitations

- [ ] Build a permanent church QR-code onboarding flow.
- [ ] Build a simple shareable church join link.
- [ ] Build leader invitation by phone/email.
- [ ] Support joining from Friendship Groups/events as well as main church.
- [ ] Use progressive onboarding: minimal first step, then optional prompts to complete profile later.
- [ ] Allow eager users to complete the entire profile immediately if they want.
- [ ] Add optional prompts for birthday, baptism, Holy Ghost, group, classes, ministry interest, etc.

## P0 — Unified member record / My Journey

- [ ] Make the member profile the single source of truth for personal and ministry data.
- [ ] Track name, phone, email, birthday, anniversary, household/family relationships, and membership status.
- [ ] Track baptism status plus exact/approximate/unknown date.
- [ ] Track Holy Ghost status plus exact/approximate/unknown date.
- [ ] Track First Steps, Effective Soul Winning, Timothys, Bible-study qualification, Bible college, ministry training, safety/harassment training, and other credentials.
- [ ] Track ministries, ministry interests, leadership roles, Friendship Group membership, communities, and serving history.
- [ ] Let members update their own permitted profile data while leaders retain appropriate verification/approval controls for church-record milestones.
- [ ] Build fast, global people search by name, phone, email, group, ministry, status, training, milestone, and other useful filters.

## P0 — Friendship Group reporting

- [ ] Digitize the Friendship Group report the user currently completes on paper.
- [ ] Capture date, group, location, attendance, guests, Bible studies, Holy Ghost reports, baptisms, prayer needs, issues, follow-up needs, lesson/topic, and notes.
- [ ] Support Matthew parties / picnic / barbecue / special group-event reporting.
- [ ] Make reports permanently stored, searchable, and categorized by group/date/person/issue.
- [ ] Allow authorized leaders to retrieve historical reports and related incidents/needs.
- [ ] Make one report automatically update attendance, guest records, evangelism/follow-up, milestones, prayer, and church-health counts where appropriate.
- [ ] Add Prophet-assisted voice/text report entry with confirmation before committing consequential records.

## P0 — Church health dashboard / reporting

- [ ] Build real-time dashboard metrics from the same underlying records rather than manually entered summary numbers.
- [ ] Track first-time guests, return guests, follow-up completion, active Bible studies, baptisms, Holy Ghost, First Steps starts/completions, Effective Soul Winning starts/completions, Timothys progress, Friendship Group participation, serving, leader pipeline, and attendance/activity.
- [ ] Show trend lines by week/month/quarter/year so leadership can see growth, stagnation, or decline.
- [ ] Show where people are getting stuck in the discipleship pathway.
- [ ] Show overdue follow-up and ministries/groups needing attention.
- [ ] Avoid one misleading "church health score"; show the underlying indicators clearly.
- [ ] Design exports/report mapping later for pastor/district reporting once their actual forms are available.

## P0 — The Prophet: AI mentor + operating interface

- [ ] Rename/reframe Kingdom Guide as The Prophet or another approved AI-mentor name, clearly labeled as AI and never as divine revelation.
- [ ] Make The Prophet a persistent global action surface rather than a standalone search page only.
- [ ] Add text command input.
- [ ] Add voice input.
- [ ] Allow natural-language actions such as creating events, tasks, reminders, group reports, prayer requests, testimonies, notes, guest records, and follow-up entries.
- [ ] Route each command to the correct system automatically.
- [ ] Before sending messages or changing another person's important record, show a confirmation summary.
- [ ] Let The Prophet answer "What should I do next?" from the member's actual journey.
- [ ] Let The Prophet resume current classes and identify the next test/locked requirement.
- [ ] Let The Prophet help members find groups, ministries, events, documents, sermons, and church resources.
- [ ] Let authorized leaders ask operational questions such as overdue follow-up, guests who have not returned, class progress, Sunday schedule, etc.
- [ ] Keep permission boundaries identical whether data is accessed through screens or AI.
- [ ] Never let The Prophet say or imply "God told me"; distinguish Scripture, church teaching, historical background, inference, and uncertainty.

## P1 — Proactive Prophet mentoring

- [ ] Add opt-in mentor nudges: Off / Once Daily / Twice Daily.
- [ ] Add quiet hours and notification preferences.
- [ ] Send Scripture-grounded encouragement, Bible-reading reminders, course-resume nudges, prayer/discipline encouragement, upcoming assignment reminders, and personalized next-step prompts.
- [ ] Avoid manipulative or spammy engagement loops; reminders should be pastoral/helpful and user-controlled.
- [ ] Let users record a goal such as prayer, fasting, Bible reading, class completion, serving, or outreach and receive relevant encouragement.

## P1 — Prayer, journal, testimonies, spiritual history

- [ ] Add private personal journal inside My Journey.
- [ ] Add personal Scripture notes.
- [ ] Add prayer requests with privacy levels.
- [ ] Let users mark prayers Answered with answer date, notes, and optional testimony.
- [ ] Add personal testimony records that can stay private or be shared with the church by choice.
- [ ] Preserve major spiritual moments so members can review years of their journey with God.
- [ ] Make testimony sharing available to Community when the user explicitly chooses to share.

## P1 — Timothys / leadership-development pipeline

- [ ] Build Timothys as a real course/program shell.
- [ ] Locate/upload the actual Timothy curriculum if available; do not present newly invented curriculum as official until church leadership approves it.
- [ ] Cover leadership character, servant leadership, prayer/personal discipline, Bible study, teaching, caring for people, Friendship Group leadership, discussion leadership, evangelism/follow-up, conflict, pastoral authority, and developing other leaders.
- [ ] Add Friendship Group practicum/observed leadership component.
- [ ] Build leadership qualification rules beyond course completion: faithfulness/attendance, required doctrinal training, ministry involvement, safety requirements, pastoral approval, and other New Life requirements.
- [ ] Show each developing leader what requirements are complete/missing.
- [ ] Build a leadership-pipeline dashboard for pastors/admins.
- [ ] Never let software appoint leaders; system recommends readiness, pastoral leadership decides.

## P1 — Calendar / schedules / tasks

- [ ] Build one reliable unified church calendar.
- [ ] Add My Schedule for each member/leader.
- [ ] Add Church Schedule for authorized users.
- [ ] Include services, Friendship Groups, First Steps, ministry meetings, practices, outreach, camps, conferences, Matthew parties, preaching schedules, volunteer assignments, vacations/time-off, and special events.
- [ ] Add conflict detection so leaders can see overlapping major events and overloaded people/teams.
- [ ] Add personal tasks and leader-assigned tasks.
- [ ] Let The Prophet create/update calendar items and reminders by natural language.
- [ ] Add appropriate email/SMS/push reminders for assignments and events.

## P1 — Serve / Teams

- [ ] Configure New Life's real ministries and teams instead of demo data.
- [ ] Define each ministry's actual leaders and qualification requirements.
- [ ] Make Serve usable: availability, assignments, accept/decline, substitutions, reminders, team communication, tasks, accountability.
- [ ] Connect training/qualification records to service eligibility.
- [ ] Give leaders a usable roster/schedule view without exposing unrelated private member data.

## P1 — First Steps / broader discipleship content

- [ ] Complete/verify all First Steps lessons from uploaded material.
- [ ] Apply the new checkpoint/final assessment standards consistently.
- [ ] Verify lesson claims biblically and historically before publication.
- [ ] Preserve local Apostolic Assembly/New Life teaching while labeling what is explicit Scripture, strong biblical conclusion, local/church doctrine, reasonable inference, historical background, or debated/uncertain.
- [ ] Add gentle notes when a historical or interpretive claim is weaker than the church tradition may imply.
- [ ] Keep Scripture as final authority and do not use historical claims to establish doctrine.

## P2 — Large learning-library roadmap

- [ ] Bible Foundations: how to read Scripture, context, interpretation, Bible history, translations, Old/New Testament structure.
- [ ] Apostolic Doctrine: One God, Jesus Christ, repentance, baptism in Jesus' name, Holy Ghost, holiness, church, resurrection, second coming, etc.
- [ ] Spiritual Disciplines: prayer, fasting, Bible reading, worship, giving/tithing/stewardship, purity, discipline.
- [ ] Bible Survey: eventually a class for every book Genesis through Revelation.
- [ ] Advanced Bible Study: historical setting, literary genres, covenants, original-language basics, typology, prophecy, biblical theology, careful contextual reading.
- [ ] Evangelism: testimony, Effective Soul Winning, home Bible studies, follow-up, outreach.
- [ ] Leadership: Timothys, Friendship Group leaders, teachers, ministry leaders, pastoral-development tracks.
- [ ] Christian Living: marriage, family, finances, work ethic, relationships, forgiveness, temptation, holiness.
- [ ] Build Spanish versions where appropriate.

## P2 — Documents / media / communication

- [ ] Finish personal Document Vault for baptism, First Steps, soul-winning, Bible college, training, and other verified certificates.
- [ ] Finish church Media Library for flyers, sermon graphics, photos, invitations, fundraiser graphics, logos, and reusable assets.
- [ ] Keep official pastoral/leadership updates separate from member Community feed.
- [ ] Keep Community focused on testimonies, prayer, photos, fellowship, and church-family life rather than engagement-addiction mechanics.

## P2 — Future integrations / later scope

- [ ] Website, Facebook, Instagram, YouTube, livestream, sermon archive, and other media integrations.
- [ ] Giving/fundraising integrations using established payment processors rather than building payment infrastructure from scratch.
- [ ] District/organization reporting exports once actual requirements/forms are supplied.
- [ ] Multi-church/network features only after the local-church operating system is solid.

---

## Current execution order

1. Learning engine rules + Effective Soul Winning assessment expansion/gating.
2. Evangelism / guest capture / follow-up automation.
3. Easy join: QR + invite + progressive onboarding.
4. Unified member record / My Journey.
5. Friendship Group digital reporting and cross-system updates.
6. Church Health Dashboard.
7. The Prophet natural-language/voice operating layer.
8. Timothys + leadership qualification pipeline.
9. Calendar / My Schedule / Church Schedule / conflict reduction.
10. Serve / Teams real New Life setup and pilot hardening.
11. Proactive Prophet mentor nudges.
12. Expand and verify the long-term learning library.

## Done / already present but still needs validation

- [x] Kingdom Network V1 product blueprint exists.
- [x] Member/leader navigation concepts exist.
- [x] Learning engine has courses, modules, assessments, attempts, passing scores, final exams, credentials, and backend completion logic.
- [x] First Steps exists as a published course.
- [x] Effective Soul Winning exists as a published course, but its assessments are below the newly required question counts and need expansion.
- [x] Draft New Convert Bible Studies and Bible Study Teacher Training courses exist from Effective Soul Winning source material.
- [x] Kingdom Guide Beta exists as trusted-resource search/navigation, but it still needs to become The Prophet operational mentor.
- [x] Supabase-backed church/member/course infrastructure exists.
- [x] Current Vercel deployment exists for the pilot site.

This checklist is the execution source of truth. New ideas should be added here, prioritized, and then worked down rather than replacing the current plan.