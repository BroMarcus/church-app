-- Reusable One Kingdom Course Package v1 importer and hard publish gate.
-- Safe by design: imports only into an empty, unpublished, history-free course.
-- Package imports never publish the course or assessments automatically.

create or replace function public.import_course_package_v1(
  p_course_id uuid,
  p_package jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_church_id uuid;
  v_user_id uuid := auth.uid();
  v_course public.courses%rowtype;
  v_course_json jsonb;
  v_lessons jsonb;
  v_assessments jsonb;
  v_lesson jsonb;
  v_resource jsonb;
  v_assessment jsonb;
  v_question jsonb;
  v_module_id uuid;
  v_assessment_id uuid;
  v_module_map jsonb := '{}'::jsonb;
  v_content jsonb;
  v_resources jsonb;
  v_sections jsonb;
  v_clean_resource jsonb;
  v_options jsonb;
  v_answer_value text;
  v_option_label text;
  v_answer_label text;
  v_title text;
  v_label text;
  v_audience text;
  v_source_ref text;
  v_type text;
  v_language text;
  v_provider text;
  v_url text;
  v_page_start integer;
  v_page_end integer;
  v_page_count integer;
  v_lesson_number integer;
  v_question_count integer;
  v_lesson_count integer := 0;
  v_assessment_count integer := 0;
  v_question_total integer := 0;
  v_position integer := 0;
  v_option_position integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_package) <> 'object' then raise exception 'Course package must be a JSON object'; end if;
  if coalesce((p_package->>'one_kingdom_package_version')::integer,0) <> 1 then
    raise exception 'Unsupported One Kingdom course package version';
  end if;

  select * into v_course from public.courses where id=p_course_id;
  if v_course.id is null then raise exception 'Course not found'; end if;
  v_church_id:=private.assert_can_manage_learning_course(p_course_id);

  if v_course.published then raise exception 'Import is allowed only on a private Draft course'; end if;
  if v_course.archived_at is not null then raise exception 'Restore the course before importing a package'; end if;
  if exists(select 1 from public.course_enrollments where course_id=p_course_id)
     or exists(select 1 from public.course_module_progress where course_id=p_course_id)
     or exists(
       select 1 from public.assessment_attempts aa
       join public.course_assessments a on a.id=aa.assessment_id
       where a.course_id=p_course_id
     ) then
    raise exception 'This course already has learner history. Import into a new Draft course instead.';
  end if;
  if exists(select 1 from public.course_modules where course_id=p_course_id)
     or exists(select 1 from public.course_assessments where course_id=p_course_id) then
    raise exception 'Course Package import requires an empty Draft. Use a new Draft course to prevent duplicates.';
  end if;

  v_course_json:=coalesce(p_package->'course','{}'::jsonb);
  v_lessons:=coalesce(p_package->'lessons','[]'::jsonb);
  v_assessments:=coalesce(p_package->'assessments','[]'::jsonb);

  if jsonb_typeof(v_lessons)<>'array' or jsonb_array_length(v_lessons)<1 or jsonb_array_length(v_lessons)>40 then
    raise exception 'Course Package must contain 1-40 lessons';
  end if;
  if jsonb_typeof(v_assessments)<>'array' or jsonb_array_length(v_assessments)>150 then
    raise exception 'Course Package assessments are invalid or exceed the supported limit';
  end if;

  v_language:=case when v_course_json->>'language'='es' then 'es' else 'en' end;
  update public.courses
  set title=coalesce(nullif(left(trim(v_course_json->>'title'),180),''),title),
      description=coalesce(nullif(left(trim(v_course_json->>'description'),5000),''),description),
      language_code=v_language,
      passing_score=greatest(80,least(100,coalesce(nullif(v_course_json->>'passing_score','')::integer,80))),
      badge_name=coalesce(nullif(left(trim(v_course_json->>'badge_name'),180),''),badge_name),
      curriculum_version=coalesce(nullif(left(trim(v_course_json->>'curriculum_version'),80),''),curriculum_version),
      source_revision=coalesce(nullif(left(trim(v_course_json->>'source_revision'),180),''),source_revision),
      published=false
  where id=p_course_id;

  if nullif(trim(v_course_json->>'source_url'),'') is not null then
    v_url:=trim(v_course_json->>'source_url');
    if v_url !~* '^https://' then raise exception 'Course package source_url must use HTTPS'; end if;
    v_provider:=nullif(trim(v_course_json->>'source_provider'),'');
    if v_provider is not null and v_provider not in ('dropbox','google_drive','onedrive','sharepoint','web') then
      raise exception 'Invalid course source provider';
    end if;
    update public.courses
    set source_url=v_url,
        source_provider=coalesce(v_provider,'web'),
        source_label=nullif(left(trim(coalesce(v_course_json->>'source_label','Course source')),180),'')
    where id=p_course_id;
  end if;

  for v_lesson in select value from jsonb_array_elements(v_lessons) loop
    if coalesce(v_lesson->>'number','') !~ '^\d{1,3}$' then raise exception 'Every package lesson needs a valid number'; end if;
    v_lesson_number:=(v_lesson->>'number')::integer;
    if v_lesson_number<0 or v_lesson_number>500 then raise exception 'Lesson number is out of range'; end if;
    if v_module_map ? v_lesson_number::text then raise exception 'Duplicate lesson number %',v_lesson_number; end if;
    v_title:=left(trim(coalesce(v_lesson->>'title','')),140);
    if v_title='' then raise exception 'Every package lesson needs a title'; end if;
    if jsonb_typeof(coalesce(v_lesson->'resources','[]'::jsonb))<>'array'
       or jsonb_array_length(coalesce(v_lesson->'resources','[]'::jsonb))>100 then
      raise exception 'Lesson % has an invalid resource list',v_lesson_number;
    end if;

    v_resources:='[]'::jsonb;
    v_sections:=case when jsonb_typeof(v_lesson->'sections')='array' then v_lesson->'sections' else '[]'::jsonb end;

    for v_resource in select value from jsonb_array_elements(coalesce(v_lesson->'resources','[]'::jsonb)) loop
      v_label:=left(trim(coalesce(v_resource->>'label',v_resource->>'file_name','Course material')),200);
      v_audience:=case when v_resource->>'audience'='teacher' then 'teacher' when v_resource->>'audience'='student' then 'student' else 'both' end;
      v_page_start:=case when coalesce(v_resource->>'page_start','')~'^\d+$' then least(5000,(v_resource->>'page_start')::integer) else 0 end;
      v_page_end:=case when coalesce(v_resource->>'page_end','')~'^\d+$' then least(5000,(v_resource->>'page_end')::integer) else 0 end;
      if v_page_start>0 and v_page_end>0 and v_page_end<v_page_start then raise exception 'Lesson % has an invalid page range',v_lesson_number; end if;
      v_page_count:=case when coalesce(v_resource->>'page_count','')~'^\d+$' then least(500,(v_resource->>'page_count')::integer) else case when v_page_start>0 and v_page_end>=v_page_start then v_page_end-v_page_start+1 else 0 end end;
      v_url:=nullif(trim(coalesce(v_resource->>'source_url',v_resource->>'url','')),'');
      if v_url is not null and v_url !~* '^https://' then raise exception 'Lesson % resource URL must use HTTPS',v_lesson_number; end if;
      v_clean_resource:=jsonb_strip_nulls(jsonb_build_object(
        'label',v_label,
        'kind',left(trim(coalesce(v_resource->>'kind','resource')),80),
        'audience',v_audience,
        'source_path',nullif(left(trim(coalesce(v_resource->>'source_path','')),500),''),
        'source_url',v_url,
        'page_start',case when v_page_start>0 then v_page_start else null end,
        'page_end',case when v_page_end>0 then v_page_end else null end,
        'page_count',case when v_page_count>0 then v_page_count else null end
      ));
      v_resources:=v_resources||jsonb_build_array(v_clean_resource);
      if v_audience<>'teacher' and jsonb_array_length(v_sections)<40 then
        v_sections:=v_sections||jsonb_build_array(jsonb_build_object(
          'heading',v_label,
          'body',case
            when v_page_start>0 and v_page_end>0 and v_language='es' then format('Lee las páginas %s–%s del material fuente conectado.',v_page_start,v_page_end)
            when v_page_start>0 and v_page_end>0 then format('Read pages %s–%s from the connected source material.',v_page_start,v_page_end)
            when v_language='es' then 'Revisa este material fuente conectado antes de continuar.'
            else 'Review this connected source material before continuing.'
          end
        ));
      end if;
    end loop;

    v_content:=jsonb_strip_nulls(jsonb_build_object(
      'summary',nullif(left(trim(coalesce(v_lesson->>'summary','')),1000),''),
      'body',nullif(left(trim(coalesce(v_lesson->>'body','')),20000),''),
      'objectives',case when jsonb_typeof(v_lesson->'objectives')='array' then v_lesson->'objectives' else '[]'::jsonb end,
      'scripture_refs',case when jsonb_typeof(v_lesson->'scripture_refs')='array' then v_lesson->'scripture_refs' else '[]'::jsonb end,
      'review_points',case when jsonb_typeof(v_lesson->'review_points')='array' then v_lesson->'review_points' else '[]'::jsonb end,
      'sections',v_sections,
      'resources',v_resources,
      'package_lesson_number',v_lesson_number,
      'package_version',1
    ));
    v_position:=v_position+1;
    insert into public.course_modules(course_id,position,title,content)
    values(p_course_id,v_position,v_title,v_content)
    returning id into v_module_id;
    v_module_map:=v_module_map||jsonb_build_object(v_lesson_number::text,v_module_id::text);
    v_lesson_count:=v_lesson_count+1;
  end loop;

  for v_assessment in select value from jsonb_array_elements(v_assessments) loop
    v_type:=case when coalesce(v_assessment->>'assessment_type',v_assessment->>'type','checkpoint')='final' then 'final_exam' else 'lesson_quiz' end;
    v_title:=left(trim(coalesce(v_assessment->>'title','Assessment')),180);
    v_question_count:=jsonb_array_length(coalesce(v_assessment->'questions','[]'::jsonb));
    if coalesce((v_assessment->>'required')::boolean,true) then
      if v_type='final_exam' and (v_question_count<20 or v_question_count>25) then
        raise exception 'Required final exams need 20-25 questions';
      elsif v_type<>'final_exam' and (v_question_count<5 or v_question_count>10) then
        raise exception 'Required checkpoint tests need 5-10 questions';
      end if;
    end if;
    if v_type='final_exam' then
      if exists(select 1 from public.course_assessments where course_id=p_course_id and assessment_type='final_exam') then
        raise exception 'Course Package can contain only one final exam';
      end if;
      v_module_id:=null;
    else
      if coalesce(v_assessment->>'lesson_number','') !~ '^\d{1,3}$' then raise exception 'Checkpoint is missing lesson_number'; end if;
      v_module_id:=nullif(v_module_map->>(v_assessment->>'lesson_number'),'')::uuid;
      if v_module_id is null then raise exception 'Checkpoint lesson_number does not match an imported lesson'; end if;
    end if;

    insert into public.course_assessments(course_id,module_id,title,assessment_type,passing_score,max_attempts,required,published,created_by)
    values(
      p_course_id,
      v_module_id,
      v_title,
      v_type,
      greatest(80,least(100,coalesce(nullif(v_assessment->>'passing_score','')::integer,80))),
      case when coalesce(v_assessment->>'max_attempts','')~'^\d+$' then greatest(1,(v_assessment->>'max_attempts')::integer) else null end,
      coalesce((v_assessment->>'required')::boolean,true),
      false,
      v_user_id
    )
    returning id into v_assessment_id;

    for v_question in select value from jsonb_array_elements(coalesce(v_assessment->'questions','[]'::jsonb)) loop
      if trim(coalesce(v_question->>'prompt',''))='' then raise exception 'Assessment question prompt is required'; end if;
      if jsonb_typeof(v_question->'options')<>'array' or jsonb_array_length(v_question->'options')<2 or jsonb_array_length(v_question->'options')>12 then
        raise exception 'Assessment questions need 2-12 answer choices';
      end if;
      if (select count(*) from jsonb_array_elements_text(v_question->'options')) <>
         (select count(distinct lower(trim(value))) from jsonb_array_elements_text(v_question->'options')) then
        raise exception 'Assessment answer choices must be unique';
      end if;
      v_answer_label:=trim(coalesce(v_question->>'answer',''));
      if v_answer_label='' then raise exception 'Assessment question answer is required'; end if;
      v_options:='[]'::jsonb;
      v_answer_value:=null;
      v_option_position:=0;
      for v_option_label in select value from jsonb_array_elements_text(v_question->'options') loop
        v_option_position:=v_option_position+1;
        v_option_label:=trim(v_option_label);
        v_options:=v_options||jsonb_build_array(jsonb_build_object('value',v_option_position::text,'label',left(v_option_label,1000)));
        if v_option_label=v_answer_label then v_answer_value:=v_option_position::text; end if;
      end loop;
      if v_answer_value is null then raise exception 'Correct answer must exactly match one answer choice'; end if;
      v_source_ref:=nullif(left(trim(coalesce(v_question->>'source_ref','')),500),'');
      perform public.create_assessment_question(
        v_assessment_id,
        'multiple_choice',
        left(trim(v_question->>'prompt'),2000),
        v_options,
        to_jsonb(v_answer_value),
        1,
        case when v_source_ref is null then null else 'Source: '||v_source_ref end
      );
      v_question_total:=v_question_total+1;
    end loop;
    v_assessment_count:=v_assessment_count+1;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'course_id',p_course_id,
    'lessons_created',v_lesson_count,
    'assessments_created',v_assessment_count,
    'questions_created',v_question_total,
    'assessments_published',false,
    'course_published',false
  );
