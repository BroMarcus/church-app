create or replace function public.update_group_member_status(
  p_group_id uuid,
  p_user_id uuid,
  p_group_role text default 'member',
  p_member_title text default null,
  p_mark_baptized boolean default false,
  p_mark_holy_ghost boolean default false
) returns void
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_actor uuid:=auth.uid();
  v_group public.groups%rowtype;
  v_is_admin boolean:=false;
  v_person_name text;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_group_role not in ('member','assistant','leader') then raise exception 'Invalid group role'; end if;
  select * into v_group from public.groups where id=p_group_id and active;
  if not found then raise exception 'Group not found'; end if;
  v_is_admin:=private.has_church_role(v_group.church_id,array['pastor','church_admin']);
  if not (
    v_group.leader_id=v_actor
    or private.has_group_role(p_group_id,array['leader'])
    or v_is_admin
  ) then raise exception 'Group leadership required'; end if;
  if not exists(select 1 from public.group_memberships gm where gm.group_id=p_group_id and gm.user_id=p_user_id) then raise exception 'Member is not in this group'; end if;

  update public.group_memberships set role=p_group_role where group_id=p_group_id and user_id=p_user_id;
  update public.church_memberships set member_title=nullif(left(btrim(coalesce(p_member_title,'')),80),'')
  where church_id=v_group.church_id and user_id=p_user_id and status='active';

  if p_mark_baptized or p_mark_holy_ghost then
    if v_is_admin then
      insert into public.member_milestones(church_id,user_id,baptized,holy_ghost_received,verified_by)
      values(v_group.church_id,p_user_id,p_mark_baptized,p_mark_holy_ghost,v_actor)
      on conflict(church_id,user_id) do update set
        baptized=public.member_milestones.baptized or excluded.baptized,
        holy_ghost_received=public.member_milestones.holy_ghost_received or excluded.holy_ghost_received,
        verified_by=v_actor,
        updated_at=now();
    else
      select coalesce(nullif(p.display_name,''),nullif(concat_ws(' ',p.first_name,p.last_name),''),'Church member')
      into v_person_name from public.profiles p where p.id=p_user_id;
      if p_mark_baptized
         and not exists(select 1 from public.member_milestones mm where mm.church_id=v_group.church_id and mm.user_id=p_user_id and mm.baptized=true)
         and not exists(select 1 from public.reported_milestones rm where rm.church_id=v_group.church_id and rm.member_user_id=p_user_id and rm.milestone_type='baptism' and rm.status='pending') then
        insert into public.reported_milestones(church_id,group_id,reported_by,person_name,milestone_type,member_user_id,status,notes)
        values(v_group.church_id,p_group_id,v_actor,coalesce(v_person_name,'Church member'),'baptism',p_user_id,'pending','Submitted from Friendship Group member-status editor for Pastor/Admin verification.');
      end if;
      if p_mark_holy_ghost
         and not exists(select 1 from public.member_milestones mm where mm.church_id=v_group.church_id and mm.user_id=p_user_id and mm.holy_ghost_received=true)
         and not exists(select 1 from public.reported_milestones rm where rm.church_id=v_group.church_id and rm.member_user_id=p_user_id and rm.milestone_type='holy_ghost' and rm.status='pending') then
        insert into public.reported_milestones(church_id,group_id,reported_by,person_name,milestone_type,member_user_id,status,notes)
        values(v_group.church_id,p_group_id,v_actor,coalesce(v_person_name,'Church member'),'holy_ghost',p_user_id,'pending','Submitted from Friendship Group member-status editor for Pastor/Admin verification.');
      end if;
    end if;
  end if;
end $$;
revoke all on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) from public,anon;
grant execute on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) to authenticated,service_role;
