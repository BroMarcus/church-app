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

test('page error recovery follows selected language without exposing technical error text',async()=>{
  const source=await read('src/app/error.tsx')
  assert.doesNotMatch(source,/error\.message/)
  assert.match(source,/console\.error\('Kingdom Network page failed'/)
  assert.match(source,/error\.digest/)
  assert.match(source,/URLSearchParams\(window\.location\.search\)/)
  assert.match(source,/get\('lang'\)==='es'/)
  assert.match(source,/withLang/)
  assert.match(source,/Try again/)
  assert.match(source,/Intentar de nuevo/)
  assert.match(source,/aria-live="assertive"/)
})

test('root global error preserves Spanish sign-in recovery and hides technical text',async()=>{
  const source=await read('src/app/global-error.tsx')
  assert.match(source,/export default function GlobalError/)
  assert.match(source,/<html lang=\{lang\}>/)
  assert.doesNotMatch(source,/error\.message/)
  assert.match(source,/console\.error\('Kingdom Network root failed'/)
  assert.match(source,/\/login\?mode=signin&lang=es/)
  assert.match(source,/Reload/)
  assert.match(source,/Recargar/)
})

test('global not-found page follows language and gives stale invitation recovery',async()=>{
  const source=await read('src/app/not-found.tsx')
  assert.match(source,/We could not find that page/)
  assert.match(source,/No encontramos esa página/)
  assert.match(source,/newest invitation or join link/)
  assert.match(source,/invitación o el enlace más reciente/)
  assert.match(source,/\/login\?mode=signin&lang=es/)
  assert.match(source,/\/?lang=es/)
  assert.doesNotMatch(source,/error\.message/)
})

test('pilot feedback renders only fixed bilingual status values',async()=>{
  const page=await read('src/app/feedback/page.tsx')
  const actions=await read('src/app/feedback/actions.ts')
  assert.doesNotMatch(page,/q\.error&&/)
  assert.doesNotMatch(page,/\{q\.error\}/)
  assert.match(page,/q\.error_code==='message_short'/)
  assert.match(page,/q\.error_code==='save_failed'/)
  assert.match(page,/q\.sent==='1'/)
  assert.match(page,/role="alert"/)
  assert.match(actions,/error_code=message_short/)
  assert.match(actions,/error_code=save_failed/)
  assert.doesNotMatch(actions,/encodeURIComponent\(/)
})

test('pilot feedback prevents duplicate submits and exposes bilingual pending state',async()=>{
  const page=await read('src/app/feedback/page.tsx')
  const button=await read('src/app/feedback/submit-button.tsx')
  assert.match(page,/SubmitFeedbackButton/)
  assert.match(page,/sending:'Sending…'/)
  assert.match(page,/sending:'Enviando…'/)
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-busy=\{pending\}/)
})

test('pilot feedback logs safe diagnostics and preserves Spanish when membership is missing',async()=>{
  const source=await read('src/app/feedback/actions.ts')
  assert.match(source,/console\.error\('Pilot feedback save failed',\{code:error\.code\?\?'unknown'\}\)/)
  assert.doesNotMatch(source,/error\.message/)
  assert.match(source,/redirect\(lang==='es'\?'\/\?lang=es':'\/'\)/)
})
