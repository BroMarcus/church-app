-- Package 1 privacy closure: assigned_to is an access grant. A Pastor/Admin or
-- explicit manage_outreach user may deliberately assign an active church member.
-- A scoped owner/group operator may only hand the person to an eligible group or
-- church-wide Outreach leader, not grant private guest access to any random member.

create or replace function private.is_outreach_assignee_target(
  p_church_id uuid,
  p_user_id uuid,
  p_group_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select p_user_id is not null and exists(
    select 1
    from public.church_memberships cm
    where cm.church_id=p_church_id
      and cm.user_id=p_user_id
      and cm.status='active'
      and (
        cm.role in ('pastor','church_admin')
        or exists(
          select 1
          from public.church_role_assignments a
          join public.church_roles r
            on r.id=a.role_id
           and r.church_id=a.church_id
           and r.active=true
          where a.church_id=p_church_id
            and a.user_id=p_user_id
            and coalesce((r.permissions->>'manage_outreach')::boolean,false)=true
        )
        or (
          p_group_id is not null
          and exists(
            select 1
            from public.groups g
            where g.id=p_group_id
              and g.church_id=p_church_id
              and g.active=true
              and (
                g.leader_id=p_user_id
                or exists(
                  select 1
                  from public.group_memberships gm
                  where gm.group_id=g.id
                    and gm.user_id=p_user_id
                    and gm.role in ('leader','assistant')
                )
              )
          )
        )
      )
  );
$function$;

revoke all on function private.is_outreach_assignee_target(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function private.validate_outreach_assignment()
returns trigger
language plpgsql
set search_path to 'public','private'
as $function$
declare
  v_actor_churchwide boolean:=false;
  v_assignment_changed boolean:=false;
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

  v_assignment_changed:=new.assigned_to is not null and (tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to);
  if not v_assignment_changed then return new; end if;

  if not exists(
    select 1 from public.church_memberships cm
    where cm.church_id=new.church_id and cm.user_id=new.assigned_to and cm.status='active'
  ) then
    raise exception 'Assigned follow-up person must be an active church member';
  end if;

  v_actor_churchwide:=private.has_church_role(new.church_id,array['pastor','church_admin'])
    or private.has_church_permission(new.church_id,'manage_outreach');

  -- Church-wide authorized leaders intentionally may delegate one specific contact
  -- to any active member. Everyone else may assign only to a scoped/group or
  -- church-wide Outreach target. This also allows anonymous SECURITY DEFINER public
  -- capture to assign the preselected group/Outreach owner without trusting anon.
  if not v_actor_churchwide
     and not private.is_outreach_assignee_target(new.church_id,new.assigned_to,new.source_group_id) then
    raise exception 'Follow-up assignment requires an eligible Outreach or group leader';
  end if;

  return new;
end
$function$;
