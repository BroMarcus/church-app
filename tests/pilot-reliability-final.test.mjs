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

test('password reset handles initialization failures without leaving a false-ready form',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/try\{/)
  assert.match(source,/password reset initialization failed/)
  assert.match(source,/setReady\(false\);setMessage\(c\.invalidBack\)/)
  assert.match(source,/password reset session exchange failed/)
  assert.match(source,/password reset session lookup failed/)
})

test('password reset always releases busy state and keeps errors member-safe',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/finally\{\s*setBusy\(false\)\s*\}/s)
  assert.match(source,/password update failed/)
  assert.match(source,/password update request failed/)
  assert.match(source,/role="status" aria-live="polite"/)
  assert.match(source,/type="submit" disabled=\{busy\}/)
  assert.match(source,/mode=signin/)
})

test('login warns returning users not to create duplicate accounts in both languages',async()=>{
  const source=await read('src/app/login/page.tsx')
  assert.match(source,/do not create another account/)
  assert.match(source,/no crees otra cuenta/)
  assert.match(source,/return you to the church join page/)
  assert.match(source,/te regresaremos a la página de la iglesia/)
  assert.match(source,/joinNext&&<div className="notice success"/)
})

test('Kingdom Guide includes bilingual account confirmation and existing-account church-join help',async()=>{
  const knowledge=await read('src/lib/help-knowledge.ts')
  assert.match(knowledge,/id:'confirm-email'/)
  assert.match(knowledge,/id:'existing-account-join'/)
  assert.match(knowledge,/id:'duplicate-account'/)
  assert.match(knowledge,/join church with existing account/)
  assert.match(knowledge,/unirme con cuenta existente/)
  assert.match(knowledge,/open only the newest message/)
  assert.match(knowledge,/abre solamente el mensaje más reciente/)
})

test('Kingdom Guide honors preferred language and bounds search input',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/preferred_language/)
  assert.match(source,/query\.lang==='es'\?'es':query\.lang==='en'\?'en':preferred/)
  assert.match(source,/\.trim\(\)\.slice\(0,160\)/)
  assert.match(source,/maxLength=\{160\}/)
  assert.match(source,/how do I join my church/)
  assert.match(source,/cómo me uno a mi iglesia/)
})