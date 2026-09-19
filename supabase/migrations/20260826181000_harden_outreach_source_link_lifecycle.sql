-- Package 1 follow-up hardening.
-- 1) Public connection links only resolve while their creator remains an active church member.
-- 2) Group-link creators must still belong to that group to manage their own link.
-- 3) An anonymous submission that matches an already-linked member fails closed to
--    central identity review instead of mutating established member history.

-- Link creators only see/manage their own links while they are still active in the church.
drop policy if exists outreach_source_links_read on public.outreach_source_links;
create policy outreach_source_links_read on public.outreach_source_links
for select to authenticated
using (
  (
    created_by = auth.uid()
    and private.is_church_member(church_id)
    and (
      source_group_id is null
      or exists(
        select 1
        from public.group_memberships gm
        where gm.group_id=source_group_id and gm.user_id=auth.uid()
      )
      or private.can_operate_group(source_group_id)
    )
  )
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

create or replace function public.set_outreach_source_link_active(p_link_id uuid,p_active boolean)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_link record;
  v_allowed boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_link from public.outreach_source_links where id=p_link_id for update;
  if v_link.id is null then raise exception 'Connection link not found'; end if;
  if not private.is_church_member(v_link.church_id) then raise exception 'Active church membership required'; end if;

  v_allowed:=(
      v_link.created_by=v_user
      and (
        v_link.source_group_id is null
        or exists(
          select 1 from public.group_memberships gm
          where gm.group_id=v_link.source_group_id and gm.user_id=v_user
        )
        or private.can_operate_group(v_link.source_group_id)
      )
    )
    or (v_link.source_group_id is not null and private.can_operate_group(v_link.source_group_id))
    or private.has_church_role(v_link.church_id,array['pastor','church_admin'])
    or private.has_church_permission(v_link.church_id,'manage_outreach');

  if not v_allowed then raise exception 'You do not have permission to change this connection link'; end if;

  update public.outreach_source_links set active=p_active,updated_at=now() where id=p_link_id;
  return true;
end
$function$;

revoke all on function public.set_outreach_source_link_active(uuid,boolean) from public, anon;
grant execute on function public.set_outreach_source_link_active(uuid,boolean) to authenticated, service_role;

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
         g.name,g.location_label,g.meeting_day,g.meeting_time,l.language_code
  from public.outreach_source_links l
  join public.churches c on c.id=l.church_id
  left join public.groups g on g.id=l.source_group_id and g.church_id=l.church_id and g.active=true
  where l.token=trim(p_token)
    and l.active=true
    and (l.expires_at is null or l.expires_at>now())
    and exists(
      select 1 from public.church_memberships cm
      where cm.church_id=l.church_id and cm.user_id=l.created_by and cm.status='active'
    )
    and (l.source_type<>'friendship_group' or g.id is not null)
  limit 1;
$function$;

revoke all on function public.resolve_outreach_source_link(text) from public;
grant execute on function public.resolve_outreach_source_link(text) to anon,authenticated,service_role;

create or replace function public.submit_outreach_connection(
  p_token text,
  p_request_key uuid,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_language text default 'en',
  p_email_consent boolean default false,
  p_sms_consent boolean default false,
  p_bible_study_interest boolean default false,
  p_first_steps_interest boolean default false,
  p_prayer_request text default null
)
returns table(result text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_link record;
  v_owner uuid;
  v_first_name text:=nullif(trim(coalesce(p_first_name,'')),'');
  v_last_name text:=nullif(trim(coalesce(p_last_name,'')),'');
  v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
  v_email text:=nullif(lower(trim(coalesce(p_email,''))),'');
  v_phone_digits text:=regexp_replace(coalesce(v_phone,''),'[^0-9]','','g');
  v_candidate_ids uuid[];
  v_candidate_count integer:=0;
  v_linked_candidate_count integer:=0;
  v_contact_id uuid;
  v_interaction_id uuid;
  v_existing_result text;
begin
  if p_request_key is null then raise exception 'Connection request is missing'; end if;
  if v_first_name is null then raise exception 'First name is required'; end if;
  if char_length(v_first_name)>120 or char_length(coalesce(v_last_name,''))>120 then raise exception 'Name is too long'; end if;
  if v_email is null and v_phone is null then raise exception 'Phone or email is required'; end if;
  if v_email is not null and (position('@' in v_email)<=1 or char_length(v_email)>320) then raise exception 'Email is not valid'; end if;
  if v_phone is not null and char_length(v_phone_digits)<7 then raise exception 'Phone is not valid'; end if;

  select l.* into v_link
  from public.outreach_source_links l
  where l.token=trim(p_token)
    and l.active=true
    and (l.expires_at is null or l.expires_at>now())
    and exists(
      select 1 from public.church_memberships cm
      where cm.church_id=l.church_id and cm.user_id=l.created_by and cm.status='active'
    )
    and (
      l.source_type<>'friendship_group'
      or exists(select 1 from public.groups g where g.id=l.source_group_id and g.church_id=l.church_id and g.active=true)
    )
  for update;
  if v_link.id is null then raise exception 'Connection link is not available'; end if;

  insert into public.outreach_connection_receipts(request_key,church_id,source_link_id,result)
  values(p_request_key,v_link.church_id,v_link.id,'processing')
  on conflict(request_key) do nothing;

  if not found then
    select r.result into v_existing_result
    from public.outreach_connection_receipts r
    where r.request_key=p_request_key;
    return query select case when v_existing_result='processing' then 'needs_review' else v_existing_result end;
    return;
  end if;

  select array_agg(distinct o.id order by o.id),count(distinct o.id) filter (where o.member_user_id is not null)::integer
    into v_candidate_ids,v_linked_candidate_count
  from public.outreach_contacts o
  where o.church_id=v_link.church_id
    and (
      (v_email is not null and o.email_normalized=v_email)
      or (char_length(v_phone_digits)>=7 and o.phone_normalized=v_phone_digits)
    );

  v_candidate_count:=coalesce(cardinality(v_candidate_ids),0);
  v_linked_candidate_count:=coalesce(v_linked_candidate_count,0);

  -- Multiple candidates are ambiguous. A match to an established member is also
  -- deliberately reviewed: anonymous capture must not silently mutate member history.
  if v_candidate_count>1 or v_linked_candidate_count>0 then
    insert into public.outreach_connection_reviews(
      church_id,source_link_id,source_group_id,request_key,candidate_ids,
      submitted_first_name,submitted_last_name,submitted_phone,submitted_email,
      communication_language,email_consent,sms_consent,bible_study_interest,first_steps_interest,prayer_request
    ) values(
      v_link.church_id,v_link.id,v_link.source_group_id,p_request_key,coalesce(v_candidate_ids,'{}'::uuid[]),
      v_first_name,v_last_name,v_phone,v_email,case when p_language='es' then 'es' else 'en' end,
      coalesce(p_email_consent,false),coalesce(p_sms_consent,false),coalesce(p_bible_study_interest,false),coalesce(p_first_steps_interest,false),
      nullif(trim(coalesce(p_prayer_request,'')),'')
    );
    update public.outreach_connection_receipts set result='needs_review',updated_at=now() where request_key=p_request_key;
    return query select 'needs_review'::text;
    return;
  end if;

  v_owner:=private.outreach_owner_for_source_link(v_link.id);
  if v_owner is null then raise exception 'Church follow-up is not configured'; end if;

  if v_candidate_count=1 then
    v_contact_id:=v_candidate_ids[1];
  else
    begin
      insert into public.outreach_contacts(
        church_id,created_by,assigned_to,first_name,last_name,phone,email,stage,
        source_type,source_label,source_group_id,source_occurred_at,
        bible_study_interest,first_steps_interest,messaging_consent,email_consent,sms_consent,
        email_consent_at,sms_consent_at,communication_language,prayer_request,follow_up_due_at
      ) values(
        v_link.church_id,v_owner,v_owner,v_first_name,v_last_name,v_phone,v_email,
        case when v_link.source_type='member_invite' then 'invited' else 'guest' end,
        v_link.source_type,v_link.source_label,v_link.source_group_id,now(),
        coalesce(p_bible_study_interest,false),coalesce(p_first_steps_interest,false),
        (coalesce(p_email_consent,false) or coalesce(p_sms_consent,false)),
        coalesce(p_email_consent,false),coalesce(p_sms_consent,false),
        case when coalesce(p_email_consent,false) then now() end,
        case when coalesce(p_sms_consent,false) then now() end,
        case when p_language='es' then 'es' else 'en' end,
        nullif(trim(coalesce(p_prayer_request,'')),''),now()+interval '24 hours'
      ) returning id into v_contact_id;
    exception when unique_violation then
      select array_agg(distinct o.id order by o.id),count(distinct o.id) filter (where o.member_user_id is not null)::integer
        into v_candidate_ids,v_linked_candidate_count
      from public.outreach_contacts o
      where o.church_id=v_link.church_id
        and (
          (v_email is not null and o.email_normalized=v_email)
          or (char_length(v_phone_digits)>=7 and o.phone_normalized=v_phone_digits)
        );

      if coalesce(cardinality(v_candidate_ids),0)=1 and coalesce(v_linked_candidate_count,0)=0 then
        v_contact_id:=v_candidate_ids[1];
      else
        insert into public.outreach_connection_reviews(
          church_id,source_link_id,source_group_id,request_key,candidate_ids,
          submitted_first_name,submitted_last_name,submitted_phone,submitted_email,
          communication_language,email_consent,sms_consent,bible_study_interest,first_steps_interest,prayer_request
        ) values(
          v_link.church_id,v_link.id,v_link.source_group_id,p_request_key,coalesce(v_candidate_ids,'{}'::uuid[]),
          v_first_name,v_last_name,v_phone,v_email,case when p_language='es' then 'es' else 'en' end,
          coalesce(p_email_consent,false),coalesce(p_sms_consent,false),coalesce(p_bible_study_interest,false),coalesce(p_first_steps_interest,false),
          nullif(trim(coalesce(p_prayer_request,'')),'')
        ) on conflict(request_key) do nothing;
        update public.outreach_connection_receipts set result='needs_review',updated_at=now() where request_key=p_request_key;
        return query select 'needs_review'::text;
        return;
      end if;
    end;
  end if;

  v_interaction_id:=private.apply_outreach_source_touch(
    v_contact_id,v_link.id,p_request_key,v_email,v_phone,p_language,
    coalesce(p_email_consent,false),coalesce(p_sms_consent,false),
    coalesce(p_bible_study_interest,false),coalesce(p_first_steps_interest,false),p_prayer_request
  );

  update public.outreach_connection_receipts
  set contact_id=v_contact_id,interaction_id=v_interaction_id,result='connected',updated_at=now()
  where request_key=p_request_key;

  return query select 'connected'::text;
end
$function$;

revoke all on function public.submit_outreach_connection(text,uuid,text,text,text,text,text,boolean,boolean,boolean,boolean,text) from public;
grant execute on function public.submit_outreach_connection(text,uuid,text,text,text,text,text,boolean,boolean,boolean,boolean,text) to anon,authenticated,service_role;
