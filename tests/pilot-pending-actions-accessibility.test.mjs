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
  assert.match(loginAction,/try\{window\.localStorage\.setItem/)
  assert.match(loginAction,/server-side rate limits remain the authority/)
  assert.match(loginAction,/setRemaining\(0\)/)
})
