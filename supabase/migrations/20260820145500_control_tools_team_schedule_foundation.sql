create table if not exists public.ministry_team_members(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  ministry_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_label text not null default 'Member' check(length(btrim(role_label)) between 1 and 80),
  is_leader boolean not null default false,
  member_status text not null default 'active' check(member_status in ('active','on_leave','inactive')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ministry_id,user_id),
  constraint ministry_team_members_ministry_church_fkey foreign key(ministry_id,church_id)
    references public.ministries(id,church_id) on delete cascade,
  constraint ministry_team_members_user_church_fkey foreign key(church_id,user_id)
    references public.church_memberships(church_id,user_id) on delete cascade
);

create index if not exists ministry_team_members_church_idx on public.ministry_team_members(church_id,member_status);
create index if not exists ministry_team_members_user_idx on public.ministry_team_members(user_id,member_status);
create index if not exists ministry_team_members_ministry_idx on public.ministry_team_members(ministry_id,member_status);

alter table public.ministry_team_members enable row level security;

drop policy if exists ministry_team_members_read on public.ministry_team_members;
create policy ministry_team_members_read on public.ministry_team_members
for select to authenticated
using(private.is_church_member(church_id));

drop policy if exists ministry_team_members_manage on public.ministry_team_members;
create policy ministry_team_members_manage on public.ministry_team_members
for all to authenticated
using(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_ministries')
)
with check(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_ministries')
);

create table if not exists public.church_schedules(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 120),
  schedule_type text not null default 'ministry' check(length(btrim(schedule_type)) between 1 and 60),
  description text,
  ministry_id uuid,
  group_id uuid references public.groups(id) on delete cascade,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_schedules_single_scope_check check(not(ministry_id is not null and group_id is not null)),
  constraint church_schedules_ministry_church_fkey foreign key(ministry_id,church_id)
    references public.ministries(id,church_id) on delete cascade
);

create unique index if not exists church_schedules_id_church_uidx on public.church_schedules(id,church_id);
create index if not exists church_schedules_church_active_idx on public.church_schedules(church_id,active,name);
create index if not exists church_schedules_ministry_idx on public.church_schedules(ministry_id) where ministry_id is not null;
create index if not exists church_schedules_group_idx on public.church_schedules(group_id) where group_id is not null;

create or replace function private.enforce_church_schedule_scope()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if new.group_id is not null and not exists(
    select 1 from public.groups g where g.id=new.group_id and g.church_id=new.church_id
  ) then
    raise exception 'Schedule group must belong to the same church';
  end if;
  return new;
end $$;

drop trigger if exists church_schedules_scope_guard on public.church_schedules;
create trigger church_schedules_scope_guard
before insert or update of church_id,ministry_id,group_id on public.church_schedules
for each row execute function private.enforce_church_schedule_scope();

alter table public.church_schedules enable row level security;

drop policy if exists church_schedules_read on public.church_schedules;
create policy church_schedules_read on public.church_schedules
for select to authenticated
using(
  private.is_church_member(church_id)
  and (
    (ministry_id is null and group_id is null)
    or exists(
      select 1 from public.ministry_team_members mtm
      where mtm.ministry_id=church_schedules.ministry_id
        and mtm.user_id=(select auth.uid())
        and mtm.member_status='active'
    )
    or exists(
      select 1 from public.group_memberships gm
      where gm.group_id=church_schedules.group_id
        and gm.user_id=(select auth.uid())
    )
    or private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_teams')
    or private.has_church_permission(church_id,'manage_calendar')
  )
);

drop policy if exists church_schedules_manage on public.church_schedules;
create policy church_schedules_manage on public.church_schedules
for all to authenticated
using(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_calendar')
  or (
    ministry_id is not null and exists(
      select 1 from public.ministry_team_members mtm
      where mtm.ministry_id=church_schedules.ministry_id
        and mtm.user_id=(select auth.uid())
        and mtm.member_status='active'
        and mtm.is_leader=true
    )
  )
  or (
    group_id is not null and exists(
      select 1 from public.groups g
      where g.id=church_schedules.group_id
        and (
          g.leader_id=(select auth.uid())
          or private.has_group_role(g.id,array['leader','assistant'])
        )
    )
  )
)
with check(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_calendar')
  or (
    ministry_id is not null and exists(
      select 1 from public.ministry_team_members mtm
      where mtm.ministry_id=church_schedules.ministry_id
        and mtm.user_id=(select auth.uid())
        and mtm.member_status='active'
        and mtm.is_leader=true
    )
  )
  or (
    group_id is not null and exists(
      select 1 from public.groups g
      where g.id=church_schedules.group_id
        and (
          g.leader_id=(select auth.uid())
          or private.has_group_role(g.id,array['leader','assistant'])
        )
    )
  )
);

