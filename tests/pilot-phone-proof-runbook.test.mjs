import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const runbook=await readFile(new URL('../src/app/church/readiness/phone-proof/runbook/page.tsx',import.meta.url),'utf8')
const phoneProof=await readFile(new URL('../src/app/church/readiness/phone-proof/page.tsx',import.meta.url),'utf8')

test('phone proof links a bilingual safe test runbook',()=>{
  assert.match(phoneProof,/phone-proof\/runbook\?lang=\$\{lang\}/)
  assert.match(phoneProof,/Open safe test runbook/)
  assert.match(phoneProof,/Abrir guía segura de prueba/)
  assert.match(phoneProof,/what secret\/private information must never be pasted/)
  assert.match(phoneProof,/qué información secreta\/privada nunca debes pegar/)
})

test('runbook is restricted to pastor and church admin and fails closed on lookup errors',()=>{
  assert.match(runbook,/supabase\.auth\.getClaims\(\)/)
  assert.match(runbook,/PHONE_PROOF_RUNBOOK_AUTH_UNAVAILABLE/)
  assert.match(runbook,/PHONE_PROOF_RUNBOOK_MEMBERSHIP_UNAVAILABLE/)
  assert.match(runbook,/\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(runbook,/function boundedCode\(value:unknown\)/)
  assert.match(runbook,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
})

test('runbook requires test accounts and one exact test site',()=>{
  assert.match(runbook,/Use test accounts only/)
  assert.match(runbook,/Usa solamente cuentas de prueba/)
  assert.match(runbook,/Use one exact preview\/site for the full run/)
  assert.match(runbook,/Usa un solo sitio\/vista previa exacta durante toda la prueba/)
  assert.match(runbook,/NEW: an email address that has never had a Kingdom Network account/)
  assert.match(runbook,/EXISTING: an existing test account that is not connected to the target church/)
  assert.match(runbook,/ADMIN: a pastor\/church-admin test account/)
})

test('runbook covers the pilot critical auth onboarding guide and setup flows',()=>{
  for(const text of [
    'New signup → confirmation → Start Here → sign out/in',
    'Existing account → join church',
    'Invitation replacement / old-link recovery',
    'Forgot password → newest reset email → sign in',
    'Kingdom Guide recovery help',
    'Fresh Church Setup → recommendation → unpublished draft'
  ]) assert.match(runbook,new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
})

test('runbook explicitly requires Spanish retesting of critical flows',()=>{
  const repeatSpanish=(runbook.match(/Repeat[^\n]*in Spanish/g)||[]).length
  const spanishCopy=(runbook.match(/Repite[^\n]*español/g)||[]).length
  assert.ok(repeatSpanish>=4)
  assert.ok(spanishCopy>=4)
  assert.match(runbook,/start the flow in Español and keep it in Spanish/)
  assert.match(runbook,/empieza el flujo en Español y mantenlo en español/)
})

test('runbook protects secrets and private church data in failure reports',()=>{
  assert.match(runbook,/Never paste into the Control Room/)
  assert.match(runbook,/Nunca pegues en el Control Room/)
  assert.match(runbook,/passwords or one-time codes/)
  assert.match(runbook,/full confirmation or password-reset links/)
  assert.match(runbook,/invitation\/join tokens or secret query strings/)
  assert.match(runbook,/real member personal information/)
  assert.match(runbook,/private prayer, pastoral-care, finance, or meeting-address data/)
})

test('runbook tells testers to stop on duplicate-account, repeated-submit, raw-error, Spanish, and publish failures',()=>{
  assert.match(runbook,/raw database\/provider\/technical text/)
  assert.match(runbook,/appears to submit more than once/)
  assert.match(runbook,/asks you to create another account/)
  assert.match(runbook,/English-only dead end/)
  assert.match(runbook,/publishes a course instead of leaving an unpublished draft/)
})

test('runbook shows the deployed Git build and does not perform production writes',()=>{
  assert.match(runbook,/VERCEL_GIT_COMMIT_SHA/)
  assert.match(runbook,/NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA/)
  assert.doesNotMatch(runbook,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
})
