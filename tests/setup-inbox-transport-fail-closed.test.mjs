import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const actions=fs.readFileSync(path.join(process.cwd(),'src/app/church/setup-inbox/actions.ts'),'utf8')
const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/setup-inbox/page.tsx'),'utf8')

test('Setup Inbox actor catches client, claims, and membership transport failures',()=>{
  assert.match(actions,/catch\(error\)[\s\S]*Setup Inbox client unavailable[\s\S]*readError:'client'/)
  assert.match(actions,/supabase\.auth\.getClaims\(\)[\s\S]*catch\(error\)[\s\S]*Setup Inbox claims transport unavailable/)
  assert.match(actions,/church_memberships[\s\S]*catch\(error\)[\s\S]*Setup Inbox membership transport unavailable/)
  assert.match(actions,/if\(ctx\.readError\|\|!ctx\.supabase\)[\s\S]*redirect\(inbox\(lang,'access'\)\)/)
})

test('Setup Inbox page catches client, Auth, membership, and records transport failures before rendering state',()=>{
  assert.match(page,/try\{supabase=await createClient\(\)\}catch\(error\)\{failLoad\('client',error\)\}/)
  assert.match(page,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}catch\(error\)\{failLoad\('auth',error\)\}/)
  assert.match(page,/try\{membershipResult=await supabase\.from\('church_memberships'\)/)
  assert.match(page,/catch\(error\)\{failLoad\('membership',error\)\}/)
  assert.match(page,/try\{rowsResult=await supabase\.from\('church_setup_uploads'\)/)
  assert.match(page,/catch\(error\)\{failLoad\('records',error\)\}/)
  assert.match(page,/throw new Error\('setup-inbox-load-failed'\)/)
})

test('Setup Inbox review actions convert thrown reads and writes into fixed bilingual recovery states',()=>{
  assert.match(actions,/generateSetupPlan[\s\S]*read transport unavailable[\s\S]*redirect\(inbox\(lang,'review'\)\)/)
  assert.match(actions,/generateSetupPlan[\s\S]*update transport unavailable[\s\S]*redirect\(inbox\(lang,'review'\)\)/)
  assert.match(actions,/generateAllSetupPlans[\s\S]*read transport unavailable[\s\S]*redirect\(inbox\(lang,'review'\)\)/)
  assert.match(actions,/generateAllSetupPlans[\s\S]*update transport unavailable[\s\S]*redirect\(inbox\(lang,'review'\)\)/)
})

test('Setup Inbox approval catches course lookup, draft creation, and final approval transport failures',()=>{
  assert.match(actions,/approveSetupPlan[\s\S]*read transport unavailable[\s\S]*redirect\(inbox\(lang,'approve'\)\)/)
  assert.match(actions,/existing course lookup transport unavailable[\s\S]*redirect\(inbox\(lang,'approve'\)\)/)
  assert.match(actions,/course creation transport unavailable[\s\S]*redirect\(inbox\(lang,'approve'\)\)/)
  assert.match(actions,/status update transport unavailable[\s\S]*redirect\(inbox\(lang,'approve'\)\)/)
})

test('Setup Inbox thrown-failure diagnostics remain bounded and provider text is not exposed',()=>{
  assert.match(actions,/const diagnosticCode=/)
  assert.match(actions,/boundedCode\(error\.name\)/)
  assert.match(page,/const diagnosticCode=/)
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.doesNotMatch(actions,/console\.error\([^\n]*,\s*error\s*\)/)
  assert.doesNotMatch(actions,/error\.message/)
  assert.doesNotMatch(page,/console\.error\([^\n]*(userId|churchId)/)
  assert.doesNotMatch(page,/error\.message/)
})
