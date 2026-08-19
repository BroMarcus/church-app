# Learning Center Audit Notes

## Purpose
Learning Center should be the place a member actually completes discipleship/training work. My Journey points the member here; Learning Center records the work and feeds progress back to the journey/transcript/admin reporting.

## Active checks
1. Landing page should answer: What am I taking? What should I continue? What is recommended next?
2. Course detail should make the next lesson obvious and avoid exposing admin complexity.
3. Enrollment, module completion, assessment results, and course completion must persist in Supabase.
4. Member progress must feed My Journey and transcript from the same authoritative records.
5. Pastor/church admin/authorized learning leaders need reporting without exposing unrelated private member data.
6. All member-facing text/statuses/errors/actions must support English and Spanish.
7. First-time guide should explain the page without blocking normal repeat use.
8. Mobile view must keep Continue/Next actions prominent.

## Verified 2026-08-19
- Learning landing page is Supabase-backed and shows current enrollment, available courses, prerequisites, credentials, XP and learning awards.
- Enrollment writes are protected by church membership/prerequisite checks before creating a course enrollment.
- Required assessment submission is server-scored in Supabase; later checkpoints are blocked until prior required checkpoints are passed.
- Passing a required module assessment automatically marks that module complete in `course_module_progress`.
- Course credential fields are protected by `trg_protect_course_enrollment_authority`; a member cannot directly self-award a credential or fake a final score.
- Learning tables reviewed in this pass have RLS enabled, including enrollments, module progress, attempts, courses, modules, assessments, questions and milestones.
- Published learning assessment counts now meet the P0 standard: required checkpoints are 5–10 questions; required final exams are 20–25 questions.
- Effective Soul Winning has 2 required six-question checkpoints and a 20-question final. Its UI was corrected so grouped checkpoints can unlock the final instead of incorrectly requiring one checkpoint per module.
- First Steps has 17 required class tests and a 25-question final.
- Transcript and leader/admin learning screens exist and use the same course/enrollment/assessment records.

## Still open in this tab
- Finish full English/Spanish coverage on course-detail, transcript and learning-admin/member status copy.
- Add/verify first-visit Learning Center guide behavior specifically on the Learning routes.
- Verify mobile Continue/Next prominence visually after the next deployment.
- Production visual verification remains intentionally deferred until the next deployment pass.
