-- Resource-level approved links for imported course packages.
-- Keeps mixed master curriculum files private while letting learner-safe resources open in-app.

create or replace function public.set_course_module_resource_link_builder(
  p_module_id uuid,
  p_resource_index integer,
  p_source_provider text,
  p_source_url text,
  p_source_label text default null
)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_course_id uuid;
  v_content jsonb;
  v_resources jsonb;
  v_resource jsonb;
  v_next jsonb;
begin
  select course_id,content into v_course_id,v_content
  from public.course_modules
  where id=p_module_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);

  if exists(select 1 from public.course_module_progress where module_id=p_module_id)
     or exists(
       select 1 from public.assessment_attempts aa
       join public.course_assessments a on a.id=aa.assessment_id
       where a.module_id=p_module_id
     ) then
    raise exception 'Resource links are locked because this lesson already has learner history. Create a new course version instead.';
  end if;

  if p_source_url is not null and trim(p_source_url)<>'' and trim(p_source_url) !~* '^https://' then
    raise exception 'Only HTTPS resource links are allowed';
  end if;
  if p_source_provider is not null and p_source_provider not in ('dropbox','google_drive','onedrive','sharepoint','web') then
    raise exception 'Invalid source provider';
  end if;

  v_resources:=coalesce(v_content->'resources','[]'::jsonb);
  if jsonb_typeof(v_resources)<>'array' then raise exception 'Lesson resources are invalid'; end if;
  if p_resource_index<0 or p_resource_index>=jsonb_array_length(v_resources) then
    raise exception 'Resource not found';
  end if;

  v_resource:=v_resources->p_resource_index;
  if coalesce(v_resource->>'audience','both')='teacher' then
    raise exception 'Teacher-only resources cannot be configured as learner viewer links';
  end if;

  v_next:=v_resource - 'source_url' - 'source_provider' - 'source_label';
  if p_source_url is not null and trim(p_source_url)<>'' then
    v_next:=v_next||jsonb_strip_nulls(jsonb_build_object(
      'source_url',trim(p_source_url),
      'source_provider',coalesce(nullif(trim(coalesce(p_source_provider,'')),''),'web'),
      'source_label',nullif(left(trim(coalesce(p_source_label,'')),180),'')
    ));
  end if;

  update public.course_modules
  set content=jsonb_set(coalesce(content,'{}'::jsonb),array['resources',p_resource_index::text],v_next,true)
  where id=p_module_id;
end;
$$;

revoke all on function public.set_course_module_resource_link_builder(uuid,integer,text,text,text) from public,anon;
grant execute on function public.set_course_module_resource_link_builder(uuid,integer,text,text,text) to authenticated;
