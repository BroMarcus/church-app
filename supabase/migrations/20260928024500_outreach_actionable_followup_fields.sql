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


alter table public.outreach_interactions
  add column if not exists source_type text,
  add column if not exists source_label text;

alter table public.outreach_interactions
  drop constraint if exists outreach_interactions_source_type_check;

alter table public.outreach_interactions
  add constraint outreach_interactions_source_type_check
  check (
    source_type is null
    or source_type in ('church_service','friendship_group','outreach','event','leader_entry')
  );

comment on column public.outreach_interactions.source_type is
  'Optional source category for a logged visit/attendance/follow-up interaction.';

comment on column public.outreach_interactions.source_label is
  'Optional human-readable source detail retained with the interaction history.';


alter table public.outreach_contacts
  add column if not exists create_request_key uuid;

create unique index if not exists outreach_contacts_create_request_key_unique_idx
  on public.outreach_contacts(create_request_key)
  where create_request_key is not null;

alter table public.outreach_interactions
  add column if not exists request_key uuid;

create unique index if not exists outreach_interactions_request_key_unique_idx
  on public.outreach_interactions(request_key)
  where request_key is not null;

comment on column public.outreach_contacts.create_request_key is
  'Retry/idempotency key for manual Quick Add creation. Re-submitting the same form must not create a second contact.';

comment on column public.outreach_interactions.request_key is
  'Retry/idempotency key for one logged interaction. Network retry/double-submit must not create a duplicate history entry.';
