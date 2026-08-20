alter table public.friendship_group_lessons
  add column if not exists owner_group_id uuid references public.groups(id) on delete cascade,
  add column if not exists source_asset_path text;

create or replace function private.validate_group_lesson_scope()
returns trigger language plpgsql set search_path=public,private,pg_temp as $$
begin
  if new.owner_group_id is not null and not exists(
    select 1 from public.groups g where g.id=new.owner_group_id and g.church_id=new.church_id and g.group_type='friendship'
  ) then raise exception 'Lesson group must belong to the same church'; end if;
  return new;
end $$;
drop trigger if exists friendship_group_lessons_validate_scope on public.friendship_group_lessons;
create trigger friendship_group_lessons_validate_scope before insert or update of church_id,owner_group_id on public.friendship_group_lessons for each row execute function private.validate_group_lesson_scope();

drop policy if exists friendship_group_lessons_read on public.friendship_group_lessons;
create policy friendship_group_lessons_read on public.friendship_group_lessons for select to authenticated using(
  private.is_church_member(church_id) and (
    owner_group_id is null
    or exists(select 1 from public.group_memberships gm where gm.group_id=owner_group_id and gm.user_id=auth.uid())
    or exists(select 1 from public.groups g where g.id=owner_group_id and g.leader_id=auth.uid())
    or private.has_church_role(church_id,array['minister','pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_learning')
  )
);
drop policy if exists friendship_group_lessons_manage on public.friendship_group_lessons;
create policy friendship_group_lessons_manage on public.friendship_group_lessons for all to authenticated using(
  private.has_church_role(church_id,array['minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_learning')
  or (owner_group_id is not null and exists(select 1 from public.groups g where g.id=owner_group_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader']))))
) with check(
  private.has_church_role(church_id,array['minister','pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_learning')
  or (owner_group_id is not null and exists(select 1 from public.groups g where g.id=owner_group_id and g.church_id=friendship_group_lessons.church_id and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader']))))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('group-lesson-assets','group-lesson-assets',false,8388608,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists group_lesson_assets_read on storage.objects;
create policy group_lesson_assets_read on storage.objects for select to authenticated using(
 bucket_id='group-lesson-assets' and exists(
  select 1 from public.groups g where g.id=(storage.foldername(storage.objects.name))[2]::uuid
   and g.church_id=(storage.foldername(storage.objects.name))[1]::uuid
   and (
    exists(select 1 from public.group_memberships gm where gm.group_id=g.id and gm.user_id=auth.uid())
    or g.leader_id=auth.uid()
    or private.has_church_role(g.church_id,array['pastor','church_admin','minister'])
    or private.has_church_permission(g.church_id,'manage_learning')
   )
 )
);
drop policy if exists group_lesson_assets_insert on storage.objects;
create policy group_lesson_assets_insert on storage.objects for insert to authenticated with check(
 bucket_id='group-lesson-assets'
 and (storage.foldername(storage.objects.name))[3]=auth.uid()::text
 and exists(
  select 1 from public.groups g where g.id=(storage.foldername(storage.objects.name))[2]::uuid
   and g.church_id=(storage.foldername(storage.objects.name))[1]::uuid
   and (g.leader_id=auth.uid() or private.has_group_role(g.id,array['leader']) or private.has_church_role(g.church_id,array['pastor','church_admin','minister']) or private.has_church_permission(g.church_id,'manage_learning'))
 )
);
drop policy if exists group_lesson_assets_update on storage.objects;
create policy group_lesson_assets_update on storage.objects for update to authenticated using(bucket_id='group-lesson-assets' and owner_id=auth.uid()::text) with check(bucket_id='group-lesson-assets' and owner_id=auth.uid()::text);
drop policy if exists group_lesson_assets_delete on storage.objects;
create policy group_lesson_assets_delete on storage.objects for delete to authenticated using(
 bucket_id='group-lesson-assets' and (
  owner_id=auth.uid()::text or exists(select 1 from public.groups g where g.id=(storage.foldername(storage.objects.name))[2]::uuid and private.has_church_role(g.church_id,array['pastor','church_admin']))
 )
);
