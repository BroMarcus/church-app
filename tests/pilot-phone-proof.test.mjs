import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page=await readFile(new URL('../src/app/church/readiness/phone-proof/page.tsx',import.meta.url),'utf8')
const client=await readFile(new URL('../src/app/church/readiness/phone-proof/phone-proof-client.tsx',import.meta.url),'utf8')

for(const flow of ['signup','existing','invite','reset','spanish','guide','setup']){
  test(`phone proof includes ${flow} acceptance flow`,()=>{ assert.match(client,new RegExp(`'${flow}'`)) })
}

test('phone proof is pastor/church-admin only',()=>{
  assert.match(page,/\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(page,/church_memberships/)
})

test('phone proof fails closed on auth or membership lookup errors',()=>{
  assert.match(page,/if\(claimsError\)\{/)
  assert.match(page,/PHONE_PROOF_AUTH_UNAVAILABLE/)
  assert.match(page,/if\(membershipError\)\{/)
  assert.match(page,/PHONE_PROOF_MEMBERSHIP_UNAVAILABLE/)
  assert.match(page,/function boundedCode\(value:unknown\)/)
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
  assert.doesNotMatch(page,/if\(claimsError\|\|!userId\)redirect/)
  assert.doesNotMatch(page,/if\(membershipError\|\|!membership\?\.church_id/)
})

test('phone proof persists only in browser-local storage',()=>{
  assert.match(client,/window\.localStorage\.setItem/)
  assert.match(client,/window\.localStorage\.getItem/)
  assert.match(client,/window\.localStorage\.removeItem/)
  assert.doesNotMatch(client,/createClient|supabase|\.from\(|\.rpc\(/)
})

test('browser-local proof is isolated by church, authenticated tester, and deployed build',()=>{
  assert.match(page,/const evidenceScope=`\$\{membership\.church_id\}:\$\{userId\}:\$\{buildId\}`/)
  assert.match(page,/Browser-local evidence must never leak between two admins/)
  assert.match(page,/churchId=\{evidenceScope\}/)
  assert.doesNotMatch(page,/<code>\{userId\}<\/code>/)
})

test('phone proof bounds tester-entered evidence',()=>{
  assert.match(client,/maxLength=\{120\}/); assert.match(client,/maxLength=\{160\}/); assert.match(client,/maxLength=\{500\}/)
  assert.match(client,/\.slice\(0,120\)/); assert.match(client,/\.slice\(0,160\)/); assert.match(client,/\.slice\(0,500\)/)
})

test('phone proof requires observed evidence before PASS or FAIL',()=>{
  assert.match(client,/function hasBaseEvidence\(entry:Entry\)/)
  assert.match(client,/normalizedSite\(entry\.site\).*entry\.notes\.trim\(\)/)
  assert.match(client,/!hasBaseEvidence\(entry\)/)
  assert.match(client,/const evidenceReady=hasBaseEvidence\(item\)&&verifiedBuild/)
  assert.match(client,/disabled=\{!evidenceReady\}/)
})

test('phone proof requires a real http or https tested site',()=>{
  assert.match(client,/function normalizedSite\(value:string\)/); assert.match(client,/new URL\(value\.trim\(\)\)/)
  assert.match(client,/url\.protocol!=='http:'&&url\.protocol!=='https:'/); assert.match(client,/return url\.origin\.toLowerCase\(\)/)
})

test('phone proof blocks mixed-site pilot acceptance',()=>{
  assert.match(client,/const testedSites=useMemo/); assert.match(client,/const oneTestedSite=testedSites\.size<=1/)
  assert.match(client,/&&oneTestedSite&&verifiedBuild&&allCurrentBuild/)
})

test('phone proof reads deployed build identity and exports it',()=>{
  assert.match(page,/VERCEL_GIT_COMMIT_SHA/); assert.match(page,/NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA/)
  assert.match(page,/const evidenceScope=/); assert.match(page,/buildId=\{buildId\}/); assert.match(client,/buildId:string/)
})

test('each PASS or FAIL is stamped to the exact current Git build',()=>{
  assert.match(client,/function evidenceMatchesBuild\(entry:Entry,buildId:string\)/)
  assert.match(client,/entry\.build\.trim\(\)\.toLowerCase\(\)===buildId\.trim\(\)\.toLowerCase\(\)/)
  assert.match(client,/build:result==='untested'\?'':currentBuild/)
})

test('editing evidence after PASS or FAIL invalidates the completed result',()=>{
  assert.match(client,/function updateEvidence\(id:CheckId/); assert.match(client,/const evidenceChanged=Object\.entries\(patch\)\.some/)
  assert.match(client,/result:evidenceChanged&&item\.result!=='untested'\?'untested':item\.result/)
})

test('saved results from a different or unknown build are downgraded to untested',()=>{
  assert.match(client,/!evidenceMatchesBuild\(entry,buildId\)/); assert.match(client,/result:'untested',build:''/)
  assert.match(client,/OLD BUILD EVIDENCE RESET/); assert.match(client,/staleBuildEvidence&&/)
})

test('phone proof cannot complete without an exact Git commit identity',()=>{
  assert.match(client,/function isVerifiedBuild\(buildId:string\)/); assert.match(client,/\^\[0-9a-f\]\{40\}\$/)
  assert.match(client,/const verifiedBuild=isVerifiedBuild\(buildId\)/); assert.match(client,/&&verifiedBuild&&allCurrentBuild/)
})

test('phone proof offers safe launch links without changing tested flows',()=>{
  assert.match(page,/mode=signup/); assert.match(page,/mode=signin/); assert.match(page,/\/start\?lang=/); assert.match(page,/\/guide\?lang=/)
  assert.match(page,/\/church\/join-center\?lang=/); assert.match(page,/\/church\/setup-inbox\?lang=/); assert.match(page,/target="_blank"/)
})

test('phone proof gives short bilingual guided steps and expected result for every flow',()=>{
  assert.match(client,/const flowGuide/); assert.match(client,/Test steps/); assert.match(client,/Pasos de prueba/)
  assert.match(client,/Expected result/); assert.match(client,/Resultado esperado/)
  for(const flow of ['signup','existing','invite','reset','spanish','guide','setup']) assert.match(client,new RegExp(`${flow}:\\{steps:\\[`))
})

test('phone proof exposes explicit complete versus incomplete gate',()=>{
  assert.match(client,/const allCurrentBuild=/)
  assert.match(client,/const allPassed=stats\.pass===ids\.length&&stats\.fail===0&&stats\.remaining===0&&oneTestedSite&&verifiedBuild&&allCurrentBuild/)
  assert.match(client,/PHONE PROOF COMPLETE/); assert.match(client,/PHONE PROOF INCOMPLETE/)
})

test('phone proof offers English and Spanish and exportable summary',()=>{
  assert.match(page,/lang==='es'/); assert.match(client,/Real-phone proof checklist/); assert.match(client,/Lista de prueba con teléfono real/)
  assert.match(client,/navigator\.clipboard\.writeText\(summary\(\)\)/)
})

test('phone proof does not silently clear saved evidence',()=>{
  assert.match(client,/window\.confirm\(t\.confirm\)/); assert.match(client,/if\(!window\.confirm\(t\.confirm\)\)return/)
})