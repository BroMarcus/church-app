import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/join/[slug]/page.tsx'),'utf8')

test('public church join page catches thrown signup-status transport failures',()=>{
  assert.match(page,/try\{[\s\S]*get_public_signup_status_for_church[\s\S]*\}catch\(error\)\{[\s\S]*public church join status transport unavailable/)
  assert.match(page,/diagnosticCode\(error,'signup_status_unavailable'\)/)
  assert.match(page,/return <UnavailableState t=\{t\} slug=\{slug\} lang=\{lang\}\/>/)
})

test('public church join page catches thrown auth-state failures',()=>{
  assert.match(page,/try\{[\s\S]*createServerClient\(\)[\s\S]*server\.auth\.getClaims\(\)[\s\S]*\}catch\(error\)\{[\s\S]*public church join auth state transport unavailable/)
  assert.match(page,/diagnosticCode\(error,'auth_state_unavailable'\)/)
  assert.match(page,/let signedIn=false/)
})

test('public church join transport recovery stays bilingual and discourages duplicate accounts',()=>{
  assert.ok(page.includes('We could not safely check this church link right now.'))
  assert.ok(page.includes('No pudimos verificar de forma segura este enlace de la iglesia en este momento.'))
  assert.ok(page.includes('do not create another one.'))
  assert.ok(page.includes('no crees otra.'))
  assert.doesNotMatch(page,/transport unavailable'\s*,\s*\{message:/)
})
