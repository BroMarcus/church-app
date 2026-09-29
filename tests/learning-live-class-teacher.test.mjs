import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const page=readFileSync(new URL('../src/app/learning/admin/sessions/[sessionId]/page.tsx',import.meta.url),'utf8')

test('live-class teacher workspace uses the same linked course lessons and materials',()=>{
  assert.match(page,/module_ids/)
  assert.match(page,/course_modules/)
  assert.match(page,/course_module_assets/)
  assert.match(page,/learning-assets/)
  assert.match(page,/TODAY'S LESSON MATERIALS/)
  assert.match(page,/same course your learners use/)
  assert.match(page,/Open original source/)
})

test('live-class teacher workflow keeps attendance connected after materials',()=>{
  assert.match(page,/saveSessionAttendance/)
  assert.match(page,/Roster/)
  assert.match(page,/Save attendance/)
})
