import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const callback=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')
const verify=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')

test('modern callback does not treat an empty auth success payload as a verified session',()=>{
  assert.match(callback,/const \{data,error\}=await supabase\.auth\.exchangeCodeForSession\(code\)/)
  assert.match(callback,/if\(!data\?\.session\|\|!data\.user\)\{/)
  assert.match(callback,/auth callback session exchange returned incomplete auth state/)
  assert.match(callback,/code:'auth_state_missing'/)
  assert.match(callback,/return linkUnavailable\(\)/)
})

test('token-hash verification requires both a session and user before recovery or invite redemption',()=>{
  assert.match(verify,/const \{data,error\}=await supabase\.auth\.verifyOtp/)
  assert.match(verify,/else verifiedAuthState=data/)
  assert.match(verify,/if\(!verifiedAuthState\?\.session\|\|!verifiedAuthState\.user\)\{/)
  assert.match(verify,/auth token verification returned incomplete auth state/)
  const stateCheck=verify.indexOf("auth token verification returned incomplete auth state")
  const recoveryRedirect=verify.indexOf("if(rawType==='recovery')")
  const inviteRedeem=verify.indexOf("if(rawType==='email'&&inviteId)")
  assert.ok(stateCheck>0&&stateCheck<recoveryRedirect,'auth state must be verified before password recovery continues')
  assert.ok(stateCheck<inviteRedeem,'auth state must be verified before private invitation redemption')
})

test('incomplete auth state remains retryable and preserves validated join/invite context',()=>{
  assert.match(callback,/const linkUnavailable=\(\)=>NextResponse\.redirect\(new URL\(`\/auth\/link-unavailable\?lang=\$\{lang\}\$\{inviteId\?/)
  assert.match(verify,/redirect\(verifyRetryUrl\(tokenHash,rawType,lang,joinNext,inviteId\)\)/)
  assert.doesNotMatch(callback,/auth_state_missing[\s\S]{0,160}callback_expired/)
  assert.doesNotMatch(verify,/auth_state_missing[\s\S]{0,160}callback_expired/)
})
