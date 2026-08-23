import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const actions=fs.readFileSync(path.join(process.cwd(),'src/app/church/setup-inbox/actions.ts'),'utf8')
const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/setup-inbox/page.tsx'),'utf8')

test('Setup Inbox actions distinguish auth and membership read failures from ordinary unauthorized access',()=>{
  assert.match(actions,/error:claimsError/)
  assert.match(actions,/readError:'auth'/)
  assert.match(actions,/error:membershipError/)
  assert.match(actions,/readError:'membership'/)
  assert.match(actions,/if\(ctx\.readError\)[\s\S]*redirect\(inbox\(lang,'access'\)\)/)
})

test('Setup Inbox authorization diagnostics are bounded',()=>{
  assert.match(actions,/const boundedCode=/)
  assert.match(actions,/errorCode:boundedCode\(claimsError\.code\)/)
  assert.match(actions,/errorCode:boundedCode\(membershipError\.code\)/)
  assert.match(page,/const boundedCode=/)
  assert.match(page,/boundedCode\(claimsError\.code\)/)
  assert.match(page,/boundedCode\(membershipError\.code\)/)
})

test('Setup Inbox gives bilingual safe recovery when leadership access cannot be verified',()=>{
  assert.ok(page.includes('We could not verify your leadership access right now. Nothing was changed.'))
  assert.ok(page.includes('No pudimos verificar tu acceso de liderazgo en este momento. Nada se cambió.'))
  assert.match(page,/q\.error==='access'/)
})

test('Setup Inbox write actions verify a real row changed before reporting success',()=>{
  assert.match(actions,/generateSetupPlan[\s\S]*\.select\('id'\)\.maybeSingle\(\)[\s\S]*if\(error\|\|!updated\)/)
  assert.match(actions,/generateAllSetupPlans[\s\S]*\.select\('id'\)\.maybeSingle\(\)[\s\S]*if\(error\|\|!updated\)/)
  assert.match(actions,/approveSetupPlan[\s\S]*\.select\('id'\)\.maybeSingle\(\)[\s\S]*if\(updateError\|\|!updated\)/)
})
