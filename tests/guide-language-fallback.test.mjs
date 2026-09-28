import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/guide/page.tsx','utf8')

test('Kingdom Guide keeps an explicit language choice authoritative',()=>{
  assert.match(source,/query\.lang===['"]es['"]\?['"]es['"]:query\.lang===['"]en['"]\?['"]en['"]:browserLang/)
})

test('Kingdom Guide uses request language when the lang query is missing',()=>{
  assert.match(source,/import \{ headers \} from ['"]next\/headers['"]/)
  assert.match(source,/requestHeaders=await headers\(\)/)
  assert.match(source,/requestHeaders\.get\(['"]accept-language['"]\)/)
  assert.match(source,/prefersSpanish\(requestHeaders\.get\(['"]accept-language['"]\)\)\?['"]es['"]:['"]en['"]/)
})

test('Kingdom Guide uses saved language after sign-in and browser language only as fallback',()=>{
  assert.match(source,/preferred=user\?\.user_metadata\?\.preferred_language===['"]es['"]\?['"]es['"]:user\?\.user_metadata\?\.preferred_language===['"]en['"]\?['"]en['"]:null/)
  assert.match(source,/preferred\?\?browserLang/)
})

test('Kingdom Guide recovery and sign-in preserve the resolved language',()=>{
  assert.match(source,/const t=copy\[requestedLang\]/)
  assert.match(source,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin`\)/)
  assert.match(source,/lang==='es'\?`\$\{href\}\$\{href\.includes\('\?'\)\?'&':'\?'\}lang=es`:href/)
})
