import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group join actions prevent duplicate mobile submissions',async()=>{
  const source=await read('src/app/groups/[groupId]/join-requests.tsx')
  assert.match(source,/useFormStatus/)
  assert.match(source,/disabled=\{pending\}/)
  assert.match(source,/aria-disabled=\{pending\}/)
  assert.match(source,/You do not need to send another request\./)
  assert.match(source,/No necesitas enviar otra solicitud\./)
})

test('Friendship Group join states are available in English and Spanish',async()=>{
  const source=await read('src/app/groups/[groupId]/join-requests.tsx')
  assert.match(source,/Request to join/)
  assert.match(source,/Solicitar unirme/)
  assert.match(source,/This group is currently full\./)
  assert.match(source,/Este grupo está lleno por ahora\./)
  assert.match(source,/Your request is pending\./)
  assert.match(source,/Tu solicitud está pendiente\./)
})

test('Friendship Groups crash recovery is language-aware and avoids provider text',async()=>{
  const source=await read('src/app/groups/error.tsx')
  assert.match(source,/params\.get\('lang'\)==='es'/)
  assert.match(source,/We could not load your groups\./)
  assert.match(source,/No pudimos cargar tus grupos\./)
  assert.match(source,/Try again/)
  assert.match(source,/Intentar de nuevo/)
  assert.match(source,/console\.error\('Friendship Groups route failed'/)
  assert.doesNotMatch(source,/error\.message/)
})
