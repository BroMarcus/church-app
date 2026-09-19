import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const actions=read('src/app/help/actions.ts')
const page=read('src/app/help/page.tsx')

test('Private Care server actions distinguish Auth uncertainty from a real signed-out user',()=>{
  assert.match(actions,/try\{supabase=await createClient\(\)\}catch\(error\)/)
  assert.match(actions,/claimsResult=await supabase\.auth\.getClaims\(\)/)
  assert.match(actions,/if\(claimsError\)/)
  assert.match(actions,/temporary_problem/)
  assert.match(actions,/if\(!userId\)redirect\(`\/login\?mode=signin&lang=\$\{lang\}`\)/)
})

test('Private Care membership and write transports fail closed instead of escaping server actions',()=>{
  assert.match(actions,/membership_throw/)
  assert.match(actions,/create_throw/)
  assert.match(actions,/update_throw/)
  assert.match(actions,/withdraw_throw/)
  assert.match(actions,/redirect\(helpUrl\(lang,'save_failed'\)\)/)
  assert.match(actions,/redirect\(helpUrl\(lang,'withdraw_failed'\)\)/)
})

test('Private Care consequential targets require UUID-shaped identifiers before database calls',()=>{
  assert.match(actions,/const uuidPattern=/)
  assert.match(actions,/const validUuid=/)
  assert.match(actions,/if\(!validUuid\(id\)\|\|!statuses\.includes\(status\)/)
  assert.match(actions,/assigned&&!validUuid\(assigned\)/)
  assert.match(actions,/if\(!validUuid\(id\)\)redirect\(helpUrl\(lang,'request_not_found'\)\)/)
})

test('Private Care diagnostics stay bounded and do not expose provider messages',()=>{
  assert.match(actions,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.match(actions,/console\.error\('\[help-care\]',\{area,code:safeCode\(error\)\}\)/)
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.doesNotMatch(actions,/\.message/)
  assert.doesNotMatch(actions,/console\.error\([^\n]*,\s*error\s*\)/)
})

test('Private Care preserves selected language and sends returning signed-out users directly to Sign In',()=>{
  assert.match(actions,/mode=signin&lang=\$\{lang\}/)
  assert.match(actions,/membership\?\.church_id\)redirect\(lang==='es'\?'\/\?lang=es':'\/'\)/)
  assert.match(actions,/helpUrl\(lang,'temporary_problem'\)/)
  assert.match(page,/if\(!userId\)redirect\(`\/login\?mode=signin&lang=\$\{es\?'es':'en'\}`\)/)
  assert.match(page,/if\(!membership\?\.church_id\)redirect\(l\('\/'\)\)/)
  assert.doesNotMatch(page,/if\(!userId\)redirect\(l\('\/login'\)\)/)
})
