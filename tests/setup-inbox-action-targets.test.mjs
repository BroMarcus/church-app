import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const actions=fs.readFileSync(path.join(process.cwd(),'src/app/church/setup-inbox/actions.ts'),'utf8')

test('Setup Inbox actions reject malformed record ids before database access',()=>{
  assert.match(actions,/const UUID_RE=\/\^\[0-9a-f\]\{8\}-/)
  assert.match(actions,/const setupId=\(formData:FormData,lang:string,error:'review'\|'approve'\)=>/)
  assert.match(actions,/if\(!UUID_RE\.test\(value\)\)redirect\(inbox\(lang,error\)\)/)
  assert.match(actions,/const lang=langOf\(formData\),id=setupId\(formData,lang,'review'\)/)
  assert.match(actions,/const lang=langOf\(formData\),id=setupId\(formData,lang,'approve'\)/)
})

test('Setup Inbox action diagnostics bound database-controlled identifiers and state',()=>{
  assert.ok(actions.includes("id:String(row.id||'').slice(0,36)"))
  assert.ok(actions.includes("status:String(row.status||'unknown').slice(0,40)"))
  assert.ok(actions.includes("courseId:String(existing.id).slice(0,36)"))
  assert.ok(actions.includes("createdId:createdId?String(createdId).slice(0,36):null"))
})

test('course draft approval remains retry-safe and never reuses a published deterministic course',()=>{
  assert.match(actions,/\.eq\('slug',slug\)\.maybeSingle\(\)/)
  assert.match(actions,/if\(existing\.published\).*redirect\(inbox\(lang,'approve'\)\)/)
  assert.match(actions,/published:false/)
  assert.match(actions,/\.eq\('status','reviewing'\)\.select\('id'\)\.maybeSingle\(\)/)
})
