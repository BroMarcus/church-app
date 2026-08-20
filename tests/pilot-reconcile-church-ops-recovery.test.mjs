import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  ['church/health','CHURCH HEALTH • SALUD DE LA IGLESIA'],
  ['church/invites','Church Invitations / Invitaciones de la Iglesia'],
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
