import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('simplified Home fails closed when the active church membership read fails',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/error:membershipError/)
  assert.match(source,/Home membership read failed/)
  assert.match(source,/We couldn't load your church connection\./)
  assert.match(source,/No pudimos cargar tu conexión con la iglesia\./)
  assert.match(source,/Nothing was changed\./)
  assert.match(source,/No se cambió nada\./)
  assert.match(source,/Check connection again/)
  assert.match(source,/Revisar conexión otra vez/)
})

test('simplified Home keeps unconnected users on their existing account and newest invite',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/Keep this account—do not create another one\./)
  assert.match(source,/newest invitation or join link/)
  assert.match(source,/Conserva esta cuenta; no crees otra\./)
  assert.match(source,/invitación o enlace más reciente/)
  assert.match(source,/I need help/)
  assert.match(source,/Necesito ayuda/)
})

test('simplified Home presents Kingdom Guide labels in Spanish',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/t\('Kingdom Guide','Guía Kingdom'\)/)
  assert.match(source,/Abrir Guía Kingdom/)
})
