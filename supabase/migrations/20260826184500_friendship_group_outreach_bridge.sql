-- Package 1 CONNECTED contract for current and future Friendship Group reporting.
-- This authenticated bridge deliberately calls the SAME public duplicate-safe
-- submit_outreach_connection resolver used by the no-account connection card, then
-- adds trusted group-report occurrence metadata (meeting time + 1st/2nd/3rd visit).

alter table public.outreach_connection_reviews
  add column if not exists reported_visit_ordinal smallint,
  add column if not exists reported_occurred_at timestamptz;

alter table public.outreach_connection_reviews
  drop constraint if exists outreach_connection_reviews_visit_ordinal_check,
  add constraint outreach_connection_reviews_visit_ordinal_check
    check (reported_visit_ordinal is null or reported_visit_ordinal between 1 and 3);

create or replace function public.record_friendship_group_outreach_visit(
  p_token text,
  p_request_key uuid,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_language text default 'en',
  p_visit_ordinal smallint default null,
  p_meeting_date date default current_date
)
returns table(result text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_link record;
  v_result text;
  v_interaction_id uuid;
  v_occurred_at timestamptz;
  v_meeting_time time;
  v_timezone text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_visit_ordinal is not null and (p_visit_ordinal<1 or p_visit_ordinal>3) then
    raise exception 'Visit ordinal must be first, second, or third';
  end if;

  select l.id,l.church_id,l.source_group_id,g.meeting_time,coalesce(c.timezone,'UTC')
    into v_link.id,v_link.church_id,v_link.source_group_id,v_meeting_time,v_timezone
  from public.outreach_source_links l
  join public.churches c on c.id=l.church_id
  join public.groups g on g.id=l.source_group_id and g.church_id=l.church_id and g.active=true
  where l.token=trim(p_token)
    and l.source_type='friendship_group'
    and l.active=true
    and (l.expires_at is null or l.expires_at>now());

  if v_link.id is null then raise exception 'Friendship Group connection source is not available'; end if;
  if not private.can_operate_group(v_link.source_group_id) then
    raise exception 'You do not have permission to record visits for this Friendship Group';
  end if;

  -- Current report UI calls its named rows first-time guests. Package 3 can pass 2
  -- or 3 from the official New Life guest codes without changing identity logic.
  v_occurred_at:=(p_meeting_date+coalesce(v_meeting_time,time '12:00')) at time zone v_timezone;

  select s.result into v_result
  from public.submit_outreach_connection(
    p_token,p_request_key,p_first_name,p_last_name,p_phone,p_email,p_language,
    false,false,false,false,null
  ) s;

  if v_result='connected' then
    select r.interaction_id into v_interaction_id
    from public.outreach_connection_receipts r
    where r.request_key=p_request_key;

    if v_interaction_id is not null then
      update public.outreach_interactions
      set visit_ordinal=p_visit_ordinal,
          occurred_at=v_occurred_at
      where id=v_interaction_id
        and church_id=v_link.church_id
        and source_group_id=v_link.source_group_id;
    end if;
  elsif v_result='needs_review' then
    update public.outreach_connection_reviews
    set reported_visit_ordinal=p_visit_ordinal,
        reported_occurred_at=v_occurred_at,
        updated_at=now()
    where request_key=p_request_key
      and church_id=v_link.church_id
      and source_group_id=v_link.source_group_id
      and status='pending';
  end if;

  return query select v_result;
end
$function$;

revoke all on function public.record_friendship_group_outreach_visit(text,uuid,text,text,text,text,text,smallint,date) from public,anon;
grant execute on function public.record_friendship_group_outreach_visit(text,uuid,text,text,text,text,text,smallint,date) to authenticated,service_role;

-- Preserve trusted group occurrence metadata when an ambiguous identity is later
-- resolved by church-wide Outreach leadership.
create or replace function public.resolve_outreach_connection_review(
  p_review_id uuid,
  p_contact_id uuid,
  p_dismiss boolean default false
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_review record;
  v_link record;
  v_interaction_id uuid;
  v_allowed boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_review
  from public.outreach_connection_reviews
  where id=p_review_id and status='pending'
  for update;
  if v_review.id is null then raise exception 'Connection review is not available'; end if;

  v_allowed:=private.has_church_role(v_review.church_id,array['pastor','church_admin'])
    or private.has_church_permission(v_review.church_id,'manage_outreach');
  if not v_allowed then raise exception 'You do not have permission to resolve this connection review'; end if;

  if p_dismiss then
    update public.outreach_connection_reviews
    set status='dismissed',resolved_by=v_user,resolved_at=now(),updated_at=now()
    where id=v_review.id;
    return true;
  end if;

  if p_contact_id is null or not (p_contact_id=any(v_review.candidate_ids)) then
    raise exception 'Choose one of the matched Outreach records';
  end if;
  if not exists(select 1 from public.outreach_contacts o where o.id=p_contact_id and o.church_id=v_review.church_id) then
    raise exception 'Matched Outreach record is no longer available';
  end if;

  select * into v_link from public.outreach_source_links where id=v_review.source_link_id;
  if v_link.id is null then raise exception 'Connection source is no longer available'; end if;

  v_interaction_id:=private.apply_outreach_source_touch(
    p_contact_id,v_link.id,v_review.request_key,v_review.submitted_email,v_review.submitted_phone,v_review.communication_language,
    v_review.email_consent,v_review.sms_consent,v_review.bible_study_interest,v_review.first_steps_interest,v_review.prayer_request
  );

  if v_interaction_id is not null and (v_review.reported_visit_ordinal is not null or v_review.reported_occurred_at is not null) then
    update public.outreach_interactions
    set visit_ordinal=coalesce(v_review.reported_visit_ordinal,visit_ordinal),
        occurred_at=coalesce(v_review.reported_occurred_at,occurred_at)
    where id=v_interaction_id and church_id=v_review.church_id;
  end if;

  update public.outreach_connection_reviews
  set status='resolved',resolved_contact_id=p_contact_id,resolved_by=v_user,resolved_at=now(),updated_at=now()
  where id=v_review.id;

  update public.outreach_connection_receipts
  set contact_id=p_contact_id,interaction_id=v_interaction_id,result='connected',updated_at=now()
  where request_key=v_review.request_key;

  return true;
end
$function$;

revoke all on function public.resolve_outreach_connection_review(uuid,uuid,boolean) from public,anon;
grant execute on function public.resolve_outreach_connection_review(uuid,uuid,boolean) to authenticated,service_role;
