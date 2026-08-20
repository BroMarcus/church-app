import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('church invitation management has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/church/invites/loading.tsx')
  const error=await read('src/app/church/invites/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Cargando invitaciones/)
  assert.match(error,/role="alert"/)
  assert.match(error,/No invitation, membership, or church access was changed/)
  assert.match(error,/No se cambió ninguna invitación, membresía ni acceso a la iglesia/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})
