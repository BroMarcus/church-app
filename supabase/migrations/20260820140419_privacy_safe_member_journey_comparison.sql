alter table public.profiles add column if not exists show_journey_comparison boolean not null default false;

drop function if exists public.church_directory_member(uuid,uuid);
create function public.church_directory_member(p_church_id uuid,p_user_id uuid)
returns table(user_id uuid,display_name text,first_name text,last_name text,bio text,contact_email text,role text,show_verified_credentials boolean,show_learning_trophies boolean,avatar_path text,show_journey_comparison boolean)
language plpgsql stable security definer set search_path='public','private' as $$
begin
  if not private.is_church_member(p_church_id) then raise exception 'Church membership required'; end if;
  if not exists(
    select 1 from public.church_memberships cm join public.profiles p on p.id=cm.user_id
    where cm.church_id=p_church_id and cm.user_id=p_user_id and cm.status='active'
      and (p.directory_visible or p.id=auth.uid() or private.has_church_role(p_church_id,array['pastor','church_admin']))
  ) then return; end if;
  return query
  select p.id,p.display_name,p.first_name,p.last_name,p.bio,
    case when p.show_contact_email then p.contact_email else null end,
    cm.role,p.show_verified_credentials,p.show_learning_trophies,p.avatar_path,p.show_journey_comparison
  from public.church_memberships cm join public.profiles p on p.id=cm.user_id
  where cm.church_id=p_church_id and cm.user_id=p_user_id and cm.status='active';
end;$$;
revoke all on function public.church_directory_member(uuid,uuid) from public,anon;
grant execute on function public.church_directory_member(uuid,uuid) to authenticated,service_role;

create or replace function public.member_journey_comparison(p_church_id uuid,p_target_user_id uuid)
returns table(user_id uuid,verified_milestones integer,courses_completed integer,courses_in_progress integer)
language plpgsql stable security definer set search_path='public','private' as $$
declare v_viewer uuid:=auth.uid();
begin
  if v_viewer is null or not private.is_church_member(p_church_id) then raise exception 'Church membership required'; end if;
  if not exists(select 1 from public.church_memberships cm where cm.church_id=p_church_id and cm.user_id=p_target_user_id and cm.status='active') then return; end if;
  if p_target_user_id<>v_viewer and not exists(select 1 from public.profiles p where p.id=p_target_user_id and p.directory_visible=true and p.show_journey_comparison=true) then return; end if;
  return query
  select p_target_user_id,
    (case when coalesce(mm.baptized,false) then 1 else 0 end + case when coalesce(mm.holy_ghost_received,false) then 1 else 0 end + case when mm.first_steps_status='completed' then 1 else 0 end + case when mm.soul_winning_status='completed' then 1 else 0 end + case when mm.bible_study_teacher_status='approved' then 1 else 0 end)::integer,
    count(*) filter(where ce.credential_earned=true)::integer,
    count(*) filter(where coalesce(ce.credential_earned,false)=false)::integer
  from public.member_milestones mm
  left join public.course_enrollments ce on ce.user_id=p_target_user_id
  where mm.church_id=p_church_id and mm.user_id=p_target_user_id
  group by mm.baptized,mm.holy_ghost_received,mm.first_steps_status,mm.soul_winning_status,mm.bible_study_teacher_status;
end;$$;
revoke all on function public.member_journey_comparison(uuid,uuid) from public,anon;
grant execute on function public.member_journey_comparison(uuid,uuid) to authenticated,service_role;
