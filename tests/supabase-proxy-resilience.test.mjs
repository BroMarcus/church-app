import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source=fs.readFileSync(path.join(process.cwd(),'src/lib/supabase/proxy.ts'),'utf8')

test('all auth recovery routes bypass session-refresh middleware',()=>{
  assert.match(source,/const publicAuthPrefixes=\['\/login','\/auth'\]/)
  assert.match(source,/request\.nextUrl\.pathname\.startsWith\(prefix\+'\/'\)/)
  assert.doesNotMatch(source,/\/auth\/callback','\/auth\/confirm','\/auth\/verify/)
})

test('session refresh transport failures do not crash the app shell',()=>{
  assert.match(source,/try\{[\s\S]*await supabase\.auth\.getClaims\(\)[\s\S]*\}catch\(error\)\{/)
  assert.match(source,/session refresh unavailable/)
  assert.match(source,/return response/)
})

test('proxy diagnostics stay bounded instead of logging raw thrown errors',()=>{
  assert.match(source,/const boundedCode=/)
  assert.match(source,/const diagnosticCode=/)
  assert.match(source,/diagnosticCode\(error,'session_refresh_unavailable'\)/)
  assert.doesNotMatch(source,/console\.error\([^\n]*,\s*error\s*\)/)
})
