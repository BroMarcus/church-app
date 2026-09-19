-- CI-ONLY Package 1 baseline fixture.
--
-- The production database predates the repository's tracked migration history, so
-- the historical migration folder cannot currently rebuild Kingdom Network from an
-- empty database. This fixture is deliberately NOT a production migration. It
-- reconstructs only the pre-Package-1 contracts that Package 1 depends on, using
-- the current live schema/helpers as the reference. The database CI gate loads this
-- into a disposable local Supabase database, applies Package 1 migrations, tests
-- them, and destroys the database.

create schema if not exists private;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text
);

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.church_memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','group_leader','ministry_leader','minister','pastor','church_admin','finance_admin','district_admin','organization_admin')),
  status text not null default 'active' check (status in ('active','inactive','visitor','pending')),
  relationship_status text not null default 'member' check (relationship_status in ('guest','attendee','member','inactive')),
  relationship_source text not null default 'legacy_backfill',
  created_at timestamptz not null default now(),
  unique(church_id,user_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  group_type text not null default 'friendship',
  leader_id uuid references auth.users(id) on delete set null,
  meeting_day text,
  meeting_time time,
  active boolean not null default true,
  meeting_frequency text not null default 'weekly',
  language_code text not null default 'en',
  location_label text,
  created_at timestamptz not null default now()
);

create table public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','leader','assistant')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  created_by uuid references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null default now()
);

create table public.church_roles (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  slug text not null,
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,slug)
);

create table public.church_role_assignments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  role_id uuid not null references public.church_roles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique(church_id,role_id,user_id)
);

create table public.church_feature_settings (
  church_id uuid not null references public.churches(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  primary key(church_id,feature_key)
);

create table public.member_milestones (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  baptized boolean not null default false,
  holy_ghost_received boolean not null default false,
  first_steps_status text not null default 'not_started',
  timothys_status text not null default 'not_started',
  unique(church_id,user_id)
);

create table public.group_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  meeting_date date not null,
  attendance_count integer not null default 0,
  first_time_guests integer not null default 0,
  active_bible_studies integer not null default 0,
  baptisms integer not null default 0,
  holy_ghost_received integer not null default 0,
  unique(group_id,meeting_date)
);

create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null default 'Test Ministry'
);

create table public.ministry_applications (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'submitted'
);

create table public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  stage text not null default 'new_contact' check (stage in ('new_contact','invited','guest','bible_study','regular_attendee','baptized','holy_ghost','first_steps','connected','serving','inactive')),
  bible_study_lesson integer,
  messaging_consent boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  service_count integer not null default 0 check (service_count>=0),
  bible_study_interest boolean not null default false,
  prayer_request text,
  follow_up_due_at timestamptz,
  last_contacted_at timestamptz,
  phone_normalized text generated always as (regexp_replace(coalesce(phone,''),'[^0-9]','','g')) stored,
  email_normalized text generated always as (lower(trim(coalesce(email,'')))) stored,
  member_user_id uuid references auth.users(id) on delete set null,
  source_type text not null default 'leader_entry' check (source_type in ('church_service','friendship_group','outreach','event','leader_entry','website','other')),
  source_label text,
  source_occurred_at timestamptz,
  email_consent boolean not null default false,
  sms_consent boolean not null default false,
  email_consent_at timestamptz,
  sms_consent_at timestamptz,
  communication_opt_out_at timestamptz,
  communication_language text not null default 'en' check (communication_language in ('en','es')),
  source_group_id uuid references public.groups(id) on delete set null,
  owner_reminder_due_snapshot timestamptz,
  leadership_escalation_due_snapshot timestamptz,
  unique(id,church_id)
);

create unique index outreach_contact_member_unique_idx
  on public.outreach_contacts(church_id,member_user_id)
  where member_user_id is not null;
create unique index outreach_unique_person_email_idx
  on public.outreach_contacts(church_id,lower(trim(first_name)),lower(trim(coalesce(last_name,''))),email_normalized)
  where email_normalized<>'';
create unique index outreach_unique_person_phone_idx
  on public.outreach_contacts(church_id,lower(trim(first_name)),lower(trim(coalesce(last_name,''))),phone_normalized)
  where phone_normalized<>'';

