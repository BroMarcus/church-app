import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8')
const component=readFileSync(new URL('../src/components/document-language.tsx',import.meta.url),'utf8')

test('root layout includes the bilingual document-language synchronizer inside Suspense',()=>{
  assert.match(layout,/import \{ DocumentLanguage \} from '@\/components\/document-language'/)
  assert.match(layout,/<Suspense fallback=\{null\}><DocumentLanguage\/><PageGuide\/><\/Suspense>/)
})

test('document language follows the selected English or Spanish route language',()=>{
  assert.match(component,/useSearchParams\(\)/)
  assert.match(component,/searchParams\.get\('lang'\)==='es'\?'es':'en'/)
  assert.match(component,/document\.documentElement\.lang=nextLang/)
  assert.doesNotMatch(component,/localStorage|sessionStorage|cookie/i)
})
