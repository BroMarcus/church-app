create table if not exists public.discipleship_pathways(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 120),
  description text,
  active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists discipleship_pathways_one_default_per_church
  on public.discipleship_pathways(church_id)
  where is_default=true and active=true;
create index if not exists discipleship_pathways_church_idx
  on public.discipleship_pathways(church_id,active,name);

create table if not exists public.discipleship_pathway_steps(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  pathway_id uuid not null references public.discipleship_pathways(id) on delete cascade,
  step_key text not null check(length(btrim(step_key)) between 1 and 80),
  title text not null check(length(btrim(title)) between 1 and 120),
  description text,
  completion_source text not null check(completion_source in (
    'milestone_boolean','milestone_status','course','friendship_group','ministry_serving','manual'
  )),
  completion_key text,
  completion_value text,
  suggested_href text,
  sort_order integer not null default 0,
  required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pathway_id,step_key),
  unique(id,church_id)
);

create index if not exists discipleship_pathway_steps_path_idx
  on public.discipleship_pathway_steps(pathway_id,active,sort_order,id);

create or replace function private.enforce_discipleship_step_church()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if not exists(
    select 1 from public.discipleship_pathways p
    where p.id=new.pathway_id and p.church_id=new.church_id
  ) then
    raise exception 'Discipleship pathway step must belong to the same church';
  end if;
  if new.completion_source in ('milestone_boolean','milestone_status','course') and nullif(btrim(coalesce(new.completion_key,'')),'') is null then
    raise exception 'This completion source requires a completion key';
  end if;
  return new;
end $$;

drop trigger if exists discipleship_pathway_steps_church_guard on public.discipleship_pathway_steps;
create trigger discipleship_pathway_steps_church_guard
before insert or update of church_id,pathway_id,completion_source,completion_key
on public.discipleship_pathway_steps
for each row execute function private.enforce_discipleship_step_church();

