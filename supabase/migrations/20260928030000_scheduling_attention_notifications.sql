-- Scheduling + Ministry Operations: meaningful in-app attention states.
-- Reuses public.notifications; no parallel alert system.

create or replace function private.notify_team_assignment_change()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_role text;
begin
  if tg_op='INSERT' then
    if new.assignment_status='scheduled' and new.assigned_user_id is not null and new.assigned_user_id<>new.created_by then
      v_role=coalesce(nullif(btrim(new.role_label),''),nullif(btrim(new.title),''),'Ministry assignment');
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(new.church_id,new.assigned_user_id,'team_assignment','New ministry assignment',v_role||' was added to your schedule.','/calendar/my','team_assignment_created',new.id)
      on conflict do nothing;
    end if;
    return new;
  end if;

  if old.assigned_user_id is distinct from new.assigned_user_id then
    if old.assignment_status='scheduled' and old.assigned_user_id is not null then
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(old.church_id,old.assigned_user_id,'team_assignment','Schedule assignment changed','You were removed from a ministry assignment.','/calendar/my','team_assignment_reassigned_from',new.id)
      on conflict do nothing;
    end if;
    if new.assignment_status='scheduled' and new.assigned_user_id is not null then
      v_role=coalesce(nullif(btrim(new.role_label),''),nullif(btrim(new.title),''),'Ministry assignment');
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(new.church_id,new.assigned_user_id,'team_assignment','New ministry assignment',v_role||' was added to your schedule.','/calendar/my','team_assignment_reassigned_to',new.id)
      on conflict do nothing;
    end if;
    return new;
  end if;

  if old.assignment_status='scheduled' and new.assignment_status='removed' then
    insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
    values(new.church_id,new.assigned_user_id,'team_assignment','Ministry assignment removed','An assignment was removed from your schedule.','/calendar/my','team_assignment_removed',new.id)
    on conflict do nothing;
    return new;
  end if;

  if new.assignment_status='scheduled' and (
    old.starts_at is distinct from new.starts_at
    or old.call_time is distinct from new.call_time
    or old.role_label is distinct from new.role_label
    or old.title is distinct from new.title
    or old.notes is distinct from new.notes
  ) then
    v_role=coalesce(nullif(btrim(new.role_label),''),nullif(btrim(new.title),''),'Ministry assignment');
    insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
    values(new.church_id,new.assigned_user_id,'team_assignment','Schedule assignment changed',v_role||' has new schedule details.','/calendar/my','team_assignment_changed',new.id)
    on conflict do nothing;
  end if;

  return new;
end $$;

drop trigger if exists team_assignments_attention_notifications on public.team_assignments;
create trigger team_assignments_attention_notifications
after insert or update of assigned_user_id,assignment_status,starts_at,call_time,role_label,title,notes
on public.team_assignments
for each row execute function private.notify_team_assignment_change();

create or replace function private.notify_five_spot_change()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if tg_op='UPDATE' and (
    old.status is distinct from new.status
    or old.leader_feedback is distinct from new.leader_feedback
    or old.mentor_user_id is distinct from new.mentor_user_id
  ) then
    insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
    values(
      new.church_id,
      new.requester_user_id,
      'five_spot',
      '5 Spot update',
      case new.status
        when 'coaching' then 'Leadership moved your 5 Spot into coaching.'
        when 'ready_for_review' then 'Your 5 Spot is ready for leadership review.'
        when 'approved' then 'Your 5 Spot was approved and is ready to be scheduled.'
        when 'scheduled' then 'Your approved 5 Spot was placed on the ministry schedule.'
        when 'completed' then 'Your 5 Spot was marked complete.'
        else 'Leadership updated your 5 Spot request.'
      end,
      '/calendar/five-spot',
      'five_spot_update',
      new.id
    )
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists five_spot_attention_notifications on public.five_spot_requests;
create trigger five_spot_attention_notifications
after update of status,leader_feedback,mentor_user_id
on public.five_spot_requests
for each row execute function private.notify_five_spot_change();

create or replace function private.notify_cleaning_rotation()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_recipient uuid;
  v_group_name text;
begin
  if tg_op='INSERT' or old.group_id is distinct from new.group_id then
    select g.name into v_group_name from public.groups g where g.id=new.group_id;
    for v_recipient in
      select distinct x.user_id from (
        select g.leader_id as user_id from public.groups g where g.id=new.group_id and g.leader_id is not null
        union
        select gm.user_id from public.group_memberships gm where gm.group_id=new.group_id and gm.role in ('leader','assistant')
      ) x
      where x.user_id is not null
    loop
      insert into public.notifications(church_id,user_id,notification_type,title,body,href,source_type,source_id)
      values(new.church_id,v_recipient,'cleaning_assignment','Cleaning rotation assigned',coalesce(v_group_name,'Your Friendship Group')||' has a cleaning date to claim.','/calendar/cleaning','cleaning_rotation',new.id)
      on conflict do nothing;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists cleaning_rotation_attention_notifications on public.cleaning_assignments;
create trigger cleaning_rotation_attention_notifications
after insert or update of group_id
on public.cleaning_assignments
for each row execute function private.notify_cleaning_rotation();

revoke all on function private.notify_team_assignment_change() from public,anon,authenticated;
revoke all on function private.notify_five_spot_change() from public,anon,authenticated;
revoke all on function private.notify_cleaning_rotation() from public,anon,authenticated;
