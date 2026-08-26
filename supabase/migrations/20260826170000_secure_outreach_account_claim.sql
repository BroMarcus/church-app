-- Security hotfix preparation only.
--
-- Risk being fixed:
--   The auth trigger and existing-account public-join RPC could attach a new
--   account to an unclaimed outreach_contact using a phone number supplied by
--   the user. A typed phone number is not sufficient identity proof.
--
-- Hotfix policy:
--   * Never claim pre-existing Outreach history from the auth INSERT trigger.
--   * An already-authenticated public join may reuse an unlinked Outreach row
--     only from one unique same-church VERIFIED account-email match.
--   * Phone is candidate/conflict detection only. It never authorizes a claim.
--   * Ambiguous/conflicting candidates remain unlinked for later review.
--   * New linked Outreach rows are created only when there is no existing
--     unlinked email/phone candidate that should be reviewed first.
--
-- This migration is intentionally narrow. Package 2 will add the complete
-- identity-review/claim workflow.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_invite_id uuid;
  v_invite record;
  v_public_church record;
  v_requested_public_church_id uuid;
  v_signup_limit integer;
  v_registration_count integer;
  v_phone text;
  v_phone_digits text;
  v_church_id uuid;
  v_followup_owner uuid;
  v_unlinked_candidate_exists boolean := false;
  v_email_consent boolean:=coalesce((new.raw_user_meta_data->>'email_consent')::boolean,false);
  v_sms_consent boolean:=coalesce((new.raw_user_meta_data->>'sms_consent')::boolean,false);
  v_language text:=case when new.raw_user_meta_data->>'preferred_language'='es' then 'es' else 'en' end;
