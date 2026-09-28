import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const page=readFileSync(new URL('../src/app/learning/page.tsx',import.meta.url),'utf8')

test('Learning Center resumes the most recently active course across course languages',()=>{
  assert.match(page,/updated_at/)
  assert.match(page,/order\('updated_at',\{ascending:false\}\)/)
  assert.match(page,/\(enrollments\?\?\[\]\)\.find/)
  assert.match(page,/allCourses\?\.some/)
  assert.match(page,/currentCourse\.language_code/)
})

test('Spanish resume URLs follow the active course language rather than only the page filter',()=>{
  assert.match(page,/resumeHref=\(href:string,courseLang\?:string\|null\)/)
  assert.match(page,/courseLang!=='es'/)
})
