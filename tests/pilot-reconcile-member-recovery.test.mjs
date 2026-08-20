import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  ['start','Start Here / Empieza Aquí'],
  ['guide','Kingdom Guide'],
  ['today','My Today / Mi Día'],
  ['journey','My Journey / Mi Camino'],
  ['learning','Learning Center / Centro de Aprendizaje'],
  ['groups','Friendship Groups / Grupos de Amistad'],
]

for (const [route,label] of routes) {
  test(`${route} has bilingual loading and recovery states`, () => {
    const loading = readFileSync(`src/app/${route}/loading.tsx`, 'utf8')
    const error = readFileSync(`src/app/${route}/error.tsx`, 'utf8')
    assert.match(loading, /aria-busy="true"/)
    assert.ok(loading.includes(label))
    assert.match(error, /role="alert"/)
    assert.match(error, /minHeight:44/)
    assert.match(error, /Try again \/ Intentar de nuevo/)
  })
}
