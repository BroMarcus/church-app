-- Enforce assessment standards at the database boundary so no UI or alternate
-- route can publish required tests that do not meet the Learning Engine rules.

create or replace function private.validate_required_assessment_publish_ready()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_count integer;
  v_course_passing integer;
begin
  if coalesce(new.published,false)=false or coalesce(new.required,false)=false then
    return new;
  end if;

  select coalesce(c.passing_score,80) into v_course_passing
  from public.courses c where c.id=new.course_id;

  select count(*) into v_count
  from public.assessment_questions q
  where q.assessment_id=new.id;

  if new.assessment_type='final_exam' then
    if v_count<20 or v_count>25 then
      raise exception 'Required final exams must contain 20 to 25 questions';
    end if;
  else
    if v_count<5 or v_count>10 then
      raise exception 'Required checkpoint assessments must contain 5 to 10 questions';
    end if;
  end if;

  if coalesce(new.passing_score,0)<greatest(80,coalesce(v_course_passing,80)) then
    raise exception 'Required assessment passing score cannot be lower than the course passing score or 80 percent';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_required_assessment_publish_ready() from public,anon,authenticated;

drop trigger if exists trg_validate_required_assessment_publish_ready on public.course_assessments;
create trigger trg_validate_required_assessment_publish_ready
before update of published,required,passing_score on public.course_assessments
for each row execute function private.validate_required_assessment_publish_ready();

create or replace function private.validate_learning_course_publish_ready()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_bad_required integer;
  v_required_finals integer;
begin
  if coalesce(new.published,false)=false then
    return new;
  end if;

  select count(*) into v_required_finals
  from public.course_assessments a
  where a.course_id=new.id and a.required=true and a.assessment_type='final_exam';

  if v_required_finals>1 then
    raise exception 'A course can have only one required final exam';
  end if;

  select count(*) into v_bad_required
  from public.course_assessments a
  left join lateral (
    select count(*)::integer as question_count
    from public.assessment_questions q
    where q.assessment_id=a.id
  ) q on true
  where a.course_id=new.id
    and a.required=true
    and (
      a.published=false
      or coalesce(a.passing_score,0)<greatest(80,coalesce(new.passing_score,80))
      or (a.assessment_type='final_exam' and (q.question_count<20 or q.question_count>25))
      or (a.assessment_type<>'final_exam' and (q.question_count<5 or q.question_count>10))
    );

  if v_bad_required>0 then
    raise exception 'Required assessments must be published, meet the 5-10 checkpoint / 20-25 final question standard, and meet the course passing score before the course can be published';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_learning_course_publish_ready() from public,anon,authenticated;

drop trigger if exists trg_validate_learning_course_publish_ready on public.courses;
create trigger trg_validate_learning_course_publish_ready
before update of published,passing_score on public.courses
for each row execute function private.validate_learning_course_publish_ready();
