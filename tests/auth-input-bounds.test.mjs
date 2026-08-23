import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/login/page.tsx'),'utf8')
const actions=fs.readFileSync(path.join(process.cwd(),'src/app/login/actions.ts'),'utf8')
const updatePassword=fs.readFileSync(path.join(process.cwd(),'src/app/auth/update-password/page.tsx'),'utf8')

test('server actions bound account inputs before calling auth providers',()=>{
  assert.match(actions,/const EMAIL_MAX=254/)
  assert.match(actions,/const NAME_MAX=80/)
  assert.match(actions,/const NEW_PASSWORD_MAX=128/)
  assert.match(actions,/const EXISTING_PASSWORD_MAX=4096/)
  assert.match(actions,/const INVITE_MAX=128/)
  assert.match(actions,/const JOIN_NEXT_MAX=500/)
  assert.match(actions,/if\(firstName\.length>NAME_MAX\|\|lastName\.length>NAME_MAX\)fail\('name_too_long'\)/)
  assert.match(actions,/if\(password\.length>NEW_PASSWORD_MAX\|\|confirmPassword\.length>NEW_PASSWORD_MAX\)fail\('password_too_long'\)/)
  assert.match(actions,/if\(password\.length>EXISTING_PASSWORD_MAX\).*password_too_long/)
  assert.match(actions,/if\(rawInviteId&&!inviteId\)fail\('invite_invalid'\)/)
})

test('email validation is reused by sign in, signup, reset, and confirmation resend',()=>{
  assert.match(actions,/function emailIssue\(email:string\)/)
  assert.match(actions,/email\.length>EMAIL_MAX\|\|\/\\s\/\.test\(email\)/)
  assert.ok((actions.match(/const emailError=emailIssue\(email\)/g)||[]).length>=4)
})

test('oversized join context is discarded before auth recovery redirects',()=>{
  assert.match(actions,/value\.length>JOIN_NEXT_MAX/)
  assert.match(page,/value\.length>500/)
  assert.match(updatePassword,/value\.length>500/)
})

test('login page mirrors server limits for low-tech users',()=>{
  assert.ok(page.includes('maxLength={80}'))
  assert.ok((page.match(/maxLength=\{254\}/g)||[]).length>=3)
  assert.ok((page.match(/maxLength=\{128\}/g)||[]).length>=2)
  assert.ok(page.includes('maxLength={4096}'))
})

test('password reset completion enforces the same new-password ceiling',()=>{
  assert.match(updatePassword,/password\.length>128\|\|confirm\.length>128/)
  assert.ok((updatePassword.match(/maxLength=\{128\}/g)||[]).length>=2)
  assert.ok(updatePassword.includes('Password must be 128 characters or fewer.'))
  assert.ok(updatePassword.includes('La contraseña debe tener 128 caracteres o menos.'))
})

test('password reset completion does not rerun initialization and overwrite success state',()=>{
  assert.match(updatePassword,/useEffect\(\(\)=>\{[\s\S]*?return\(\)=>\{mounted=false;listener\.subscription\.unsubscribe\(\)\}\n  \},\[\]\)/)
  assert.doesNotMatch(updatePassword,/\},\[completed\]\)/)
})

test('password reset reports a failed post-reset sign-out instead of claiming a clean sign-in handoff',()=>{
  assert.ok(updatePassword.includes('setSignOutIncomplete(true)'))
  assert.ok(updatePassword.includes('Your password was updated, but we could not safely finish signing this browser out.'))
  assert.ok(updatePassword.includes('Tu contraseña fue actualizada, pero no pudimos cerrar esta sesión del navegador de forma segura.'))
  assert.ok(updatePassword.includes("signOutIncomplete?securityHref:signInHref"))
})

test('bilingual messages explain bounded-input failures without provider text',()=>{
  assert.ok(page.includes('Your first and last name must each be 80 characters or fewer.'))
  assert.ok(page.includes('Tu nombre y apellido deben tener 80 caracteres o menos cada uno.'))
  assert.ok(page.includes('Enter a valid email address without extra spaces.'))
  assert.ok(page.includes('Escribe un correo electrónico válido y sin espacios adicionales.'))
  assert.ok(page.includes('That password is too long. Use a shorter password and try again.'))
  assert.ok(page.includes('Esa contraseña es demasiado larga. Usa una contraseña más corta e inténtalo otra vez.'))
})

test('malformed oversized invitation ids are not echoed back into login links',()=>{
  assert.match(page,/const inviteParam=params\.invite&&params\.invite\.length<=128\?params\.invite:''/)
  assert.match(page,/const inviteMalformed=Boolean\(params\.invite&&!inviteParam\)/)
  assert.match(page,/if\(inviteParam\)\{/)
  assert.match(page,/inviteParam\?`&invite=\$\{encodeURIComponent\(inviteParam\)\}`:''/)
})
