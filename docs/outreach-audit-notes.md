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

## Design decision still open
- Assignment itself grants the assigned person access to that outreach record. This is useful for delegated follow-up, but the pilot should decide whether any active member may be assigned or whether assignment should later require a dedicated outreach role/permission.

## Still open in this tab
- Visual/mobile verification after the next deployment.
- Provider delivery verification once external email/SMS delivery is intentionally enabled for the pilot.
- Continue observing duplicate/merge behavior when an outreach contact later claims or creates a member account.
