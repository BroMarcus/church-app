import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/launch/page.tsx'),'utf8')

test('Church Builder fails closed when auth or membership reads fail',()=>{
  assert.match(page,/data:claims,error:claimsError/)
  assert.match(page,/if\(claimsError\)[\s\S]*throw new Error\('church-launch-load-failed'\)/)
  assert.match(page,/data:membership,error:membershipError/)
  assert.match(page,/\.maybeSingle\(\)/)
  assert.match(page,/if\(membershipError\)[\s\S]*throw new Error\('church-launch-load-failed'\)/)
})

test('Church Builder does not calculate readiness from failed count queries',()=>{
  assert.match(page,/const readinessReads=await Promise\.all/)
  assert.match(page,/const readinessErrors=readinessReads\.map\(result=>result\.error\)\.filter\(Boolean\)/)
  assert.match(page,/if\(readinessErrors\.length\)[\s\S]*throw new Error\('church-launch-load-failed'\)/)
  assert.match(page,/const \[\{count:admins\},\{count:pilotMembers\},\{count:publishedCourses\},\{count:groups\},\{count:events\},\{count:openInvites\},\{count:setupFiles\}\]=readinessReads/)
})

test('Church Builder diagnostics keep provider details bounded',()=>{
  assert.match(page,/const boundedCode=/)
  assert.match(page,/boundedCode\(claimsError\.code\)/)
  assert.match(page,/boundedCode\(membershipError\.code\)/)
  assert.match(page,/readinessErrors\.map\(error=>boundedCode\(error\?\.code\)\)/)
  assert.doesNotMatch(page,/console\.error\([^\n]+message:/)
})
