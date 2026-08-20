drop policy if exists prayer_requests_read on public.prayer_requests;
create policy prayer_requests_read on public.prayer_requests for select to authenticated using (
  user_id = auth.uid()
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or (visibility='public' and private.is_church_member(church_id))
  or (
    group_id is not null
    and exists (
      select 1 from public.groups g
      where g.id=prayer_requests.group_id
        and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']))
    )
  )
  or (
    share_with_group
    and group_id is not null
    and exists (
      select 1 from public.group_memberships gm
      where gm.group_id=prayer_requests.group_id
        and gm.user_id=auth.uid()
    )
  )
);
