import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('teacher dashboard uses the existing learning model and learning permission',async()=>{
  const source=await read('src/app/learning/admin/teacher/page.tsx')
  assert.match(source,/current_user_has_church_permission/)
  assert.match(source,/manage_learning/)
  assert.match(source,/from\('course_sessions'\)/)
  assert.match(source,/from\('course_enrollments'\)/)
  assert.match(source,/\/learning\/admin\/sessions\/\$\{session\.id\}/)
  assert.match(source,/\/learning\/admin\/course-builder/)
  assert.doesNotMatch(source,/teacher_sessions|teacher_enrollments/)
})

test('web app manifest provides install metadata without offline private-data caching',async()=>{
  const manifest=await read('src/app/manifest.ts')
  assert.match(manifest,/name:'Kingdom Network'/)
  assert.match(manifest,/display:'standalone'/)
  assert.match(manifest,/start_url:'\/'/)
  assert.match(manifest,/kingdom-icon\.svg/)
  assert.match(manifest,/kingdom-icon-maskable\.svg/)
  let sw=''
  try{sw=await read('public/sw.js')}catch{}
  assert.doesNotMatch(sw,/caches\.open|cache\.put|respondWith/)
})