create or replace function private.update_assessment_question_impl(
  p_question_id uuid,
  p_question_type text,
  p_prompt text,
  p_options jsonb,
  p_correct_answer jsonb default null,
  p_points integer default 1,
  p_explanation text default null
) returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_church_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_question_type not in ('multiple_choice','true_false','multi_select') then raise exception 'Invalid question type'; end if;
  if coalesce(btrim(p_prompt),'')='' then raise exception 'Question prompt is required'; end if;
  if p_points is null or p_points<1 then raise exception 'Points must be at least 1'; end if;

  select c.church_id into v_church_id
  from public.assessment_questions q
  join public.course_assessments a on a.id=q.assessment_id
  join public.courses c on c.id=a.course_id
  where q.id=p_question_id and c.church_id is not null;

  if v_church_id is null or not (
    private.has_church_role(v_church_id,array['minister','pastor','church_admin'])
    or private.has_church_permission(v_church_id,'manage_learning')
  ) then raise exception 'Not authorized'; end if;

  update public.assessment_questions
  set question_type=p_question_type,
      prompt=btrim(p_prompt),
      options=coalesce(p_options,'[]'::jsonb),
      points=p_points,
      explanation_after_submit=nullif(btrim(coalesce(p_explanation,'')),'')
  where id=p_question_id;

  if not found then raise exception 'Question not found'; end if;

  if p_correct_answer is not null then
    insert into private.assessment_answer_keys(question_id,correct_answer)
    values(p_question_id,p_correct_answer)
    on conflict(question_id) do update set correct_answer=excluded.correct_answer;
  end if;
end $$;

create or replace function public.update_assessment_question(
  p_question_id uuid,
  p_question_type text,
  p_prompt text,
  p_options jsonb,
  p_correct_answer jsonb default null,
  p_points integer default 1,
  p_explanation text default null
) returns void
language sql
set search_path=public,private,pg_temp
as $$
  select private.update_assessment_question_impl(
    p_question_id,
    p_question_type,
    p_prompt,
    p_options,
    p_correct_answer,
    p_points,
    p_explanation
  );
$$;

revoke all on function private.update_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) from public,anon,authenticated;
revoke all on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) from public,anon;
grant execute on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) to authenticated;
