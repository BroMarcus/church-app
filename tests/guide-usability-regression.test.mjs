import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Kingdom Guide supports normalized multi-word search instead of exact-phrase-only matching',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/normalize\('NFD'\)/)
  assert.match(source,/queryTokens=normalizedQuery\.split/)
  assert.match(source,/__matchedTokens===queryTokens\.length/)
})

test('Kingdom Guide keeps Spanish selected when opening a resource result',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/href=\{withLang\(`\/resources\?q=/)
})
