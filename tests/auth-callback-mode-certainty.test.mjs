import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const callback=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')
const confirm=readFileSync(new URL('../src/app/auth/confirm/route.ts',import.meta.url),'utf8')

test('modern auth callback requires an explicit supported mode before exchanging the code',()=>{
  assert.match(callback,/const rawMode=url\.searchParams\.get\('mode'\)/)
  assert.match(callback,/const mode=rawMode==='signup'\|\|rawMode==='recovery'\?rawMode:null/)
  assert.match(callback,/if\(!mode\)return loginError\('callback_incomplete'\)/)
  assert.match(callback,/if\(!mode\)return loginError\('callback_incomplete'\)[\s\S]*exchangeCodeForSession\(code\)/)
  assert.doesNotMatch(callback,/url\.searchParams\.get\('mode'\)==='recovery'\?'recovery':'signup'/)
})

test('private invitation redemption can only occur after an explicit signup callback mode',()=>{
  assert.match(callback,/if\(mode==='signup'&&inviteId\)/)
  assert.match(callback,/return NextResponse\.redirect\(new URL\(mode==='recovery'\?recoveryNext:signupNext,siteUrl\)\)/)
})

test('legacy callback redirect context does not default unknown modes to signup',()=>{
  assert.match(confirm,/if\(mode==='recovery'\)[\s\S]*if\(mode==='signup'\)[\s\S]*return empty/)
  assert.match(confirm,/if\(mode==='signup'\)\{[\s\S]*signupNext:safeSignupDestination/)
  assert.match(confirm,/if\(mode==='signup'\)\{[\s\S]*recoveryNext:''\}\s*\n\s*\}\s*\n\s*return empty/)
})
