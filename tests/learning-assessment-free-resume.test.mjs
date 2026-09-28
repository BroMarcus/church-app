import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const coursePage=read('src/app/learning/[courseId]/page.tsx')
const lessonPage=read('src/app/learning/[courseId]/lesson/[moduleId]/page.tsx')
const learningActions=read('src/app/learning/actions.ts')
const resume=read('src/lib/learning-resume.ts')

test('assessment-free courses explicitly say no assessment was provided',()=>{
  assert.match(coursePage,/No assessment provided/)
  assert.match(coursePage,/does not provide an assessment/)
  assert.match(coursePage,/will not invent a test/)
  assert.match(coursePage,/SIN EVALUACIÓN/)
})

test('assessment-free lessons can be deliberately completed and then resume moves forward',()=>{
  assert.match(lessonPage,/setModuleComplete/)
  assert.match(lessonPage,/NO REQUIRED ASSESSMENT/)
  assert.match(lessonPage,/Mark lesson complete/)
  assert.match(lessonPage,/Boolean\(moduleProgress\?\.completed\)/)
  assert.match(resume,/completedModules\.has\(courseModule\.id\)/)
})

test('manual lesson completion cannot bypass a published required assessment',()=>{
  assert.match(learningActions,/requiredAssessmentCount/)
  assert.match(learningActions,/eq\('required',true\)/)
  assert.match(learningActions,/eq\('published',true\)/)
  assert.match(learningActions,/Pass it to complete the lesson/)
})
