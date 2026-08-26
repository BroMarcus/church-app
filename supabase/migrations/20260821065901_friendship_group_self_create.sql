create or replace function public.create_own_friendship_group(
  p_church_id uuid,
  p_name text,
  p_meeting_day text default null,
  p_meeting_time time default null,
  p_meeting_frequency text default 'weekly',
  p_description text default null,
  p_meeting_address text default null
) returns uuid
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_user uuid:=auth.uid();
  v_group_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.church_memberships m where m.church_id=p_church_id and m.user_id=v_user and m.status='active') then raise exception 'Active church membership required'; end if;
  if not private.has_church_permission(p_church_id,'lead_own_group') then raise exception 'Friendship Group Leader permission required'; end if;
  if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>120 then raise exception 'Valid group name required'; end if;
  if p_meeting_day is not null and p_meeting_day not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') then raise exception 'Invalid meeting day'; end if;
  if coalesce(p_meeting_frequency,'weekly') not in ('weekly','biweekly','monthly','seasonal','other') then raise exception 'Invalid meeting frequency'; end if;
  if exists(
    select 1 from public.groups g
    left join public.group_memberships gm on gm.group_id=g.id and gm.user_id=v_user
    where g.church_id=p_church_id and g.active and g.group_type='friendship'
      and (g.leader_id=v_user or gm.user_id=v_user)
  ) then raise exception 'Already connected to an active Friendship Group'; end if;

  insert into public.groups(church_id,name,group_type,leader_id,description,meeting_day,meeting_time,meeting_frequency,language_code,accepting_members,active)
  values(p_church_id,trim(p_name),'friendship',v_user,nullif(trim(coalesce(p_description,'')),''),p_meeting_day,p_meeting_time,coalesce(p_meeting_frequency,'weekly'),'en',true,true)
  returning id into v_group_id;

  insert into public.group_memberships(group_id,user_id,role) values(v_group_id,v_user,'member');
  if nullif(trim(coalesce(p_meeting_address,'')),'') is not null then
    insert into public.group_private_details(group_id,meeting_address,updated_by) values(v_group_id,trim(p_meeting_address),v_user);
  end if;
  return v_group_id;
end $$;

revoke all on function public.create_own_friendship_group(uuid,text,text,time,text,text,text) from public;
grant execute on function public.create_own_friendship_group(uuid,text,text,time,text,text,text) to authenticated;
