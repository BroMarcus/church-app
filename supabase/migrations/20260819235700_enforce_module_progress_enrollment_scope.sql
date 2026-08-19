create or replace function private.validate_course_module_progress_scope()
returns trigger
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_actor uuid:=auth.uid();
  v_church uuid;
begin
  if v_actor is null then return new; end if;
  if new.user_id is distinct from v_actor then
    raise exception 'You can only save your own lesson progress';
  end if;
  if not exists(select 1 from public.course_modules cm where cm.id=new.module_id and cm.course_id=new.course_id) then
    raise exception 'Lesson does not belong to this course';
  end if;
  select c.church_id into v_church from public.courses c where c.id=new.course_id and c.published=true;
  if not found then raise exception 'Published course not found'; end if;
  if v_church is not null and not exists(
    select 1 from public.church_memberships m where m.church_id=v_church and m.user_id=v_actor and m.status='active'
  ) then
    raise exception 'Active church membership is required';
  end if;
  if not exists(
    select 1 from public.course_enrollments e where e.course_id=new.course_id and e.user_id=v_actor
  ) then
    raise exception 'Course enrollment is required before saving lesson progress';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_course_module_progress_scope() from public,anon,authenticated;

drop trigger if exists trg_validate_course_module_progress_scope on public.course_module_progress;
create trigger trg_validate_course_module_progress_scope
before insert or update on public.course_module_progress
for each row execute function private.validate_course_module_progress_scope();
