-- Package 1 public-intake closure.
-- Protect the first durable mutation in anonymous capture so a caller cannot bypass
-- UI/source resolution when Outreach intake is paused or reuse one request UUID
-- against a different source link.

create or replace function private.guard_outreach_connection_receipt()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing record;
  v_source_church uuid;
begin
  select l.church_id into v_source_church
  from public.outreach_source_links l
  where l.id=new.source_link_id;

  if v_source_church is null or v_source_church<>new.church_id then
    raise exception 'Connection request source is not valid';
  end if;

  select r.source_link_id,r.church_id into v_existing
  from public.outreach_connection_receipts r
  where r.request_key=new.request_key;

  -- Same request + same source is a legitimate retry and must reach ON CONFLICT so
  -- submit_outreach_connection can return the already-stored result. A request key
  -- must never be portable between churches or source links.
  if v_existing.source_link_id is not null then
    if v_existing.source_link_id<>new.source_link_id or v_existing.church_id<>new.church_id then
      raise exception 'Connection request does not match its original source';
    end if;
    return new;
  end if;

  -- No explicit setting means enabled. A church can pause new public Outreach
  -- intake without disabling authenticated leadership follow-up on existing people.
  if exists(
    select 1
    from public.church_feature_settings fs
    where fs.church_id=new.church_id
      and fs.feature_key='outreach'
      and fs.enabled=false
  ) then
    raise exception 'Church connection intake is paused';
  end if;

  return new;
end
$function$;

revoke all on function private.guard_outreach_connection_receipt() from public,anon,authenticated;

drop trigger if exists trg_guard_outreach_connection_receipt on public.outreach_connection_receipts;
create trigger trg_guard_outreach_connection_receipt
before insert on public.outreach_connection_receipts
for each row execute function private.guard_outreach_connection_receipt();

-- Keep the public resolver consistent with the write guard. It also intentionally
-- returns NULL for group_location_label: groups.location_label is not guaranteed to
-- be safe for anonymous display and may later contain a private-home location.
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
    and not exists(
      select 1
      from public.church_feature_settings fs
      where fs.church_id=l.church_id
        and fs.feature_key='outreach'
        and fs.enabled=false
    )
    and (l.source_type<>'friendship_group' or g.id is not null)
  limit 1;
$function$;

revoke all on function public.resolve_outreach_source_link(text) from public;
grant execute on function public.resolve_outreach_source_link(text) to anon,authenticated,service_role;