begin
  v_phone:=nullif(trim(coalesce(new.raw_user_meta_data->>'phone','')),'');
  v_phone_digits:=regexp_replace(coalesce(v_phone,''),'[^0-9]','','g');

  insert into public.profiles(id,first_name,last_name,display_name)
  values(new.id,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name',coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)))
  on conflict(id) do nothing;

  insert into public.member_private_details(user_id,email,phone)
  values(new.id,new.email,v_phone)
  on conflict(user_id) do update set email=excluded.email,phone=coalesce(public.member_private_details.phone,excluded.phone);

  begin
    v_invite_id:=nullif(new.raw_user_meta_data->>'invite_id','')::uuid;
  exception when invalid_text_representation then
    v_invite_id:=null;
  end;

  if v_invite_id is not null then
    select i.id,i.church_id,i.email,i.role
      into v_invite
    from public.church_invites i
    where i.id=v_invite_id
      and i.email=lower(trim(new.email))
      and i.revoked_at is null
      and i.redeemed_at is null
      and i.expires_at>now()
    for update;

    if v_invite.id is null then raise exception 'Invitation is no longer valid'; end if;
    v_church_id:=v_invite.church_id;

    insert into public.church_memberships(church_id,user_id,role,status,relationship_status)
    values(v_invite.church_id,new.id,v_invite.role,'active','member')
    on conflict(church_id,user_id) do update set role=excluded.role,status='active',relationship_status='member';

    update public.church_invites
    set redeemed_by=new.id,redeemed_at=now()
    where id=v_invite.id;

  elsif coalesce(new.raw_user_meta_data->>'public_signup','false')='true' then
    begin
      v_requested_public_church_id:=nullif(new.raw_user_meta_data->>'public_signup_church_id','')::uuid;
    exception when invalid_text_representation then
      v_requested_public_church_id:=null;
    end;

    if v_requested_public_church_id is not null then
      select c.id,c.public_signup_role
        into v_public_church
      from public.churches c
      where c.id=v_requested_public_church_id
        and c.public_signup_enabled=true
      for update;
    else
      select c.id,c.public_signup_role
        into v_public_church
      from public.churches c
      where c.public_signup_enabled=true
      order by c.created_at asc
      limit 1
      for update;
    end if;

    if v_public_church.id is null then raise exception 'Public signup is not available'; end if;
    v_church_id:=v_public_church.id;

    select coalesce(s.public_signup_limit,0)
      into v_signup_limit
    from public.church_signup_settings s
    where s.church_id=v_public_church.id;
    v_signup_limit:=coalesce(v_signup_limit,0);

    select count(*)::integer
      into v_registration_count
    from public.public_signup_registrations r
    where r.church_id=v_public_church.id;

    if v_signup_limit>0 and v_registration_count>=v_signup_limit then
      raise exception 'Public signup capacity has been reached';
    end if;

    insert into public.church_memberships(church_id,user_id,role,status,relationship_status)
    values(v_public_church.id,new.id,coalesce(v_public_church.public_signup_role,'member'),'active','guest')
    on conflict(church_id,user_id) do update set status='active';

    insert into public.public_signup_registrations(church_id,user_id)
    values(v_public_church.id,new.id)
    on conflict(church_id,user_id) do nothing;
  end if;

  -- SECURITY: auth INSERT occurs before we have a verified signed-in identity.
  -- Never attach a pre-existing Outreach row here by email OR typed phone.
  -- For public signup, create a new linked Outreach row only when there is no
  -- unlinked candidate that should be reviewed after verification.
  if v_church_id is not null
     and coalesce(new.raw_user_meta_data->>'public_signup','false')='true' then

    select exists(
      select 1
      from public.outreach_contacts o
      where o.church_id=v_church_id
        and o.member_user_id is null
        and (
          (new.email is not null and o.email is not null and lower(trim(o.email))=lower(trim(new.email)))
          or (
            length(v_phone_digits)>=7
            and length(regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'))>=7
            and regexp_replace(coalesce(o.phone,''),'[^0-9]','','g')=v_phone_digits
          )
        )
    ) into v_unlinked_candidate_exists;

    if not v_unlinked_candidate_exists then
      select cm.user_id
        into v_followup_owner
      from public.church_memberships cm
      where cm.church_id=v_church_id
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
          v_church_id,v_followup_owner,v_followup_owner,new.id,
          coalesce(nullif(new.raw_user_meta_data->>'first_name',''),'Guest'),
          nullif(new.raw_user_meta_data->>'last_name',''),
          new.email,v_phone,'guest',now()+interval '24 hours',
          'Joined Kingdom Network through the church public join link.',
          (v_email_consent or v_sms_consent),v_email_consent,v_sms_consent,
          case when v_email_consent then now() end,
          case when v_sms_consent then now() end,
          v_language
        );
      end if;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.join_public_church_existing_account(
  p_church_slug text,
  p_phone text default null::text,
  p_email_consent boolean default false,
  p_sms_consent boolean default false,
  p_language text default 'en'::text
)
returns table(church_id uuid, church_name text, already_member boolean)
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare
  v_user uuid:=auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
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
  v_email_match_count integer:=0;
  v_phone_match_count integer:=0;
  v_phone_conflict boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select u.email,u.email_confirmed_at,p.first_name,p.last_name
    into v_email,v_email_confirmed_at,v_first_name,v_last_name
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=v_user;

  if v_email is null or v_email_confirmed_at is null then
    raise exception 'A verified account email is required';
  end if;

  select c.id,c.name
    into v_church
  from public.churches c
  where c.slug=lower(trim(p_church_slug))
    and c.public_signup_enabled=true
  for update;

  if v_church.id is null then
    raise exception 'This church is not accepting public signups right now';
  end if;

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

  -- Existing explicit user link is always the strongest safe match.
  select o.id
    into v_outreach_id
  from public.outreach_contacts o
  where o.church_id=v_church.id
    and o.member_user_id=v_user
  order by o.updated_at desc
  limit 1
  for update;

  if v_outreach_id is null then
    -- Verified email is the only automatic claim signal in this hotfix.
    select count(*)::integer
      into v_email_match_count
    from public.outreach_contacts o
    where o.church_id=v_church.id
      and o.member_user_id is null
      and o.email is not null
      and lower(trim(o.email))=lower(trim(v_email));

    if length(v_phone_digits)>=7 then
      select count(*)::integer
        into v_phone_match_count
      from public.outreach_contacts o
      where o.church_id=v_church.id
        and o.member_user_id is null
        and length(regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'))>=7
        and regexp_replace(coalesce(o.phone,''),'[^0-9]','','g')=v_phone_digits;
    end if;

    if v_email_match_count=1 then
      select o.id
        into v_outreach_id
      from public.outreach_contacts o
      where o.church_id=v_church.id
        and o.member_user_id is null
        and o.email is not null
        and lower(trim(o.email))=lower(trim(v_email))
      for update;

      -- If the typed phone points at a DIFFERENT unlinked record, fail closed.
      if length(v_phone_digits)>=7 then
        select exists(
          select 1
          from public.outreach_contacts o
          where o.church_id=v_church.id
            and o.member_user_id is null
            and o.id<>v_outreach_id
            and length(regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'))>=7
            and regexp_replace(coalesce(o.phone,''),'[^0-9]','','g')=v_phone_digits
        ) into v_phone_conflict;
      end if;

      if v_phone_conflict then
        v_outreach_id:=null;
      end if;
    end if;
  end if;

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
    where cm.church_id=v_church.id
      and cm.user_id=v_user
      and cm.relationship_status='guest';

  elsif v_email_match_count=0 and v_phone_match_count=0 then
    -- No pre-existing unlinked candidate exists. It is safe to create a new
    -- Outreach row already linked to this authenticated account.
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
        'guest',now()+interval '24 hours',
        'Joined Kingdom Network through the church public join link using an existing account.',
        (p_email_consent or p_sms_consent),p_email_consent,p_sms_consent,
        case when p_email_consent then now() end,
        case when p_sms_consent then now() end,
        v_language
      );
    end if;
  end if;

  -- Ambiguous or phone-only candidates intentionally remain unlinked here.
  -- Package 2 will surface them in a church-scoped identity review queue.

  return query select v_church.id,v_church.name,false;
end;
$function$;
