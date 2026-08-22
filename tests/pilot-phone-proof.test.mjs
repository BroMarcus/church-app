import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page=await readFile(new URL('../src/app/church/readiness/phone-proof/page.tsx',import.meta.url),'utf8')
const client=await readFile(new URL('../src/app/church/readiness/phone-proof/phone-proof-client.tsx',import.meta.url),'utf8')

for(const flow of ['signup','existing','invite','reset','spanish','guide','setup']){
  test(`phone proof includes ${flow} acceptance flow`,()=>{
    assert.match(client,new RegExp(`'${flow}'`))
  })
}

test('phone proof is pastor/church-admin only',()=>{
  assert.match(page,/\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(page,/church_memberships/)
})

test('phone proof persists only in browser-local storage',()=>{
  assert.match(client,/window\.localStorage\.setItem/)
  assert.match(client,/window\.localStorage\.getItem/)
  assert.match(client,/window\.localStorage\.removeItem/)
  assert.doesNotMatch(client,/createClient|supabase|\.from\(|\.rpc\(/)
})

test('phone proof bounds tester-entered evidence',()=>{
  assert.match(client,/maxLength=\{120\}/)
  assert.match(client,/maxLength=\{500\}/)
  assert.match(client,/\.slice\(0,120\)/)
  assert.match(client,/\.slice\(0,500\)/)
})

test('phone proof requires evidence before PASS or FAIL',()=>{
  assert.match(client,/function hasBaseEvidence\(entry:Entry\)/)
  assert.match(client,/function hasFailureEvidence\(entry:Entry\)/)
  assert.match(client,/disabled=\{!baseEvidence\}/)
  assert.match(client,/disabled=\{!failureEvidence\}/)
  assert.match(client,/entry\.result==='pass'&&!hasBaseEvidence\(entry\)/)
  assert.match(client,/entry\.result==='fail'&&!hasFailureEvidence\(entry\)/)
})

test('phone proof exposes explicit complete versus incomplete gate',()=>{
  assert.match(client,/const allPassed=stats\.pass===ids\.length&&stats\.fail===0&&stats\.remaining===0/)
  assert.match(client,/PHONE PROOF COMPLETE/)
  assert.match(client,/PHONE PROOF INCOMPLETE/)
  assert.match(client,/PRUEBA DE TELÉFONO COMPLETA/)
  assert.match(client,/PRUEBA DE TELÉFONO INCOMPLETA/)
  assert.match(client,/proofStatus/)
})

test('phone proof offers English and Spanish and exportable summary',()=>{
  assert.match(page,/lang==='es'/)
  assert.match(client,/Real-phone proof checklist/)
  assert.match(client,/Lista de prueba con teléfono real/)
  assert.match(client,/navigator\.clipboard\.writeText\(summary\(\)\)/)
  assert.match(client,/KINGDOM NETWORK PHONE PROOF/)
  assert.match(client,/PRUEBA DE TELÉFONO — KINGDOM NETWORK/)
})

test('phone proof does not silently clear saved evidence',()=>{
  assert.match(client,/window\.confirm\(t\.confirm\)/)
  assert.match(client,/if\(!window\.confirm\(t\.confirm\)\)return/)
})
