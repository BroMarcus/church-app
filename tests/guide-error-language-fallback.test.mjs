import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/app/guide/error.tsx','utf8')

test('Kingdom Guide error keeps explicit English or Spanish authoritative',()=>{
  assert.match(source,/explicit==='es'\?'es':explicit==='en'\?'en'/)
})

test('Kingdom Guide error falls back to the phone language when no explicit language exists',()=>{
  assert.match(source,/navigator\.language\|\|navigator\.languages\?\.\[0\]/)
  assert.match(source,/browserSpanish\?'es':'en'/)
})

test('Kingdom Guide error recovery links preserve the resolved language',()=>{
  assert.match(source,/href={`\/\?lang=\$\{lang\}`}/)
  assert.match(source,/href={`\/feedback\?lang=\$\{lang\}`}/)
})
