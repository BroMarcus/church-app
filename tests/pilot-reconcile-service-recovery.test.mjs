import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  ['calendar','Calendar / Calendario'],
  ['help','Help Center / Centro de Ayuda'],
  ['messages','Messages / Mensajes'],
  ['serve','Serve / Servir'],
  ['teams','Teams / Equipos'],
]

for (const [route,label] of routes) {
  test(`${route} has bilingual safe loading and recovery states`, () => {
    const loading = readFileSync(`src/app/${route}/loading.tsx`, 'utf8')
    const error = readFileSync(`src/app/${route}/error.tsx`, 'utf8')
    assert.match(loading, /aria-busy="true"/)
    assert.ok(loading.includes(label))
    assert.match(error, /role="alert"/)
    assert.match(error, /minHeight:44/)
    assert.match(error, /Try again \/ Intentar de nuevo/)
  })
}