create table if not exists public.schedule_items(
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null,
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'scheduled' check(status in ('scheduled','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_items_schedule_church_fkey foreign key(schedule_id,church_id)
    references public.church_schedules(id,church_id) on delete cascade,
  constraint schedule_items_time_check check(ends_at is null or ends_at>=starts_at)
);

create unique index if not exists schedule_items_id_church_uidx on public.schedule_items(id,church_id);
create index if not exists schedule_items_schedule_time_idx on public.schedule_items(schedule_id,starts_at);
create index if not exists schedule_items_church_time_idx on public.schedule_items(church_id,starts_at);

alter table public.schedule_items enable row level security;

drop policy if exists schedule_items_read on public.schedule_items;
create policy schedule_items_read on public.schedule_items
for select to authenticated
using(
  exists(
    select 1 from public.church_schedules s
    where s.id=schedule_items.schedule_id
      and s.church_id=schedule_items.church_id
  )
);

drop policy if exists schedule_items_manage on public.schedule_items;
create policy schedule_items_manage on public.schedule_items
for all to authenticated
using(
  exists(
    select 1 from public.church_schedules s
    where s.id=schedule_items.schedule_id
      and s.church_id=schedule_items.church_id
      and (
        private.has_church_role(s.church_id,array['ministry_leader','minister','pastor','church_admin'])
        or private.has_church_permission(s.church_id,'manage_teams')
        or private.has_church_permission(s.church_id,'manage_calendar')
        or (
          s.ministry_id is not null and exists(
            select 1 from public.ministry_team_members mtm
            where mtm.ministry_id=s.ministry_id
              and mtm.user_id=(select auth.uid())
              and mtm.member_status='active'
              and mtm.is_leader=true
          )
        )
        or (
          s.group_id is not null and exists(
            select 1 from public.groups g
            where g.id=s.group_id
              and (
                g.leader_id=(select auth.uid())
                or private.has_group_role(g.id,array['leader','assistant'])
              )
          )
        )
      )
  )
)
with check(
  exists(
    select 1 from public.church_schedules s
    where s.id=schedule_items.schedule_id
      and s.church_id=schedule_items.church_id
      and (
        private.has_church_role(s.church_id,array['ministry_leader','minister','pastor','church_admin'])
        or private.has_church_permission(s.church_id,'manage_teams')
        or private.has_church_permission(s.church_id,'manage_calendar')
        or (
          s.ministry_id is not null and exists(
            select 1 from public.ministry_team_members mtm
            where mtm.ministry_id=s.ministry_id
              and mtm.user_id=(select auth.uid())
              and mtm.member_status='active'
              and mtm.is_leader=true
          )
        )
        or (
          s.group_id is not null and exists(
            select 1 from public.groups g
            where g.id=s.group_id
              and (
                g.leader_id=(select auth.uid())
                or private.has_group_role(g.id,array['leader','assistant'])
              )
          )
        )
      )
  )
);

alter table public.team_assignments
  add column if not exists schedule_item_id uuid references public.schedule_items(id) on delete set null,
  add column if not exists role_label text,
  add column if not exists assignment_status text not null default 'scheduled';

do $$ begin
  alter table public.team_assignments add constraint team_assignments_status_check check(assignment_status in ('scheduled','removed'));
exception when duplicate_object then null; end $$;

create index if not exists team_assignments_schedule_item_idx on public.team_assignments(schedule_item_id) where schedule_item_id is not null;
create index if not exists team_assignments_schedule_status_idx on public.team_assignments(church_id,starts_at,assignment_status);

create or replace function private.prepare_scheduled_team_assignment()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_item public.schedule_items%rowtype;
  v_schedule public.church_schedules%rowtype;
begin
  if new.schedule_item_id is null then return new; end if;

  select * into v_item from public.schedule_items where id=new.schedule_item_id;
  if not found then raise exception 'Schedule item not found'; end if;

  select * into v_schedule from public.church_schedules where id=v_item.schedule_id;
  if not found then raise exception 'Schedule not found'; end if;

  if new.church_id<>v_schedule.church_id then
    raise exception 'Assignment and schedule must belong to the same church';
  end if;

  if not exists(
    select 1 from public.church_memberships cm
    where cm.church_id=new.church_id and cm.user_id=new.assigned_user_id and cm.status='active'
  ) then
    raise exception 'Only an active church member can be scheduled';
  end if;

  if v_schedule.ministry_id is not null then
    if new.ministry_id is null then new.ministry_id=v_schedule.ministry_id; end if;
    if new.ministry_id<>v_schedule.ministry_id then
      raise exception 'Assignment ministry must match the schedule ministry';
    end if;
  end if;

  new.starts_at=v_item.starts_at;
  if new.call_time is not null and new.call_time>new.starts_at then
    raise exception 'Call time must be before or equal to the assignment start time';
  end if;

  return new;
end $$;

drop trigger if exists team_assignments_schedule_guard on public.team_assignments;
create trigger team_assignments_schedule_guard
before insert or update of schedule_item_id,church_id,ministry_id,assigned_user_id,starts_at,call_time
on public.team_assignments
for each row execute function private.prepare_scheduled_team_assignment();

create or replace function private.sync_schedule_item_assignment_times()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    update public.team_assignments
    set starts_at=new.starts_at
    where schedule_item_id=new.id;
  end if;
  return new;
end $$;

drop trigger if exists schedule_items_sync_assignment_times on public.schedule_items;
create trigger schedule_items_sync_assignment_times
after update of starts_at on public.schedule_items
for each row execute function private.sync_schedule_item_assignment_times();

drop policy if exists assignments_read on public.team_assignments;
create policy assignments_read on public.team_assignments
for select to authenticated
using(
  assigned_user_id=(select auth.uid())
  or private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or (
    schedule_item_id is not null
    and exists(
      select 1
      from public.schedule_items si
      join public.church_schedules s on s.id=si.schedule_id
      where si.id=team_assignments.schedule_item_id
        and s.church_id=team_assignments.church_id
        and (
          (s.ministry_id is null and s.group_id is null and private.is_church_member(s.church_id))
          or exists(
            select 1 from public.ministry_team_members mtm
            where mtm.ministry_id=s.ministry_id
              and mtm.user_id=(select auth.uid())
              and mtm.member_status='active'
          )
          or exists(
            select 1 from public.group_memberships gm
            where gm.group_id=s.group_id
              and gm.user_id=(select auth.uid())
          )
        )
    )
  )
);

drop policy if exists assignments_manage on public.team_assignments;
create policy assignments_manage on public.team_assignments
for all to authenticated
using(
  created_by=(select auth.uid())
  or private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or (
    schedule_item_id is not null
    and exists(
      select 1
      from public.schedule_items si
      join public.church_schedules s on s.id=si.schedule_id
      where si.id=team_assignments.schedule_item_id
        and s.church_id=team_assignments.church_id
        and (
          (s.ministry_id is not null and exists(
            select 1 from public.ministry_team_members mtm
            where mtm.ministry_id=s.ministry_id
              and mtm.user_id=(select auth.uid())
              and mtm.member_status='active'
              and mtm.is_leader=true
          ))
          or (s.group_id is not null and exists(
            select 1 from public.groups g
            where g.id=s.group_id
              and (
                g.leader_id=(select auth.uid())
                or private.has_group_role(g.id,array['leader','assistant'])
              )
          ))
        )
    )
  )
)
with check(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or (
    schedule_item_id is not null
    and exists(
      select 1
      from public.schedule_items si
      join public.church_schedules s on s.id=si.schedule_id
      where si.id=team_assignments.schedule_item_id
        and s.church_id=team_assignments.church_id
        and (
          (s.ministry_id is not null and exists(
            select 1 from public.ministry_team_members mtm
            where mtm.ministry_id=s.ministry_id
              and mtm.user_id=(select auth.uid())
              and mtm.member_status='active'
              and mtm.is_leader=true
          ))
          or (s.group_id is not null and exists(
            select 1 from public.groups g
            where g.id=s.group_id
              and (
                g.leader_id=(select auth.uid())
                or private.has_group_role(g.id,array['leader','assistant'])
              )
          ))
        )
    )
  )
);

revoke all on public.ministry_team_members from anon;
revoke all on public.church_schedules from anon;
revoke all on public.schedule_items from anon;
grant select,insert,update on public.ministry_team_members to authenticated;
grant select,insert,update on public.church_schedules to authenticated;
grant select,insert,update on public.schedule_items to authenticated;
