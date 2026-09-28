import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/join-center/page.tsx'),'utf8')

test('Join Center distinguishes auth and membership outages from normal authorization denial',()=>{
  assert.match(page,/claimsError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(page,/membershipError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(page,/!membership\?\.church_id\|\|!\['pastor','church_admin'\]\.includes\(membership\.role\)[\s\S]*AccessRecovery lang=\{lang\} kind="unauthorized"/)
  assert.match(page,/\.limit\(1\)\.maybeSingle\(\)/)
})

test('Join Center catches thrown client, Auth, membership, and signup-status failures',()=>{
  assert.match(page,/try\{supabase=await createClient\(\)\}/)
  assert.match(page,/join center client unavailable/)
  assert.match(page,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}/)
  assert.match(page,/join center auth transport failed/)
  assert.match(page,/try\{membershipResult=await supabase\.from\('church_memberships'\)/)
  assert.match(page,/join center membership transport failed/)
  assert.match(page,/try\{[\s\S]*supabase\.rpc\('get_public_signup_status_for_church'/)
  assert.match(page,/join center public signup status transport failed/)
})

test('Signed-out Join Center always returns a protected user to Sign In instead of Create Account',()=>{
  assert.match(page,/if\(!userId\)redirect\(`\/login\?lang=\$\{lang\}&mode=signin&next=/)
  assert.doesNotMatch(page,/if\(!userId\)redirect\(`\/login\?lang=\$\{lang\}&next=/)
})

test('Join Center never turns an empty signup-status result into fake paused or zero state',()=>{
  assert.match(page,/if\(!statusError&&!status\)console\.error\('join center public signup status empty'/)
  assert.match(page,/const statusUnavailable=Boolean\(statusError\)\|\|!status/)
  assert.match(page,/\{statusUnavailable&&<section[\s\S]*We could not check signup status\./)
  assert.match(page,/\{!statusUnavailable&&<div/)
})

test('Join Center diagnostics are bounded and normal users get bilingual retry guidance',()=>{
  assert.match(page,/const boundedCode=/)
  assert.match(page,/const diagnosticCode=/)
  assert.match(page,/errorCode:boundedCode\(claimsError\.code\)/)
  assert.match(page,/errorCode:boundedCode\(membershipError\.code\)/)
  assert.match(page,/errorCode:boundedCode\(statusError\.code\)/)
  assert.doesNotMatch(page,/claimsError\.message|membershipError\.message|statusError\.message|error\.message/)
  assert.ok(page.includes('Do not assume signup is open or paused, and do not share a new link until this page loads correctly.'))
  assert.ok(page.includes('No asumas que el registro está abierto o pausado y no compartas un enlace nuevo hasta que esta página cargue correctamente.'))
})

test('Join Center keeps duplicate-account prevention guidance in both languages',()=>{
  assert.ok(page.includes('they should use that same account; they never need to create another one.'))
  assert.ok(page.includes('debe usar esa misma cuenta; nunca necesita crear otra.'))
})