create table public.outreach_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null,
  church_id uuid not null references public.churches(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  interaction_type text not null check (interaction_type in ('call','text','visit','invitation','bible_study','service_attendance','prayer','follow_up','note')),
  occurred_at timestamptz not null default now(),
  summary text not null check (char_length(summary) between 1 and 2000),
  bible_study_lesson integer,
  created_at timestamptz not null default now(),
  foreign key(contact_id,church_id) references public.outreach_contacts(id,church_id) on delete cascade
);

create or replace function private.has_church_role(target_church uuid,allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null and exists(
    select 1 from public.church_memberships m
    where m.church_id=target_church
      and m.user_id=(select auth.uid())
      and m.status='active'
      and m.role=any(allowed_roles)
  );
$function$;

create or replace function private.is_church_member(target_church uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null and exists(
    select 1 from public.church_memberships m
    where m.church_id=target_church
      and m.user_id=(select auth.uid())
      and m.status='active'
  );
$function$;

create or replace function private.has_church_permission(target_church uuid,permission_key text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null and (
    exists(
      select 1 from public.church_memberships m
      where m.church_id=target_church
        and m.user_id=(select auth.uid())
        and m.status='active'
        and m.role in ('pastor','church_admin')
    )
    or exists(
      select 1
      from public.church_role_assignments a
      join public.church_roles r on r.id=a.role_id and r.church_id=a.church_id
      join public.church_memberships m on m.church_id=a.church_id and m.user_id=a.user_id and m.status='active'
      where a.church_id=target_church
        and a.user_id=(select auth.uid())
        and r.active=true
        and coalesce((r.permissions->>permission_key)::boolean,false)=true
    )
  );
$function$;

create or replace function private.can_operate_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists(
    select 1
    from public.groups g
    where g.id=p_group_id
      and (
        g.leader_id=(select auth.uid())
        or exists(
          select 1 from public.group_memberships gm
          where gm.group_id=g.id and gm.user_id=(select auth.uid()) and gm.role in ('leader','assistant')
        )
        or private.has_church_role(g.church_id,array['pastor','church_admin'])
        or private.has_church_permission(g.church_id,'manage_groups')
      )
  );
$function$;

revoke all on function private.has_church_role(uuid,text[]) from public,anon;
revoke all on function private.is_church_member(uuid) from public,anon;
revoke all on function private.has_church_permission(uuid,text) from public,anon;
revoke all on function private.can_operate_group(uuid) from public,anon;
grant execute on function private.has_church_role(uuid,text[]) to authenticated;
grant execute on function private.is_church_member(uuid) to authenticated;
grant execute on function private.has_church_permission(uuid,text) to authenticated;
grant execute on function private.can_operate_group(uuid) to authenticated;

create or replace function private.validate_outreach_assignment()
returns trigger
language plpgsql
set search_path to 'public','private'
as $function$
begin
  if tg_op='UPDATE' and new.church_id is distinct from old.church_id then
    raise exception 'Outreach contact cannot be moved to another church';
  end if;
  if tg_op='UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'Outreach contact creator cannot be changed';
  end if;
  if tg_op='INSERT' and not exists(
    select 1 from public.church_memberships cm
    where cm.church_id=new.church_id and cm.user_id=new.created_by and cm.status='active'
  ) then
    raise exception 'Creator must be an active church member';
  end if;
  if new.assigned_to is not null
     and (tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to)
     and not exists(
       select 1 from public.church_memberships cm
       where cm.church_id=new.church_id and cm.user_id=new.assigned_to and cm.status='active'
     ) then
    raise exception 'Assigned follow-up person must be an active church member';
  end if;
  return new;
end
$function$;

create trigger trg_validate_outreach_assignment
before insert or update on public.outreach_contacts
for each row execute function private.validate_outreach_assignment();

alter table public.outreach_contacts enable row level security;
alter table public.outreach_interactions enable row level security;

-- Simulate the pre-Package-1 table privileges. Package 1 replaces the RLS policy
-- expressions while these grants make the final policies exercisable as real roles.
grant select,insert,update,delete on public.outreach_contacts to authenticated;
grant select,insert,update,delete on public.outreach_interactions to authenticated;
grant select on public.churches,public.church_memberships,public.groups,public.group_memberships,public.church_roles,public.church_role_assignments to authenticated;
