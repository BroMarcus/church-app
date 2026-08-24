import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const loginActions=read('src/app/login/actions.ts')
const callbackRoute=read('src/app/auth/callback/route.ts')
const confirmRoute=read('src/app/auth/confirm/route.ts')
const verifyActions=read('src/app/auth/verify/actions.ts')
const verifyPage=read('src/app/auth/verify/page.tsx')
const updatePassword=read('src/app/auth/update-password/page.tsx')

test('auth and recovery diagnostics do not log raw provider messages',()=>{
  for(const source of [loginActions,callbackRoute,verifyActions,updatePassword]){
    assert.doesNotMatch(source,/console\.error\([^\n]*\{[^\n]*message\s*:/)
    assert.doesNotMatch(source,/error instanceof Error\?error\.message/)
  }
})

test('server auth diagnostics use sanitized bounded provider codes',()=>{
  assert.match(loginActions,/const boundedCode=\(value:unknown\)=>String\(value\|\|'unknown'\)\.replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)\|\|'unknown'/)
  assert.match(loginActions,/signup failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(loginActions,/requestPasswordReset failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(loginActions,/resendConfirmation failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(loginActions,/login unavailable',\{code:authCode,status:/)
  assert.match(callbackRoute,/session exchange failed',\{mode,code:boundedCode\(error\.code\)\}/)
  assert.match(verifyActions,/token verification failed',\{type:rawType,code:boundedCode\(error\.code\)\}/)
})

test('signup and account-email recovery classify failures by stable auth code, not provider message text',()=>{
  assert.match(loginActions,/function authEmailErrorCode\(error:\{code\?:unknown;status\?:unknown\}\)/)
  assert.match(loginActions,/code==='over_email_send_rate_limit'\|\|code==='over_request_rate_limit'/)
  assert.match(loginActions,/code==='email_exists'\|\|code==='user_already_exists'/)
  assert.match(loginActions,/code==='weak_password'/)
  assert.match(loginActions,/code==='email_address_invalid'/)
  assert.doesNotMatch(loginActions,/authEmailErrorCode\(error\.message\)/)
  assert.doesNotMatch(loginActions,/normalized\.includes\('rate limit'\)/)
  assert.match(loginActions,/authEmailErrorCode\(error\)/)
})

test('client password reset diagnostics stay bounded without exposing exception text',()=>{
  assert.match(updatePassword,/function diagnosticCode\(error:unknown\)/)
  assert.match(updatePassword,/password reset initialization failed',\{code:diagnosticCode\(error\)\}/)
  assert.match(updatePassword,/password update request failed',\{code:diagnosticCode\(error\)\}/)
  assert.match(updatePassword,/post-reset sign out failed',\{code:diagnosticCode\(signOutError\)\}/)
})

test('join-context recovery allowlists remain intact',()=>{
  assert.match(loginActions,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(callbackRoute,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(confirmRoute,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(verifyActions,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(updatePassword,/parsed\.pathname\.startsWith\('\/join\/'\)/)
})

test('auth callback recovery cannot redirect directly into ordinary signed-in pages',()=>{
  assert.match(callbackRoute,/mode==='recovery'\s*\?`\/auth\/update-password\?lang=\$\{lang\}/)
  assert.match(callbackRoute,/safeSignupDestination\(rawNext,signupFallback\)/)
  assert.match(callbackRoute,/parsed\.pathname==='\/start'\|\|parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.doesNotMatch(callbackRoute,/allowedAuthDestination/)
})

test('legacy token confirmation validates token size and supported OTP types before verification',()=>{
  assert.match(confirmRoute,/MAX_AUTH_VALUE_LENGTH=1000/)
  assert.match(confirmRoute,/allowedTypes=new Set\(\['email','recovery','invite','magiclink','email_change'\]\)/)
  assert.match(confirmRoute,/tokenHash\.length>MAX_AUTH_VALUE_LENGTH/)
  assert.match(verifyActions,/tokenHash\.length>MAX_AUTH_VALUE_LENGTH/)
  assert.match(verifyPage,/validType=Boolean\(params\.type&&allowedTypes\.has\(params\.type\)\)/)
  assert.match(verifyPage,/validToken=Boolean\(params\.token_hash&&params\.token_hash\.length<=MAX_AUTH_VALUE_LENGTH\)/)
})

test('recovery verification preserves only a safe church join return target',()=>{
  assert.match(verifyActions,/const joinNext=safeJoinDestination\(rawNext\)/)
  assert.match(verifyActions,/if\(rawType==='recovery'\)/)
  assert.match(verifyActions,/redirect\(`\/auth\/update-password\?lang=\$\{lang\}\$\{nextPart\}`\)/)
  assert.doesNotMatch(verifyActions,/if\(next&&next!=='\/'\)redirect\(next\)/)
})