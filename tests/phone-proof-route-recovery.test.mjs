import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const errorBoundary=read('src/app/church/readiness/phone-proof/error.tsx')
const loading=read('src/app/church/readiness/phone-proof/loading.tsx')

test('Phone Proof has a local bilingual fail-closed recovery boundary',()=>{
  assert.match(errorBoundary,/We could not verify the phone-test station/)
  assert.match(errorBoundary,/No pudimos verificar la estación de prueba/)
  assert.match(errorBoundary,/Nothing was changed/)
  assert.match(errorBoundary,/No se cambió nada/)
  assert.match(errorBoundary,/before recording PASS or FAIL/)
  assert.match(errorBoundary,/antes de registrar PASÓ o FALLÓ/)
  assert.match(errorBoundary,/onClick=\{reset\}/)
  assert.match(errorBoundary,/\/church\/readiness/)
  assert.match(errorBoundary,/mode=signin/)
  assert.doesNotMatch(errorBoundary,/error\.message|error\.stack|digest\}/)
})

test('Phone Proof recovery preserves explicit English or Spanish context',()=>{
  for(const source of [errorBoundary,loading]){
    assert.match(source,/URLSearchParams\(window\.location\.search\)/)
    assert.match(source,/requested === 'es'/)
    assert.match(source,/requested === 'en'/)
    assert.match(source,/document\.documentElement\.lang/)
  }
})

test('Phone Proof shows a low-tech accessible loading state while access is verified',()=>{
  assert.match(loading,/Checking the phone-test station/)
  assert.match(loading,/Verificando la estación de prueba/)
  assert.match(loading,/Keep this page open/)
  assert.match(loading,/Mantén esta página abierta/)
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/role="status"/)
  assert.match(loading,/aria-live="polite"/)
})
