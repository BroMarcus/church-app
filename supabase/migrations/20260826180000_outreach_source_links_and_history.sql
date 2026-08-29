-- Package 1 — Evangelism / Guest Stewardship
-- Source-aware public connection links, retry-safe guest capture, attributed visit history,
-- ambiguous-match review, and scoped Outreach access.

alter table public.outreach_contacts
  add column if not exists first_steps_interest boolean not null default false;

alter table public.outreach_contacts
  drop constraint if exists outreach_contacts_source_type_check;

alter table public.outreach_contacts
  add constraint outreach_contacts_source_type_check
  check (source_type = any (array[
    'church_service'::text,
    'friendship_group'::text,
    'outreach'::text,
    'event'::text,
    'leader_entry'::text,
    'website'::text,
    'other'::text,
    'member_invite'::text,
    'front_door'::text,
    'campaign'::text
  ]));

alter table public.outreach_interactions
  add column if not exists source_type text,
  add column if not exists source_label text,
  add column if not exists source_group_id uuid,
  add column if not exists source_event_id uuid,
  add column if not exists referrer_user_id uuid,
  add column if not exists visit_ordinal smallint,
  add column if not exists source_key text;

alter table public.outreach_interactions
  drop constraint if exists outreach_interactions_source_type_check,
  add constraint outreach_interactions_source_type_check
    check (source_type is null or source_type = any (array[
      'church_service'::text,
      'friendship_group'::text,
      'outreach'::text,
      'event'::text,
      'leader_entry'::text,
      'website'::text,
      'other'::text,
      'member_invite'::text,
      'front_door'::text,
      'campaign'::text
    ])),
  drop constraint if exists outreach_interactions_visit_ordinal_check,
  add constraint outreach_interactions_visit_ordinal_check
    check (visit_ordinal is null or visit_ordinal between 1 and 3),
  drop constraint if exists outreach_interactions_source_group_id_fkey,
  add constraint outreach_interactions_source_group_id_fkey
    foreign key (source_group_id) references public.groups(id) on delete set null,
  drop constraint if exists outreach_interactions_source_event_id_fkey,
  add constraint outreach_interactions_source_event_id_fkey
    foreign key (source_event_id) references public.events(id) on delete set null,
  drop constraint if exists outreach_interactions_referrer_user_id_fkey,
  add constraint outreach_interactions_referrer_user_id_fkey
    foreign key (referrer_user_id) references auth.users(id) on delete set null;

create unique index if not exists outreach_interactions_source_key_unique_idx
  on public.outreach_interactions(church_id, source_key)
  where source_key is not null;
create index if not exists outreach_interactions_source_group_idx
  on public.outreach_interactions(source_group_id, occurred_at desc)
  where source_group_id is not null;
create index if not exists outreach_interactions_source_event_idx
  on public.outreach_interactions(source_event_id, occurred_at desc)
  where source_event_id is not null;

create table if not exists public.outreach_source_links (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  token text not null unique,
  source_type text not null check (source_type = any (array[
    'church_service'::text,
    'friendship_group'::text,
    'outreach'::text,
    'event'::text,
    'member_invite'::text,
    'front_door'::text,
    'campaign'::text
  ])),
  source_label text,
  source_group_id uuid references public.groups(id) on delete cascade,
  source_event_id uuid references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  language_code text not null default 'en' check (language_code in ('en','es')),
  active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_type='friendship_group' or source_group_id is null),
  check (source_type in ('event','campaign') or source_event_id is null)
);

create index if not exists outreach_source_links_church_idx
  on public.outreach_source_links(church_id, active, created_at desc);
create index if not exists outreach_source_links_creator_idx
  on public.outreach_source_links(created_by, active, created_at desc);
create index if not exists outreach_source_links_group_idx
  on public.outreach_source_links(source_group_id, active)
  where source_group_id is not null;

alter table public.outreach_source_links enable row level security;

