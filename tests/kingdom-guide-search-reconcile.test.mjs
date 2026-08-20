import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../src/app/guide/page.tsx',import.meta.url),'utf8')

test('Kingdom Guide resource search is accent tolerant and token based',()=>{
  assert.ok(source.includes("normalize('NFD')"))
  assert.ok(source.includes("replace(/[\\u0300-\\u036f]/g,'')"))
  assert.match(source,/queryTokens=normalizedQuery\.split/)
  assert.match(source,/__matchedTokens===queryTokens\.length/)
})

test('Spanish resource links preserve language',()=>{
  assert.match(source,/withLang\(`\/resources\?q=/)
  assert.match(source,/href=\{withLang\('\/'\)\}/)
})
