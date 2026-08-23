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

test('join signup action separates unavailable or malformed status from unknown church and intentionally closed signup',()=>{
  assert.match(actions,/if\(statusError\)[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!church\)[\s\S]*empty_signup_status[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!church\.church_id\)fail\('missing_church'\)/)
  assert.match(actions,/if\(typeof church\.open!==['"]boolean['"]\)[\s\S]*malformed_signup_status[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!church\.open\)fail\('signup_closed'\)/)
})

test('public church join bounds slug and account inputs before RPC or Auth calls',()=>{
  assert.match(actions,/const EMAIL_MAX=254/)
  assert.match(actions,/const NAME_MAX=80/)
  assert.match(actions,/const PHONE_MAX=40/)
  assert.match(actions,/const NEW_PASSWORD_MAX=128/)
  assert.match(actions,/const SLUG_MAX=120/)
  assert.match(actions,/function safeChurchSlug\(value:string\)/)
  assert.match(actions,/function emailIssue\(email:string\)/)
  assert.match(actions,/firstName\.length>NAME_MAX\|\|lastName\.length>NAME_MAX/)
  assert.match(actions,/phone\.length>PHONE_MAX/)
  assert.match(actions,/password\.length>NEW_PASSWORD_MAX\|\|confirm\.length>NEW_PASSWORD_MAX/)
  assert.ok((actions.match(/safeChurchSlug\(text\(formData,'church_slug'\)\)/g)||[]).length>=2)
})

test('public church join page mirrors server bounds and rejects malformed route slugs before RPC',()=>{
  assert.match(page,/const safeChurchSlug=/)
  assert.match(page,/if\(!slug\)notFound\(\)/)
  assert.ok((page.match(/maxLength=\{NAME_MAX\}/g)||[]).length>=2)
  assert.ok(page.includes('maxLength={PHONE_MAX}'))
  assert.ok(page.includes('maxLength={EMAIL_MAX}'))
  assert.ok((page.match(/maxLength=\{PASSWORD_MAX\}/g)||[]).length>=2)
  assert.ok(page.includes('Enter a valid email address without extra spaces.'))
  assert.ok(page.includes('Escribe un correo electrónico válido y sin espacios adicionales.'))
})

test('public join diagnostics are bounded and do not log provider messages',()=>{
  assert.match(page,/boundedCode\(churchStatusError\.code\)/)
  assert.match(page,/boundedCode\(claimsError\.code\)/)
  assert.match(actions,/boundedCode\(statusError\.code\)/)
  assert.match(actions,/boundedCode\(error\.code\)/)
  assert.match(actions,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
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