create table if not exists public.member_journey_pathway_assignments(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pathway_id uuid not null references public.discipleship_pathways(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists member_journey_one_active_pathway
  on public.member_journey_pathway_assignments(church_id,user_id)
  where active=true;
create index if not exists member_journey_pathway_assignments_path_idx
  on public.member_journey_pathway_assignments(pathway_id,active);

create or replace function private.enforce_member_journey_pathway_church()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if not exists(
    select 1 from public.church_memberships cm
    where cm.church_id=new.church_id and cm.user_id=new.user_id and cm.status='active'
  ) then raise exception 'Journey pathway can only be assigned to an active member'; end if;
  if not exists(
    select 1 from public.discipleship_pathways p
    where p.id=new.pathway_id and p.church_id=new.church_id and p.active=true
  ) then raise exception 'Journey pathway must be active and belong to the same church'; end if;
  return new;
end $$;

drop trigger if exists member_journey_pathway_assignments_church_guard on public.member_journey_pathway_assignments;
create trigger member_journey_pathway_assignments_church_guard
before insert or update of church_id,user_id,pathway_id,active
on public.member_journey_pathway_assignments
for each row execute function private.enforce_member_journey_pathway_church();

create table if not exists public.member_journey_step_tracking(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step_id uuid not null,
  responsible_leader_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  manual_status text check(manual_status is null or manual_status in ('not_started','in_progress','completed','waived')),
  manual_completed_at timestamptz,
  evidence_note text,
  evidence_source_type text,
  evidence_source_id uuid,
  last_activity_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,user_id,step_id),
  constraint member_journey_step_tracking_step_church_fkey foreign key(step_id,church_id)
    references public.discipleship_pathway_steps(id,church_id) on delete cascade,
  constraint member_journey_step_tracking_member_church_fkey foreign key(church_id,user_id)
    references public.church_memberships(church_id,user_id) on delete cascade,
  constraint member_journey_step_tracking_leader_church_fkey foreign key(church_id,responsible_leader_id)
    references public.church_memberships(church_id,user_id) on delete set null
);

create index if not exists member_journey_step_tracking_user_idx
  on public.member_journey_step_tracking(church_id,user_id);
create index if not exists member_journey_step_tracking_leader_idx
  on public.member_journey_step_tracking(church_id,responsible_leader_id,due_at)
  where responsible_leader_id is not null;
create index if not exists member_journey_step_tracking_due_idx
  on public.member_journey_step_tracking(church_id,due_at)
  where due_at is not null;

alter table public.discipleship_pathways enable row level security;
alter table public.discipleship_pathway_steps enable row level security;
alter table public.member_journey_pathway_assignments enable row level security;
alter table public.member_journey_step_tracking enable row level security;

drop policy if exists discipleship_pathways_read on public.discipleship_pathways;
create policy discipleship_pathways_read on public.discipleship_pathways
for select to authenticated
using(private.is_church_member(church_id));

drop policy if exists discipleship_pathways_manage on public.discipleship_pathways;
create policy discipleship_pathways_manage on public.discipleship_pathways
for all to authenticated
using(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
)
with check(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
);

drop policy if exists discipleship_pathway_steps_read on public.discipleship_pathway_steps;
create policy discipleship_pathway_steps_read on public.discipleship_pathway_steps
for select to authenticated
using(private.is_church_member(church_id));

drop policy if exists discipleship_pathway_steps_manage on public.discipleship_pathway_steps;
create policy discipleship_pathway_steps_manage on public.discipleship_pathway_steps
for all to authenticated
using(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
)
with check(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
);

drop policy if exists member_journey_pathway_assignments_read on public.member_journey_pathway_assignments;
create policy member_journey_pathway_assignments_read on public.member_journey_pathway_assignments
for select to authenticated
using(
  user_id=(select auth.uid())
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
  or exists(
    select 1 from public.group_memberships target_gm
    join public.groups g on g.id=target_gm.group_id
    where target_gm.user_id=member_journey_pathway_assignments.user_id
      and g.church_id=member_journey_pathway_assignments.church_id
      and (
        g.leader_id=(select auth.uid())
        or private.has_group_role(g.id,array['leader','assistant'])
      )
  )
);

drop policy if exists member_journey_pathway_assignments_manage on public.member_journey_pathway_assignments;
create policy member_journey_pathway_assignments_manage on public.member_journey_pathway_assignments
for all to authenticated
using(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
)
with check(
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
);

drop policy if exists member_journey_step_tracking_read on public.member_journey_step_tracking;
create policy member_journey_step_tracking_read on public.member_journey_step_tracking
for select to authenticated
using(
  user_id=(select auth.uid())
  or responsible_leader_id=(select auth.uid())
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
  or exists(
    select 1 from public.group_memberships target_gm
    join public.groups g on g.id=target_gm.group_id
    where target_gm.user_id=member_journey_step_tracking.user_id
      and g.church_id=member_journey_step_tracking.church_id
      and (
        g.leader_id=(select auth.uid())
        or private.has_group_role(g.id,array['leader','assistant'])
      )
  )
);

drop policy if exists member_journey_step_tracking_insert on public.member_journey_step_tracking;
create policy member_journey_step_tracking_insert on public.member_journey_step_tracking
for insert to authenticated
with check(
  created_by=(select auth.uid())
  and (
    private.has_church_role(church_id,array['pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_members')
  )
);

drop policy if exists member_journey_step_tracking_update on public.member_journey_step_tracking;
create policy member_journey_step_tracking_update on public.member_journey_step_tracking
for update to authenticated
using(
  responsible_leader_id=(select auth.uid())
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
)
with check(
  responsible_leader_id=(select auth.uid())
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_members')
);

revoke all on public.discipleship_pathways from anon;
revoke all on public.discipleship_pathway_steps from anon;
revoke all on public.member_journey_pathway_assignments from anon;
revoke all on public.member_journey_step_tracking from anon;

grant select,insert,update on public.discipleship_pathways to authenticated;
grant select,insert,update on public.discipleship_pathway_steps to authenticated;
grant select,insert,update on public.member_journey_pathway_assignments to authenticated;
grant select,insert,update on public.member_journey_step_tracking to authenticated;