drop policy if exists outreach_source_links_read on public.outreach_source_links;
create policy outreach_source_links_read on public.outreach_source_links
for select to authenticated
using (
  created_by = auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

revoke insert, update, delete on public.outreach_source_links from anon, authenticated;
grant select on public.outreach_source_links to authenticated;

create table if not exists public.outreach_connection_receipts (
  request_key uuid primary key,
  church_id uuid not null references public.churches(id) on delete cascade,
  source_link_id uuid not null references public.outreach_source_links(id) on delete cascade,
  contact_id uuid references public.outreach_contacts(id) on delete set null,
  interaction_id uuid references public.outreach_interactions(id) on delete set null,
  result text not null check (result in ('processing','connected','needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outreach_connection_receipts enable row level security;
revoke all on public.outreach_connection_receipts from anon, authenticated;

create table if not exists public.outreach_connection_reviews (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  source_link_id uuid not null references public.outreach_source_links(id) on delete cascade,
  source_group_id uuid references public.groups(id) on delete set null,
  request_key uuid not null unique,
  candidate_ids uuid[] not null default '{}',
  submitted_first_name text not null,
  submitted_last_name text,
  submitted_phone text,
  submitted_email text,
  communication_language text not null default 'en' check (communication_language in ('en','es')),
  email_consent boolean not null default false,
  sms_consent boolean not null default false,
  bible_study_interest boolean not null default false,
  first_steps_interest boolean not null default false,
  prayer_request text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  resolved_contact_id uuid references public.outreach_contacts(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_connection_reviews_church_status_idx
  on public.outreach_connection_reviews(church_id,status,created_at desc);
create index if not exists outreach_connection_reviews_group_status_idx
  on public.outreach_connection_reviews(source_group_id,status,created_at desc)
  where source_group_id is not null;

alter table public.outreach_connection_reviews enable row level security;

drop policy if exists outreach_connection_reviews_read on public.outreach_connection_reviews;
create policy outreach_connection_reviews_read on public.outreach_connection_reviews
for select to authenticated
using (
  (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

revoke insert, update, delete on public.outreach_connection_reviews from anon, authenticated;
grant select on public.outreach_connection_reviews to authenticated;

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
        when follow_up_due_at is null then v_now+interval '24 hours'
        else least(follow_up_due_at,v_now+interval '24 hours')
      end,
      last_contacted_at=case when v_interaction_type in ('visit','service_attendance') then greatest(coalesce(last_contacted_at,v_now),v_now) else last_contacted_at end,
      updated_at=v_now
  where id=v_contact.id;

  update public.outreach_source_links
  set last_used_at=v_now,use_count=use_count+1,updated_at=v_now
  where id=v_link.id;

  return v_interaction_id;
end
$function$;

revoke all on function private.apply_outreach_source_touch(uuid,uuid,uuid,text,text,text,boolean,boolean,boolean,boolean,text) from public, anon, authenticated;

create or replace function public.create_outreach_source_link(
  p_church_id uuid,
  p_source_type text default 'member_invite',
  p_source_group_id uuid default null,
  p_source_event_id uuid default null,
  p_source_label text default null,
  p_language_code text default 'en'
)
returns table(id uuid,token text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_role text;
  v_existing record;
  v_token text;
  v_allowed boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_source_type not in ('church_service','friendship_group','outreach','event','member_invite','front_door','campaign') then
    raise exception 'Invalid connection source';
  end if;

  select cm.role into v_role
  from public.church_memberships cm
  where cm.church_id=p_church_id and cm.user_id=v_user and cm.status='active';
  if v_role is null then raise exception 'Active church membership required'; end if;

  if p_source_type='member_invite' then
    v_allowed:=true;
  elsif p_source_type='friendship_group' then
    if p_source_group_id is null then raise exception 'Friendship Group is required'; end if;
    v_allowed:=exists(
      select 1 from public.groups g
      where g.id=p_source_group_id and g.church_id=p_church_id and g.active=true
        and (
          exists(select 1 from public.group_memberships gm where gm.group_id=g.id and gm.user_id=v_user)
          or private.can_operate_group(g.id)
        )
    );
  else
    v_allowed:=v_role in ('pastor','church_admin') or private.has_church_permission(p_church_id,'manage_outreach');
  end if;

  if not v_allowed then raise exception 'You do not have permission to create this connection link'; end if;

  if p_source_group_id is not null and not exists(
    select 1 from public.groups g where g.id=p_source_group_id and g.church_id=p_church_id and g.active=true
  ) then raise exception 'Friendship Group is not available'; end if;

  if p_source_event_id is not null and not exists(
    select 1 from public.events e where e.id=p_source_event_id and e.church_id=p_church_id
  ) then raise exception 'Event is not available'; end if;

  select l.id,l.token into v_existing
  from public.outreach_source_links l
  where l.church_id=p_church_id
    and l.created_by=v_user
    and l.source_type=p_source_type
    and l.source_group_id is not distinct from p_source_group_id
    and l.source_event_id is not distinct from p_source_event_id
    and coalesce(l.source_label,'')=coalesce(nullif(trim(coalesce(p_source_label,'')),''),'')
    and l.active=true
    and (l.expires_at is null or l.expires_at>now())
  order by l.created_at desc
  limit 1;

  if v_existing.id is not null then
    return query select v_existing.id,v_existing.token;
    return;
  end if;

  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');

  insert into public.outreach_source_links(
    church_id,token,source_type,source_label,source_group_id,source_event_id,created_by,language_code
  ) values(
    p_church_id,v_token,p_source_type,nullif(trim(coalesce(p_source_label,'')),''),p_source_group_id,p_source_event_id,v_user,
    case when p_language_code='es' then 'es' else 'en' end
  ) returning outreach_source_links.id,outreach_source_links.token into id,token;

  return next;
end
$function$;

revoke all on function public.create_outreach_source_link(uuid,text,uuid,uuid,text,text) from public, anon;
grant execute on function public.create_outreach_source_link(uuid,text,uuid,uuid,text,text) to authenticated, service_role;

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

  v_allowed:=v_link.created_by=v_user
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

  select * into v_link
  from public.outreach_source_links l
  where l.token=trim(p_token)
    and l.active=true
    and (l.expires_at is null or l.expires_at>now())
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

  select array_agg(distinct o.id order by o.id)
    into v_candidate_ids
  from public.outreach_contacts o
  where o.church_id=v_link.church_id
    and (
      (v_email is not null and o.email_normalized=v_email)
      or (char_length(v_phone_digits)>=7 and o.phone_normalized=v_phone_digits)
    );

  v_candidate_count:=coalesce(cardinality(v_candidate_ids),0);

  if v_candidate_count>1 then
    insert into public.outreach_connection_reviews(
      church_id,source_link_id,source_group_id,request_key,candidate_ids,
      submitted_first_name,submitted_last_name,submitted_phone,submitted_email,
      communication_language,email_consent,sms_consent,bible_study_interest,first_steps_interest,prayer_request
    ) values(
      v_link.church_id,v_link.id,v_link.source_group_id,p_request_key,v_candidate_ids,
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
      select array_agg(distinct o.id order by o.id)
        into v_candidate_ids
      from public.outreach_contacts o
      where o.church_id=v_link.church_id
        and (
          (v_email is not null and o.email_normalized=v_email)
          or (char_length(v_phone_digits)>=7 and o.phone_normalized=v_phone_digits)
        );
      if coalesce(cardinality(v_candidate_ids),0)=1 then
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

  v_allowed:=(v_review.source_group_id is not null and private.can_operate_group(v_review.source_group_id))
    or private.has_church_role(v_review.church_id,array['pastor','church_admin'])
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

  update public.outreach_connection_reviews
  set status='resolved',resolved_contact_id=p_contact_id,resolved_by=v_user,resolved_at=now(),updated_at=now()
  where id=v_review.id;

  update public.outreach_connection_receipts
  set contact_id=p_contact_id,interaction_id=v_interaction_id,result='connected',updated_at=now()
  where request_key=v_review.request_key;

  return true;
end
$function$;

revoke all on function public.resolve_outreach_connection_review(uuid,uuid,boolean) from public, anon;
grant execute on function public.resolve_outreach_connection_review(uuid,uuid,boolean) to authenticated,service_role;

-- Scope Outreach to the person responsible for the contact, the group operating it,
-- or explicit church-wide Outreach authority. Do not grant church-wide access merely
-- because someone has a legacy minister/group/ministry title.
drop policy if exists outreach_read on public.outreach_contacts;
create policy outreach_read on public.outreach_contacts
for select to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

drop policy if exists outreach_update on public.outreach_contacts;
create policy outreach_update on public.outreach_contacts
for update to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
)
with check (private.is_church_member(church_id));

drop policy if exists outreach_insert on public.outreach_contacts;
create policy outreach_insert on public.outreach_contacts
for insert to authenticated
with check (
  created_by=auth.uid()
  and private.is_church_member(church_id)
  and (member_user_id is null or member_user_id=auth.uid())
  and (
    source_group_id is null
    or private.can_operate_group(source_group_id)
    or exists(select 1 from public.group_memberships gm where gm.group_id=source_group_id and gm.user_id=auth.uid())
  )
);

drop policy if exists outreach_interactions_read on public.outreach_interactions;
create policy outreach_interactions_read on public.outreach_interactions
for select to authenticated
using (
  exists(
    select 1 from public.outreach_contacts o
    where o.id=outreach_interactions.contact_id
      and o.church_id=outreach_interactions.church_id
      and (
        o.assigned_to=auth.uid()
        or o.created_by=auth.uid()
        or (o.source_group_id is not null and private.can_operate_group(o.source_group_id))
        or private.has_church_role(o.church_id,array['pastor','church_admin'])
        or private.has_church_permission(o.church_id,'manage_outreach')
      )
  )
);

drop policy if exists outreach_interactions_insert on public.outreach_interactions;
create policy outreach_interactions_insert on public.outreach_interactions
for insert to authenticated
with check (
  recorded_by=auth.uid()
  and exists(
    select 1 from public.outreach_contacts o
    where o.id=outreach_interactions.contact_id
      and o.church_id=outreach_interactions.church_id
      and (
        o.assigned_to=auth.uid()
        or o.created_by=auth.uid()
        or (o.source_group_id is not null and private.can_operate_group(o.source_group_id))
        or private.has_church_role(o.church_id,array['pastor','church_admin'])
        or private.has_church_permission(o.church_id,'manage_outreach')
      )
  )
);
