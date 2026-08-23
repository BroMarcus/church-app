import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const actions=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/actions.ts'),'utf8')
const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/page.tsx'),'utf8')

test('private invitation server action independently verifies manage_members authority',()=>{
  assert.match(actions,/current_user_has_church_permission/)
  assert.match(actions,/p_permission_key:'manage_members'/)
  assert.match(actions,/const canInvite=\['pastor','church_admin'\]\.includes\(membership\.role\)\|\|Boolean\(custom\)/)
  assert.match(actions,/if\(!canInvite\)redirect\(path\(lang,'not_authorized'\)\)/)
})

test('private invitation access reads fail closed instead of looking unauthorized or successful',()=>{
  assert.match(actions,/claimsError[\s\S]*access_unavailable/)
  assert.match(actions,/membershipError[\s\S]*access_unavailable/)
  assert.match(actions,/permissionError[\s\S]*access_unavailable/)
  assert.match(page,/claimsError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(page,/membershipError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(page,/permissionError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
})

test('private invitation diagnostics are bounded and do not log provider messages',()=>{
  assert.match(actions,/const boundedCode=/)
  assert.match(actions,/errorCode:boundedCode\(claimsError\.code\)/)
  assert.match(actions,/errorCode:boundedCode\(membershipError\.code\)/)
  assert.match(actions,/errorCode:boundedCode\(permissionError\.code\)/)
  assert.doesNotMatch(actions,/error\.message|claimsError\.message|membershipError\.message|permissionError\.message/)
  assert.doesNotMatch(page,/error\.message|claimsError\.message|membershipError\.message|permissionError\.message/)
})

test('private invitation inputs are bounded server-side and client-side',()=>{
  assert.match(actions,/validEmail\(email\)/)
  assert.match(actions,/validText\(firstName,80\)/)
  assert.match(actions,/validText\(lastName,80\)/)
  assert.match(actions,/validText\(phone,40\)/)
  assert.match(page,/name="first_name"[\s\S]*maxLength=\{80\}/)
  assert.match(page,/name="last_name"[\s\S]*maxLength=\{80\}/)
  assert.match(page,/name="phone"[\s\S]*maxLength=\{40\}/)
  assert.match(page,/name="email"[\s\S]*maxLength=\{254\}/)
})

test('private invitation recovery is bilingual and does not encourage duplicate accounts',()=>{
  assert.ok(page.includes('We could not verify your invitation access right now. Nothing was changed.'))
  assert.ok(page.includes('No pudimos verificar tu acceso para invitar en este momento. No se cambió nada.'))
  assert.ok(page.includes('they should sign in with that same account—not create another one.'))
  assert.ok(page.includes('debe iniciar sesión con la misma cuenta; no debe crear otra.'))
})
