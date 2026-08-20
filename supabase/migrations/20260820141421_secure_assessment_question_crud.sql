create or replace function private.update_assessment_question_impl(
  p_question_id uuid,
  p_question_type text,
  p_prompt text,
  p_options jsonb,
  p_correct_answer jsonb,
  p_points integer default 1,
  p_explanation text default null
) returns void
language plpgsql security definer set search_path='public','private','pg_temp' as $$
declare v_assessment uuid; v_church uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_question_type not in ('multiple_choice','true_false','multi_select') then raise exception 'Invalid question type'; end if;
  if coalesce(trim(p_prompt),'')='' or p_points<1 then raise exception 'Invalid question'; end if;
  select q.assessment_id,c.church_id into v_assessment,v_church
  from public.assessment_questions q join public.course_assessments a on a.id=q.assessment_id join public.courses c on c.id=a.course_id
  where q.id=p_question_id;
  if v_assessment is null then raise exception 'Question not found'; end if;
  if not (private.has_church_role(v_church,array['minister','pastor','church_admin']) or private.has_church_permission(v_church,'manage_learning')) then raise exception 'Not authorized'; end if;
  if exists(select 1 from public.assessment_attempts aa where aa.assessment_id=v_assessment) then raise exception 'Questions cannot be changed after learners have attempted this assessment. Create a new assessment version instead.'; end if;
  update public.assessment_questions set question_type=p_question_type,prompt=trim(p_prompt),options=coalesce(p_options,'[]'::jsonb),points=p_points,explanation_after_submit=nullif(trim(coalesce(p_explanation,'')),'') where id=p_question_id;
  update private.assessment_answer_keys set correct_answer=p_correct_answer where question_id=p_question_id;
end $$;

create or replace function public.update_assessment_question(
  p_question_id uuid,p_question_type text,p_prompt text,p_options jsonb,p_correct_answer jsonb,p_points integer default 1,p_explanation text default null
) returns void language sql set search_path='public','private' as $$
  select private.update_assessment_question_impl(p_question_id,p_question_type,p_prompt,p_options,p_correct_answer,p_points,p_explanation);
$$;

create or replace function private.delete_assessment_question_impl(p_question_id uuid) returns void
language plpgsql security definer set search_path='public','private','pg_temp' as $$
declare v_assessment uuid; v_church uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select q.assessment_id,c.church_id into v_assessment,v_church
  from public.assessment_questions q join public.course_assessments a on a.id=q.assessment_id join public.courses c on c.id=a.course_id
  where q.id=p_question_id;
  if v_assessment is null then raise exception 'Question not found'; end if;
  if not (private.has_church_role(v_church,array['minister','pastor','church_admin']) or private.has_church_permission(v_church,'manage_learning')) then raise exception 'Not authorized'; end if;
  if exists(select 1 from public.assessment_attempts aa where aa.assessment_id=v_assessment) then raise exception 'Questions cannot be deleted after learners have attempted this assessment.'; end if;
  delete from public.assessment_questions where id=p_question_id;
end $$;

create or replace function public.delete_assessment_question(p_question_id uuid) returns void language sql set search_path='public','private' as $$
  select private.delete_assessment_question_impl(p_question_id);
$$;

revoke all on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) from public,anon;
revoke all on function public.delete_assessment_question(uuid) from public,anon;
grant execute on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) to authenticated,service_role;
grant execute on function public.delete_assessment_question(uuid) to authenticated,service_role;
revoke all on function private.update_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) from public,anon,authenticated;
revoke all on function private.delete_assessment_question_impl(uuid) from public,anon,authenticated;
