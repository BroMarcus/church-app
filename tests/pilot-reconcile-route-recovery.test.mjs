import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  ['account/data','My Data / Mis datos'],
  ['fundraising','Fundraising / Recaudación de fondos'],
  ['feedback','Feedback / Comentarios'],
  ['directory','Member Directory / Directorio de miembros'],
  ['documents','Documents / Documentos'],
]

for (const [route,label] of routes) {
  test(`${route} has bilingual safe loading and recovery states`, () => {
    const loading = readFileSync(`src/app/${route}/loading.tsx`, 'utf8')
    const error = readFileSync(`src/app/${route}/error.tsx`, 'utf8')
    assert.match(loading, /aria-busy="true"/)
    assert.match(loading, /aria-live="polite"/)
    assert.ok(loading.includes(label))
    assert.match(error, /role="alert"/)
    assert.match(error, /minHeight:44/)
    assert.match(error, /Try again \/ Intentar de nuevo/)
  })
}
