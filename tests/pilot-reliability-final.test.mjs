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
})

test('pilot readiness hides raw backend errors and provides retry guidance',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.doesNotMatch(source,/\{error\.message\}/)
  assert.match(source,/console\.error\('Pilot readiness check failed'/)
  assert.match(source,/Try readiness checks again/)
})

test('pilot readiness explicitly tests existing-account church join in both languages',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/Test an existing account joining a church/)
  assert.match(source,/without creating a duplicate account/)
  assert.match(source,/Prueba que una cuenta existente se una a una iglesia/)
  assert.match(source,/sin crear una cuenta duplicada/)
})

test('public church signup uses bounded status codes instead of query-string error text',async()=>{
  const actions=await read('src/app/join/[slug]/actions.ts')
  const page=await read('src/app/join/[slug]/page.tsx')
  assert.match(actions,/error_code=/)
  assert.match(actions,/joinSignupErrorCode/)
  assert.match(actions,/fail\('signup_failed'\)|fail\(joinSignupErrorCode/)
  assert.doesNotMatch(actions,/[&?]error=\$\{encodeURIComponent/)
  assert.match(page,/searchParams:Promise<\{lang\?:string;error_code\?:string\}>/)
  assert.match(page,/const joinErrors=/)
  assert.match(page,/statusError=.*query\.error_code/)
  assert.doesNotMatch(page,/query\.error\b/)
  assert.match(page,/role="alert"/)
})

test('existing-account join keeps provider failures private and uses fixed codes',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/console\.error\('existing-account church join failed'/)
  assert.match(source,/fail\('capacity_full'\)/)
  assert.match(source,/fail\('inactive_access'\)/)
  assert.match(source,/fail\('join_failed'\)/)
})

test('password reset handles initialization failures without leaving a false-ready form',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/try\{/)
  assert.match(source,/password reset initialization failed/)
  assert.match(source,/setReady\(false\);setMessage\(c\.invalidBack\)/)
})

test('password reset always releases busy state and keeps errors member-safe',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/finally\{\s*setBusy\(false\)\s*\}/s)
  assert.match(source,/password update failed/)
  assert.match(source,/role=\{completed\?'status':'alert'\}/)
  assert.match(source,/aria-live="polite"/)
  assert.match(source,/type="submit" disabled=\{busy\}/)
  assert.match(source,/setCompleted\(true\)/)
})

test('password recovery preserves a safe church-join return path end to end',async()=>{
  const page=await read('src/app/login/page.tsx')
  const actions=await read('src/app/login/actions.ts')
  const reset=await read('src/app/auth/update-password/page.tsx')
  assert.match(page,/name="next" value=\{joinNext\}/)
  assert.match(actions,/const recoveryUrl=.*safeJoinNext/)
  assert.match(actions,/resetPasswordForEmail\(email,\{redirectTo:recoveryUrl\(lang,next\)\}\)/)
  assert.match(reset,/function safeJoinNext/)
  assert.match(reset,/new URL\(value,base\)/)
  assert.match(reset,/setJoinNext\(next\)/)
  assert.match(reset,/signInHref=`\/login\?lang=\$\{lang\}&mode=signin\$\{nextPart\}`/)
})

test('login renders only allowlisted bilingual status codes, not arbitrary query text',async()=>{
  const page=await read('src/app/login/page.tsx')
  assert.match(page,/error_code\?:string;message_code\?:string/)
  assert.match(page,/const authStatus=/)
  assert.match(page,/statusError=.*params\.error_code/)
  assert.match(page,/statusMessage=.*params\.message_code/)
  assert.doesNotMatch(page,/params\.error\b/)
  assert.doesNotMatch(page,/params\.message\b/)
  assert.match(page,/callback_expired:/)
  assert.match(page,/Ese enlace venció o ya fue usado/)
  assert.match(page,/role="alert"/)
  assert.match(page,/role="status" aria-live="polite"/)
})

test('login and callback emit status codes instead of member-facing query strings',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const callback=await read('src/app/auth/callback/route.ts')
  assert.match(actions,/code='invalid_credentials'/)
  assert.match(actions,/statusPart\('message','account_created'\)/)
  assert.match(actions,/statusPart\('message','reset_sent'\)/)
  assert.match(actions,/statusPart\('message','confirmation_sent'\)/)
  assert.doesNotMatch(actions,/[&?]error=\+?encodeURIComponent/)
  assert.doesNotMatch(actions,/[&?]message=\+?encodeURIComponent/)
  assert.match(callback,/error_code=/)
  assert.match(callback,/loginError\('callback_incomplete'\)/)
  assert.match(callback,/loginError\('callback_expired'\)/)
})

test('login warns returning users not to create duplicate accounts in both languages',async()=>{
  const source=await read('src/app/login/page.tsx')
  assert.match(source,/do not create another account/)
  assert.match(source,/no crees otra cuenta/)
  assert.match(source,/return you to the church join page/)
  assert.match(source,/te regresaremos a la página de la iglesia/)
})

test('Kingdom Guide includes bilingual account confirmation and existing-account church-join help',async()=>{
  const knowledge=await read('src/lib/help-knowledge.ts')
  assert.match(knowledge,/id:'confirm-email'/)
  assert.match(knowledge,/id:'existing-account-join'/)
  assert.match(knowledge,/id:'duplicate-account'/)
  assert.match(knowledge,/join church with existing account/)
  assert.match(knowledge,/unirme con cuenta existente/)
})

test('Kingdom Guide honors preferred language and bounds search input',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/preferred_language/)
  assert.match(source,/query\.lang==='es'\?'es':query\.lang==='en'\?'en':preferred/)
  assert.match(source,/\.trim\(\)\.slice\(0,160\)/)
  assert.match(source,/maxLength=\{160\}/)
})