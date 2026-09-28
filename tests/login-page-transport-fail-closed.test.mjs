import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/login/page.tsx'),'utf8')

test('login page catches thrown invitation preview failures and fails closed',()=>{
  assert.match(page,/if\(inviteParam\)\{[\s\S]*try\{[\s\S]*get_invite_preview[\s\S]*\}catch\(error\)\{[\s\S]*inviteCheckFailed=true/)
  assert.match(page,/login invite preview transport unavailable/)
  assert.match(page,/diagnosticCode\(error,'invite_preview_unavailable'\)/)
  assert.match(page,/const availabilityFailed=inviteCheckFailed\|\|inviteDecisionInvalid/)
})

test('login page catches thrown public signup status failures and does not call them closed signup',()=>{
  assert.match(page,/if\(!explicitSignin\)\{[\s\S]*try\{[\s\S]*get_public_signup_status[\s\S]*\}catch\(error\)\{[\s\S]*publicStatusFailed=true/)
  assert.match(page,/login public signup status transport unavailable/)
  assert.match(page,/diagnosticCode\(error,'signup_status_unavailable'\)/)
  assert.match(page,/!explicitSignin&&!params\.invite&&!publicOpen&&!publicStatusFailed/)
})

test('login transport diagnostics stay bounded and bilingual recovery remains available',()=>{
  assert.match(page,/const diagnosticCode=\(error:unknown,fallback:string\)=>/)
  assert.match(page,/return boundedCode\(fallback\)/)
  assert.ok(page.includes('We could not safely check account creation or invitation status right now.'))
  assert.ok(page.includes('No pudimos verificar de forma segura el registro o la invitación en este momento.'))
  assert.doesNotMatch(page,/transport unavailable'\s*,\s*\{message:/)
})
