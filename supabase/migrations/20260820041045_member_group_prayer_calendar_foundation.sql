alter table public.member_milestones
  add column if not exists baptism_officiant_name text,
  add column if not exists baptism_church_name text,
  add column if not exists baptism_pastor_name text,
  add column if not exists show_baptism_details boolean not null default false;

alter table public.profiles add column if not exists show_journey_progress boolean not null default false;
alter table public.church_memberships add column if not exists member_title text;
alter table public.events
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;
alter table public.group_report_attendance
  add column if not exists attendance_status text not null default 'on_time',
  add column if not exists checked_in_at timestamptz;
do $$ begin
  alter table public.group_report_attendance add constraint group_report_attendance_status_check check (attendance_status in ('on_time','late','missing'));
exception when duplicate_object then null; end $$;

create or replace function private.enforce_single_friendship_group_membership()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_type text;
begin
  select group_type into v_type from public.groups where id=new.group_id;
  if v_type='friendship' and exists(
    select 1 from public.group_memberships gm join public.groups g on g.id=gm.group_id
    where gm.user_id=new.user_id and gm.group_id<>new.group_id and g.group_type='friendship' and g.active
  ) then raise exception 'A member can belong to only one active Friendship Group'; end if;
  return new;
end $$;
drop trigger if exists group_memberships_one_friendship_group on public.group_memberships;
create trigger group_memberships_one_friendship_group before insert or update of group_id,user_id on public.group_memberships
for each row execute function private.enforce_single_friendship_group_membership();

create table if not exists public.group_meeting_checkins(
  id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,
  meeting_date date not null,scheduled_start_at timestamptz not null,checked_in_at timestamptz not null default now(),
  attendance_status text not null check(attendance_status in ('on_time','late')),source text not null default 'self' check(source in ('self','leader')),
  recorded_by uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),unique(group_id,user_id,meeting_date)
);
alter table public.group_meeting_checkins enable row level security;

create or replace function private.prepare_group_meeting_checkin()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_group public.groups%rowtype; v_timezone text; v_local_date date; v_local_day text; v_start timestamptz;
begin
  select * into v_group from public.groups where id=new.group_id and active and group_type='friendship';
  if not found or v_group.meeting_time is null or v_group.meeting_day is null then raise exception 'This Friendship Group does not have an active meeting day and time'; end if;
  select timezone into v_timezone from public.churches where id=v_group.church_id;
  v_local_date=(now() at time zone v_timezone)::date; v_local_day=lower(trim(to_char(v_local_date,'FMDay')));
  if new.meeting_date<>v_local_date then raise exception 'Check-in is available only for today''s meeting'; end if;
  if lower(trim(v_group.meeting_day))<>v_local_day then raise exception 'Today is not this Friendship Group''s meeting day'; end if;
  v_start=((new.meeting_date+v_group.meeting_time) at time zone v_timezone);
  if now()<v_start-interval '60 minutes' or now()>v_start+interval '4 hours' then raise exception 'Check-in is available from one hour before until four hours after the scheduled start'; end if;
  new.church_id=v_group.church_id; new.scheduled_start_at=v_start; new.checked_in_at=now();
  new.attendance_status=case when now()<=v_start+interval '10 minutes' then 'on_time' else 'late' end;
  if new.source='self' then new.recorded_by=new.user_id; end if; return new;
end $$;
drop trigger if exists group_meeting_checkins_prepare on public.group_meeting_checkins;
create trigger group_meeting_checkins_prepare before insert on public.group_meeting_checkins for each row execute function private.prepare_group_meeting_checkin();

