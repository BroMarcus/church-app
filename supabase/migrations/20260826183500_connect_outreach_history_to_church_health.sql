-- Package 1 CONNECTED proof: Church Health reads the same canonical Outreach
-- contacts/interactions. No summary table or second Evangelism datastore is added.
-- Package 6 can later add trends/visuals on these same events.

create or replace function public.church_health_snapshot_base(p_church_id uuid,p_days integer default 30)
returns table(metric_key text,category text,label text,value bigint,denominator bigint,detail text)
language plpgsql
stable
security definer
set search_path to 'public','private'
as $function$
declare
  v_days integer:=greatest(1,least(coalesce(p_days,30),365));
  v_members bigint;v_guests bigint;v_attendees bigint;v_holy bigint;v_baptized bigint;v_first_steps bigint;
  v_bible_studies bigint;v_recent_outreach bigint;v_overdue bigint;v_groups bigint;v_group_reports bigint;
  v_serving bigint;v_timothys bigint;v_new_birth_complete bigint;
  v_first_source_connections bigint:=0;v_return_source_connections bigint:=0;v_attributed_source_touches bigint:=0;
begin
  if not (
    private.has_church_role(p_church_id,array['pastor','church_admin']) or
    private.has_church_permission(p_church_id,'view_leadership') or
    private.has_church_permission(p_church_id,'manage_members')
  ) then raise exception 'Leadership reporting access required'; end if;

  select count(*) into v_members from public.church_memberships where church_id=p_church_id and status='active' and relationship_status='member';
  select count(*) into v_guests from public.church_memberships where church_id=p_church_id and status='active' and relationship_status='guest';
  select count(*) into v_attendees from public.church_memberships where church_id=p_church_id and status='active' and relationship_status='attendee';

  select count(*) into v_holy
  from public.member_milestones mm join public.church_memberships cm on cm.church_id=mm.church_id and cm.user_id=mm.user_id
  where mm.church_id=p_church_id and cm.status='active' and cm.relationship_status='member' and mm.holy_ghost_received=true;

  select count(*) into v_baptized
  from public.member_milestones mm join public.church_memberships cm on cm.church_id=mm.church_id and cm.user_id=mm.user_id
  where mm.church_id=p_church_id and cm.status='active' and cm.relationship_status='member' and mm.baptized=true;

  select count(*) into v_new_birth_complete
  from public.member_milestones mm join public.church_memberships cm on cm.church_id=mm.church_id and cm.user_id=mm.user_id
  where mm.church_id=p_church_id and cm.status='active' and cm.relationship_status='member' and mm.holy_ghost_received=true and mm.baptized=true;

  select count(*) into v_first_steps
  from public.member_milestones mm join public.church_memberships cm on cm.church_id=mm.church_id and cm.user_id=mm.user_id
  where mm.church_id=p_church_id and cm.status='active' and cm.relationship_status='member' and mm.first_steps_status='completed';

  select count(*) into v_timothys
  from public.member_milestones mm join public.church_memberships cm on cm.church_id=mm.church_id and cm.user_id=mm.user_id
  where mm.church_id=p_church_id and cm.status='active' and cm.relationship_status='member' and mm.timothys_status in ('in_progress','completed');

  select count(*) into v_bible_studies from public.outreach_contacts where church_id=p_church_id and stage='bible_study';
  select count(*) into v_recent_outreach from public.outreach_contacts where church_id=p_church_id and created_at>=now()-make_interval(days=>v_days) and stage<>'inactive';
  select count(*) into v_overdue from public.outreach_contacts where church_id=p_church_id and follow_up_due_at<now() and stage not in ('inactive','serving');

  -- Rank across full canonical history first, then apply the reporting window. That
  -- prevents a return touch from being mislabeled as first merely because the
  -- person's original connection happened before the selected window.
  with ranked as (
    select oi.contact_id,oi.occurred_at,oi.source_type,
           row_number() over(partition by oi.contact_id order by oi.occurred_at,oi.id) as touch_number
    from public.outreach_interactions oi
    where oi.church_id=p_church_id
      and oi.source_key is not null
      and oi.source_type is not null
  )
  select
    count(*) filter(where occurred_at>=now()-make_interval(days=>v_days) and touch_number=1),
    count(*) filter(where occurred_at>=now()-make_interval(days=>v_days) and touch_number>1),
    count(*) filter(where occurred_at>=now()-make_interval(days=>v_days))
  into v_first_source_connections,v_return_source_connections,v_attributed_source_touches
  from ranked;

  select count(*) into v_groups from public.groups where church_id=p_church_id and active=true;
  select count(*) into v_group_reports from public.group_reports gr join public.groups g on g.id=gr.group_id where g.church_id=p_church_id and gr.meeting_date>=current_date-v_days;
  select count(distinct ma.user_id) into v_serving from public.ministry_applications ma join public.ministries m on m.id=ma.ministry_id where m.church_id=p_church_id and ma.status='accepted';

  return query select 'formal_members','people','Formal members',v_members,null::bigint,'Active accounts whose church relationship is Member.';
  return query select 'guest_accounts','people','Guests with app access',v_guests,null::bigint,'Active accounts whose church relationship is Guest.';
  return query select 'regular_attendees','people','Regular attendees',v_attendees,null::bigint,'Active accounts whose church relationship is Regular Attendee.';
  return query select 'holy_ghost_verified','new_birth','Holy Ghost verified',v_holy,v_members,'Verified among formal Members.';
  return query select 'baptized_verified','new_birth','Baptized verified',v_baptized,v_members,'Verified among formal Members.';
  return query select 'new_birth_complete','new_birth','Baptism + Holy Ghost verified',v_new_birth_complete,v_members,'Formal Members with both verified milestones.';
  return query select 'first_steps_complete','discipleship','First Steps complete',v_first_steps,v_members,'Formal Members who completed First Steps.';
  return query select 'timothys_pipeline','leadership','Timothys in progress/completed',v_timothys,v_members,'Formal Members currently in or through Timothys.';
  return query select 'active_bible_studies','outreach','Active Bible studies',v_bible_studies,null::bigint,'People currently in the Bible Study stage.';
  return query select 'recent_outreach','outreach','New outreach records',v_recent_outreach,null::bigint,'New non-inactive outreach records in the selected window.';
  return query select 'first_source_connections','outreach','First source connections',v_first_source_connections,null::bigint,'First attributed connection touches in the selected window, derived from canonical Outreach interaction history.';
  return query select 'return_source_connections','outreach','Return source connections',v_return_source_connections,null::bigint,'Later attributed connection touches from people who had already connected before.';
  return query select 'attributed_source_touches','outreach','Attributed source touches',v_attributed_source_touches,null::bigint,'Source-attributed connection events. Channel breakdown comes from outreach_interactions.source_type.';
  return query select 'overdue_followup','outreach','Overdue follow-ups',v_overdue,null::bigint,'Active outreach people whose follow-up time has passed.';
  return query select 'active_groups','groups','Active Friendship/other groups',v_groups,null::bigint,'Active local groups.';
  return query select 'group_reports','groups','Group reports submitted',v_group_reports,null::bigint,'Meeting reports submitted in the selected window.';
  return query select 'people_serving','serving','People approved to serve',v_serving,v_members,'Distinct people with an accepted ministry application.';
end
$function$;
