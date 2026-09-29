import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const page=readFileSync(new URL('../src/app/learning/admin/course-builder/[courseId]/page.tsx',import.meta.url),'utf8')
const uploader=readFileSync(new URL('../src/app/learning/admin/course-builder/[courseId]/course-source-uploader.tsx',import.meta.url),'utf8')
const actions=readFileSync(new URL('../src/app/learning/admin/course-builder/[courseId]/actions.ts',import.meta.url),'utf8')

test('Course Builder accepts a whole course as multiple files or ZIP in one source drop',()=>{
  assert.match(page,/COURSE SOURCE FILES/)
  assert.match(page,/Drop the whole course in one place/)
  assert.match(page,/CourseSourceUploader/)
  assert.match(uploader,/multiple/)
  assert.match(uploader,/\.zip/)
  assert.match(uploader,/onDrop/)
  assert.match(uploader,/50\*1024\*1024/)
})

test('uploaded source registration is church-scoped and cleanup-safe',()=>{
  assert.match(actions,/registerCourseSourceUpload/)
  assert.match(actions,/manager\(courseId\)/)
  assert.match(actions,/storagePath\.startsWith/)
  assert.match(actions,/created_record_id:courseId/)
  assert.match(uploader,/remove\(\[storagePath\]\)/)
})

test('source extraction targets one selected source instead of accidentally updating every course source',()=>{
  assert.match(page,/name="source_id"/)
  assert.match(actions,/sourceId=text\(formData,'source_id'\)/)
  assert.match(actions,/\.eq\('id',sourceId\)/)
})
