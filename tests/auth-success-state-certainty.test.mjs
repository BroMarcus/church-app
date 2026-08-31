import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const callback=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')
const verify=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')
const loginActions=readFileSync(new URL('../src/app/login/actions.ts',import.meta.url),'utf8')
const resetPage=readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

test('sign in requires a real authenticated user and session before continuing',()=>{
  assert.match(loginActions,/const \{data,error\}=signInResult/)
  assert.match(loginActions,/if\(!data\?\.session\|\|!data\.user\?\.id\)\{/)
  assert.match(loginActions,/login returned incomplete auth state/)
  const stateCheck=loginActions.indexOf('login returned incomplete auth state')
  const inviteRedeem=loginActions.indexOf("redeemInvite(supabase,inviteId,'existing-account private')")
  const joinRedirect=loginActions.indexOf('if(next)redirect(next)')
  assert.ok(stateCheck>0&&stateCheck<inviteRedeem,'private invitation redemption must require a verified sign-in state')
  assert.ok(stateCheck<joinRedirect,'church return redirects must require a verified sign-in state')
})

test('signup does not report account creation when Auth returns no user',()=>{
  assert.match(loginActions,/if\(!data\?\.user\)\{/)
  assert.match(loginActions,/signup returned incomplete auth state/)
  assert.match(loginActions,/fail\('email_failed'\)/)
  const stateCheck=loginActions.indexOf('signup returned incomplete auth state')
  const successMessage=loginActions.indexOf("statusPart('message','account_created')")
  assert.ok(stateCheck>0&&stateCheck<successMessage,'account-created message must require a returned Auth user')
})

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
  const stateCheck=verify.indexOf('auth token verification returned incomplete auth state')
  const recoveryRedirect=verify.indexOf("if(rawType==='recovery')")
  const inviteRedeem=verify.indexOf("if(rawType==='email'&&inviteId)")
  assert.ok(stateCheck>0&&stateCheck<recoveryRedirect,'auth state must be verified before password recovery continues')
  assert.ok(stateCheck<inviteRedeem,'auth state must be verified before private invitation redemption')
})

test('password update requires Auth to return the updated user before showing completion',()=>{
  assert.match(resetPage,/const \{data,error\}=await supabase\.auth\.updateUser\(\{password\}\)/)
  assert.match(resetPage,/if\(!data\?\.user\)\{console\.error\('password update returned incomplete auth state'/)
  const stateCheck=resetPage.indexOf('password update returned incomplete auth state')
  const completed=resetPage.indexOf('setCompleted(true)')
  const signOut=resetPage.indexOf('finishPostResetSignOut(supabase)')
  assert.ok(stateCheck>0&&stateCheck<completed,'password reset must not report completion without a returned user')
  assert.ok(stateCheck<signOut,'post-reset sign-out must not run after an unverified password-update result')
})

test('incomplete auth state remains retryable and preserves validated join/invite context',()=>{
  assert.match(callback,/const linkUnavailable=\(\)=>NextResponse\.redirect\(new URL\(`\/auth\/link-unavailable\?lang=\$\{lang\}\$\{inviteId\?/)
  assert.match(verify,/redirect\(verifyRetryUrl\(tokenHash,rawType,lang,joinNext,inviteId\)\)/)
  assert.doesNotMatch(callback,/auth_state_missing[\s\S]{0,160}callback_expired/)
  assert.doesNotMatch(verify,/auth_state_missing[\s\S]{0,160}callback_expired/)
})
