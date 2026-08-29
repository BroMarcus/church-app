import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/start/page.tsx','utf8')

test('Start Here keeps explicit language authoritative',()=>{
  assert.match(source,/params\.lang===['"]es['"]\?['"]es['"]:params\.lang===['"]en['"]\?['"]en['"]/)
})

test('Start Here falls back to Spanish request language before auth is available',()=>{
  assert.match(source,/import \{ headers \} from ['"]next\/headers['"]/)
  assert.match(source,/requestHeaders=await headers\(\)/)
  assert.match(source,/requestHeaders\.get\(['"]accept-language['"]\)/)
  assert.match(source,/prefersSpanish\(requestHeaders\.get\(['"]accept-language['"]\)\)\?['"]es['"]:['"]en['"]/)
})

test('Start Here recovery preserves the resolved language into retry and sign in',()=>{
  assert.match(source,/href=\{`\/start\?lang=\$\{lang\}`\}/)
  assert.match(source,/href=\{`\/login\?lang=\$\{lang\}&mode=signin`\}/)
  assert.match(source,/user\?preferred:requestedLang/)
})
