import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const page=readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

test('a thrown post-reset sign-out cannot relabel a successful password update as failed',()=>{
  assert.match(page,/const \{error\}=await supabase\.auth\.updateUser\(\{password\}\)/)
  assert.match(page,/setCompleted\(true\)[\s\S]*try\{[\s\S]*await supabase\.auth\.signOut\(\)[\s\S]*\}catch\(error\)\{[\s\S]*post-reset sign out request failed[\s\S]*setSignOutIncomplete\(true\)[\s\S]*setMessage\(t\.signOutIncomplete\)/)
})

test('post-reset sign-out failures keep bilingual recovery that states the password already changed',()=>{
  assert.match(page,/signOutIncomplete:'Your password was updated, but we could not safely finish signing this browser out/)
  assert.match(page,/signOutIncomplete:'Tu contraseña fue actualizada, pero no pudimos cerrar esta sesión del navegador de forma segura/)
  assert.match(page,/signOutIncomplete\?securityHref:signInHref/)
  assert.match(page,/signOutIncomplete\?t\.accountSecurity:t\.continue/)
})

test('post-reset sign-out diagnostics stay bounded and do not expose provider messages',()=>{
  assert.match(page,/console\.error\('post-reset sign out request failed',\{code:diagnosticCode\(error\)\}\)/)
  assert.doesNotMatch(page,/post-reset sign out request failed',error\)/)
})
