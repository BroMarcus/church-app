import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/launch/page.tsx'),'utf8')

test('Church Builder fails closed when client, auth, membership, or church relation startup is uncertain',()=>{
  assert.match(page,/try\{supabase=await createClient\(\)\}/)
  assert.match(page,/catch\(error\)\{failLoad\('client',error\)\}/)
  assert.match(page,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}/)
  assert.match(page,/catch\(error\)\{failLoad\('auth',error\)\}/)
  assert.match(page,/data:claims,error:claimsError/)
  assert.match(page,/if\(claimsError\)failLoad\('auth',claimsError\)/)
  assert.match(page,/try\{membershipResult=await supabase\.from\('church_memberships'\)/)
  assert.match(page,/catch\(error\)\{failLoad\('membership',error\)\}/)
  assert.match(page,/data:membership,error:membershipError/)
  assert.match(page,/if\(membershipError\)failLoad\('membership',membershipError\)/)
  assert.match(page,/if\(!church\)failLoad\('church_relation',\{code:'missing_church'\}\)/)
})

test('Church Builder never calculates readiness from thrown, failed, or incomplete count queries',()=>{
  assert.match(page,/let readinessReads/)
  assert.match(page,/try\{[\s\S]*readinessReads=await Promise\.all/)
  assert.match(page,/catch\(error\)\{failLoad\('readiness',error\)\}/)
  assert.match(page,/const readinessErrors=readinessReads\.map\(result=>result\.error\)\.filter\(Boolean\)/)
  assert.match(page,/if\(readinessErrors\.length\)[\s\S]*throw new Error\('church-launch-load-failed'\)/)
  assert.match(page,/const readinessCounts=readinessReads\.map\(result=>result\.count\)/)
  assert.match(page,/readinessCounts\.some\(count=>typeof count!=='number'\|\|!Number\.isFinite\(count\)\)/)
  assert.match(page,/Church Builder readiness counts invalid/)
  assert.match(page,/const \[\{count:admins\},\{count:pilotMembers\},\{count:publishedCourses\},\{count:groups\},\{count:events\},\{count:openInvites\},\{count:setupFiles\}\]=readinessReads/)
})

test('Church Builder diagnostics are sanitized and bounded',()=>{
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.match(page,/const diagnosticCode=/)
  assert.match(page,/console\.error\('Church Builder load failed',\{area:boundedCode\(area\),code:diagnosticCode\(error,'unavailable'\)\}\)/)
  assert.match(page,/readinessErrors\.map\(error=>boundedCode\(error\?\.code\)\)/)
  assert.doesNotMatch(page,/console\.error\([^\n]+message:/)
})

test('Church Builder pilot instructions match the simplified Home experience in both languages',()=>{
  assert.match(page,/runBody:'Test signup,[^']*Start Here, Home, Profile/)
  assert.match(page,/runBody:'Prueba registro,[^']*Empieza Aquí, Inicio, Perfil/)
  assert.doesNotMatch(page,/My Today/)
  assert.doesNotMatch(page,/Mi Día/)
})