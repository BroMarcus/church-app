# Outreach / Evangelism Audit Notes

## Purpose
Outreach should capture a guest or prospect with minimal friction, assign clear follow-up ownership, preserve interaction history, automate consent-aware communication, and connect the person into the same member/journey record when they later join.

## Verified 2026-08-19
- Quick Add supports first name plus optional last name, phone, email, connection stage, owner, prayer request, Bible-study interest, language and channel-specific communication consent.
- When no follow-up time is entered, a new contact receives a 24-hour follow-up due date.
- Outreach records sort overdue and upcoming follow-up to the top and surface unassigned records.
- Interaction logging supports calls, texts, visits, invitations, Bible studies, service attendance, prayer, follow-up and notes.
- Service attendance and Bible-study interactions advance the outreach relationship and create the next follow-up window.
- Linked member milestones can advance outreach stages without duplicating the member record.
- Duplicate protection exists for linked church members and normalized phone/email identity combinations inside the same church.
- RLS is enabled on outreach contacts and interactions. Read/update access is scoped to the creator, assigned follow-up owner, qualifying church leadership roles, or `manage_outreach` permission.
- Assignment validation prevents assigning a contact to a user who is not an active member of the same church.
- Automated communication queueing is channel-consent aware. No-consent rows are suppressed; recorded opt-out stops queueing.
- English and Spanish active templates exist for guest thank-you, Bible-study follow-up and re-invite workflows.
- Communication dedupe keys prevent the same template/channel/occurrence from being queued repeatedly.
- Outreach changes are written to the leadership audit log.

## Added and verified 2026-08-20
- First Steps invitation automation is now part of the standard Outreach communication workflow.
- When a contact advances into `regular_attendee`, the system queues a `first_steps_invite` using the contact's communication language.
- First Steps invitation templates exist in English and Spanish for both email and SMS, with the same consent/opt-out safeguards as other Outreach automation.
- External provider delivery remains intentionally separate; queued messages do not bypass provider readiness or communication consent.
- Missed follow-up reminders now run from a private Supabase function on an hourly pg_cron job at minute 15.
- At the follow-up due time, the active assigned follow-up owner receives one bilingual in-app reminder for that due date.
- At 24 hours overdue, active pastors and church admins receive one bilingual leadership escalation for that due date.
- A contact is not treated as overdue when `last_contacted_at` is at or after the current `follow_up_due_at`.
- Reminder/escalation snapshots are tied to the due-date value so rescheduling creates a new valid reminder cycle without repeating alerts for the old deadline.
- Current live verification after enablement showed zero overdue contacts and zero 24-hour escalations waiting, so the migration did not create an alert storm.
- The database migration is mirrored in `supabase/migrations/20260820162600_add_first_steps_and_overdue_outreach_automation.sql`.

## Design decision still open
- Assignment itself grants the assigned person access to that outreach record. This is useful for delegated follow-up, but the pilot should decide whether any active member may be assigned or whether assignment should later require a dedicated outreach role/permission.

## Still open in this tab
- Visual/mobile verification after the next deliberate combined deployment.
- Provider delivery verification once external email/SMS delivery is intentionally enabled for the pilot.
- Continue observing duplicate/merge behavior when an outreach contact later claims or creates a member account.
