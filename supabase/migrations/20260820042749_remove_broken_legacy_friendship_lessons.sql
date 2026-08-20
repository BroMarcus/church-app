delete from public.group_lesson_assignments gla
using public.friendship_group_lessons l
where gla.lesson_id=l.id
  and l.source_revision='52 Lessons for Cell Groups — uploaded source';

delete from public.friendship_group_lessons
where source_revision='52 Lessons for Cell Groups — uploaded source'
  and source_label='The Cell Group — 52 Lessons for Cell Groups';
