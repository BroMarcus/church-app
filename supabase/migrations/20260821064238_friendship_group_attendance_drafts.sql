create table public.group_attendance_drafts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  user_id uuid not null,
  meeting_date date not null,
  attendance_status text not null check (attendance_status in ('on_time','late','missing')),
  recorded_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint group_attendance_drafts_membership_fk foreign key (group_id,user_id) references public.group_memberships(group_id,user_id) on delete cascade,
  constraint group_attendance_drafts_unique unique (group_id,user_id,meeting_date)
);

alter table public.group_attendance_drafts enable row level security;

create policy group_attendance_drafts_read on public.group_attendance_drafts
for select to authenticated
using (private.can_operate_group(group_id));

create policy group_attendance_drafts_insert on public.group_attendance_drafts
for insert to authenticated
with check (recorded_by=auth.uid() and private.can_operate_group(group_id));

create policy group_attendance_drafts_update on public.group_attendance_drafts
for update to authenticated
using (private.can_operate_group(group_id))
with check (recorded_by=auth.uid() and private.can_operate_group(group_id));

create policy group_attendance_drafts_delete on public.group_attendance_drafts
for delete to authenticated
using (private.can_operate_group(group_id));

grant select,insert,update,delete on public.group_attendance_drafts to authenticated;
