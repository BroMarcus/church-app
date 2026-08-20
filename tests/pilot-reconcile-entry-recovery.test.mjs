import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  ['profile','My Profile / Mi Perfil'],
  ['login','KINGDOM NETWORK • PILOT'],
  ['join/[slug]','KINGDOM NETWORK'],
]

for (const [route,label] of routes) {
  test(`${route} has bilingual safe loading and recovery states`, () => {
    const loading = readFileSync(`src/app/${route}/loading.tsx`, 'utf8')
    const error = readFileSync(`src/app/${route}/error.tsx`, 'utf8')
    assert.match(loading, /aria-busy="true"/)
    assert.ok(loading.includes(label))
    assert.match(error, /role="alert"/)
    assert.match(error, /Try again \/ Intentar de nuevo/)
  })
}

test('home has safe bilingual loading and recovery states', () => {
  const loading = readFileSync('src/app/loading.tsx','utf8')
  const error = readFileSync('src/app/error.tsx','utf8')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Estamos preparando/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Try again \/ Intentar de nuevo/)
})
