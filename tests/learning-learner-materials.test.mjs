import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const course=readFileSync(new URL('../src/app/learning/[courseId]/page.tsx',import.meta.url),'utf8')
const lesson=readFileSync(new URL('../src/app/learning/[courseId]/lesson/[moduleId]/page.tsx',import.meta.url),'utf8')

test('learner material readiness recognizes builder text and attached lesson files',()=>{
  assert.match(course,/String\(content\.body\?\?''\)\.trim\(\)!==''/)
  assert.match(course,/course_module_assets/)
  assert.match(course,/assetModuleIds/)
})

test('online lesson renders canonical builder text and attached lesson assets',()=>{
  assert.match(lesson,/course_module_assets/)
  assert.match(lesson,/learning-assets/)
  assert.match(lesson,/LESSON MATERIAL/)
  assert.match(lesson,/LESSON FILES/)
  assert.match(lesson,/Open material/)
})
