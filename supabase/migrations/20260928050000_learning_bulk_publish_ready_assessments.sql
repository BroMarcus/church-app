-- All-or-nothing required-assessment publishing for a reviewed Draft course.

create or replace function public.publish_ready_course_assessments(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_course public.courses%rowtype;
  v_required integer;
  v_final integer;
  v_bad integer;
  v_missing_keys integer;
begin
  perform private.assert_can_manage_learning_course(p_course_id);
  select * into v_course from public.courses where id=p_course_id;
  if v_course.id is null then raise exception 'Course not found'; end if;
  if v_course.published then raise exception 'Required-test bulk publishing is available only while the course is a Draft'; end if;
  if v_course.archived_at is not null then raise exception 'Restore the course before publishing assessments'; end if;
  if exists(select 1 from public.assessment_attempts aa join public.course_assessments a on a.id=aa.assessment_id where a.course_id=p_course_id)
     or exists(select 1 from public.course_module_progress where course_id=p_course_id) then
    raise exception 'Learner history exists. Create a new course version instead of bulk-changing assessments.';
  end if;

  select count(*) into v_required from public.course_assessments where course_id=p_course_id and required=true;
  if v_required=0 then raise exception 'No required assessments are configured'; end if;

  select count(*) into v_final from public.course_assessments where course_id=p_course_id and required=true and assessment_type='final_exam';
  if v_final<>1 then raise exception 'Exactly one required final exam is required'; end if;

  select count(*) into v_bad
  from public.course_assessments a
  left join lateral (
    select count(*)::integer question_count
    from public.assessment_questions q
    where q.assessment_id=a.id
  ) q on true
  where a.course_id=p_course_id and a.required=true
    and (
      a.passing_score<80
      or (a.assessment_type<>'final_exam' and a.module_id is null)
      or (a.assessment_type='final_exam' and (q.question_count<20 or q.question_count>25))
      or (a.assessment_type<>'final_exam' and (q.question_count<5 or q.question_count>10))
    );
  if v_bad>0 then raise exception 'Required tests are not ready. Check passing scores, lesson links, and question counts.'; end if;

  select count(*) into v_missing_keys
  from public.assessment_questions q
  join public.course_assessments a on a.id=q.assessment_id
  left join private.assessment_answer_keys k on k.question_id=q.id
  where a.course_id=p_course_id and a.required=true and k.question_id is null;
  if v_missing_keys>0 then raise exception 'One or more required questions is missing its protected answer key'; end if;

  update public.course_assessments
  set published=true,updated_at=now()
  where course_id=p_course_id and required=true;

  return jsonb_build_object(
    'ok',true,
    'required_published',v_required,
    'final_count',v_final
  );
end;
$$;

revoke all on function public.publish_ready_course_assessments(uuid) from public,anon;
grant execute on function public.publish_ready_course_assessments(uuid) to authenticated;
