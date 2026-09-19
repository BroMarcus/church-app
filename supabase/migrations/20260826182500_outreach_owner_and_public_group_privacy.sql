-- Package 1 ownership/privacy closure.
-- 1) Prefer an explicitly permissioned manage_outreach user before falling back to
--    Pastor/Admin when no Friendship Group leader owns the source.
-- 2) Keep the anonymous source resolver from exposing groups.location_label. That
--    field is not guaranteed to be a public-safe neighborhood label and could later
--    hold a private home location. Exact/public location design belongs to Package 3.

create or replace function private.outreach_owner_for_source_link(p_link_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_link record;
  v_owner uuid;
begin
  select l.church_id,l.source_group_id
    into v_link
  from public.outreach_source_links l
  where l.id=p_link_id;

  if v_link.church_id is null then return null; end if;

  -- A live Friendship Group leader owns follow-up from that group's source first.
  if v_link.source_group_id is not null then
    select g.leader_id
      into v_owner
    from public.groups g
    join public.church_memberships cm
      on cm.church_id=g.church_id
     and cm.user_id=g.leader_id
     and cm.status='active'
    where g.id=v_link.source_group_id
      and g.church_id=v_link.church_id
      and g.active=true;
  end if;

  -- Otherwise prefer an active user explicitly assigned a custom role that carries
  -- manage_outreach. This reuses the existing church-role authority model and does
  -- not grant or modify any shared role assignment.
  if v_owner is null then
    select a.user_id
      into v_owner
    from public.church_role_assignments a
    join public.church_roles r
      on r.id=a.role_id
     and r.church_id=a.church_id
     and r.active=true
    join public.church_memberships cm
      on cm.church_id=a.church_id
     and cm.user_id=a.user_id
     and cm.status='active'
    where a.church_id=v_link.church_id
      and coalesce((r.permissions->>'manage_outreach')::boolean,false)=true
    order by a.assigned_at,a.id
    limit 1;
  end if;

  -- Final operational fallback keeps the connection from becoming ownerless.
  if v_owner is null then
    select cm.user_id
      into v_owner
    from public.church_memberships cm
    where cm.church_id=v_link.church_id
      and cm.status='active'
      and cm.role in ('pastor','church_admin')
    order by case when cm.role='pastor' then 0 else 1 end,cm.created_at
    limit 1;
  end if;

  return v_owner;
end
$function$;

revoke all on function private.outreach_owner_for_source_link(uuid) from public, anon, authenticated;

create or replace function public.resolve_outreach_source_link(p_token text)
returns table(
  church_id uuid,
  church_name text,
  church_slug text,
  source_type text,
  source_label text,
  source_group_id uuid,
  group_name text,
  group_location_label text,
  group_meeting_day text,
  group_meeting_time time,
  language_code text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select c.id,c.name,c.slug,l.source_type,l.source_label,l.source_group_id,
         g.name,null::text,g.meeting_day,g.meeting_time,l.language_code
  from public.outreach_source_links l
  join public.churches c on c.id=l.church_id
  left join public.groups g
    on g.id=l.source_group_id
   and g.church_id=l.church_id
   and g.active=true
  where l.token=trim(p_token)
    and l.active=true
    and (l.expires_at is null or l.expires_at>now())
    and exists(
      select 1 from public.church_memberships cm
      where cm.church_id=l.church_id
        and cm.user_id=l.created_by
        and cm.status='active'
    )
    and (l.source_type<>'friendship_group' or g.id is not null)
  limit 1;
$function$;

revoke all on function public.resolve_outreach_source_link(text) from public;
grant execute on function public.resolve_outreach_source_link(text) to anon,authenticated,service_role;
