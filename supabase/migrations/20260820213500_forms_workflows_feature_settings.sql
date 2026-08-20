create table if not exists public.church_workflow_templates(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  description text,
  default_status text not null default 'new' check(default_status in('new','in_review','approved','declined','completed')),
  default_next_action text,
  due_days integer check(due_days is null or due_days between 0 and 365),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,name)
);

create table if not exists public.church_forms(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  workflow_template_id uuid references public.church_workflow_templates(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  form_schema jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,slug),
  check(jsonb_typeof(form_schema)='array')
);

create table if not exists public.church_form_submissions(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  form_id uuid not null references public.church_forms(id) on delete restrict,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'new' check(status in('new','in_review','approved','declined','completed')),
  owner_user_id uuid references public.profiles(id) on delete set null,
  next_action text,
  due_at timestamptz,
  leadership_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(jsonb_typeof(answers)='object')
);

create table if not exists public.church_feature_settings(
  church_id uuid not null references public.churches(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(church_id,feature_key),
  check(feature_key in('community','prayer','messages','serve','outreach','documents','directory','updates','private_care','library','business','fundraising','network'))
);

create index if not exists church_forms_church_state_idx on public.church_forms(church_id,published,archived_at);
create index if not exists church_form_submissions_queue_idx on public.church_form_submissions(church_id,status,due_at,created_at);
create index if not exists church_form_submissions_owner_idx on public.church_form_submissions(church_id,owner_user_id,status);
create index if not exists church_workflow_templates_church_active_idx on public.church_workflow_templates(church_id,active);

alter table public.church_workflow_templates enable row level security;
alter table public.church_forms enable row level security;
alter table public.church_form_submissions enable row level security;
alter table public.church_feature_settings enable row level security;

create or replace function private.can_manage_church_forms(p_church_id uuid)
returns boolean
language sql stable security definer
set search_path=public,private,pg_temp
as $$
 select auth.uid() is not null and (
   private.has_church_role(p_church_id,array['pastor','church_admin'])
   or private.has_church_permission(p_church_id,'manage_members')
 );
$$;
revoke all on function private.can_manage_church_forms(uuid) from public,anon,authenticated;

create policy church_workflow_templates_manage on public.church_workflow_templates
for all to authenticated
using(private.can_manage_church_forms(church_id))
with check(private.can_manage_church_forms(church_id));

create policy church_forms_manage on public.church_forms
for all to authenticated
using(private.can_manage_church_forms(church_id))
with check(private.can_manage_church_forms(church_id));

create policy church_forms_member_read on public.church_forms
for select to authenticated
using(published and archived_at is null and private.is_church_member(church_id));

create policy church_form_submissions_self_read on public.church_form_submissions
for select to authenticated
using(submitted_by=auth.uid());

create policy church_form_submissions_leader_read on public.church_form_submissions
for select to authenticated
using(private.can_manage_church_forms(church_id));

create policy church_form_submissions_self_insert on public.church_form_submissions
for insert to authenticated
with check(
 submitted_by=auth.uid()
 and private.is_church_member(church_id)
 and exists(select 1 from public.church_forms f where f.id=form_id and f.church_id=church_id and f.published and f.archived_at is null)
);

create policy church_form_submissions_leader_update on public.church_form_submissions
for update to authenticated
using(private.can_manage_church_forms(church_id))
with check(private.can_manage_church_forms(church_id));

create policy church_feature_settings_member_read on public.church_feature_settings
for select to authenticated
using(private.is_church_member(church_id));

create policy church_feature_settings_manage on public.church_feature_settings
for all to authenticated
using(private.has_church_role(church_id,array['pastor','church_admin']))
with check(private.has_church_role(church_id,array['pastor','church_admin']));

create or replace function public.submit_church_form(p_form_id uuid,p_answers jsonb)
returns uuid
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_form public.church_forms%rowtype;
  v_template public.church_workflow_templates%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception 'Form answers must be an object'; end if;
  select * into v_form from public.church_forms where id=p_form_id and published and archived_at is null;
  if v_form.id is null then raise exception 'Form not available'; end if;
  if not private.is_church_member(v_form.church_id) then raise exception 'Church membership required'; end if;
  if v_form.workflow_template_id is not null then select * into v_template from public.church_workflow_templates where id=v_form.workflow_template_id and church_id=v_form.church_id and active; end if;
  insert into public.church_form_submissions(church_id,form_id,submitted_by,answers,status,next_action,due_at)
  values(v_form.church_id,v_form.id,v_user,p_answers,coalesce(v_template.default_status,'new'),v_template.default_next_action,case when v_template.due_days is null then null else now()+(v_template.due_days||' days')::interval end)
  returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.submit_church_form(uuid,jsonb) from public,anon;
grant execute on function public.submit_church_form(uuid,jsonb) to authenticated;
