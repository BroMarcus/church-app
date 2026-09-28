-- Evangelism + Follow-Up Engine — actionable follow-up fields.
-- Additive only: preserves existing Outreach records and RLS policies.
-- Production application remains part of the coordinated deployment gate.

alter table public.outreach_contacts
  add column if not exists first_steps_interest boolean not null default false,
  add column if not exists next_action text;

alter table public.outreach_contacts
  drop constraint if exists outreach_contacts_next_action_length_check;

alter table public.outreach_contacts
  add constraint outreach_contacts_next_action_length_check
  check (next_action is null or char_length(next_action) <= 500);

comment on column public.outreach_contacts.first_steps_interest is
  'True when the guest/prospect has expressed interest in First Steps; this is follow-up intent, not course enrollment or completion.';

comment on column public.outreach_contacts.next_action is
  'Plain-language next human follow-up action for this person. Due timing remains in follow_up_due_at.';
