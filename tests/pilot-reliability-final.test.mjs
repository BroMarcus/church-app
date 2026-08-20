import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('backup-admin promotion requires explicit acknowledgement on both UI and server',async()=>{
  const page=await read('src/app/church/admin-backup/page.tsx')
  const actions=await read('src/app/church/admin-backup/actions.ts')
  assert.match(page,/name="confirm_admin" value="yes" required/)
  assert.match(page,/full church-admin access/)
  assert.match(page,/acceso completo de administrador de la iglesia/)
  assert.match(actions,/const confirmed=value\(formData,'confirm_admin'\)==='yes'/)
  assert.match(actions,/if\(!confirmed\)redirect/)
})

test('backup-admin promotion keeps failures private and limits update to active target',async()=>{
  const actions=await read('src/app/church/admin-backup/actions.ts')
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
  assert.match(actions,/console\.error\('Backup admin promotion failed'/)
  assert.match(actions,/\.eq\('status','active'\)/)
  assert.match(actions,/Nothing was changed\. Try again or choose another active member\./)
  assert.match(actions,/No se cambió nada\. Inténtalo de nuevo o elige a otro miembro activo\./)
})

test('pilot readiness hides raw backend errors and provides retry guidance',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.doesNotMatch(source,/\{error\.message\}/)
  assert.match(source,/console\.error\('Pilot readiness check failed'/)
  assert.match(source,/Some readiness checks could not load\. Nothing was changed\./)
  assert.match(source,/No se pudieron cargar algunas revisiones\. No se cambió nada\./)
  assert.match(source,/Try readiness checks again/)
})

test('pilot readiness explicitly tests existing-account church join in both languages',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/Test an existing account joining a church/)
  assert.match(source,/without creating a duplicate account/)
  assert.match(source,/Prueba que una cuenta existente se una a una iglesia/)
  assert.match(source,/sin crear una cuenta duplicada/)
  assert.match(source,/href=\{`\/church\/join-center/)
})

test('pilot readiness avoids database jargon in the hero copy',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.doesNotMatch(source,/Live church\/database checks/)
  assert.doesNotMatch(source,/iglesia\/base de datos/)
  assert.match(source,/Live setup checks plus the real-phone tests/)
  assert.match(source,/Revisiones en vivo de la configuración/)
})

test('public church signup never returns raw auth-provider errors to a member',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.doesNotMatch(source,/fail\(error\.message,error\.message\)/)
  assert.match(source,/console\.error\('public church signup failed'/)
  assert.match(source,/We could not create your account right now\. Check your email and password and try again\./)
  assert.match(source,/No pudimos crear tu cuenta en este momento\. Revisa tu correo y contraseña e inténtalo otra vez\./)
  assert.match(source,/Too many confirmation emails were requested\. Wait about one minute/)
})

test('existing-account join logs unexpected failures without exposing provider text',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/console\.error\('existing-account church join failed'/)
  assert.match(source,/We could not connect your account to this church yet\./)
  assert.match(source,/Todavía no pudimos conectar tu cuenta con esta iglesia\./)
})
