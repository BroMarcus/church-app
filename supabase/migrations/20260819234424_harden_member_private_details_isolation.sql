create or replace function private.can_manage_member_private_details(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select (select auth.uid()) is not null
    and 1 = (
      select count(distinct cm.church_id)
      from public.church_memberships cm
      where cm.user_id=target_user and cm.status='active'
    )
    and exists (
      select 1
      from public.church_memberships cm
      where cm.user_id=target_user
        and cm.status='active'
        and (
          private.has_church_role(cm.church_id,array['pastor','church_admin'])
          or private.has_church_permission(cm.church_id,'manage_members')
        )
    );
$$;

revoke all on function private.can_manage_member_private_details(uuid) from public, anon, authenticated;

drop policy if exists private_details_insert_church_admin on public.member_private_details;
drop policy if exists private_details_read on public.member_private_details;
drop policy if exists private_details_update_church_admin on public.member_private_details;
drop policy if exists private_details_update_self on public.member_private_details;

create policy private_details_read
on public.member_private_details
for select
to authenticated
using ((select auth.uid())=user_id or private.can_manage_member_private_details(user_id));

create policy private_details_update_self
on public.member_private_details
for update
to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

create policy private_details_insert_church_admin
on public.member_private_details
for insert
to authenticated
with check (private.can_manage_member_private_details(user_id));

create policy private_details_update_church_admin
on public.member_private_details
for update
to authenticated
using (private.can_manage_member_private_details(user_id))
with check (private.can_manage_member_private_details(user_id));
