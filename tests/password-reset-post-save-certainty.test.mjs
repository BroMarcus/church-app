import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const page=readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

test('a successful password update verifies that this browser session actually disappeared',()=>{
  assert.match(page,/async function finishPostResetSignOut/)
  assert.match(page,/await supabase\.auth\.signOut\(\{scope:'local'\}\)/)
  assert.match(page,/await supabase\.auth\.getSession\(\)/)
  assert.match(page,/if\(!verification\.data\.session\)return true/)
  assert.match(page,/post-reset session still present/)
})

test('password-reset cleanup does not sign the member out on every device',()=>{
  assert.doesNotMatch(page,/await supabase\.auth\.signOut\(\)/)
  assert.match(page,/post-reset local sign out failed/)
  assert.match(page,/post-reset local sign out unavailable/)
})

test('uncertain post-reset cleanup never relabels a successful password update as failed',()=>{
  assert.match(page,/setCompleted\(true\)[\s\S]*const signedOut=await finishPostResetSignOut\(supabase\)[\s\S]*if\(!signedOut\)\{setSignOutIncomplete\(true\);setMessage\(t\.signOutIncomplete\);return\}/)
  assert.match(page,/signOutIncomplete:'Your password was updated, but we could not safely finish signing this browser out/)
  assert.match(page,/signOutIncomplete:'Tu contraseña fue actualizada, pero no pudimos cerrar esta sesión del navegador de forma segura/)
  assert.match(page,/signOutIncomplete\?securityHref:signInHref/)
  assert.match(page,/signOutIncomplete\?t\.accountSecurity:t\.continue/)
})

test('post-reset sign-out diagnostics stay bounded and do not expose provider messages',()=>{
  assert.match(page,/post-reset local sign out failed',\{attempt,code:diagnosticCode\(error\)\}/)
  assert.match(page,/post-reset sign out verification failed',\{attempt,code:diagnosticCode\(verification\.error\)\}/)
  assert.match(page,/post-reset local sign out unavailable',\{attempt,code:diagnosticCode\(error\)\}/)
  assert.doesNotMatch(page,/post-reset local sign out failed',error\)/)
  assert.doesNotMatch(page,/post-reset sign out verification failed',verification\.error/)
})