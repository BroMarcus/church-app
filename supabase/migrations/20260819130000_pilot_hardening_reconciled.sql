-- Kingdom Network pilot-hardening schema reconciliation
-- Idempotent representation of schema/security changes already applied to the live pilot database.

-- Friendship Group report detail
alter table public.group_reports add column if not exists meeting_type text not null default 'regular';
alter table public.group_reports add column if not exists location_label text;
alter table public.group_reports add column if not exists prayer_needs text;
alter table public.group_reports add column if not exists issues_notes text;
alter table public.group_reports add column if not exists follow_up_notes text;
alter table public.group_reports add column if not exists general_notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='group_reports_meeting_type_check' and conrelid='public.group_reports'::regclass) then
    alter table public.group_reports add constraint group_reports_meeting_type_check
      check (meeting_type in ('regular','matthew_party','picnic','barbecue','special_event','other'));
  end if;
end $$;
create index if not exists group_reports_group_meeting_date_idx on public.group_reports(group_id,meeting_date desc);

-- Outreach source/origin tracking
alter table public.outreach_contacts add column if not exists source_type text not null default 'leader_entry';
alter table public.outreach_contacts add column if not exists source_label text;
alter table public.outreach_contacts add column if not exists source_occurred_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='outreach_contacts_source_type_check' and conrelid='public.outreach_contacts'::regclass) then
    alter table public.outreach_contacts add constraint outreach_contacts_source_type_check
      check (source_type in ('church_service','friendship_group','outreach','event','leader_entry','website','other'));
  end if;
end $$;
create index if not exists outreach_contacts_church_source_idx on public.outreach_contacts(church_id,source_type,created_at desc);

-- New Birth date accuracy
alter table public.member_milestones add column if not exists baptism_date_precision text not null default 'unknown';
alter table public.member_milestones add column if not exists holy_ghost_date_precision text not null default 'unknown';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='member_milestones_baptism_date_precision_check' and conrelid='public.member_milestones'::regclass) then
    alter table public.member_milestones add constraint member_milestones_baptism_date_precision_check check (baptism_date_precision in ('exact','approximate','unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname='member_milestones_holy_ghost_date_precision_check' and conrelid='public.member_milestones'::regclass) then
    alter table public.member_milestones add constraint member_milestones_holy_ghost_date_precision_check check (holy_ghost_date_precision in ('exact','approximate','unknown'));
  end if;
end $$;
update public.member_milestones set baptism_date_precision='exact' where baptism_date is not null and baptism_date_precision='unknown';
update public.member_milestones set holy_ghost_date_precision='exact' where holy_ghost_date is not null and holy_ghost_date_precision='unknown';

-- Household/family grouping
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_name_not_blank check (length(trim(name)) > 0)
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  relationship_role text not null default 'adult',
  primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (household_id,user_id),
  constraint household_members_role_check check (relationship_role in ('adult','spouse','child','dependent','other'))
);
create unique index if not exists household_members_one_household_per_church_user on public.household_members(church_id,user_id);
create index if not exists households_church_idx on public.households(church_id,name);
create index if not exists household_members_church_household_idx on public.household_members(church_id,household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.current_user_in_household(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.household_members hm
    where hm.household_id=p_household_id and hm.user_id=(select auth.uid())
  );
$$;
revoke all on function public.current_user_in_household(uuid) from public;
grant execute on function public.current_user_in_household(uuid) to authenticated;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members') or public.current_user_in_household(id));
drop policy if exists households_insert on public.households;
create policy households_insert on public.households for insert to authenticated
with check (public.current_user_has_church_permission(church_id,'manage_members'));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members'))
with check (public.current_user_has_church_permission(church_id,'manage_members'));
drop policy if exists households_delete on public.households;
create policy households_delete on public.households for delete to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members'));

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members for select to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members') or public.current_user_in_household(household_id));
drop policy if exists household_members_insert on public.household_members;
create policy household_members_insert on public.household_members for insert to authenticated
with check (
  public.current_user_has_church_permission(church_id,'manage_members')
  and exists(select 1 from public.households h where h.id=household_id and h.church_id=household_members.church_id)
  and exists(select 1 from public.church_memberships m where m.church_id=household_members.church_id and m.user_id=household_members.user_id and m.status='active')
);
drop policy if exists household_members_update on public.household_members;
create policy household_members_update on public.household_members for update to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members'))
with check (
  public.current_user_has_church_permission(church_id,'manage_members')
  and exists(select 1 from public.households h where h.id=household_id and h.church_id=household_members.church_id)
  and exists(select 1 from public.church_memberships m where m.church_id=household_members.church_id and m.user_id=household_members.user_id and m.status='active')
);
drop policy if exists household_members_delete on public.household_members;
create policy household_members_delete on public.household_members for delete to authenticated
using (public.current_user_has_church_permission(church_id,'manage_members'));

grant select,insert,update,delete on public.households to authenticated;
grant select,insert,update,delete on public.household_members to authenticated;
