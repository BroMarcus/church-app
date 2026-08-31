import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const action=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')
const page=readFileSync(new URL('../src/app/auth/verify/page.tsx',import.meta.url),'utf8')

test('token-hash verification routes each supported auth purpose explicitly',()=>{
  assert.match(action,/if\(rawType==='recovery'\)[\s\S]*\/auth\/update-password/)
  assert.match(action,/if\(rawType==='email'\)redirect\(signupNext\)/)
  assert.match(action,/if\(rawType==='invite'\)redirect\(signupFallback\)/)
  assert.match(action,/if\(rawType==='magiclink'\)redirect\(joinNext\|\|\(lang==='es'\?'\/\?lang=es':'\/'\)\)/)
  assert.match(action,/if\(rawType==='email_change'\)redirect\(`\/account\/security\?lang=\$\{lang\}`\)/)
})

test('email-change verification cannot fall through to first-login Start Here routing or stale request guidance',()=>{
  const emailChangeIndex=action.indexOf("if(rawType==='email_change')")
  const finalFallbackIndex=action.lastIndexOf("redirect(`${loginBase}&error_code=callback_incomplete`)")
  assert.ok(emailChangeIndex>0)
  assert.ok(finalFallbackIndex>emailChangeIndex)
  assert.match(action.slice(emailChangeIndex,finalFallbackIndex),/account\/security/)
  assert.doesNotMatch(action.slice(emailChangeIndex,finalFallbackIndex),/\/start\?welcome=1/)
  assert.doesNotMatch(action.slice(emailChangeIndex,finalFallbackIndex),/&email=1/)
})

test('private church invite context is only accepted with email confirmation or password recovery links',()=>{
  assert.match(action,/if\(inviteId&&rawType!=='email'&&rawType!=='recovery'\)/)
  assert.match(action,/error_code=invite_malformed/)
  assert.match(page,/const inviteContextSupported=!inviteId\|\|params\.type==='email'\|\|params\.type==='recovery'/)
  assert.match(page,/inviteId&&!inviteContextSupported\?t\.unsupportedInviteContext/)
})

test('verification UI describes the actual link purpose in English and Spanish',()=>{
  assert.match(page,/magic:'Sign in securely'/)
  assert.match(page,/emailChange:'Confirm your new login email'/)
  assert.match(page,/magic:'Iniciar sesión de forma segura'/)
  assert.match(page,/emailChange:'Confirmar tu nuevo correo de acceso'/)
  assert.match(page,/isMagic\?t\.magic/)
  assert.match(page,/isEmailChange\?t\.emailChange/)
})

test('invalid verification links do not tell users to tap a button that is not rendered',()=>{
  assert.match(page,/invalidSecurity:'For your security, Kingdom Network did not process this incomplete or unsupported account link.'/)
  assert.match(page,/invalidSecurity:'Por tu seguridad, Kingdom Network no procesó este enlace de cuenta incompleto o no compatible.'/)
  assert.match(page,/\{hasLink\?t\.security:t\.invalidSecurity\}/)
})
