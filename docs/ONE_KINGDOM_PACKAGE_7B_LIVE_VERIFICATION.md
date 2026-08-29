# One Kingdom — Package 7B Final Live Verification

Status before live test: **BUILD VERIFIED — USER VERIFICATION NEEDED**

Rule: Do not mark One Kingdom PREVIEW VERIFIED, READY, DONE, or launch-approved until these checks are actually completed in the live Base44 preview.

## 1. Member
- Log in on a phone-sized screen.
- Confirm dashboard loads cleanly and shows One Kingdom branding only.
- Confirm Help & Feedback is reachable from navigation and dashboard CTA.
- Submit a Problem, Suggestion, or Question and confirm it appears in the member's own history.
- Confirm Coming Soon cards appear as informational/non-clickable cards: Church Office, Fundraising, Camps & Conferences, Giving & Finance, Forms Center, Official Records.
- Open My Journey, My Profile, Friendship Groups, Classes, Prayer Wall, Calendar/My Schedule.
- Confirm no admin-only controls or unrelated member data are visible.
- Logout and log back in; confirm normal landing/navigation still works.

## 2. Leader
- Confirm leader dashboard and permitted leader navigation.
- Confirm managed Friendship Group data is scoped to groups the leader manages.
- Open weekly report flow and report history.
- Check Guests / Follow-Up Queue only show permitted records.
- Open Church Health and confirm viewer-scoped wording/data; no Admin-only church-wide data leaks.
- Confirm Help & Feedback works.

## 3. Teacher
- Confirm assigned class is visible.
- Open class/lesson/roster/progress surfaces needed to teach.
- Confirm teacher can perform only the intended teacher actions.
- Confirm unrelated Admin controls and unrelated classes are not exposed.
- Confirm student completion/learning records remain consistent with verified Package 5 behavior.

## 4. Church Admin
- Confirm Administration loads and normal church administration remains usable.
- Confirm People/account linking/invitations open as expected.
- Confirm Baptism Records and Church Health load.
- Open Help & Feedback and confirm church feedback queue is visible.
- Change one test feedback item through New → Reviewing → Fixed → Verified.
- Confirm member feedback from another user is visible to Admin but not to ordinary members.

## 5. Platform Owner
- Confirm Platform Owner crown/owner identity remains correct.
- Confirm owner-only controls remain protected.
- Do not transfer Platform Owner during this test.
- Confirm One Kingdom naming is consistent in owner/admin surfaces.

## 6. Cross-role / launch safety
- Test the main flows on phone and desktop widths.
- Check English/Spanish paths where currently supported, especially login/register/connect/invite/onboarding and core pilot navigation.
- Confirm direct `/learning/poc` no longer opens the old Proof-of-Concept screen.
- Confirm no user-facing `Kingdom Network` naming remains.
- Test one public join/invite path through login/registration/account linking without creating a duplicate person/account.
- Confirm logout/login and safe deep-link behavior.
- Confirm no obvious demo/test/POC material is exposed to normal pilot users.

## Launch gate
Only after the live checks above pass:
1. Package 7A → PREVIEW VERIFIED
2. Package 8A → PREVIEW VERIFIED
3. Package 7B → PREVIEW VERIFIED
4. Marcus approves Private Madera pilot publish/invite

If any check fails, record the exact role, page, action, expected result, actual result, and screenshot when useful; repair only the failed dependency and retest it plus related flows.
