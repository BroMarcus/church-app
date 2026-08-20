-- Group leaders may report baptism / Holy Ghost milestones, but those reports must
-- not directly change a member's official milestone record. Pastor/church-admin
-- review remains the authority boundary for verified Journey milestones.

create or replace function public.update_group_member_status(
  p_group_id uuid,
  p_user_id uuid,
  p_group_role text default 'member',
  p_member_title text default null,
  p_mark_baptized boolean default false,
  p_mark_holy_ghost boolean default false
)
returns void
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_group public.groups%rowtype;
  v_person_name text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if p_group_role not in ('member','assistant','leader') then
    raise exception 'Invalid group role';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id and active;

  if not found then
    raise exception 'Group not found';
  end if;

  if not (
    v_group.leader_id = v_actor
    or private.has_group_role(p_group_id, array['leader'])
    or private.has_church_role(v_group.church_id, array['pastor','church_admin'])
  ) then
    raise exception 'Group leadership required';
  end if;

  if not exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
  ) then
    raise exception 'Member is not in this group';
  end if;

  update public.group_memberships
  set role = p_group_role
  where group_id = p_group_id and user_id = p_user_id;

  update public.church_memberships
  set member_title = nullif(left(btrim(coalesce(p_member_title,'')),80),'')
  where church_id = v_group.church_id
    and user_id = p_user_id
    and status = 'active';

  if p_mark_baptized or p_mark_holy_ghost then
    select coalesce(
      nullif(btrim(p.display_name),''),
      nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),
      'Church member'
    )
    into v_person_name
    from public.profiles p
    where p.id = p_user_id;

    v_person_name := coalesce(v_person_name,'Church member');
  end if;

  -- A leader report is intentionally pending. Only the existing milestone-review
  -- workflow may promote it into member_milestones and stamp verified_by.
  if p_mark_baptized
     and not exists (
       select 1 from public.member_milestones mm
       where mm.church_id = v_group.church_id
         and mm.user_id = p_user_id
         and mm.baptized = true
     )
     and not exists (
       select 1 from public.reported_milestones rm
       where rm.church_id = v_group.church_id
         and rm.member_user_id = p_user_id
         and rm.milestone_type = 'baptism'
         and rm.status = 'pending'
     ) then
    insert into public.reported_milestones(
      church_id, group_id, reported_by, person_name,
      milestone_type, member_user_id, status, notes
    ) values (
      v_group.church_id, p_group_id, v_actor, v_person_name,
      'baptism', p_user_id, 'pending',
      'Reported from Friendship Group member status; pastor/admin verification required.'
    );
  end if;

  if p_mark_holy_ghost
     and not exists (
       select 1 from public.member_milestones mm
       where mm.church_id = v_group.church_id
         and mm.user_id = p_user_id
         and mm.holy_ghost_received = true
     )
     and not exists (
       select 1 from public.reported_milestones rm
       where rm.church_id = v_group.church_id
         and rm.member_user_id = p_user_id
         and rm.milestone_type = 'holy_ghost'
         and rm.status = 'pending'
     ) then
    insert into public.reported_milestones(
      church_id, group_id, reported_by, person_name,
      milestone_type, member_user_id, status, notes
    ) values (
      v_group.church_id, p_group_id, v_actor, v_person_name,
      'holy_ghost', p_user_id, 'pending',
      'Reported from Friendship Group member status; pastor/admin verification required.'
    );
  end if;
end
$function$;

revoke all on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) from public, anon;
grant execute on function public.update_group_member_status(uuid,uuid,text,text,boolean,boolean) to authenticated;
