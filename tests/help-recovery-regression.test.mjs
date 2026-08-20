import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Help Center has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/help/loading.tsx')
  const error=await read('src/app/help/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Cargando la ayuda de la iglesia/)
  assert.match(error,/role="alert"/)
  assert.match(error,/No church information or account settings were changed/)
  assert.match(error,/No se cambió ninguna información de la iglesia ni configuración de tu cuenta/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})
