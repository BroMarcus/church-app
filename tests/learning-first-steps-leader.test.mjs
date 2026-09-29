import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const page=readFileSync(new URL('../src/app/learning/admin/first-steps/page.tsx',import.meta.url),'utf8')

test('First Steps leader view derives final readiness from required class assessments',()=>{
  assert.match(page,/requiredClassCount=requiredClassAssessments\.length/)
  assert.match(page,/r\.classesPassed===requiredClassCount/)
  assert.match(page,/r\.classesPassed\/requiredClassCount/)
  assert.doesNotMatch(page,/classesPassed===\(modules\?\.length/)
  assert.doesNotMatch(page,/classesPassed\/modules\.length/)
})

test('authorized learning managers can use the First Steps leader view without broad admin role',()=>{
  assert.match(page,/current_user_has_church_permission/)
  assert.match(page,/p_permission_key:'manage_learning'/)
  assert.match(page,/customLearningAccess/)
})
