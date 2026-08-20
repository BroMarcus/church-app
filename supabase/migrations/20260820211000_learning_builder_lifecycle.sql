alter table public.courses
  add column if not exists archived_at timestamptz;

create index if not exists courses_church_archived_idx
  on public.courses(church_id, archived_at, published);

create or replace function private.assert_can_manage_learning_course(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_church_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.church_id into v_church_id
  from public.courses c
  where c.id = p_course_id;

  if v_church_id is null then
    raise exception 'Course not found';
  end if;

  if not (
    private.has_church_role(v_church_id, array['minister','pastor','church_admin'])
    or private.has_church_permission(v_church_id, 'manage_learning')
  ) then
    raise exception 'Not authorized';
  end if;

  return v_church_id;
end;
$$;

revoke all on function private.assert_can_manage_learning_course(uuid) from public, anon, authenticated;

create or replace function public.course_builder_history_status(p_course_id uuid)
returns table(
  has_enrollments boolean,
  has_module_progress boolean,
  has_assessment_attempts boolean
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_can_manage_learning_course(p_course_id);
  return query
  select
    exists(select 1 from public.course_enrollments e where e.course_id=p_course_id),
    exists(select 1 from public.course_module_progress mp where mp.course_id=p_course_id),
    exists(
      select 1
      from public.assessment_attempts aa
      join public.course_assessments a on a.id=aa.assessment_id
      where a.course_id=p_course_id
    );
end;
$$;

revoke all on function public.course_builder_history_status(uuid) from public, anon;
grant execute on function public.course_builder_history_status(uuid) to authenticated;

create or replace function public.update_course_module_builder(
  p_module_id uuid,
  p_title text,
  p_summary text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid;
begin
  select m.course_id into v_course_id from public.course_modules m where m.id=p_module_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.course_module_progress mp where mp.module_id=p_module_id)
     or exists(
       select 1 from public.assessment_attempts aa
       join public.course_assessments a on a.id=aa.assessment_id
       where a.module_id=p_module_id
     ) then
    raise exception 'This lesson already has learner history. Create a new course version instead of rewriting it.';
  end if;

  if coalesce(trim(p_title),'')='' then raise exception 'Lesson title is required'; end if;

  update public.course_modules
  set title=left(trim(p_title),140),
      content=coalesce(content,'{}'::jsonb) || jsonb_build_object(
        'summary',coalesce(p_summary,''),
        'body',coalesce(p_body,'')
      )
  where id=p_module_id;
end;
$$;

revoke all on function public.update_course_module_builder(uuid,text,text,text) from public, anon;
grant execute on function public.update_course_module_builder(uuid,text,text,text) to authenticated;

create or replace function public.move_course_module_builder(p_module_id uuid,p_direction integer)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid;
  v_position integer;
  v_neighbor_id uuid;
  v_neighbor_position integer;
begin
  if p_direction not in (-1,1) then raise exception 'Direction must be -1 or 1'; end if;
  select m.course_id,m.position into v_course_id,v_position from public.course_modules m where m.id=p_module_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.course_module_progress mp where mp.course_id=v_course_id)
     or exists(
       select 1 from public.assessment_attempts aa
       join public.course_assessments a on a.id=aa.assessment_id
       where a.course_id=v_course_id
     ) then
    raise exception 'Lesson order is locked because learners already have progress in this course.';
  end if;

  if p_direction=-1 then
    select id,position into v_neighbor_id,v_neighbor_position
    from public.course_modules
    where course_id=v_course_id and position<v_position
    order by position desc limit 1;
  else
    select id,position into v_neighbor_id,v_neighbor_position
    from public.course_modules
    where course_id=v_course_id and position>v_position
    order by position asc limit 1;
  end if;

  if v_neighbor_id is null then return; end if;
  update public.course_modules set position=-1000000-v_position where id=p_module_id;
  update public.course_modules set position=v_position where id=v_neighbor_id;
  update public.course_modules set position=v_neighbor_position where id=p_module_id;
end;
$$;

revoke all on function public.move_course_module_builder(uuid,integer) from public, anon;
grant execute on function public.move_course_module_builder(uuid,integer) to authenticated;

create or replace function public.delete_course_module_builder(p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid;
begin
  select m.course_id into v_course_id from public.course_modules m where m.id=p_module_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.course_module_progress mp where mp.module_id=p_module_id)
     or exists(
       select 1 from public.assessment_attempts aa
       join public.course_assessments a on a.id=aa.assessment_id
       where a.module_id=p_module_id
     ) then
    raise exception 'This lesson cannot be deleted because learner history exists.';
  end if;

  if exists(select 1 from public.course_sessions s where s.course_id=v_course_id and p_module_id=any(s.module_ids)) then
    raise exception 'This lesson is linked to a classroom session. Unlink the session before deleting it.';
  end if;

  delete from public.course_modules where id=p_module_id;

  update public.course_modules set position=position+10000 where course_id=v_course_id;
  with ordered as (
    select id,row_number() over(order by position)::integer as next_position
    from public.course_modules where course_id=v_course_id
  )
  update public.course_modules m
  set position=o.next_position
  from ordered o
  where m.id=o.id;
end;
$$;

revoke all on function public.delete_course_module_builder(uuid) from public, anon;
grant execute on function public.delete_course_module_builder(uuid) to authenticated;

create or replace function public.update_course_assessment_builder(
  p_assessment_id uuid,
  p_title text,
  p_module_id uuid,
  p_assessment_type text,
  p_passing_score integer,
  p_max_attempts integer,
  p_required boolean,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid;
begin
  select a.course_id into v_course_id from public.course_assessments a where a.id=p_assessment_id;
  if v_course_id is null then raise exception 'Assessment not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.assessment_attempts aa where aa.assessment_id=p_assessment_id) then
    raise exception 'This assessment already has learner attempts. Create a new assessment version instead.';
  end if;

  if coalesce(trim(p_title),'')='' then raise exception 'Assessment title is required'; end if;
  if p_assessment_type not in ('lesson_quiz','knowledge_check','final_exam') then raise exception 'Invalid assessment type'; end if;
  if p_passing_score<0 or p_passing_score>100 then raise exception 'Passing score must be between 0 and 100'; end if;
  if p_required and p_passing_score<80 then raise exception 'Required assessments must use a passing score of at least 80'; end if;
  if p_assessment_type='final_exam' and p_passing_score<80 then raise exception 'Final exams must use a passing score of at least 80'; end if;
  if p_max_attempts is not null and p_max_attempts<1 then raise exception 'Maximum attempts must be at least 1'; end if;

  if p_module_id is not null and not exists(
    select 1 from public.course_modules m where m.id=p_module_id and m.course_id=v_course_id
  ) then
    raise exception 'Selected lesson is not part of this course';
  end if;

  update public.course_assessments
  set title=left(trim(p_title),180),
      module_id=p_module_id,
      assessment_type=p_assessment_type,
      passing_score=p_passing_score,
      max_attempts=p_max_attempts,
      required=p_required,
      published=p_published,
      updated_at=now()
  where id=p_assessment_id;
end;
$$;

revoke all on function public.update_course_assessment_builder(uuid,text,uuid,text,integer,integer,boolean,boolean) from public, anon;
grant execute on function public.update_course_assessment_builder(uuid,text,uuid,text,integer,integer,boolean,boolean) to authenticated;

create or replace function public.delete_course_assessment_builder(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_course_id uuid;
begin
  select a.course_id into v_course_id from public.course_assessments a where a.id=p_assessment_id;
  if v_course_id is null then raise exception 'Assessment not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.assessment_attempts aa where aa.assessment_id=p_assessment_id) then
    raise exception 'This assessment cannot be deleted because learner attempts exist.';
  end if;

  delete from public.course_assessments where id=p_assessment_id;
end;
$$;

revoke all on function public.delete_course_assessment_builder(uuid) from public, anon;
grant execute on function public.delete_course_assessment_builder(uuid) to authenticated;

create or replace function public.move_assessment_question_builder(p_question_id uuid,p_direction integer)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_assessment_id uuid;
  v_course_id uuid;
  v_position integer;
  v_neighbor_id uuid;
  v_neighbor_position integer;
begin
  if p_direction not in (-1,1) then raise exception 'Direction must be -1 or 1'; end if;

  select q.assessment_id,q.position,a.course_id
  into v_assessment_id,v_position,v_course_id
  from public.assessment_questions q
  join public.course_assessments a on a.id=q.assessment_id
  where q.id=p_question_id;

  if v_assessment_id is null then raise exception 'Question not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.assessment_attempts aa where aa.assessment_id=v_assessment_id) then
    raise exception 'Question order is locked because learners already attempted this assessment.';
  end if;

  if p_direction=-1 then
    select id,position into v_neighbor_id,v_neighbor_position
    from public.assessment_questions
    where assessment_id=v_assessment_id and position<v_position
    order by position desc limit 1;
  else
    select id,position into v_neighbor_id,v_neighbor_position
    from public.assessment_questions
    where assessment_id=v_assessment_id and position>v_position
    order by position asc limit 1;
  end if;

  if v_neighbor_id is null then return; end if;
  update public.assessment_questions set position=-1000000-v_position where id=p_question_id;
  update public.assessment_questions set position=v_position where id=v_neighbor_id;
  update public.assessment_questions set position=v_neighbor_position where id=p_question_id;
end;
$$;

revoke all on function public.move_assessment_question_builder(uuid,integer) from public, anon;
grant execute on function public.move_assessment_question_builder(uuid,integer) to authenticated;

create or replace function public.set_course_archived_builder(p_course_id uuid,p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_can_manage_learning_course(p_course_id);
  update public.courses
  set archived_at=case when p_archived then coalesce(archived_at,now()) else null end,
      published=case when p_archived then false else published end
  where id=p_course_id;
end;
$$;

revoke all on function public.set_course_archived_builder(uuid,boolean) from public, anon;
grant execute on function public.set_course_archived_builder(uuid,boolean) to authenticated;
