import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const actions=read('src/app/login/actions.ts')

test('auth server actions fail closed when the Supabase client cannot be created',()=>{
  assert.match(actions,/async function getSupabase\(context:string\)/)
  assert.match(actions,/client unavailable/)
  assert.match(actions,/if\(!supabase\)redirect\(loginUrl\(lang,'&mode=signin'.*'login_failed'/s)
  assert.match(actions,/if\(!supabase\)fail\(inviteId\?'invite_check_unavailable':'signup_status_unavailable'\)/)
  assert.match(actions,/password reset request/)
  assert.match(actions,/confirmation resend/)
})

test('sign-in, signup, reset, and resend transport exceptions map to safe fixed statuses',()=>{
  assert.match(actions,/login transport unavailable/)
  assert.match(actions,/signup transport unavailable/)
  assert.match(actions,/requestPasswordReset transport unavailable/)
  assert.match(actions,/resendConfirmation transport unavailable/)
  assert.match(actions,/statusPart\('error','login_failed'\)/)
  assert.match(actions,/fail\('email_failed'\)/)
  assert.match(actions,/statusPart\('error','email_failed'\)/)
})

test('signup availability RPC transport failures stay distinct from real closed or invalid states',()=>{
  assert.match(actions,/signup invite validation transport unavailable/)
  assert.match(actions,/fail\('invite_check_unavailable'\)/)
  assert.match(actions,/public signup status transport unavailable/)
  assert.match(actions,/fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!valid\)fail\('invite_invalid'\)/)
  assert.match(actions,/if\(!row\.open\)fail\('signup_closed'\)/)
})

test('private invite redemption and local cleanup tolerate thrown RPC or sign-out failures',()=>{
  assert.match(actions,/async function redeemInvite/)
  assert.match(actions,/invitation redemption unavailable/)
  assert.match(actions,/async function cleanupLocalSession/)
  assert.match(actions,/for\(let attempt=1;attempt<=2;attempt\+=1\)/)
  assert.match(actions,/local sign out unavailable/)
  assert.match(actions,/status=signout_failed/)
})

test('legacy first-login inference transport failures do not invent a new-member state',()=>{
  assert.match(actions,/legacy onboarding inference transport unavailable/)
  assert.match(actions,/if\(historyResults\)/)
  assert.match(actions,/if\(hasBasicProfile&&!hasActivity\)redirect/)
})

test('new transport diagnostics remain bounded and do not log raw thrown errors',()=>{
  assert.match(actions,/const diagnosticCode=/)
  assert.match(actions,/diagnosticCode\(authError,'signin_unavailable'\)/)
  assert.match(actions,/diagnosticCode\(signupError,'signup_unavailable'\)/)
  assert.doesNotMatch(actions,/console\.error\([^\n]*,\s*authError\s*\)/)
  assert.doesNotMatch(actions,/console\.error\([^\n]*,\s*signupError\s*\)/)
})
