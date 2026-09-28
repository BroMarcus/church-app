-- Verified learner engagement for linked course resources.
-- Learners cannot self-mark resource-backed lessons complete; the server does it after required active time.

create table if not exists public.course_resource_engagement (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null,
  resource_index integer not null check(resource_index>=0),
  active_seconds integer not null default 0 check(active_seconds>=0),
  required_seconds integer not null default 0 check(required_seconds>=0),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  primary key(user_id,module_id,resource_index),
  constraint course_resource_engagement_module_course_fkey
    foreign key(module_id,course_id) references public.course_modules(id,course_id) on delete cascade
);

alter table public.course_resource_engagement enable row level security;

drop policy if exists course_resource_engagement_read_own on public.course_resource_engagement;
create policy course_resource_engagement_read_own
on public.course_resource_engagement
for select to authenticated
using(user_id=auth.uid());

revoke insert,update,delete on public.course_resource_engagement from anon,authenticated;
grant select on public.course_resource_engagement to authenticated;

create or replace function public.record_course_resource_engagement(
  p_course_id uuid,
  p_module_id uuid,
  p_resource_index integer,
  p_active_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_course public.courses%rowtype;
  v_module public.course_modules%rowtype;
  v_resource jsonb;
  v_resources jsonb;
  v_required integer;
  v_delta integer;
  v_active integer;
  v_complete boolean;
  v_module_complete boolean:=false;
  v_missing integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_resource_index<0 then raise exception 'Resource not found'; end if;

  select * into v_course
  from public.courses
  where id=p_course_id and published=true;
  if v_course.id is null then raise exception 'Course not available'; end if;
  if v_course.church_id is not null and not private.is_church_member(v_course.church_id) then
    raise exception 'Course not available';
  end if;
  if not exists(select 1 from public.course_enrollments where course_id=p_course_id and user_id=v_user) then
    raise exception 'Start the course before recording progress';
  end if;

  select * into v_module
  from public.course_modules
  where id=p_module_id and course_id=p_course_id;
  if v_module.id is null then raise exception 'Lesson not found'; end if;

  v_resources:=case when jsonb_typeof(v_module.content->'resources')='array' then v_module.content->'resources' else '[]'::jsonb end;
  if p_resource_index>=jsonb_array_length(v_resources) then raise exception 'Resource not found'; end if;
  v_resource:=v_resources->p_resource_index;
  if coalesce(v_resource->>'audience','both')='teacher' then raise exception 'Resource not available'; end if;
  if nullif(trim(coalesce(v_resource->>'source_url','')),'') is null
     and nullif(trim(coalesce(v_module.source_url,'')),'') is null then
    raise exception 'Learner-safe resource link is not connected';
  end if;

  v_required:=case
    when coalesce(v_resource->>'engagement_seconds','')~'^\d+$' and (v_resource->>'engagement_seconds')::integer>0
      then least(3600,(v_resource->>'engagement_seconds')::integer)
    when coalesce(v_resource->>'page_count','')~'^\d+$' and (v_resource->>'page_count')::integer>0
      then least(1800,(v_resource->>'page_count')::integer*30)
    else 30
  end;
  v_delta:=greatest(0,least(15,coalesce(p_active_seconds,0)));

  insert into public.course_resource_engagement(user_id,course_id,module_id,resource_index,active_seconds,required_seconds,completed_at,last_activity_at)
  values(v_user,p_course_id,p_module_id,p_resource_index,v_delta,v_required,case when v_delta>=v_required then now() else null end,now())
  on conflict(user_id,module_id,resource_index) do update set
    active_seconds=least(greatest(public.course_resource_engagement.required_seconds,v_required)+15,public.course_resource_engagement.active_seconds+v_delta),
    required_seconds=v_required,
    completed_at=case
      when public.course_resource_engagement.active_seconds+v_delta>=v_required then coalesce(public.course_resource_engagement.completed_at,now())
      else null
    end,
    last_activity_at=now()
  returning active_seconds,completed_at is not null into v_active,v_complete;

  -- A lesson with a required published test is completed by passing that test.
  -- A resource-backed lesson with no required test is completed automatically
  -- only after every learner-visible resource is verified complete.
  if not exists(
    select 1 from public.course_assessments
    where course_id=p_course_id and module_id=p_module_id and required=true and published=true
  ) then
    select count(*) into v_missing
    from jsonb_array_elements(v_resources) with ordinality r(resource,ord)
    where coalesce(resource->>'audience','both')<>'teacher'
      and not exists(
        select 1 from public.course_resource_engagement e
        where e.user_id=v_user
          and e.course_id=p_course_id
          and e.module_id=p_module_id
          and e.resource_index=(ord-1)::integer
          and e.completed_at is not null
      );

    if v_missing=0 and exists(
      select 1 from jsonb_array_elements(v_resources) r(resource)
      where coalesce(resource->>'audience','both')<>'teacher'
    ) then
      insert into public.course_module_progress(user_id,course_id,module_id,completed,completed_at,updated_at)
      values(v_user,p_course_id,p_module_id,true,now(),now())
      on conflict(user_id,module_id) do update set completed=true,completed_at=coalesce(public.course_module_progress.completed_at,now()),updated_at=now();
      v_module_complete:=true;
      perform * from public.refresh_my_course_completion(p_course_id);
    end if;
  end if;

  return jsonb_build_object(
    'active_seconds',v_active,
    'required_seconds',v_required,
    'completed',v_complete,
    'module_complete',v_module_complete
  );
end;
$$;

revoke all on function public.record_course_resource_engagement(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.record_course_resource_engagement(uuid,uuid,integer,integer) to authenticated;
