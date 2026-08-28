import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/church/launch/page.tsx','utf8')

test('Church Builder keeps explicit language authoritative',()=>{
  assert.match(source,/params\.lang===['"]es['"]\?['"]es['"]:params\.lang===['"]en['"]\?['"]en['"]/)
})

test('Church Builder falls back to Spanish request language when lang is missing',()=>{
  assert.match(source,/import \{ headers \} from ['"]next\/headers['"]/)
  assert.match(source,/requestHeaders=await headers\(\)/)
  assert.match(source,/prefersSpanish\(requestHeaders\.get\(['"]accept-language['"]\)\)\?['"]es['"]:['"]en['"]/)
})

test('Church Builder carries the resolved Spanish language into downstream pilot routes',()=>{
  assert.match(source,/const l=\(path:string\)=>lang===['"]es['"]\?`\$\{path\}\$\{path\.includes\(['"]\?['"]\)\?['"]&['"]:['"]\?['"]\}lang=es`:path/)
  assert.match(source,/redirect\(l\(['"]\/login\?mode=signin['"]\)\)/)
  assert.match(source,/href=\{l\(['"]\/guide['"]\)\}/)
  assert.match(source,/href=\{l\(['"]\/church\/join-center['"]\)\}/)
})
