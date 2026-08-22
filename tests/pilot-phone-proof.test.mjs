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
  assert.match(client,/maxLength=\{160\}/)
  assert.match(client,/maxLength=\{500\}/)
  assert.match(client,/\.slice\(0,120\)/)
  assert.match(client,/\.slice\(0,160\)/)
  assert.match(client,/\.slice\(0,500\)/)
})

test('phone proof requires observed evidence before PASS or FAIL',()=>{
  assert.match(client,/function hasBaseEvidence\(entry:Entry\)/)
  assert.match(client,/normalizedSite\(entry\.site\).*entry\.notes\.trim\(\)/)
  assert.match(client,/entry\.result!=='untested'&&!hasBaseEvidence\(entry\)/)
  assert.match(client,/const evidenceReady=hasBaseEvidence\(item\)/)
  assert.match(client,/disabled=\{!evidenceReady\}/)
  assert.match(client,/Observed result \/ exact failing step/)
  assert.match(client,/Resultado observado \/ paso exacto que falló/)
})

test('phone proof requires a real http or https tested site',()=>{
  assert.match(client,/function normalizedSite\(value:string\)/)
  assert.match(client,/new URL\(value\.trim\(\)\)/)
  assert.match(client,/url\.protocol!=='http:'&&url\.protocol!=='https:'/)
  assert.match(client,/return url\.origin\.toLowerCase\(\)/)
  assert.match(client,/type="url"/)
  assert.match(client,/aria-invalid=/)
  assert.match(client,/Enter a full http:\/\/ or https:\/\/ site\/preview address/)
  assert.match(client,/Escribe una dirección completa que empiece con http:\/\/ o https:\/\//)
})

test('phone proof binds evidence to the tested site or preview',()=>{
  assert.match(client,/site:string/)
  assert.match(client,/window\.location\.origin\.slice\(0,160\)/)
  assert.match(client,/site:String\(value\.site\?\?''\)\.slice\(0,160\)/)
  assert.match(client,/Tested site \/ preview/)
  assert.match(client,/Sitio \/ vista previa probada/)
  assert.match(client,/`- \$\{t\.site\}: \$\{item\.site\|\|'—'\}`/)
})

test('phone proof treats different routes on one preview origin as one site',()=>{
  assert.match(client,/return url\.origin\.toLowerCase\(\)/)
  assert.doesNotMatch(client,/replace\(\/\\\/$\//)
})

test('phone proof blocks mixed-site pilot acceptance',()=>{
  assert.match(client,/const testedSites=useMemo/)
  assert.match(client,/const oneTestedSite=testedSites\.size<=1/)
  assert.match(client,/&&oneTestedSite&&verifiedBuild/)
  assert.match(client,/SITE MISMATCH/)
  assert.match(client,/LOS SITIOS NO COINCIDEN/)
  assert.match(client,/siteStatus/)
})

test('phone proof isolates browser evidence by deployed build and exports that build',()=>{
  assert.match(page,/VERCEL_GIT_COMMIT_SHA/)
  assert.match(page,/NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA/)
  assert.match(page,/const evidenceScope=/)
  assert.match(page,/buildId=\{buildId\}/)
  assert.match(client,/buildId:string/)
  assert.match(client,/`\$\{t\.build\}: \$\{buildId\}`/)
  assert.match(page,/Tested build/)
  assert.match(page,/Versión probada/)
})

test('phone proof cannot complete without an exact Git commit identity',()=>{
  assert.match(client,/function isVerifiedBuild\(buildId:string\)/)
  assert.match(client,/\^\[0-9a-f\]\{40\}\$/)
  assert.match(client,/const verifiedBuild=isVerifiedBuild\(buildId\)/)
  assert.match(client,/&&verifiedBuild/)
  assert.match(client,/UNVERIFIED BUILD/)
  assert.match(client,/VERSIÓN NO VERIFICADA/)
  assert.match(client,/buildStatus/)
})

test('phone proof offers safe launch links without changing tested flows',()=>{
  assert.match(page,/mode=signup/)
  assert.match(page,/mode=signin/)
  assert.match(page,/\/start\?lang=/)
  assert.match(page,/\/guide\?lang=/)
  assert.match(page,/\/church\/join-center\?lang=/)
  assert.match(page,/\/church\/setup-inbox\?lang=/)
  assert.match(page,/target="_blank"/)
  assert.match(page,/use test accounts only/)
  assert.match(page,/usa solamente cuentas de prueba/)
})

test('older evidence without a tested site cannot stay passed',()=>{
  assert.match(client,/next\[id\]=normalizeEvidence\(/)
  assert.match(client,/site:String\(value\.site\?\?''\)\.slice\(0,160\)/)
  assert.match(client,/if\(!next\[id\]\.site\)next\[id\]=\{\.\.\.next\[id\],site:origin\}/)
})

test('phone proof gives short bilingual guided steps and expected result for every flow',()=>{
  assert.match(client,/const flowGuide/)
  assert.match(client,/Test steps/)
  assert.match(client,/Pasos de prueba/)
  assert.match(client,/Expected result/)
  assert.match(client,/Resultado esperado/)
  assert.match(client,/guide\[id\]\.steps\.map/)
  assert.match(client,/guide\[id\]\.expected/)
  for(const flow of ['signup','existing','invite','reset','spanish','guide','setup']){
    assert.match(client,new RegExp(`${flow}:\\{steps:\\[`))
  }
})

test('phone proof exposes explicit complete versus incomplete gate',()=>{
  assert.match(client,/const allPassed=stats\.pass===ids\.length&&stats\.fail===0&&stats\.remaining===0&&oneTestedSite&&verifiedBuild/)
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