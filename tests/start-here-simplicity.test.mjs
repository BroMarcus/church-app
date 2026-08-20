import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../src/app/start/page.tsx',import.meta.url),'utf8')

test('Start Here keeps the visible first-login path to three primary actions',()=>{
  assert.match(source,/START WITH THESE 3 THINGS/)
  assert.match(source,/COMIENZA CON ESTAS 3 COSAS/)
  assert.match(source,/\[UserRound,t\.profile/)
  assert.match(source,/\[Sparkles,t\.journey/)
  assert.match(source,/\[CheckCircle2,t\.today/)
})

test('the large app map and secondary guidance are opt-in rather than expanded by default',()=>{
  const detailsCount=(source.match(/<details/g)||[]).length
  assert.ok(detailsCount>=2)
  assert.match(source,/tour:'Show me all sections'/)
  assert.match(source,/tour:'Ver todas las secciones'/)
  assert.match(source,/<details className="card start-how"[^>]*><summary[^>]*>\{t\.tour\}<\/summary>/)
})

test('Kingdom Guide is visible before the optional full app map',()=>{
  const guideIndex=source.indexOf("href={withLang('/guide')}")
  const tourIndex=source.indexOf('{t.tour}</summary>')
  assert.ok(guideIndex>=0)
  assert.ok(tourIndex>guideIndex)
})
