create or replace function public.list_friendship_group_directory(p_church_id uuid)
returns table(
  group_id uuid,
  name text,
  leader_id uuid,
  meeting_day text,
  meeting_time time,
  meeting_frequency text,
  location_label text,
  capacity integer,
  accepting_members boolean,
  member_count bigint
)
language plpgsql
stable
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if auth.uid() is null or not private.is_church_member(p_church_id) then
    raise exception 'Active church membership required';
  end if;
  return query
  select g.id,g.name,g.leader_id,g.meeting_day,g.meeting_time,g.meeting_frequency,g.location_label,g.capacity,g.accepting_members,count(gm.user_id)::bigint
  from public.groups g
  left join public.group_memberships gm on gm.group_id=g.id
  where g.church_id=p_church_id and g.active and g.group_type='friendship'
  group by g.id,g.name,g.leader_id,g.meeting_day,g.meeting_time,g.meeting_frequency,g.location_label,g.capacity,g.accepting_members
  order by g.name;
end $$;

revoke all on function public.list_friendship_group_directory(uuid) from public;
grant execute on function public.list_friendship_group_directory(uuid) to authenticated;
