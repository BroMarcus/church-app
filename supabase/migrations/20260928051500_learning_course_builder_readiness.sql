-- Read-only Course Builder readiness report used before publishing a course.

create or replace function public.course_builder_readiness(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_course public.courses%rowtype;
  v_lessons integer:=0;
  v_required integer:=0;
  v_final integer:=0;
  v_unpublished integer:=0;
  v_bad_counts integer:=0;
  v_missing_keys integer:=0;
  v_bad_links integer:=0;
  v_missing_material_links integer:=0;
  v_issues jsonb:='[]'::jsonb;
begin
  perform private.assert_can_manage_learning_course(p_course_id);
  select * into v_course from public.courses where id=p_course_id;
  if v_course.id is null then raise exception 'Course not found'; end if;

  select count(*) into v_lessons from public.course_modules where course_id=p_course_id;
  select count(*) into v_required from public.course_assessments where course_id=p_course_id and required=true;
  select count(*) into v_final from public.course_assessments where course_id=p_course_id and required=true and assessment_type='final_exam';
  select count(*) into v_unpublished from public.course_assessments where course_id=p_course_id and required=true and published=false;

  select count(*) into v_bad_counts
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

  select count(*) into v_missing_keys
  from public.assessment_questions q
  join public.course_assessments a on a.id=q.assessment_id
  left join private.assessment_answer_keys k on k.question_id=q.id
  where a.course_id=p_course_id and a.required=true and k.question_id is null;

  select count(*) into v_bad_links
  from public.course_modules m
  where m.course_id=p_course_id
    and m.source_url is not null
    and m.source_url !~* '^https://';

  select coalesce(sum(missing_count),0)::integer into v_missing_material_links
  from (
    select count(*) filter (
      where coalesce(resource->>'audience','both')<>'teacher'
        and nullif(trim(coalesce(resource->>'source_url','')),'') is null
        and nullif(trim(coalesce(m.source_url,'')),'') is null
    ) as missing_count
    from public.course_modules m
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(m.content->'resources')='array' then m.content->'resources' else '[]'::jsonb end
    ) resource
    where m.course_id=p_course_id
    group by m.id
  ) x;

  if v_course.archived_at is not null then v_issues:=v_issues||jsonb_build_array('Restore the archived course first.'); end if;
  if v_lessons=0 then v_issues:=v_issues||jsonb_build_array('Add at least one lesson.'); end if;
  if coalesce(trim(v_course.description),'')='' then v_issues:=v_issues||jsonb_build_array('Add a course description.'); end if;
  if v_bad_links>0 then v_issues:=v_issues||jsonb_build_array('Fix invalid lesson source links.'); end if;
  if v_missing_material_links>0 then v_issues:=v_issues||jsonb_build_array(format('Connect %s learner-safe lesson material link(s).',v_missing_material_links)); end if;

  if v_required>0 then
    if v_course.passing_score<80 then v_issues:=v_issues||jsonb_build_array('Set the course passing score to at least 80%.'); end if;
    if v_final<>1 then v_issues:=v_issues||jsonb_build_array('Configure exactly one required final exam.'); end if;
    if v_unpublished>0 then v_issues:=v_issues||jsonb_build_array(format('Publish %s required assessment(s) after review.',v_unpublished)); end if;
    if v_bad_counts>0 then v_issues:=v_issues||jsonb_build_array('Fix required assessment lesson links, passing scores, or question counts.'); end if;
    if v_missing_keys>0 then v_issues:=v_issues||jsonb_build_array('Repair missing protected assessment answer keys.'); end if;
    if coalesce(trim(v_course.badge_name),'')='' then v_issues:=v_issues||jsonb_build_array('Name the completion certificate / credential.'); end if;
  end if;

  return jsonb_build_object(
    'ready',jsonb_array_length(v_issues)=0,
    'issues',v_issues,
    'lesson_count',v_lessons,
    'required_assessment_count',v_required,
    'required_final_count',v_final,
    'unpublished_required_count',v_unpublished,
    'missing_material_link_count',v_missing_material_links
  );
end;
$$;

revoke all on function public.course_builder_readiness(uuid) from public,anon;
grant execute on function public.course_builder_readiness(uuid) to authenticated;
