import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8')
const component=readFileSync(new URL('../src/components/document-language.tsx',import.meta.url),'utf8')

test('root layout includes the bilingual document-language synchronizer inside Suspense',()=>{
  assert.match(layout,/import \{ DocumentLanguage \} from '@\/components\/document-language'/)
  assert.match(layout,/<Suspense fallback=\{null\}><DocumentLanguage\/><PageGuide\/><\/Suspense>/)
})

test('document language follows an explicit English or Spanish route language without guessing when none is supplied',()=>{
  assert.match(component,/useSearchParams\(\)/)
  assert.match(component,/const selected=searchParams\.get\('lang'\)/)
  assert.match(component,/if\(selected==='en'\|\|selected==='es'\)document\.documentElement\.lang=selected/)
  assert.doesNotMatch(component,/\?\s*'es'\s*:\s*'en'/)
  assert.doesNotMatch(component,/localStorage|sessionStorage|cookie/i)
})
