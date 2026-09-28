import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const pkg=JSON.parse(read('docs/curriculum/effective-soul-winning/course-package-v1.json'))
const migration=read('supabase/migrations/20260928043000_learning_course_package_import.sql')
const actions=read('src/app/learning/admin/course-builder/[courseId]/actions.ts')
const page=read('src/app/learning/admin/course-builder/[courseId]/page.tsx')
const lessonPage=read('src/app/learning/[courseId]/lesson/[moduleId]/page.tsx')
const sourceViewer=read('src/app/learning/[courseId]/lesson/[moduleId]/source/page.tsx')

test('Effective Soul Winning package keeps the verified six-lesson mastery structure',()=>{
  assert.equal(pkg.one_kingdom_package_version,1)
  assert.equal(pkg.course.title,'Effective Soul Winning')
  assert.equal(pkg.course.progression_mode,'mastery')
  assert.equal(pkg.course.passing_score,80)
  assert.deepEqual(pkg.lessons.map((x)=>x.title),[
    'The Old and the New Testament',
    'What Is Repentance?',
    'There Is Only One God',
    'Man of Sorrows',
    'Apostolic Authority',
    'The New Birth',
  ])
})

test('Effective Soul Winning uses three valid checkpoints and a 20-question final',()=>{
  const checkpoints=pkg.assessments.filter((a)=>(a.type??a.assessment_type)==='checkpoint')
  const finals=pkg.assessments.filter((a)=>(a.type??a.assessment_type)==='final')
  assert.equal(checkpoints.length,3)
  assert.deepEqual(checkpoints.map((a)=>a.questions.length),[6,6,6])
  assert.equal(finals.length,1)
  assert.equal(finals[0].questions.length,20)
  for(const assessment of [...checkpoints,...finals]){
    assert.equal(assessment.required,true)
    assert.equal(assessment.passing_score,80)
    for(const question of assessment.questions){
      assert.ok(question.question_id)
      assert.ok(question.prompt)
      assert.ok(Array.isArray(question.options)&&question.options.length>=2)
      assert.ok(question.options.includes(question.answer))
      assert.ok(question.source_ref)
    }
  }
})

test('Course Package import is empty-draft-only, atomic, and never auto-publishes',()=>{
  assert.match(migration,/import_course_package_v1/)
  assert.match(migration,/Import is allowed only on a private Draft course/)
  assert.match(migration,/already has learner history/)
  assert.match(migration,/requires an empty Draft/)
  assert.match(migration,/perform public\.create_assessment_question/)
  assert.match(migration,/published,false/)
  assert.match(migration,/'assessments_published',false/)
  assert.match(actions,/importCoursePackage/)
  assert.match(actions,/2_000_000/)
  assert.match(actions,/import_course_package_v1/)
  assert.match(page,/COURSE PACKAGE/)
  assert.match(page,/Import into Draft/)
  assert.match(page,/whole import rolls back/)
})

test('database publish readiness enforces real checkpoint and final counts',()=>{
  assert.match(migration,/trg_learning_course_publish_readiness/)
  assert.match(migration,/Tested courses require exactly one required final exam/)
  assert.match(migration,/Publish every required assessment before publishing the course/)
  assert.match(migration,/Required checkpoint tests need 5-10 questions and final exams need 20-25 questions/)
  assert.match(migration,/Tested courses require a passing score of at least 80/)
})


test('ESW lesson resources stay inside the authenticated One Kingdom viewer',()=>{
  assert.match(lessonPage,/LESSON MATERIALS/)
  assert.match(lessonPage,/Open in One Kingdom/)
  assert.match(lessonPage,/module\.content\?\.resources/)
  assert.match(sourceViewer,/getClaims/)
  assert.match(sourceViewer,/course_enrollments/)
  assert.match(sourceViewer,/church_memberships/)
  assert.match(sourceViewer,/ONE KINGDOM VIEWER/)
  assert.match(sourceViewer,/drive\.google\.com/)
  assert.match(sourceViewer,/docs\.google\.com/)
  assert.match(sourceViewer,/dropbox\.com/)
  assert.match(sourceViewer,/raw','1'/)
  assert.match(sourceViewer,/resource\?\.page_start/)
})
