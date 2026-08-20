import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const index=read('src/app/learning/admin/course-builder/page.tsx')
const page=read('src/app/learning/admin/course-builder/[courseId]/page.tsx')
const actions=read('src/app/learning/admin/course-builder/[courseId]/actions.ts')
const createActions=read('src/app/learning/admin/course-builder/actions.ts')
const migration=read('supabase/migrations/20260820211000_learning_builder_lifecycle.sql')

test('class builder can create a church-owned draft without code changes',()=>{
  assert.match(index,/Build your church’s own classes/)
  assert.match(index,/action=\{createBuilderCourse\}/)
  assert.match(createActions,/published:false/)
  assert.match(createActions,/current_user_has_church_permission/)
  assert.match(createActions,/p_permission_key:'manage_learning'/)
  assert.match(createActions,/redirect\(`\/learning\/admin\/course-builder\/\$\{course\.id\}/)
})

test('builder exposes full lesson lifecycle with learner-history protection',()=>{
  assert.match(page,/action=\{updateBuilderLesson\}/)
  assert.match(page,/action=\{moveBuilderLesson\}/)
  assert.match(page,/action=\{deleteBuilderLesson\}/)
  assert.match(actions,/update_course_module_builder/)
  assert.match(actions,/move_course_module_builder/)
  assert.match(actions,/delete_course_module_builder/)
  assert.match(migration,/learner history exists/i)
  assert.match(migration,/linked to a classroom session/i)
  assert.match(migration,/course_module_progress/)
})

test('builder attaches assessments to lessons and manages secure questions',()=>{
  assert.match(page,/Attach to lesson/)
  assert.match(page,/action=\{createBuilderAssessment\}/)
  assert.match(page,/action=\{updateBuilderAssessment\}/)
  assert.match(page,/action=\{deleteBuilderAssessment\}/)
  assert.match(page,/action=\{addBuilderQuestion\}/)
  assert.match(page,/action=\{updateBuilderQuestion\}/)
  assert.match(page,/action=\{moveBuilderQuestion\}/)
  assert.match(page,/action=\{deleteBuilderQuestion\}/)
  assert.match(actions,/create_assessment_question/)
  assert.match(actions,/update_assessment_question/)
  assert.match(actions,/delete_assessment_question/)
  assert.doesNotMatch(page,/assessment_answer_keys/)
  assert.doesNotMatch(actions,/from\(['"]assessment_answer_keys['"]\)/)
})

test('builder supports publish, unpublish, archive and restore',()=>{
  assert.match(page,/action=\{setBuilderCoursePublished\}/)
  assert.match(page,/action=\{setBuilderCourseArchived\}/)
  assert.match(migration,/add column if not exists archived_at timestamptz/)
  assert.match(migration,/set_course_archived_builder/)
  assert.match(migration,/published=case when p_archived then false/)
})

test('new builder security-definer functions are authenticated-only and tenant-authorized',()=>{
  assert.match(migration,/assert_can_manage_learning_course/)
  assert.match(migration,/private\.has_church_role/)
  assert.match(migration,/private\.has_church_permission/)
  const publicFunctions=['course_builder_history_status','update_course_module_builder','move_course_module_builder','delete_course_module_builder','update_course_assessment_builder','delete_course_assessment_builder','move_assessment_question_builder','set_course_archived_builder']
  for(const name of publicFunctions){
    assert.match(migration,new RegExp(`revoke all on function public\\.${name}`))
    assert.match(migration,new RegExp(`grant execute on function public\\.${name}`))
  }
})
