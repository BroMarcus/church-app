import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const page=read('src/app/learning/admin/course-builder/[courseId]/page.tsx')
const actions=read('src/app/learning/admin/course-builder/[courseId]/actions.ts')
const migration=read('supabase/migrations/20260928030000_learning_external_source_links.sql')
const resourceMigration=read('supabase/migrations/20260928044500_learning_resource_source_links.sql')

test('course builder supports provider-neutral HTTPS source links without provider credentials',()=>{
  assert.match(page,/CLOUD \/ LINKED SOURCE/)
  assert.match(page,/saveCourseSourceLink/)
  assert.match(page,/saveLessonSourceLink/)
  assert.match(page,/Google Drive/)
  assert.match(page,/Dropbox/)
  assert.match(page,/long-lived access tokens/)
  assert.match(actions,/sourceProvider/)
  assert.match(actions,/set_course_source_link_builder/)
  assert.match(actions,/set_course_module_source_link_builder/)
  assert.match(actions,/url\.protocol!=='https:'/)
})

test('source-link migration is additive, tenant-authorized, and authenticated-only',()=>{
  assert.match(migration,/add column if not exists source_provider/)
  assert.match(migration,/add column if not exists source_url/)
  assert.match(migration,/private\.assert_can_manage_learning_course/)
  assert.match(migration,/Only HTTPS source links are allowed/)
  assert.match(migration,/revoke all on function public\.set_course_source_link_builder/)
  assert.match(migration,/grant execute on function public\.set_course_source_link_builder/)
  assert.match(migration,/revoke all on function public\.set_course_module_source_link_builder/)
  assert.match(migration,/grant execute on function public\.set_course_module_source_link_builder/)
})


test('imported learner resources can receive individual safe source links without exposing teacher material',()=>{
  assert.match(page,/saveResourceSourceLink/)
  assert.match(page,/Learner-safe links by resource/)
  assert.match(page,/master course file is never used automatically here/)
  assert.match(actions,/saveResourceSourceLink/)
  assert.match(actions,/set_course_module_resource_link_builder/)
  assert.match(resourceMigration,/private\.assert_can_manage_learning_course/)
  assert.match(resourceMigration,/Resource links are locked because this lesson already has learner history/)
  assert.match(resourceMigration,/Teacher-only resources cannot be configured as learner viewer links/)
  assert.match(resourceMigration,/Only HTTPS resource links are allowed/)
  assert.match(resourceMigration,/jsonb_set/)
  assert.match(resourceMigration,/revoke all on function public\.set_course_module_resource_link_builder/)
})
