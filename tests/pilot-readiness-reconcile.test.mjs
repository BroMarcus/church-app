import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../src/app/church/readiness/page.tsx',import.meta.url),'utf8')

test('Pilot Readiness shows one clear next action and keeps Spanish navigation',()=>{
  assert.match(source,/nextAction=rows\.find/)
  assert.match(source,/DO THIS NEXT/)
  assert.match(source,/HAZ ESTO AHORA/)
  assert.match(source,/localizedHref/)
  assert.match(source,/redirect\(lang==='es'\?'\/\?lang=es':'\/'\)/)
})

test('Pilot Readiness hides raw RPC errors and localizes status labels',()=>{
  assert.match(source,/console\.error\('church_pilot_readiness failed'/)
  assert.doesNotMatch(source,/\{error\.message\}/)
  assert.match(source,/function statusLabel/)
  assert.match(source,/ready:'LISTO'/)
  assert.match(source,/needOne/)
  assert.match(source,/needMany/)
})
