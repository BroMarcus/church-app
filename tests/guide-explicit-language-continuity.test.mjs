import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const guide=fs.readFileSync(new URL('../src/app/guide/page.tsx',import.meta.url),'utf8')

test('Kingdom Guide carries the explicit language through every internal destination',()=>{
  assert.match(guide,/const withLang=\(href:string\)=>`\$\{href\}\$\{href\.includes\('\?'\)\?'&':'\?'\}lang=\$\{lang\}`/)
  assert.match(guide,/if\(!membership\?\.church_id\)redirect\(lang==='es'\?'\/\?lang=es':'\/\?lang=en'\)/)
  assert.match(guide,/href=\{withLang\(answer\.href\)\}/)
  assert.match(guide,/href=\{withLang\('\/feedback'\)\}/)
  assert.match(guide,/href=\{withLang\('\/'\)\}/)
})
