create or replace function public.join_public_church_existing_account(
  p_church_slug text,
  p_phone text default null,
  p_email_consent boolean default false,
  p_sms_consent boolean default false,
  p_language text default 'en'
)
returns table(church_id uuid, church_name text, already_member boolean)
language plpgsql
security definer
set search_path='public','private','auth','pg_temp'
as $$
declare
  v_user uuid:=auth.uid();
  v_email text;
  v_first_name text;
  v_last_name text;
  v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
  v_phone_digits text:=regexp_replace(coalesce(v_phone,''),'[^0-9]','','g');
  v_language text:=case when p_language='es' then 'es' else 'en' end;
  v_church record;
  v_existing record;
  v_signup_limit integer:=0;
  v_registration_count integer:=0;
  v_outreach_id uuid;
  v_followup_owner uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select u.email,p.first_name,p.last_name
    into v_email,v_first_name,v_last_name
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=v_user;

  if v_email is null then raise exception 'A verified account email is required'; end if;

  select c.id,c.name
    into v_church
  from public.churches c
  where c.slug=lower(trim(p_church_slug))
    and c.public_signup_enabled=true
  for update;

  if v_church.id is null then raise exception 'This church is not accepting public signups right now'; end if;

  select cm.status,cm.role
    into v_existing
  from public.church_memberships cm
  where cm.church_id=v_church.id and cm.user_id=v_user;

  if v_existing.status='active' then
    return query select v_church.id,v_church.name,true;
    return;
  elsif v_existing.status is not null then
    raise exception 'Your previous church access is not active. Ask a church administrator to restore it.';
  end if;

  select coalesce(s.public_signup_limit,0)
    into v_signup_limit
  from public.church_signup_settings s
  where s.church_id=v_church.id;
  v_signup_limit:=coalesce(v_signup_limit,0);

  select count(*)::integer
    into v_registration_count
  from public.public_signup_registrations r
  where r.church_id=v_church.id;

  if v_signup_limit>0 and v_registration_count>=v_signup_limit then
    raise exception 'Public signup capacity has been reached';
  end if;

  insert into public.church_memberships(
    church_id,user_id,role,status,relationship_status,relationship_source
  ) values(
    v_church.id,v_user,'member','active','guest','public_join'
  );

  insert into public.public_signup_registrations(church_id,user_id)
  values(v_church.id,v_user)
  on conflict(church_id,user_id) do nothing;

  if v_phone is not null then
    update public.member_private_details
    set phone=coalesce(nullif(trim(phone),''),v_phone)
    where user_id=v_user;
  end if;

  select o.id
    into v_outreach_id
  from public.outreach_contacts o
  where o.church_id=v_church.id
    and o.member_user_id is null
    and (
      (o.email is not null and lower(trim(o.email))=lower(trim(v_email)))
      or (
        length(v_phone_digits)>=7
        and length(regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'))>=7
        and regexp_replace(coalesce(o.phone,''),'[^0-9]','','g')=v_phone_digits
      )
    )
  order by case when o.email is not null and lower(trim(o.email))=lower(trim(v_email)) then 0 else 1 end,o.updated_at desc
  limit 1
  for update;

  if v_outreach_id is not null then
    update public.outreach_contacts
    set member_user_id=v_user,
        email=coalesce(email,v_email),
        phone=coalesce(phone,v_phone),
        email_consent=(email_consent or p_email_consent),
        sms_consent=(sms_consent or p_sms_consent),
        email_consent_at=case when email_consent or not p_email_consent then email_consent_at else now() end,
        sms_consent_at=case when sms_consent or not p_sms_consent then sms_consent_at else now() end,
        messaging_consent=(email_consent or p_email_consent or sms_consent or p_sms_consent),
        communication_language=v_language,
        updated_at=now()
    where id=v_outreach_id;

    update public.church_memberships cm
    set relationship_status=case
      when exists(
        select 1 from public.outreach_contacts o
        where o.id=v_outreach_id and (o.stage='regular_attendee' or o.service_count>=2)
      ) then 'attendee'
      else cm.relationship_status
    end
    where cm.church_id=v_church.id and cm.user_id=v_user and cm.relationship_status='guest';
  else
    select cm.user_id
      into v_followup_owner
    from public.church_memberships cm
    where cm.church_id=v_church.id
      and cm.status='active'
      and cm.role in ('pastor','church_admin')
    order by case when cm.role='pastor' then 0 else 1 end,cm.created_at
    limit 1;

    if v_followup_owner is not null then
      insert into public.outreach_contacts(
        church_id,created_by,assigned_to,member_user_id,first_name,last_name,email,phone,
        stage,follow_up_due_at,notes,messaging_consent,email_consent,sms_consent,
        email_consent_at,sms_consent_at,communication_language
      ) values(
        v_church.id,v_followup_owner,v_followup_owner,v_user,
        coalesce(nullif(trim(v_first_name),''),'Guest'),nullif(trim(v_last_name),''),v_email,v_phone,
        'guest',now()+interval '24 hours','Joined Kingdom Network through the church public join link using an existing account.',
        (p_email_consent or p_sms_consent),p_email_consent,p_sms_consent,
        case when p_email_consent then now() end,case when p_sms_consent then now() end,v_language
      );
    end if;
  end if;

  return query select v_church.id,v_church.name,false;
end;
$$;

revoke all on function public.join_public_church_existing_account(text,text,boolean,boolean,text) from public;
revoke all on function public.join_public_church_existing_account(text,text,boolean,boolean,text) from anon;
grant execute on function public.join_public_church_existing_account(text,text,boolean,boolean,text) to authenticated;
