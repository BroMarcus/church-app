-- Add provider-neutral external curriculum source links without storing provider credentials.
-- Course and lesson source ownership remains with the church/provider; Kingdom Network stores metadata only.

alter table public.courses
  add column if not exists source_provider text,
  add column if not exists source_url text,
  add column if not exists source_label text;

alter table public.course_modules
  add column if not exists source_provider text,
  add column if not exists source_url text,
  add column if not exists source_label text;

alter table public.courses drop constraint if exists courses_source_provider_check;
alter table public.courses add constraint courses_source_provider_check
  check (source_provider is null or source_provider in ('dropbox','google_drive','onedrive','sharepoint','web'));

alter table public.course_modules drop constraint if exists course_modules_source_provider_check;
alter table public.course_modules add constraint course_modules_source_provider_check
  check (source_provider is null or source_provider in ('dropbox','google_drive','onedrive','sharepoint','web'));

alter table public.courses drop constraint if exists courses_source_url_https_check;
alter table public.courses add constraint courses_source_url_https_check
  check (source_url is null or source_url ~* '^https://');

alter table public.course_modules drop constraint if exists course_modules_source_url_https_check;
alter table public.course_modules add constraint course_modules_source_url_https_check
  check (source_url is null or source_url ~* '^https://');

create or replace function public.set_course_source_link_builder(
  p_course_id uuid,
  p_source_provider text,
  p_source_url text,
  p_source_label text default null
)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  perform private.assert_can_manage_learning_course(p_course_id);
  if p_source_url is not null and p_source_url !~* '^https://' then
    raise exception 'Only HTTPS source links are allowed';
  end if;
  if p_source_provider is not null and p_source_provider not in ('dropbox','google_drive','onedrive','sharepoint','web') then
    raise exception 'Invalid source provider';
  end if;
  update public.courses
  set source_provider=nullif(trim(coalesce(p_source_provider,'')),''),
      source_url=nullif(trim(coalesce(p_source_url,'')),''),
      source_label=nullif(left(trim(coalesce(p_source_label,'')),180),'')
  where id=p_course_id;
end;
$$;

revoke all on function public.set_course_source_link_builder(uuid,text,text,text) from public,anon;
grant execute on function public.set_course_source_link_builder(uuid,text,text,text) to authenticated;

create or replace function public.set_course_module_source_link_builder(
  p_module_id uuid,
  p_source_provider text,
  p_source_url text,
  p_source_label text default null
)
returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare v_course_id uuid;
begin
  select course_id into v_course_id from public.course_modules where id=p_module_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  perform private.assert_can_manage_learning_course(v_course_id);
  if p_source_url is not null and p_source_url !~* '^https://' then
    raise exception 'Only HTTPS source links are allowed';
  end if;
  if p_source_provider is not null and p_source_provider not in ('dropbox','google_drive','onedrive','sharepoint','web') then
    raise exception 'Invalid source provider';
  end if;
  update public.course_modules
  set source_provider=nullif(trim(coalesce(p_source_provider,'')),''),
      source_url=nullif(trim(coalesce(p_source_url,'')),''),
      source_label=nullif(left(trim(coalesce(p_source_label,'')),180),'')
  where id=p_module_id;
end;
$$;

revoke all on function public.set_course_module_source_link_builder(uuid,text,text,text) from public,anon;
grant execute on function public.set_course_module_source_link_builder(uuid,text,text,text) to authenticated;
