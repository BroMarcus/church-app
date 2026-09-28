-- Scheduling + Ministry Operations: preaching year plan and 5 Spot development workflow.
-- Extends the canonical church_schedules -> schedule_items -> team_assignments engine.

create or replace function private.can_manage_church_schedule(p_schedule_id uuid,p_church_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
  select exists(
    select 1
    from public.church_schedules s
    where s.id=p_schedule_id
      and s.church_id=p_church_id
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
  );
$$;

revoke all on function private.can_manage_church_schedule(uuid,uuid) from public,anon;
grant execute on function private.can_manage_church_schedule(uuid,uuid) to authenticated;

create table if not exists public.schedule_month_plans(
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null,
  church_id uuid not null references public.churches(id) on delete cascade,
  month_start date not null,
  theme text,
  scripture text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_month_plans_schedule_church_fkey foreign key(schedule_id,church_id)
    references public.church_schedules(id,church_id) on delete cascade,
  constraint schedule_month_plans_first_day_check check(extract(day from month_start)=1),
  unique(schedule_id,month_start)
);

create index if not exists schedule_month_plans_church_month_idx
  on public.schedule_month_plans(church_id,month_start);

alter table public.schedule_month_plans enable row level security;

drop policy if exists schedule_month_plans_read on public.schedule_month_plans;
create policy schedule_month_plans_read on public.schedule_month_plans
for select to authenticated
using(
  private.is_church_member(church_id)
  and exists(
    select 1 from public.church_schedules s
    where s.id=schedule_month_plans.schedule_id
      and s.church_id=schedule_month_plans.church_id
      and (
        (s.ministry_id is null and s.group_id is null)
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
        or private.has_church_role(s.church_id,array['ministry_leader','minister','pastor','church_admin'])
        or private.has_church_permission(s.church_id,'manage_teams')
        or private.has_church_permission(s.church_id,'manage_calendar')
      )
  )
);

drop policy if exists schedule_month_plans_manage on public.schedule_month_plans;
create policy schedule_month_plans_manage on public.schedule_month_plans
for all to authenticated
using(private.can_manage_church_schedule(schedule_id,church_id))
with check(private.can_manage_church_schedule(schedule_id,church_id));

create table if not exists public.five_spot_requests(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  scripture text not null check(length(btrim(scripture)) between 1 and 500),
  title_idea text not null check(length(btrim(title_idea)) between 1 and 160),
  main_thought text not null check(length(btrim(main_thought)) between 1 and 2000),
  short_outline text not null check(length(btrim(short_outline)) between 1 and 6000),
  notes text,
  mentor_user_id uuid references public.profiles(id) on delete set null,
  leader_feedback text,
  status text not null default 'submitted'
    check(status in ('submitted','coaching','ready_for_review','approved','scheduled','completed')),
  scheduled_assignment_id uuid references public.team_assignments(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint five_spot_requester_church_fkey foreign key(church_id,requester_user_id)
    references public.church_memberships(church_id,user_id) on delete cascade
);

create index if not exists five_spot_requests_church_status_idx
  on public.five_spot_requests(church_id,status,created_at);
create index if not exists five_spot_requests_requester_idx
  on public.five_spot_requests(requester_user_id,created_at desc);
create unique index if not exists five_spot_requests_scheduled_assignment_uidx
  on public.five_spot_requests(scheduled_assignment_id)
  where scheduled_assignment_id is not null;

create or replace function private.guard_five_spot_schedule_link()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_assignment public.team_assignments%rowtype;
begin
  if new.status='scheduled' and new.scheduled_assignment_id is null then
    raise exception 'Scheduled 5 Spot requests must link to an assignment';
  end if;

  if new.status not in ('scheduled','completed') and new.scheduled_assignment_id is not null then
    raise exception 'Only scheduled or completed 5 Spot requests may link to an assignment';
  end if;

  if new.scheduled_assignment_id is not null then
    select * into v_assignment
    from public.team_assignments
    where id=new.scheduled_assignment_id;

    if not found then raise exception '5 Spot assignment not found'; end if;
    if v_assignment.church_id<>new.church_id then raise exception '5 Spot assignment must belong to the same church'; end if;
    if v_assignment.assigned_user_id<>new.requester_user_id then raise exception '5 Spot assignment must belong to the requester'; end if;
    if lower(coalesce(v_assignment.role_label,v_assignment.title,''))<>'5 spot' then
      raise exception '5 Spot request must link to a 5 Spot assignment';
    end if;
  end if;

  new.updated_at=now();
  return new;
end $$;

drop trigger if exists five_spot_schedule_link_guard on public.five_spot_requests;
create trigger five_spot_schedule_link_guard
before insert or update of status,scheduled_assignment_id,church_id,requester_user_id
on public.five_spot_requests
for each row execute function private.guard_five_spot_schedule_link();

alter table public.five_spot_requests enable row level security;

drop policy if exists five_spot_requests_read on public.five_spot_requests;
create policy five_spot_requests_read on public.five_spot_requests
for select to authenticated
using(
  private.is_church_member(church_id)
  and (
    requester_user_id=(select auth.uid())
    or mentor_user_id=(select auth.uid())
    or private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_teams')
    or private.has_church_permission(church_id,'manage_calendar')
  )
);

drop policy if exists five_spot_requests_submit on public.five_spot_requests;
create policy five_spot_requests_submit on public.five_spot_requests
for insert to authenticated
with check(
  requester_user_id=(select auth.uid())
  and created_by=(select auth.uid())
  and status='submitted'
  and mentor_user_id is null
  and scheduled_assignment_id is null
  and private.is_church_member(church_id)
);

drop policy if exists five_spot_requests_leadership_manage on public.five_spot_requests;
create policy five_spot_requests_leadership_manage on public.five_spot_requests
for update to authenticated
using(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_calendar')
)
with check(
  private.has_church_role(church_id,array['ministry_leader','minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_teams')
  or private.has_church_permission(church_id,'manage_calendar')
);

revoke all on public.schedule_month_plans from anon;
revoke all on public.five_spot_requests from anon;
grant select,insert,update on public.schedule_month_plans to authenticated;
grant select,insert,update on public.five_spot_requests to authenticated;
