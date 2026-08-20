create or replace function private.protect_church_membership_authority()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_other_authority integer := 0;
  v_title_only boolean:=false;
begin
  if v_actor is null then return new; end if;
  if new.church_id is distinct from old.church_id or new.user_id is distinct from old.user_id then
    raise exception 'Membership church and member cannot be reassigned';
  end if;

  v_title_only :=
    new.id is not distinct from old.id
    and new.church_id is not distinct from old.church_id
    and new.user_id is not distinct from old.user_id
    and new.role is not distinct from old.role
    and new.status is not distinct from old.status
    and new.joined_at is not distinct from old.joined_at
    and new.created_at is not distinct from old.created_at
    and new.relationship_status is not distinct from old.relationship_status
    and new.relationship_source is not distinct from old.relationship_source
    and new.relationship_verified_at is not distinct from old.relationship_verified_at
    and new.relationship_verified_by is not distinct from old.relationship_verified_by
    and new.member_title is distinct from old.member_title;

  if v_title_only and exists(
    select 1
    from public.groups g
    join public.group_memberships target_gm on target_gm.group_id=g.id and target_gm.user_id=old.user_id
    left join public.group_memberships actor_gm on actor_gm.group_id=g.id and actor_gm.user_id=v_actor
    where g.church_id=old.church_id and g.active=true
      and (g.leader_id=v_actor or actor_gm.role='leader')
  ) then
    return new;
  end if;

  select cm.role into v_actor_role
  from public.church_memberships cm
  where cm.church_id=old.church_id and cm.user_id=v_actor and cm.status='active'
  limit 1;

  if v_actor_role not in ('pastor','church_admin') then
    raise exception 'Pastor or Church Admin access required';
  end if;

  if v_actor_role='church_admin' and (old.role='pastor' or new.role='pastor') then
    raise exception 'Only a Pastor can assign or change the Pastor role';
  end if;

  if v_actor=old.user_id and (new.status<>'active' or new.role not in ('pastor','church_admin')) then
    raise exception 'You cannot remove your own administrative authority';
  end if;

  if old.status='active' and old.role in ('pastor','church_admin') and (new.status<>'active' or new.role not in ('pastor','church_admin')) then
    select count(*) into v_other_authority
    from public.church_memberships cm
    where cm.church_id=old.church_id
      and cm.id<>old.id
      and cm.status='active'
      and cm.role in ('pastor','church_admin');
    if v_other_authority<1 then
      raise exception 'The church must keep at least one active Pastor or Church Admin';
    end if;
  end if;

  return new;
end;
$$;
