import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const loginPage=fs.readFileSync(path.join(process.cwd(),'src/app/login/page.tsx'),'utf8')
const loginActions=fs.readFileSync(path.join(process.cwd(),'src/app/login/actions.ts'),'utf8')
const callbackRoute=fs.readFileSync(path.join(process.cwd(),'src/app/auth/callback/route.ts'),'utf8')
const confirmRoute=fs.readFileSync(path.join(process.cwd(),'src/app/auth/confirm/route.ts'),'utf8')
const verifyPage=fs.readFileSync(path.join(process.cwd(),'src/app/auth/verify/page.tsx'),'utf8')

test('malformed private invite never exposes ordinary create-account mode',()=>{
  assert.match(loginPage,/const inviteMalformed=Boolean\(params\.invite&&!inviteParam\)/)
  assert.match(loginPage,/const canCreate=!explicitSignin&&!inviteMalformed&&!availabilityFailed&&\(validInvite\|\|publicOpen\)/)
  assert.match(loginPage,/inviteMalformed&&<div className="notice error" role="alert">\{t\.malformedInvite\}<\/div>/)
  assert.ok(loginPage.includes('Do not create a new account from this link.'))
  assert.ok(loginPage.includes('No crees una cuenta nueva desde este enlace.'))
})

test('all account-entry server actions fail malformed invite context back to sign in',()=>{
  const guarded=(loginActions.match(/rawInviteId&&!inviteId\)redirect\(loginUrl\(lang,'&mode=signin'\+statusPart\('error','invite_malformed'\)\)\)/g)||[]).length
  assert.ok(guarded>=4,`expected at least four malformed-invite sign-in guards, got ${guarded}`)
})

test('modern and legacy confirmation routes classify malformed invite separately',()=>{
  assert.match(callbackRoute,/if\(rawInvite&&!inviteId\)return loginError\('invite_malformed'\)/)
  assert.match(confirmRoute,/explicitInviteRaw&&!explicitInviteId[\s\S]*error_code=invite_malformed/)
})

test('verification page does not tell a malformed church invite to request another account email',()=>{
  assert.match(verifyPage,/const inviteMalformed=Boolean\(params\.invite&&!inviteId\)/)
  assert.match(verifyPage,/inviteMalformed\?t\.malformedInvite:t\.fresh/)
  assert.ok(verifyPage.includes('Do not request another account email or create another account because of this link.'))
  assert.ok(verifyPage.includes('No solicites otro correo de cuenta ni crees otra cuenta por este enlace.'))
})