drop policy if exists group_meeting_checkins_read on public.group_meeting_checkins;
create policy group_meeting_checkins_read on public.group_meeting_checkins for select to authenticated using(
  user_id=auth.uid() or exists(select 1 from public.groups g where g.id=group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']) or private.has_church_role(g.church_id,array['pastor','church_admin'])))
);
drop policy if exists group_meeting_checkins_insert_self on public.group_meeting_checkins;
create policy group_meeting_checkins_insert_self on public.group_meeting_checkins for insert to authenticated with check(
  user_id=auth.uid() and recorded_by=auth.uid() and source='self' and exists(select 1 from public.group_memberships gm where gm.group_id=group_id and gm.user_id=auth.uid())
);
drop policy if exists group_meeting_checkins_insert_leader on public.group_meeting_checkins;
create policy group_meeting_checkins_insert_leader on public.group_meeting_checkins for insert to authenticated with check(
  source='leader' and recorded_by=auth.uid() and exists(select 1 from public.groups g where g.id=group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']) or private.has_church_role(g.church_id,array['pastor','church_admin'])))
);
drop policy if exists group_meeting_checkins_update_leader on public.group_meeting_checkins;
create policy group_meeting_checkins_update_leader on public.group_meeting_checkins for update to authenticated using(
  exists(select 1 from public.groups g where g.id=group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']) or private.has_church_role(g.church_id,array['pastor','church_admin'])))
) with check(
  exists(select 1 from public.groups g where g.id=group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']) or private.has_church_role(g.church_id,array['pastor','church_admin'])))
);

create table if not exists public.prayer_requests(
  id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,group_id uuid references public.groups(id) on delete set null,
  body text not null check(length(btrim(body)) between 1 and 5000),visibility text not null default 'private' check(visibility in ('public','private')),
  share_with_group boolean not null default false,community_post_id uuid references public.community_posts(id) on delete set null,
  status text not null default 'open' check(status in ('open','answered')),answered_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.prayer_requests enable row level security;
drop policy if exists prayer_requests_read on public.prayer_requests;
create policy prayer_requests_read on public.prayer_requests for select to authenticated using(
  user_id=auth.uid() or private.has_church_role(church_id,array['pastor','church_admin']) or (visibility='public' and private.is_church_member(church_id))
  or (group_id is not null and exists(select 1 from public.groups g where g.id=group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader','assistant']))))
  or (share_with_group and group_id is not null and exists(select 1 from public.group_memberships gm where gm.group_id=group_id and gm.user_id=auth.uid()))
);

create or replace function public.submit_prayer_request(p_church_id uuid,p_body text,p_visibility text default 'private',p_share_with_group boolean default false)
returns uuid language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid(); v_group uuid; v_request uuid; v_post uuid; v_recipient uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_visibility not in ('public','private') then raise exception 'Invalid prayer visibility'; end if;
  if length(btrim(coalesce(p_body,'')))<1 or length(btrim(p_body))>5000 then raise exception 'Prayer request must be between 1 and 5000 characters'; end if;
  if not exists(select 1 from public.church_memberships cm where cm.church_id=p_church_id and cm.user_id=v_user and cm.status='active') then raise exception 'Active church membership required'; end if;
  select gm.group_id into v_group from public.group_memberships gm join public.groups g on g.id=gm.group_id
  where gm.user_id=v_user and g.church_id=p_church_id and g.group_type='friendship' and g.active limit 1;
  insert into public.prayer_requests(church_id,user_id,group_id,body,visibility,share_with_group)
  values(p_church_id,v_user,v_group,btrim(p_body),p_visibility,coalesce(p_share_with_group,false) and v_group is not null) returning id into v_request;
  if p_visibility='public' then
    insert into public.community_posts(church_id,author_id,body,post_type,visibility) values(p_church_id,v_user,btrim(p_body),'prayer_request','church') returning id into v_post;
    update public.prayer_requests set community_post_id=v_post where id=v_request;
  end if;
  if v_group is not null then
    for v_recipient in select distinct x.user_id from (
      select g.leader_id as user_id from public.groups g where g.id=v_group and g.leader_id is not null
      union select gm.user_id from public.group_memberships gm where gm.group_id=v_group and gm.role in ('leader','assistant')
    ) x where x.user_id is not null and x.user_id<>v_user loop
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(p_church_id,v_recipient,'group_prayer','Friendship Group prayer request','A member in your Friendship Group submitted a prayer request.','/groups/'||v_group::text||'#prayer-wall','prayer_request',v_request);
    end loop;
  else
    for v_recipient in select distinct x.user_id from (
      select g.leader_id as user_id from public.groups g where g.church_id=p_church_id and g.group_type='friendship' and g.active and g.leader_id is not null
      union select gm.user_id from public.group_memberships gm join public.groups g on g.id=gm.group_id where g.church_id=p_church_id and g.group_type='friendship' and g.active and gm.role in ('leader','assistant')
      union select cm.user_id from public.church_memberships cm where cm.church_id=p_church_id and cm.status='active' and cm.role in ('pastor','church_admin')
    ) x where x.user_id is not null and x.user_id<>v_user loop
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(p_church_id,v_recipient,'member_needs_group','Member needs a Friendship Group','A member without a Friendship Group submitted a prayer request. Reach out and invite them into a group.','/church/group-growth','prayer_request',v_request);
      insert into public.member_tasks(church_id,assigned_to,created_by,title,notes,due_at,status,priority,source_type,source_id)
      values(p_church_id,v_recipient,v_user,'Invite member to a Friendship Group','This member submitted a prayer request and is not currently connected to a Friendship Group.',now()+interval '3 days','open','high','prayer_no_group',v_request);
    end loop;
  end if;
  return v_request;
end $$;

create or replace function public.mark_my_prayer_answered(p_request_id uuid)
returns void language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  update public.prayer_requests set status='answered',answered_at=now(),updated_at=now() where id=p_request_id and user_id=auth.uid();
  if not found then raise exception 'Prayer request not found'; end if;
  update public.community_posts cp set answered_at=now(),updated_at=now() from public.prayer_requests pr
  where pr.id=p_request_id and pr.community_post_id=cp.id and pr.user_id=auth.uid();
end $$;

create or replace function public.update_my_baptism_details(p_church_id uuid,p_baptized boolean,p_baptism_date date default null,p_officiant_name text default null,p_church_name text default null,p_pastor_name text default null,p_visible boolean default false)
returns void language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null or not exists(select 1 from public.church_memberships cm where cm.church_id=p_church_id and cm.user_id=v_user and cm.status='active') then raise exception 'Active church membership required'; end if;
  if not p_baptized and p_baptism_date is not null then raise exception 'A baptism date requires baptism confirmation'; end if;
  insert into public.member_milestones(church_id,user_id,baptized,baptism_date,baptism_date_precision,baptism_officiant_name,baptism_church_name,baptism_pastor_name,show_baptism_details)
  values(p_church_id,v_user,p_baptized,case when p_baptized then p_baptism_date else null end,case when p_baptized and p_baptism_date is not null then 'exact' else 'unknown' end,
    nullif(btrim(coalesce(p_officiant_name,'')),''),nullif(btrim(coalesce(p_church_name,'')),''),nullif(btrim(coalesce(p_pastor_name,'')),''),coalesce(p_visible,false))
  on conflict(church_id,user_id) do update set baptized=excluded.baptized,baptism_date=excluded.baptism_date,baptism_date_precision=excluded.baptism_date_precision,
    baptism_officiant_name=excluded.baptism_officiant_name,baptism_church_name=excluded.baptism_church_name,baptism_pastor_name=excluded.baptism_pastor_name,
    show_baptism_details=excluded.show_baptism_details,updated_at=now();
end $$;

create or replace function public.member_public_baptism(p_church_id uuid,p_user_id uuid)
returns table(baptized boolean,baptism_date date,officiant_name text,church_name text,pastor_name text)
language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if auth.uid() is null or not private.is_church_member(p_church_id) then return; end if;
  return query select mm.baptized,mm.baptism_date,mm.baptism_officiant_name,mm.baptism_church_name,mm.baptism_pastor_name
  from public.member_milestones mm where mm.church_id=p_church_id and mm.user_id=p_user_id and mm.show_baptism_details=true
    and exists(select 1 from public.church_memberships cm where cm.church_id=p_church_id and cm.user_id=p_user_id and cm.status='active');
end $$;

revoke all on function public.submit_prayer_request(uuid,text,text,boolean) from public,anon;
revoke all on function public.mark_my_prayer_answered(uuid) from public,anon;
revoke all on function public.update_my_baptism_details(uuid,boolean,date,text,text,text,boolean) from public,anon;
revoke all on function public.member_public_baptism(uuid,uuid) from public,anon;
grant execute on function public.submit_prayer_request(uuid,text,text,boolean) to authenticated;
grant execute on function public.mark_my_prayer_answered(uuid) to authenticated;
grant execute on function public.update_my_baptism_details(uuid,boolean,date,text,text,text,boolean) to authenticated;
grant execute on function public.member_public_baptism(uuid,uuid) to authenticated;
