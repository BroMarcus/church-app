-- Package 1 bridge for the CURRENT Friendship Group report side effect.
-- The report remains owned by the Groups system; named guest identity/history is
-- resolved by canonical Outreach. Report ID + guest slot provides a stable retry
-- key so one report occurrence cannot create duplicate Outreach touches.

create or replace function public.record_group_report_guest_outreach(
  p_group_report_id uuid,
  p_guest_slot smallint,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_language text default 'en'
)
returns table(result text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_report record;
  v_token text;
  v_request_key uuid;
  v_result text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_guest_slot is null or p_guest_slot<1 or p_guest_slot>20 then
    raise exception 'Guest slot is not valid';
  end if;
  if nullif(trim(coalesce(p_first_name,'')),'') is null then
    raise exception 'Guest first name is required';
  end if;

  select gr.id,gr.group_id,gr.meeting_date,g.church_id,g.name
    into v_report
  from public.group_reports gr
  join public.groups g on g.id=gr.group_id and g.active=true
  where gr.id=p_group_report_id;

  if v_report.id is null then raise exception 'Group report is not available'; end if;
  if not private.can_operate_group(v_report.group_id) then
    raise exception 'You do not have permission to record guests for this Friendship Group';
  end if;

  -- A name without a stable contact key is valuable as an attendance/report count
  -- but is not enough identity evidence to create or merge a canonical person.
  if nullif(trim(coalesce(p_phone,'')),'') is null
     and nullif(trim(coalesce(p_email,'')),'') is null then
    return query select 'needs_identity'::text;
    return;
  end if;

  select l.token into v_token
  from public.create_outreach_source_link(
    v_report.church_id,
    'friendship_group',
    v_report.group_id,
    null,
    v_report.name,
    case when p_language='es' then 'es' else 'en' end
  ) l
  limit 1;

  if v_token is null then raise exception 'Friendship Group connection source could not be prepared'; end if;

  -- PostgreSQL UUID input accepts the 32 hexadecimal characters returned by md5.
  -- This is an idempotency key, not a security token.
  v_request_key:=md5(v_report.id::text||':guest:'||p_guest_slot::text)::uuid;

  select x.result into v_result
  from public.record_friendship_group_outreach_visit(
    v_token,
    v_request_key,
    p_first_name,
    p_last_name,
    p_phone,
    p_email,
    p_language,
    1::smallint,
    v_report.meeting_date
  ) x;

  return query select coalesce(v_result,'needs_review'::text);
end
$function$;

revoke all on function public.record_group_report_guest_outreach(uuid,smallint,text,text,text,text,text) from public,anon;
grant execute on function public.record_group_report_guest_outreach(uuid,smallint,text,text,text,text,text) to authenticated,service_role;
