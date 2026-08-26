# Kingdom Network — Friendship Group Operating System Package

Status: PLANNING READY — DO NOT IMPLEMENT UNTIL CURRENT PRIOR WORK IS CLEARED IN CONTROL ROOM

## Purpose
Build Friendship Groups as a complete ministry operating system rather than a digital copy of a paper form. The package must connect group discovery, joining, roster care, attendance, guest progression, weekly reporting, pastoral escalation, discipleship, leadership development, multiplication, and Church Health while preserving strict privacy and tenant isolation.

## Guiding rule
Enter information once. Update every authorized place that information affects.

The Friendship Group report must preserve the real New Life workflow: leader, assistant, topic, date/time, urgent matters, vision/mission/motto/goals, attendance categories, guests and visit counts, multiplication prospects, shared meeting responsibilities, Bible studies, prayer day, upcoming events, yearly/current objectives, Holy Ghost, baptisms, restored, praise reports, prayer requests, and leader comments.

## Dependencies
Before implementation:
1. Evangelism package must be stable enough for guest/follow-up handoff.
2. Onboarding + Identity + Invitations must lock the unified Person/member-record schema and claim/duplicate rules.
3. Existing Friendship Group RLS, roles, report hardening, prayer hardening, and pilot-reliability work must be reviewed and preserved.
4. Do not create a second permission model or duplicate group/report concepts.
5. Production deployment remains HOLD until Marcus approves a combined deployment.

## Core V1 scope

### 1. Group directory and lifecycle
Each Friendship Group should have:
- church_id / tenant scope
- group name
- leader
- assistant leader(s)
- normal meeting day/time
- general public area/neighborhood
- exact private meeting address
- capacity / ideal size
- current status
- target multiplication date
- parent_group_id / lineage
- created/started date
- archived date/reason when applicable

Defined statuses:
- Forming
- Active
- Paused
- Multiplying
- Archived

Paused must preserve history and temporarily remove the group from normal active discovery without treating it as failed/abandoned.

### 2. Privacy-aware group discovery
Public/member browsing should show only what is appropriate:
- group name
- leaders
- general area/neighborhood
- meeting day/time
- life-stage/category if configured
- availability / capacity signal

Exact home addresses must not be exposed publicly. Exact location unlocks only for approved/joined members or authorized leadership.

### 3. Join, approval, waitlist, transfer, reassignment
Support:
- member request to join
- leader/admin review
- approve/decline
- capacity-aware waitlist
- admin assignment
- leader/admin reassignment
- member transfer request
- transfer between groups while preserving prior membership history
- temporary visitor from another group
- church member not currently assigned to an FG

Referral source and actual group membership must remain separate concepts.

### 4. Leader and assistant permissions
Use capability-based permissions under church/tenant RLS rather than a second ad-hoc role system.

Default concept:
- Leader: roster, attendance, guest entry, report draft/submission, normal contact info, membership recommendations, potential-leader tagging, group operations within own scope.
- Assistant: roster, attendance, guest entry, report drafting, normal contact info; final submission and other higher-authority actions configurable by church.
- Neither role receives unrestricted pastoral-care or unrelated church data.
- Reassignment, sensitive role changes, broad permissions, and other-church/group access remain admin/pastoral authority.

Assistant responsibility should be able to grow over time as part of leadership development without exposing confidential pastoral information.

### 5. Roster as the group ministry workspace
Roster should include, within permission boundaries:
- person/member identity
- contact details authorized for the role
- household/family context where appropriate
- membership state
- current and historical FG connection
- attendance trend
- excused/unexcused absences
- guest-to-member history
- follow-up needs
- Bible study status
- permitted Journey/milestone indicators
- potential leader / assistant-development flag
- notes appropriate for FG leadership scope

No duplicated contact list. Group communication audiences must derive from the roster.

### 6. Attendance
Fast mobile-first attendance:
- Present
- Excused
- Unexcused
- Child
- Church member, not of this FG
- Member of another FG
- Guest/visitor

Support individual people when known and aggregate unidentified children/visitors when necessary.

Attendance should preserve history by meeting occurrence and person.

