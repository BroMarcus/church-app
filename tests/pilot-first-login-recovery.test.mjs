import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('signed-in account without a church gets concrete bilingual recovery guidance',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/You're signed in\. One step is left\./)
  assert.match(source,/Ya iniciaste sesión\. Falta un paso\./)
  assert.match(source,/Do not create another account/)
  assert.match(source,/No crees otra cuenta/)
  assert.match(source,/newest church invitation or join link/)
  assert.match(source,/invitación o el enlace más reciente/)
  assert.match(source,/Check connection again/)
  assert.match(source,/Revisar conexión otra vez/)
})

test('no-church state avoids inaccessible Guide and Feedback redirect loops',async()=>{
  const source=await read('src/app/page.tsx')
  const start=source.indexOf("if(!membership?.church_id)return")
  const end=source.indexOf("const isAdmin=",start)
  assert.ok(start>=0&&end>start,'no-church branch must exist')
  const branch=source.slice(start,end)
  assert.doesNotMatch(branch,/href=\{l\('\/guide'\)\}/)
  assert.doesNotMatch(branch,/href=\{l\('\/feedback'\)\}/)
  assert.match(branch,/href=\{l\('\/'\)\}/)
  assert.match(branch,/action="\/auth\/signout"/)
})

test('global error boundary hides technical error text and gives three safe exits',async()=>{
  const source=await read('src/app/error.tsx')
  assert.doesNotMatch(source,/error\.message/)
  assert.match(source,/console\.error\('Kingdom Network page failed'/)
  assert.match(source,/error\.digest/)
  assert.match(source,/Try again \/ Intentar de nuevo/)
  assert.match(source,/Home \/ Inicio/)
  assert.match(source,/Sign in \/ Iniciar sesión/)
})

test('global not-found page is bilingual and never renders arbitrary request text',async()=>{
  const source=await read('src/app/not-found.tsx')
  assert.match(source,/We could not find that page/)
  assert.match(source,/No encontramos esa página/)
  assert.match(source,/Your account and church information were not changed/)
  assert.match(source,/Tu cuenta y la información de tu iglesia no fueron modificadas/)
  assert.match(source,/href="\/"/)
  assert.match(source,/href="\/login\?mode=signin"/)
})

test('pilot feedback renders only fixed bilingual error codes',async()=>{
  const page=await read('src/app/feedback/page.tsx')
  const actions=await read('src/app/feedback/actions.ts')
  assert.doesNotMatch(page,/q\.error&&/)
  assert.doesNotMatch(page,/\{q\.error\}/)
  assert.match(page,/q\.error_code==='message_short'/)
  assert.match(page,/q\.error_code==='save_failed'/)
  assert.match(page,/role="alert"/)
  assert.match(actions,/error_code=message_short/)
  assert.match(actions,/error_code=save_failed/)
  assert.doesNotMatch(actions,/encodeURIComponent\(/)
})

test('pilot feedback logs safe diagnostics and preserves Spanish when membership is missing',async()=>{
  const source=await read('src/app/feedback/actions.ts')
  assert.match(source,/console\.error\('Pilot feedback save failed',\{code:error\.code\?\?'unknown'\}\)/)
  assert.doesNotMatch(source,/error\.message/)
  assert.match(source,/redirect\(lang==='es'\?'\/\?lang=es':'\/'\)/)
})
