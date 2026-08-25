import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const loginSubmit=read('src/app/login/pending-submit.tsx')
const loginAction=read('src/app/login/pending-action.tsx')
const joinSubmit=read('src/app/join/[slug]/join-submit-button.tsx')
const inviteSubmit=read('src/app/church/invites/pending-submit.tsx')
const setupAction=read('src/app/church/setup-inbox/setup-action-button.tsx')

test('critical pilot submit buttons block repeat taps and expose busy state',()=>{
  for(const source of [loginSubmit,loginAction,joinSubmit,inviteSubmit,setupAction]){
    assert.match(source,/disabled=/)
    assert.match(source,/aria-disabled=/)
    assert.match(source,/aria-busy=/)
  }
})

test('critical pending labels are announced politely for low-tech and assistive users',()=>{
  for(const source of [loginSubmit,loginAction,joinSubmit,inviteSubmit,setupAction]){
    assert.match(source,/aria-live="polite"/)
  }
})

test('forgot-password and resend cooldown survives browsers where local storage is unavailable',()=>{
  assert.match(loginAction,/try\{\s*const until=Number\(window\.localStorage\.getItem/)
  assert.match(loginAction,/catch\{\s*\/\/ Storage can be unavailable/)
  assert.match(loginAction,/try\{[\s\S]*window\.localStorage\.setItem/)
  assert.match(loginAction,/server-side rate limits remain the authority/)
  assert.match(loginAction,/setRemaining\(0\)/)
})

test('auth email cooldown begins only after the server confirms an email was sent',()=>{
  assert.match(loginAction,/successCode=cooldownKey==='password-reset'\?'reset_sent':cooldownKey==='confirmation-resend'\?'confirmation_sent':''/)
  assert.match(loginAction,/params\.get\('message_code'\)!==successCode/)
  assert.match(loginAction,/window\.localStorage\.setItem\(storageKey,String\(until\)\)/)
  assert.doesNotMatch(loginAction,/if\(status\.pending&&!started\.current\)/)
  assert.doesNotMatch(loginAction,/Date\.now\(\)\+cooldownSeconds\*1000[\s\S]*status\.pending/)
})

test('confirmed-send cooldown does not extend itself on a normal page reload',()=>{
  assert.match(loginAction,/const existing=Number\(window\.localStorage\.getItem\(storageKey\)\|\|0\)/)
  assert.match(loginAction,/if\(existing>now\)\{[\s\S]*setRemaining\(Math\.max\(0,Math\.ceil\(\(existing-now\)\/1000\)\)\)[\s\S]*return/)
})