end;
$$;

revoke all on function public.import_course_package_v1(uuid,jsonb) from public,anon;
grant execute on function public.import_course_package_v1(uuid,jsonb) to authenticated;

create or replace function private.enforce_learning_course_publish_readiness()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_required_count integer;
  v_final_count integer;
  v_bad_count integer;
begin
  if not new.published then return new; end if;
  if new.archived_at is not null then raise exception 'Archived courses cannot be published'; end if;
  if not exists(select 1 from public.course_modules where course_id=new.id) then
    raise exception 'Add at least one lesson before publishing this course';
  end if;

  select count(*) into v_required_count from public.course_assessments where course_id=new.id and required=true;
  if v_required_count=0 then return new; end if;
  if new.passing_score<80 then raise exception 'Tested courses require a passing score of at least 80'; end if;

  select count(*) into v_final_count
  from public.course_assessments
  where course_id=new.id and required=true and assessment_type='final_exam';
  if v_final_count<>1 then raise exception 'Tested courses require exactly one required final exam'; end if;

  if exists(select 1 from public.course_assessments where course_id=new.id and required=true and published=false) then
    raise exception 'Publish every required assessment before publishing the course';
  end if;
  if exists(select 1 from public.course_assessments where course_id=new.id and required=true and assessment_type<>'final_exam' and module_id is null) then
    raise exception 'Required checkpoint tests must be attached to a lesson';
  end if;

  select count(*) into v_bad_count
  from public.course_assessments a
  left join lateral (
    select count(*)::integer as question_count
    from public.assessment_questions q
    where q.assessment_id=a.id
  ) q on true
  where a.course_id=new.id and a.required=true
    and (
      (a.assessment_type='final_exam' and (q.question_count<20 or q.question_count>25))
      or
      (a.assessment_type<>'final_exam' and (q.question_count<5 or q.question_count>10))
    );
  if v_bad_count>0 then
    raise exception 'Required checkpoint tests need 5-10 questions and final exams need 20-25 questions';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_learning_course_publish_readiness on public.courses;
create trigger trg_learning_course_publish_readiness
before insert or update of published on public.courses
for each row
execute function private.enforce_learning_course_publish_readiness();

revoke all on function private.enforce_learning_course_publish_readiness() from public,anon,authenticated;
