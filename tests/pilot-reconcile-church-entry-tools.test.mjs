import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const routes=[
  ['church/import','MEMBER IMPORT • IMPORTAR MIEMBROS'],
  ['church/invite-person','INVITE A PERSON • INVITAR A UNA PERSONA'],
  ['church/join-center','JOIN CENTER • CENTRO DE REGISTRO'],
]
for(const [route,label] of routes){
  test(`${route} has bilingual safe loading and recovery states`,()=>{
    const loading=readFileSync(`src/app/${route}/loading.tsx`,'utf8')
    const error=readFileSync(`src/app/${route}/error.tsx`,'utf8')
    assert.match(loading,/aria-busy="true"/)
    assert.match(loading,/aria-live="polite"/)
    assert.ok(loading.includes(label))
    assert.match(error,/role="alert"/)
    assert.match(error,/Try again \/ Intentar de nuevo/)
  })
}