### 7. Meeting occurrence model
Separate normal group schedule from an individual meeting occurrence.

Example:
- Normal: Tuesday 7:00 PM at Smith home
- This week only: church building at 6:00 PM

A one-time change must not overwrite the recurring group schedule.

### 8. Guest progression
Preserve the report's 1st / 2nd / 3rd visit distinctions as real workflow.

Suggested progression:
- First visit: match/create Evangelism contact, source = Friendship Group guest, first-touch preserved, welcome action generated.
- Second visit: return-guest indicator and leader connection prompt.
- Third visit: suggest appropriate next step such as group membership, onboarding, Bible study, or First Steps.
- Connected/member: retain original guest history; never reset the person's journey.

Church Health later should be able to report conversion funnels such as first-time FG guests -> return guests -> connected -> members.

### 9. Repeated-absence care
Two or three consecutive unexcused absences should create a suggested leader check-in using the same follow-up principles as Evangelism.

Requirements:
- church-configurable threshold
- leader can mark contact attempted/completed
- reason/outcome history
- no automatic pastoral diagnosis
- escalation only according to configured rules and permissions

### 10. Weekly Friendship Group report
Digitize the real New Life form while eliminating re-entry.

Auto-populate where known:
- leader/assistant
- group
- date/time/location
- roster
- attendance already marked
- known guest information
- current goals/configuration

Capture:
- topic/lesson
- urgent matters
- vision/mission/motto/goals/guidelines confirmations
- attendance
- guests + 1st/2nd/3rd visit
- contacts
- multiplication date/prospects
- shared meeting responsibilities
- Bible studies
- weekly prayer day
- upcoming FG events
- yearly/current objectives
- Holy Ghost reports
- baptisms
- restored
- praise reports
- prayer requests
- group leader comments
- Matthew party / picnic / barbecue / special-event context when appropriate

### 11. Draft, submit, correct, audit
Report state:
- Draft
- Submitted
- Reviewed when configured

Allow corrections after submission with audit history:
- who changed it
- when
- old value
- new value
- reason when consequential

No silent historical rewriting.

### 12. Cross-system actions from one report
Report submission should produce authorized downstream updates without forcing re-entry.

Guest -> Evangelism
- match/create contact
- preserve source and visit history
- create appropriate follow-up

Attendance -> Person/group history
- meeting attendance record
- engagement/follow-up signals

Bible study -> discipleship/evangelism
- active study record or update
- teacher/participant relationship where appropriate

Baptism/Holy Ghost -> Journey milestone review
- report as a claim/event
- do not silently convert a report into an official verified church record unless church policy allows
- leadership verification workflow when required

Urgent matter/prayer -> protected care workflow
- privacy level
- route only to authorized people

Praise report -> history + optional share request
- community sharing only with proper consent

Potential leader -> leadership pipeline
- create/maintain development signal
- never appoint someone automatically

### 13. Prayer and urgent-matter privacy
Support clear privacy levels such as:
- Pastor/private pastoral care
- Authorized leader team
- Friendship Group
- Church/community, only with consent

The report submitter must not be able to accidentally expose pastoral/private information broadly.

Praise reports involving another person require appropriate consent before public sharing.

### 14. Potential leader and assistant development
Roster action: mark a member as a potential leader / assistant candidate.

This should feed the later leadership-development/Timothys pipeline with:
- who identified the person
- date
- group
- observations appropriate for ministry development
- current readiness stage

Software recommends/organizes; pastoral leadership decides appointments.

### 15. Multiplication readiness
Track more than a target date.

Signals can include:
- sustained attendance
- capacity pressure
- recent guest growth
- return/connection rates
- number/readiness of assistants or potential leaders
- stability of reporting/leadership
- member distribution sufficient for healthy child groups

System wording: "This group may be ready for multiplication" or equivalent.

Never auto-decide multiplication.

### 16. Group lineage
When a group multiplies:
- preserve parent_group_id
- create child group records
- preserve pre-multiplication history
- record effective multiplication date
- record leadership transition
- allow Church Health to report multiplication lineage

### 17. Leader succession
Changing leaders should not destroy group identity/history.

