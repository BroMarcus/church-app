import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source=fs.readFileSync(path.join(process.cwd(),'src/app/church/readiness/page.tsx'),'utf8')

test('Pilot Readiness catches client, Auth, membership, and readiness transport failures',()=>{
  assert.match(source,/try\{supabase=await createClient\(\)\}/)
  assert.match(source,/Pilot readiness client unavailable/)
  assert.match(source,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}/)
  assert.match(source,/Pilot readiness auth transport failed/)
  assert.match(source,/try\{membershipResult=await supabase\.from\('church_memberships'\)/)
  assert.match(source,/Pilot readiness membership transport failed/)
  assert.match(source,/const readinessResult=await supabase\.rpc\('church_pilot_readiness'/)
  assert.match(source,/Pilot readiness transport failed/)
})

test('Pilot Readiness fails closed instead of turning transport uncertainty into a zero score',()=>{
  assert.match(source,/readinessError=\{code:safeErrorCode\(error\)\}/)
  assert.match(source,/const score=readinessError\?null:/)
  assert.match(source,/const blockers=readinessError\?null:/)
  assert.match(source,/Do not treat this as a 0% score or a clear checklist/)
  assert.match(source,/No interpretes esto como 0% ni como una lista sin problemas/)
})

test('Pilot Readiness diagnostics stay bounded and Spanish setup guidance avoids mixed English workflow labels',()=>{
  assert.match(source,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.doesNotMatch(source,/console\.error\([^\n]*error\.message/)
  assert.match(source,/Configuración Inicial \/ Constructor de Iglesia/)
  assert.match(source,/Constructor de Iglesia → Bandeja de Configuración/)
  assert.match(source,/Abrir Bandeja de Configuración →/)
})
