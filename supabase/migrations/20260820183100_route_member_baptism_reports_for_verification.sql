-- Members may enter baptism information and control its profile visibility, but
-- self-reporting must not directly change the official verified baptism milestone.
-- A new self-report is queued for the existing pastor/admin milestone review flow.

create or replace function public.update_my_baptism_details(
  p_church_id uuid,
  p_baptized boolean,
  p_baptism_date date default null,
  p_officiant_name text default null,
  p_church_name text default null,
  p_pastor_name text default null,
  p_visible boolean default false
)
returns void
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_verified boolean := false;
  v_person_name text;
  v_notes text;
  v_pending_id uuid;
begin
  if v_user is null or not exists (
    select 1
    from public.church_memberships cm
    where cm.church_id = p_church_id
      and cm.user_id = v_user
      and cm.status = 'active'
  ) then
    raise exception 'Active church membership required';
  end if;

  if not coalesce(p_baptized,false) and p_baptism_date is not null then
    raise exception 'A baptism date requires baptism confirmation';
  end if;

  select coalesce(mm.baptized,false)
  into v_verified
  from public.member_milestones mm
  where mm.church_id = p_church_id
    and mm.user_id = v_user;

  v_verified := coalesce(v_verified,false);

  if coalesce(p_baptized,false) and not v_verified then
    select coalesce(
      nullif(btrim(p.display_name),''),
      nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),
      'Church member'
    )
    into v_person_name
    from public.profiles p
    where p.id = v_user;

    v_person_name := coalesce(v_person_name,'Church member');
    v_notes := concat_ws(E'\n',
      'Self-reported from My Profile; pastor/admin verification required.',
      case when nullif(btrim(coalesce(p_officiant_name,'')),'') is not null then 'Officiant: '||left(btrim(p_officiant_name),200) end,
      case when nullif(btrim(coalesce(p_church_name,'')),'') is not null then 'Baptism church: '||left(btrim(p_church_name),200) end,
      case when nullif(btrim(coalesce(p_pastor_name,'')),'') is not null then 'Pastor at the time: '||left(btrim(p_pastor_name),200) end
    );

    select rm.id
    into v_pending_id
    from public.reported_milestones rm
    where rm.church_id = p_church_id
      and rm.member_user_id = v_user
      and rm.milestone_type = 'baptism'
      and rm.status = 'pending'
    order by rm.created_at desc
    limit 1
    for update;

    if v_pending_id is null then
      insert into public.reported_milestones(
        church_id, reported_by, person_name, milestone_type,
        occurred_on, member_user_id, status, notes
      ) values (
        p_church_id, v_user, v_person_name, 'baptism',
        p_baptism_date, v_user, 'pending', v_notes
      );
    else
      update public.reported_milestones
      set occurred_on = coalesce(p_baptism_date,occurred_on),
          person_name = v_person_name,
          notes = v_notes,
          updated_at = now()
      where id = v_pending_id;
    end if;
  end if;

  -- These descriptive fields are member-entered. The verified baptized/date fields
  -- are intentionally untouched here. Visibility is only effective after baptism
  -- has been leadership-verified.
  insert into public.member_milestones(
    church_id, user_id, baptism_officiant_name, baptism_church_name,
    baptism_pastor_name, show_baptism_details
  ) values (
    p_church_id, v_user,
    nullif(btrim(coalesce(p_officiant_name,'')),''),
    nullif(btrim(coalesce(p_church_name,'')),''),
    nullif(btrim(coalesce(p_pastor_name,'')),''),
    (v_verified and coalesce(p_visible,false))
  )
  on conflict(church_id,user_id) do update set
    baptism_officiant_name = excluded.baptism_officiant_name,
    baptism_church_name = excluded.baptism_church_name,
    baptism_pastor_name = excluded.baptism_pastor_name,
    show_baptism_details = (public.member_milestones.baptized = true and excluded.show_baptism_details),
    updated_at = now();
end
$function$;

create or replace function public.member_public_baptism(
  p_church_id uuid,
  p_user_id uuid
)
returns table(
  baptized boolean,
  baptism_date date,
  officiant_name text,
  church_name text,
  pastor_name text
)
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $function$
begin
  if auth.uid() is null or not private.is_church_member(p_church_id) then
    return;
  end if;

  return query
  select
    mm.baptized,
    mm.baptism_date,
    mm.baptism_officiant_name,
    mm.baptism_church_name,
    mm.baptism_pastor_name
  from public.member_milestones mm
  where mm.church_id = p_church_id
    and mm.user_id = p_user_id
    and mm.baptized = true
    and mm.show_baptism_details = true
    and exists (
      select 1
      from public.church_memberships cm
      where cm.church_id = p_church_id
        and cm.user_id = p_user_id
        and cm.status = 'active'
    );
end
$function$;

revoke all on function public.update_my_baptism_details(uuid,boolean,date,text,text,text,boolean) from public, anon;
revoke all on function public.member_public_baptism(uuid,uuid) from public, anon;
grant execute on function public.update_my_baptism_details(uuid,boolean,date,text,text,text,boolean) to authenticated;
grant execute on function public.member_public_baptism(uuid,uuid) to authenticated;
