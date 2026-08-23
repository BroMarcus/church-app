import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/join/[slug]/page.tsx'),'utf8')
const actions=fs.readFileSync(path.join(process.cwd(),'src/app/join/[slug]/actions.ts'),'utf8')

test('public church join page does not turn backend availability failures into a missing-link state',()=>{
  assert.match(page,/error:churchStatusError/)
  assert.match(page,/if\(churchStatusError\)[\s\S]*public church join status unavailable/)
  assert.match(page,/if\(!church\?\.church_id\)notFound\(\)/)
  assert.ok(page.includes('We could not safely check this church link right now.'))
  assert.ok(page.includes('No pudimos verificar de forma segura este enlace de la iglesia en este momento.'))
})

test('join signup action separates unavailable status, unknown church, and intentionally closed signup',()=>{
  assert.match(actions,/if\(statusError\)[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!church\?\.church_id\)fail\('missing_church'\)/)
  assert.match(actions,/if\(!church\?\.open\)fail\('signup_closed'\)/)
})

test('public join diagnostics are bounded and do not log provider messages',()=>{
  assert.match(page,/boundedCode\(churchStatusError\.code\)/)
  assert.match(page,/boundedCode\(claimsError\.code\)/)
  assert.match(actions,/boundedCode\(statusError\.code\)/)
  assert.match(actions,/boundedCode\(error\.code\)/)
  assert.doesNotMatch(actions,/console\.error\([^\n]+message:error\.message/)
  assert.doesNotMatch(page,/console\.error\([^\n]+message:/)
})

test('existing-account join fails closed on auth uncertainty or empty rpc result',()=>{
  assert.match(actions,/data:claims,error:claimsError/)
  assert.match(actions,/if\(claimsError\)[\s\S]*fail\('join_failed'\)/)
  assert.match(actions,/if\(!row\)[\s\S]*fail\('join_failed'\)/)
})

test('existing-account join uses the pending submit button to block repeat taps',()=>{
  assert.match(page,/JoinSubmitButton label=\{t\.existing\} workingLabel=\{t\.connecting\}/)
  assert.ok(page.includes('Connecting your account…'))
  assert.ok(page.includes('Conectando tu cuenta…'))
})
