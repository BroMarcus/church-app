create or replace function private.has_finance_permission(target_church uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select (select auth.uid()) is not null and (
    exists(
      select 1
      from public.church_memberships m
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
$$;

create or replace function private.seed_finance_settings_for_church()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  insert into public.finance_settings(church_id)
  values(new.id)
  on conflict(church_id) do nothing;

  insert into public.church_roles(church_id,name,slug,description,permissions,active)
  values(
    new.id,
    'Finance Admin',
    'finance-admin',
    'Designated finance role with access to giving, budgets, bills, approvals, statements, and finance audit history.',
    jsonb_build_object(
      'view_finance',true,
      'manage_finance',true,
      'approve_finance',true,
      'request_finance',true
    ),
    true
  )
  on conflict(church_id,slug) do nothing;

  return new;
end;
$$;

insert into public.church_roles(church_id,name,slug,description,permissions,active)
select c.id,
       'Finance Admin',
       'finance-admin',
       'Designated finance role with access to giving, budgets, bills, approvals, statements, and finance audit history.',
       jsonb_build_object(
         'view_finance',true,
         'manage_finance',true,
         'approve_finance',true,
         'request_finance',true
       ),
       true
from public.churches c
on conflict(church_id,slug) do update
set name=excluded.name,
    description=excluded.description,
    permissions=public.church_roles.permissions || excluded.permissions,
    active=true,
    updated_at=now();