Maintain leader assignment history:
- person
- role
- start date
- end date
- reason/notes if appropriate

### 18. Missing-report accountability
After expected meeting/report window:
- nudge leader when report missing
- assistant can be notified if configured
- after church-configurable delay, surface missing report to appropriate overseer
- distinguish "group did not meet" from "report missing"

Avoid spammy notifications.

### 19. Communication audience logic
From the group workspace, support future actions such as:
- message my group
- message assistants
- message people absent this week
- contact a guest
- contact follow-up list

The package should define recipient logic even if paid SMS/email providers are not part of V1.

### 20. Household/child handling
Known children should link to Person/household/guardian records where appropriate.

Allow aggregate unidentified children on first visit without forcing full registration during the meeting.

Respect guardian/minor privacy and onboarding rules from the Identity package.

### 21. First-time FG guest welcome handoff
A first-time FG guest should be able to receive the same appropriate welcome/onboarding content as other new contacts, using the source-aware onboarding pipeline.

Do not require a second manual entry.

### 22. Reliability / transactional behavior
Submitting one report may touch several systems. The architecture must avoid silent partial success.

Use reliable transaction/outbox/idempotent patterns as appropriate so:
- duplicate taps do not duplicate people/actions
- failed downstream actions can retry safely
- leader sees clear success/recovery state
- audit trail identifies what happened

### 23. Offline / poor-connectivity strategy
V1 priority:
- mobile-first
- fast attendance
- preserve unsent draft locally where practical
- retry safely
- recover from brief connection loss

True conflict-safe offline sync is designed for but not required for first pilot unless real usage proves it necessary.

## Advanced / designed-for-now but may ship later
- full offline synchronization
- richer multiplication scoring
- map/distance-assisted group discovery
- waitlist auto-suggestions
- advanced leadership-readiness modeling
- richer in-app group messaging
- configurable group categories/life stages
- district/network roll-up only after multi-church isolation is proven

## Church Health outputs enabled by this package
Examples:
- active/forming/paused/multiplying groups
- reporting compliance
- attendance trends
- members connected to groups
- first-time vs return FG guests
- guest-to-connected conversion
- repeated absences needing follow-up
- active Bible studies
- reported/verified baptisms and Holy Ghost milestones
- pastoral-care signals by authorized count only
- capacity pressure
- groups that may be ready to multiply
- potential leaders / assistants in development
- lineage / multiplication history

## Human experience acceptance tests

### Member
- browse groups without seeing private home addresses
- request to join
- see pending/approved status
- transfer when appropriate
- access exact location only when authorized

### New guest
- attend without needing full app account
- be entered once
- receive correct source/visit history
- later onboard/claim record without duplication

### Leader
- see only own group scope
- mark attendance quickly on phone
- enter guests without duplicate records
- draft/submit weekly report
- see suggested follow-up actions
- correct a submitted report with audit history
- identify potential leaders
- never see unrelated private pastoral information

### Assistant
- perform configured operational tasks
- cannot exceed assigned capability scope
- development can expand without role/RLS bypasses

### Pastor/Admin
- manage assignment/reassignment/status
- see missing reports and actionable group health
- review milestone reports and sensitive escalations according to permission
- view lineage and multiplication readiness without software making ministry decisions

### Security
- cross-church data isolation
- cross-group leader isolation
- exact address protection
- prayer/pastoral privacy
- privileged-role protections
- idempotent report/guest writes
- fail-closed behavior on uncertain authorization/read failures

## Definition of done
The package is not complete because screens exist. It must be:
FUNCTIONAL -> CONNECTED -> SECURE -> SIMPLE -> TESTED -> VERIFIED.

Before READY FOR COMBINED DEPLOYMENT:
- security/regression tests pass
- TypeScript/build/lint pass
- affected RLS/RPC behavior verified
- English + Spanish UX verified where applicable
- mobile flows tested
- empty/loading/error/retry states tested
- guest/member/leader/assistant/pastor/admin flows tested
- real New Life report fields mapped without losing ministry meaning
- no duplicate people/contact/group-history creation
- no privacy leakage
- no independent production deployment
