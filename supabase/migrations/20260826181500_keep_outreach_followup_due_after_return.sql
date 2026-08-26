-- A new visit/source touch should never make an already-overdue follow-up appear
-- satisfied without leaving a new next-action window. Keep any nearer future due
-- date, but replace a null/past due date with the normal 24-hour follow-up target.

create or replace function private.apply_outreach_source_touch(
  p_contact_id uuid,
  p_link_id uuid,
  p_request_key uuid,
  p_email text,
  p_phone text,
  p_language text,
  p_email_consent boolean,
  p_sms_consent boolean,
  p_bible_study_interest boolean,
  p_first_steps_interest boolean,
  p_prayer_request text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_contact record;
  v_link record;
  v_owner uuid;
  v_interaction_id uuid;
  v_interaction_type text;
  v_next_stage text;
  v_next_service_count integer;
  v_source_key text:='connect:'||p_request_key::text;
  v_now timestamptz:=now();
begin
  select * into v_contact
  from public.outreach_contacts
  where id=p_contact_id
  for update;
  if v_contact.id is null then raise exception 'Outreach contact not found'; end if;

  select * into v_link
  from public.outreach_source_links
  where id=p_link_id and church_id=v_contact.church_id;
  if v_link.id is null then raise exception 'Connection source not found'; end if;

  select i.id into v_interaction_id
  from public.outreach_interactions i
  where i.church_id=v_contact.church_id and i.source_key=v_source_key;
  if v_interaction_id is not null then return v_interaction_id; end if;

  v_owner:=private.outreach_owner_for_source_link(v_link.id);
  if v_owner is null then raise exception 'Church follow-up is not configured'; end if;

  v_interaction_type:=case
    when v_link.source_type='church_service' then 'service_attendance'
    when v_link.source_type='member_invite' then 'invitation'
    else 'visit'
  end;

  v_next_service_count:=coalesce(v_contact.service_count,0)+case when v_link.source_type='church_service' then 1 else 0 end;
  v_next_stage:=v_contact.stage;

  if v_link.source_type='member_invite' and v_contact.stage='new_contact' then
    v_next_stage:='invited';
  elsif v_link.source_type='church_service' and v_contact.stage in ('new_contact','invited','guest','regular_attendee') then
    v_next_stage:=case when v_next_service_count>=2 then 'regular_attendee' else 'guest' end;
  elsif v_link.source_type in ('friendship_group','outreach','event','front_door','campaign')
        and v_contact.stage in ('new_contact','invited') then
    v_next_stage:='guest';
  end if;

  insert into public.outreach_interactions(
    contact_id,church_id,recorded_by,interaction_type,summary,
    source_type,source_label,source_group_id,source_event_id,referrer_user_id,source_key
  ) values(
    v_contact.id,v_contact.church_id,v_owner,v_interaction_type,
    'Connected through '||coalesce(nullif(v_link.source_label,''),replace(v_link.source_type,'_',' '))||'.',
    v_link.source_type,v_link.source_label,v_link.source_group_id,v_link.source_event_id,v_link.created_by,v_source_key
  ) returning id into v_interaction_id;

  update public.outreach_contacts
  set assigned_to=coalesce(assigned_to,v_owner),
      email=coalesce(email,nullif(trim(coalesce(p_email,'')),'')),
      phone=coalesce(phone,nullif(trim(coalesce(p_phone,'')),'')),
      stage=v_next_stage,
      service_count=v_next_service_count,
      bible_study_interest=(bible_study_interest or coalesce(p_bible_study_interest,false)),
      first_steps_interest=(first_steps_interest or coalesce(p_first_steps_interest,false)),
      messaging_consent=(messaging_consent or coalesce(p_email_consent,false) or coalesce(p_sms_consent,false)),
      email_consent=(email_consent or coalesce(p_email_consent,false)),
      sms_consent=(sms_consent or coalesce(p_sms_consent,false)),
      email_consent_at=case when email_consent or not coalesce(p_email_consent,false) then email_consent_at else v_now end,
      sms_consent_at=case when sms_consent or not coalesce(p_sms_consent,false) then sms_consent_at else v_now end,
      communication_language=case when p_language='es' then 'es' else 'en' end,
      prayer_request=coalesce(prayer_request,nullif(trim(coalesce(p_prayer_request,'')),'')),
      follow_up_due_at=case
        when follow_up_due_at is null or follow_up_due_at<=v_now then v_now+interval '24 hours'
        else least(follow_up_due_at,v_now+interval '24 hours')
      end,
      last_contacted_at=case
        when v_interaction_type in ('visit','service_attendance') then greatest(coalesce(last_contacted_at,v_now),v_now)
        else last_contacted_at
      end,
      updated_at=v_now
  where id=v_contact.id;

  update public.outreach_source_links
  set last_used_at=v_now,use_count=use_count+1,updated_at=v_now
  where id=v_link.id;

  return v_interaction_id;
end
$function$;

revoke all on function private.apply_outreach_source_touch(uuid,uuid,uuid,text,text,text,boolean,boolean,boolean,boolean,text) from public, anon, authenticated;
