import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const actions=readFileSync(new URL('../src/app/learning/admin/actions.ts',import.meta.url),'utf8')
const studio=readFileSync(new URL('../src/app/learning/admin/page.tsx',import.meta.url),'utf8')
const weekly=readFileSync(new URL('../src/app/learning/admin/weekly-series/page.tsx',import.meta.url),'utf8')
const teacher=readFileSync(new URL('../src/app/learning/admin/teacher/page.tsx',import.meta.url),'utf8')
const roster=readFileSync(new URL('../src/app/learning/admin/sessions/[sessionId]/page.tsx',import.meta.url),'utf8')

test('live class teacher assignment is tied to an active same-church user',()=>{
  assert.match(actions,/instructorFor/)
  assert.match(actions,/eq\('church_id',churchId\)/)
  assert.match(actions,/eq\('user_id',instructorUserId\)/)
  assert.match(actions,/eq\('status','active'\)/)
  assert.match(actions,/instructor_user_id:instructorUserId/)
})

test('Learning Studio and weekly series choose teachers from active church people',()=>{
  for(const page of [studio,weekly]){
    assert.match(page,/activeMembers/)
    assert.match(page,/teacherOptions/)
    assert.match(page,/name="instructor_user_id"/)
    assert.doesNotMatch(page,/name="instructor_name" placeholder="Teacher name"/)
  }
})

test('teacher dashboard can now recognize assigned sessions as mine',()=>{
  assert.match(teacher,/instructor_user_id/)
  assert.match(teacher,/s\.instructor_user_id===userId/)
})

test('assigned teachers can use their own teaching workspace without broad learning-manager access',()=>{
  assert.match(roster,/assignedTeacher=session\.instructor_user_id===actorId/)
  assert.match(roster,/if\(!canManage&&!assignedTeacher\)redirect/)
  assert.match(teacher,/if\(!canManage\)sessionQuery=sessionQuery\.eq\('instructor_user_id',userId\)/)
  assert.match(teacher,/if\(!canManage&&\!\(sessions\?\?\[\]\)\.length\)redirect/)
  assert.match(teacher,/visible=canManage\?/)
})
