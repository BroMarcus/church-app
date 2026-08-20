alter table public.course_assessments add column if not exists checkpoint_section integer;
alter table public.course_assessments drop constraint if exists course_assessments_checkpoint_section_check;
alter table public.course_assessments add constraint course_assessments_checkpoint_section_check check(checkpoint_section is null or checkpoint_section>=0);
