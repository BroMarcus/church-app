-- Scheduling + Ministry Operations: Cleaning workflow attached to canonical schedule_items.

create table if not exists public.cleaning_assignments(
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null unique,
  church_id uuid not null references public.churches(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  status text not null default 'assigned' check(status in ('assigned','claimed','completed','cancelled')),
  claimed_for_at timestamptz,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  completion_notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaning_assignments_item_church_fkey foreign key(schedule_item_id,church_id)
    references public.schedule_items(id,church_id) on delete cascade
);

create index if not exists cleaning_assignments_church_status_idx on public.cleaning_assignments(church_id,status);
create index if not exists cleaning_assignments_group_status_idx on public.cleaning_assignments(group_id,status);

create or replace function private.guard_cleaning_assignment()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_schedule public.church_schedules%rowtype;
begin
  select s.* into v_schedule
  from public.schedule_items si
  join public.church_schedules s on s.id=si.schedule_id and s.church_id=si.church_id
  where si.id=new.schedule_item_id and si.church_id=new.church_id;

  if not found then raise exception 'Cleaning schedule item not found'; end if;
  if v_schedule.schedule_type<>'cleaning' then raise exception 'Cleaning assignment requires a cleaning schedule'; end if;
  if not exists(select 1 from public.groups g where g.id=new.group_id and g.church_id=new.church_id and g.active and g.group_type='friendship') then
    raise exception 'Cleaning rotation requires an active Friendship Group from the same church';
  end if;

  if new.status='completed' and (new.completed_by is null or new.completed_at is null) then
    raise exception 'Completed cleaning assignments require completion details';
  end if;

  new.updated_at=now();
  return new;
end $$;

drop trigger if exists cleaning_assignment_guard on public.cleaning_assignments;
create trigger cleaning_assignment_guard
before insert or update on public.cleaning_assignments
for each row execute function private.guard_cleaning_assignment();

create table if not exists public.cleaning_checklist_items(
  id uuid primary key default gen_random_uuid(),
  cleaning_assignment_id uuid not null references public.cleaning_assignments(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  label text not null check(length(btrim(label)) between 1 and 180),
  sort_order integer not null default 0,
  required boolean not null default true,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cleaning_checklist_assignment_idx on public.cleaning_checklist_items(cleaning_assignment_id,sort_order);

create table if not exists public.cleaning_participants(
  id uuid primary key default gen_random_uuid(),
  cleaning_assignment_id uuid not null references public.cleaning_assignments(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(cleaning_assignment_id,user_id)
);

create or replace function private.can_act_for_cleaning_group(p_group_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
  select exists(
    select 1 from public.groups g
    where g.id=p_group_id and g.active and g.group_type='friendship'
      and (
        g.leader_id=p_user_id
        or exists(select 1 from public.group_memberships gm where gm.group_id=g.id and gm.user_id=p_user_id)
      )
  );
$$;

revoke all on function private.can_act_for_cleaning_group(uuid,uuid) from public,anon;
grant execute on function private.can_act_for_cleaning_group(uuid,uuid) to authenticated;

alter table public.cleaning_assignments enable row level security;
alter table public.cleaning_checklist_items enable row level security;
alter table public.cleaning_participants enable row level security;

drop policy if exists cleaning_assignments_read on public.cleaning_assignments;
create policy cleaning_assignments_read on public.cleaning_assignments
for select to authenticated
using(
  private.can_act_for_cleaning_group(group_id,(select auth.uid()))
  or exists(
    select 1 from public.schedule_items si
    where si.id=cleaning_assignments.schedule_item_id
      and private.can_manage_church_schedule(si.schedule_id,cleaning_assignments.church_id)
  )
);

drop policy if exists cleaning_assignments_manage on public.cleaning_assignments;
create policy cleaning_assignments_manage on public.cleaning_assignments
for all to authenticated
using(
  exists(
    select 1 from public.schedule_items si
    where si.id=cleaning_assignments.schedule_item_id
      and private.can_manage_church_schedule(si.schedule_id,cleaning_assignments.church_id)
  )
)
with check(
  exists(
    select 1 from public.schedule_items si
    where si.id=cleaning_assignments.schedule_item_id
      and private.can_manage_church_schedule(si.schedule_id,cleaning_assignments.church_id)
  )
);

drop policy if exists cleaning_checklist_read on public.cleaning_checklist_items;
create policy cleaning_checklist_read on public.cleaning_checklist_items
for select to authenticated
using(
  exists(
    select 1 from public.cleaning_assignments ca
    join public.schedule_items si on si.id=ca.schedule_item_id
    where ca.id=cleaning_checklist_items.cleaning_assignment_id
      and ca.church_id=cleaning_checklist_items.church_id
      and (
        private.can_act_for_cleaning_group(ca.group_id,(select auth.uid()))
        or private.can_manage_church_schedule(si.schedule_id,ca.church_id)
      )
  )
);

drop policy if exists cleaning_checklist_manage on public.cleaning_checklist_items;
create policy cleaning_checklist_manage on public.cleaning_checklist_items
for all to authenticated
using(
  exists(
    select 1 from public.cleaning_assignments ca
    join public.schedule_items si on si.id=ca.schedule_item_id
    where ca.id=cleaning_checklist_items.cleaning_assignment_id
      and private.can_manage_church_schedule(si.schedule_id,ca.church_id)
  )
)
with check(
  exists(
    select 1 from public.cleaning_assignments ca
    join public.schedule_items si on si.id=ca.schedule_item_id
    where ca.id=cleaning_checklist_items.cleaning_assignment_id
      and private.can_manage_church_schedule(si.schedule_id,ca.church_id)
  )
);

drop policy if exists cleaning_participants_read on public.cleaning_participants;
create policy cleaning_participants_read on public.cleaning_participants
for select to authenticated
using(
  exists(
    select 1 from public.cleaning_assignments ca
    join public.schedule_items si on si.id=ca.schedule_item_id
    where ca.id=cleaning_participants.cleaning_assignment_id
      and ca.church_id=cleaning_participants.church_id
      and (
        private.can_act_for_cleaning_group(ca.group_id,(select auth.uid()))
        or private.can_manage_church_schedule(si.schedule_id,ca.church_id)
      )
  )
);

create or replace function public.claim_cleaning_assignment(p_cleaning_assignment_id uuid,p_claimed_for_at timestamptz)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_assignment public.cleaning_assignments%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_claimed_for_at is null then raise exception 'Choose a cleaning date and time'; end if;

  select * into v_assignment from public.cleaning_assignments where id=p_cleaning_assignment_id for update;
  if not found then raise exception 'Cleaning assignment not found'; end if;
  if not private.can_act_for_cleaning_group(v_assignment.group_id,v_user) then raise exception 'Only the assigned Friendship Group can claim this cleaning time'; end if;
  if v_assignment.status in ('completed','cancelled') then raise exception 'This cleaning assignment is closed'; end if;

  update public.cleaning_assignments
  set status='claimed',claimed_for_at=p_claimed_for_at,claimed_by=v_user,claimed_at=now(),updated_at=now()
  where id=v_assignment.id;
end $$;

create or replace function public.set_cleaning_checklist_item(p_item_id uuid,p_completed boolean)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_group uuid;
  v_status text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select ca.group_id,ca.status into v_group,v_status
  from public.cleaning_checklist_items ci
  join public.cleaning_assignments ca on ca.id=ci.cleaning_assignment_id
  where ci.id=p_item_id;

  if v_group is null then raise exception 'Cleaning checklist item not found'; end if;
  if not private.can_act_for_cleaning_group(v_group,v_user) then raise exception 'Only the assigned Friendship Group can update this checklist'; end if;
  if v_status in ('completed','cancelled') then raise exception 'This cleaning assignment is closed'; end if;

  update public.cleaning_checklist_items
  set completed_by=case when p_completed then v_user else null end,
      completed_at=case when p_completed then now() else null end,
      updated_at=now()
  where id=p_item_id;
end $$;

create or replace function public.record_cleaning_participation(p_cleaning_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_assignment public.cleaning_assignments%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_assignment from public.cleaning_assignments where id=p_cleaning_assignment_id;
  if not found then raise exception 'Cleaning assignment not found'; end if;
  if not private.can_act_for_cleaning_group(v_assignment.group_id,v_user) then raise exception 'Only the assigned Friendship Group can record participation'; end if;

  insert into public.cleaning_participants(cleaning_assignment_id,church_id,user_id,recorded_by)
  values(v_assignment.id,v_assignment.church_id,v_user,v_user)
  on conflict(cleaning_assignment_id,user_id) do nothing;
end $$;

create or replace function public.complete_cleaning_assignment(p_cleaning_assignment_id uuid,p_notes text default null)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_assignment public.cleaning_assignments%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_assignment from public.cleaning_assignments where id=p_cleaning_assignment_id for update;
  if not found then raise exception 'Cleaning assignment not found'; end if;
  if not private.can_act_for_cleaning_group(v_assignment.group_id,v_user) then raise exception 'Only the assigned Friendship Group can complete this cleaning assignment'; end if;
  if v_assignment.status='cancelled' then raise exception 'This cleaning assignment was cancelled'; end if;
  if exists(
    select 1 from public.cleaning_checklist_items ci
    where ci.cleaning_assignment_id=v_assignment.id and ci.required and ci.completed_at is null
  ) then raise exception 'Complete the required cleaning checklist first'; end if;

  insert into public.cleaning_participants(cleaning_assignment_id,church_id,user_id,recorded_by)
  values(v_assignment.id,v_assignment.church_id,v_user,v_user)
  on conflict(cleaning_assignment_id,user_id) do nothing;

  update public.cleaning_assignments
  set status='completed',completed_by=v_user,completed_at=now(),completion_notes=nullif(btrim(coalesce(p_notes,'')),''),
      updated_at=now()
  where id=v_assignment.id;
end $$;

revoke all on function public.claim_cleaning_assignment(uuid,timestamptz) from public,anon;
revoke all on function public.set_cleaning_checklist_item(uuid,boolean) from public,anon;
revoke all on function public.record_cleaning_participation(uuid) from public,anon;
revoke all on function public.complete_cleaning_assignment(uuid,text) from public,anon;
grant execute on function public.claim_cleaning_assignment(uuid,timestamptz) to authenticated;
grant execute on function public.set_cleaning_checklist_item(uuid,boolean) to authenticated;
grant execute on function public.record_cleaning_participation(uuid) to authenticated;
grant execute on function public.complete_cleaning_assignment(uuid,text) to authenticated;

revoke all on public.cleaning_assignments from anon;
revoke all on public.cleaning_checklist_items from anon;
revoke all on public.cleaning_participants from anon;
grant select,insert,update on public.cleaning_assignments to authenticated;
grant select,insert,update on public.cleaning_checklist_items to authenticated;
grant select on public.cleaning_participants to authenticated;
