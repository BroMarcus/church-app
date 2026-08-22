import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const loginActions=read('src/app/login/actions.ts')
const callbackRoute=read('src/app/auth/callback/route.ts')
const verifyActions=read('src/app/auth/verify/actions.ts')
const updatePassword=read('src/app/auth/update-password/page.tsx')

test('auth and recovery diagnostics do not log raw provider messages',()=>{
  for(const source of [loginActions,callbackRoute,verifyActions,updatePassword]){
    assert.doesNotMatch(source,/console\.error\([^\n]*\{[^\n]*message\s*:/)
    assert.doesNotMatch(source,/error instanceof Error\?error\.message/)
  }
})

test('server auth diagnostics are bounded to provider error codes',()=>{
  assert.match(loginActions,/const boundedCode=\(value:unknown\)=>String\(value\|\|'unknown'\)\.slice\(0,80\)/)
  assert.match(loginActions,/signup failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(loginActions,/requestPasswordReset failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(loginActions,/resendConfirmation failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(callbackRoute,/session exchange failed',\{mode,code:boundedCode\(error\.code\)\}/)
  assert.match(verifyActions,/token verification failed',\{type:rawType,code:boundedCode\(error\.code\)\}/)
})

test('client password reset diagnostics stay bounded without exposing exception text',()=>{
  assert.match(updatePassword,/function diagnosticCode\(error:unknown\)/)
  assert.match(updatePassword,/password reset initialization failed',\{code:diagnosticCode\(error\)\}/)
  assert.match(updatePassword,/password update request failed',\{code:diagnosticCode\(error\)\}/)
  assert.match(updatePassword,/post-reset sign out failed',\{code:diagnosticCode\(signOutError\)\}/)
})

test('join-context recovery allowlists remain intact',()=>{
  assert.match(loginActions,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(callbackRoute,/path\.startsWith\('\/join\/'\)/)
  assert.match(verifyActions,/path\.startsWith\('\/join\/'\)/)
  assert.match(updatePassword,/parsed\.pathname\.startsWith\('\/join\/'\)/)
})
