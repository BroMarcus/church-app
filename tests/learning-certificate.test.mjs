import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../supabase/migrations/20260928033000_learning_certificate_identity.sql',import.meta.url),'utf8')
const page=readFileSync(new URL('../src/app/learning/certificate/[courseId]/page.tsx',import.meta.url),'utf8')
const course=readFileSync(new URL('../src/app/learning/[courseId]/page.tsx',import.meta.url),'utf8')
const transcript=readFileSync(new URL('../src/app/learning/transcript/page.tsx',import.meta.url),'utf8')

test('certificate identity is issued only from a credential-earned enrollment',()=>{
  assert.match(migration,/credential_earned,false\)=true/)
  assert.match(migration,/certificate_number/)
  assert.match(migration,/certificate_issued_at/)
  assert.match(migration,/course_enrollments_certificate_number_uidx/)
  assert.match(page,/enrollment\?\.credential_earned/)
  assert.match(page,/enrollment\.certificate_number/)
})

test('completed learners can open a printable certificate from course and transcript',()=>{
  assert.match(page,/Print \/ Save PDF/)
  assert.match(page,/Certificate number/)
  assert.match(course,/\/learning\/certificate\//)
  assert.match(transcript,/\/learning\/certificate\//)
})
