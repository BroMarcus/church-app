import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const transcript=readFileSync(new URL('../src/app/learning/transcript/page.tsx',import.meta.url),'utf8')

test('First Steps transcript derives required class count instead of hardcoding 17',()=>{
  assert.match(transcript,/requiredClassRows/)
  assert.match(transcript,/requiredClassCount/)
  assert.match(transcript,/passedClasses\/requiredClassCount/)
  assert.doesNotMatch(transcript,/all 17 class tests/)
})

test('First Steps final question count comes from the published assessment',()=>{
  assert.match(transcript,/questionCount/)
  assert.match(transcript,/question_count/)
  assert.match(transcript,/finalRow\?\.question_count/)
  assert.doesNotMatch(transcript,/34-question final exam/)
})
