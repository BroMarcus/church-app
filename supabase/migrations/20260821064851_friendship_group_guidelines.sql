create table public.group_guidelines (
  group_id uuid primary key references public.groups(id) on delete cascade,
  body text not null default '',
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.group_guidelines enable row level security;

create policy group_guidelines_read on public.group_guidelines
for select to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id=group_guidelines.group_id
      and (
        g.leader_id=auth.uid()
        or exists(select 1 from public.group_memberships gm where gm.group_id=g.id and gm.user_id=auth.uid())
        or private.has_church_role(g.church_id,array['pastor','church_admin','minister']::text[])
        or private.has_church_permission(g.church_id,'manage_groups')
      )
  )
);

create policy group_guidelines_insert on public.group_guidelines
for insert to authenticated
with check (updated_by=auth.uid() and private.can_manage_group(group_id));

create policy group_guidelines_update on public.group_guidelines
for update to authenticated
using (private.can_manage_group(group_id))
with check (updated_by=auth.uid() and private.can_manage_group(group_id));

create policy group_guidelines_delete on public.group_guidelines
for delete to authenticated
using (private.can_manage_group(group_id));

grant select,insert,update,delete on public.group_guidelines to authenticated;
