create or replace function public.update_group_member_status(
  p_group_id uuid,
  p_user_id uuid,
  p_group_role text default 'member',
  p_member_title text default null,
  p_mark_baptized boolean default false,
  p_mark_holy_ghost boolean default false
) returns void
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare
  v_actor uuid:=auth.uid();
  v_group public.groups%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_group_role not in ('member','assistant','leader') then raise exception 'Invalid group role'; end if;
  select * into v_group from public.groups where id=p_group_id and active;
  if not found then raise exception 'Group not found'; end if;
  if not (
    v_group.leader_id=v_actor
    or private.has_group_role(p_group_id,array['leader'])
    or private.has_church_role(v_group.church_id,array['pastor','church_admin'])
  ) then raise exception 'Group leadership required'; end if;
  if not exists(select 1 from public.group_memberships gm where gm.group_id=p_group_id and gm.user_id=p_user_id) then raise exception 'Member is not in this group'; end if;
  update public.group_memberships set role=p_group_role where group_id=p_group_id and user_id=p_user_id;
  update public.church_memberships set member_title=nullif(left(btrim(coalesce(p_member_title,'')),80),'')
  where church_id=v_group.church_id and user_id=p_user_id and status='active';
  if p_mark_baptized or p_mark_holy_ghost then
    insert into public.member_milestones(church_id,user_id,baptized,holy_ghost_received)
    values(v_group.church_id,p_user_id,p_mark_baptized,p_mark_holy_ghost)
    on conflict(church_id,user_id) do update set
      baptized=public.member_milestones.baptized or excluded.baptized,
      holy_ghost_received=public.member_milestones.holy_ghost_received or excluded.holy_ghost_received,
      updated_at=now();
  end if;
end $$;
revoke all on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) from public,anon;
grant execute on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) to authenticated;
