import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/login/page.tsx'),'utf8')
const actions=fs.readFileSync(path.join(process.cwd(),'src/app/login/actions.ts'),'utf8')

test('login page distinguishes availability failures from real closed or invalid states',()=>{
  assert.match(page,/const publicStatusFailed=Boolean\(publicStatusError\)/)
  assert.match(page,/const availabilityFailed=inviteCheckFailed\|\|\(!validInvite&&publicStatusFailed\)/)
  assert.match(page,/params\.invite&&!validInvite&&!inviteCheckFailed&&!publicStatusFailed/)
  assert.match(page,/!params\.invite&&!publicOpen&&!publicStatusFailed/)
})

test('signup action does not mislabel backend read failures as closed signup or invalid invitation',()=>{
  assert.match(actions,/if\(inviteError\)[\s\S]*fail\('invite_check_unavailable'\)/)
  assert.match(actions,/if\(statusError\)[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!valid\)fail\('invite_invalid'\)/)
  assert.match(actions,/if\(!row\?\.open\)fail\('signup_closed'\)/)
})

test('availability recovery guidance is bilingual and discourages duplicate accounts',()=>{
  assert.ok(page.includes('We could not safely check account creation or invitation status right now.'))
  assert.ok(page.includes('No pudimos verificar de forma segura el registro o la invitación en este momento.'))
  assert.ok(page.includes('Do not create a second account.'))
  assert.ok(page.includes('No crees otra cuenta.'))
})

test('availability diagnostics use bounded error codes instead of provider messages',()=>{
  assert.match(page,/boundedCode\(error\.code\)/)
  assert.match(page,/boundedCode\(publicStatusError\.code\)/)
  assert.match(actions,/boundedCode\(inviteError\.code\)/)
  assert.match(actions,/boundedCode\(statusError\.code\)/)
  assert.doesNotMatch(actions,/invite validation unavailable'\s*,\s*\{message:/)
  assert.doesNotMatch(actions,/signup status unavailable'\s*,\s*\{message:/)
})

test('legacy first-login inference does not treat failed reads as proof of no activity',()=>{
  assert.match(actions,/const \[profileResult,groupsResult,enrollmentsResult\]=await Promise\.all/)
  assert.match(actions,/const inferenceError=profileResult\.error\|\|groupsResult\.error\|\|enrollmentsResult\.error/)
  assert.match(actions,/if\(inferenceError\)[\s\S]*legacy onboarding inference unavailable/)
  assert.match(actions,/\}else\{[\s\S]*const hasActivity=\(groupsResult\.count\?\?0\)>0\|\|\(enrollmentsResult\.count\?\?0\)>0/)
  assert.match(actions,/profile:profileResult\.error\?boundedCode\(profileResult\.error\.code\):'ok'/)
})
