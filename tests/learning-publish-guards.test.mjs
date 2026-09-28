import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../supabase/migrations/20260928031500_learning_publish_guards.sql',import.meta.url),'utf8')
const adminActions=readFileSync(new URL('../src/app/learning/admin/actions.ts',import.meta.url),'utf8')
const adminPage=readFileSync(new URL('../src/app/learning/admin/page.tsx',import.meta.url),'utf8')

test('required assessments cannot publish outside the 5-10 checkpoint / 20-25 final standards',()=>{
  assert.match(migration,/Required final exams must contain 20 to 25 questions/)
  assert.match(migration,/Required checkpoint assessments must contain 5 to 10 questions/)
  assert.match(migration,/greatest\(80,coalesce\(v_course_passing,80\)\)/)
  assert.match(migration,/trg_validate_required_assessment_publish_ready/)
})

test('course publishing fails closed when required assessments are incomplete or invalid',()=>{
  assert.match(migration,/trg_validate_learning_course_publish_ready/)
  assert.match(migration,/a\.published=false/)
  assert.match(migration,/v_required_finals>1/)
  assert.match(migration,/Required assessments must be published/)
})

test('legacy Learning Studio creates assessments as drafts instead of publish-now shells',()=>{
  assert.match(adminActions,/required:formData\.get\('required'\)==='on',published:false/)
  assert.doesNotMatch(adminPage,/Publish now/)
  assert.match(adminPage,/Create draft assessment/)
  assert.match(adminPage,/5–10 checkpoint or 20–25 final questions/)
})
