import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const page=read('src/app/start/page.tsx')
const actions=read('src/app/start/actions.ts')
const submit=read('src/app/start/start-submit-button.tsx')

test('Start Here does not echo arbitrary query-string error or message text',()=>{
  assert.doesNotMatch(page,/params\.error\b/)
  assert.doesNotMatch(page,/params\.message\b/)
  assert.match(page,/error_code\?:string/)
  assert.match(page,/statusCopy/)
  assert.match(page,/onboarding_save_failed/)
})

test('Start Here distinguishes temporary auth and data-read failures from real empty membership state',()=>{
  assert.match(page,/error:authError/)
  assert.match(page,/if\(authError\)return recovery/)
  assert.match(page,/profileResult\.error\|\|membershipResult\.error/)
  assert.match(page,/if\(!membership\?\.church_id\)redirect/)
})

test('Start Here failure recovery is bilingual and keeps diagnostics bounded',()=>{
  assert.match(page,/We could not safely load Start Here/)
  assert.match(page,/No pudimos cargar Empieza Aquí de forma segura/)
  assert.match(page,/const boundedCode=\(value:unknown\)=>String\(value\|\|'unknown'\)\.slice\(0,80\)/)
  assert.match(page,/Try Start Here again/)
  assert.match(page,/Intentar Empieza Aquí otra vez/)
})

test('onboarding completion uses fixed status codes and does not put provider text in the URL',()=>{
  assert.match(actions,/error_code=onboarding_save_failed/)
  assert.match(actions,/error_code=connection_unavailable/)
  assert.doesNotMatch(actions,/encodeURIComponent\(message\)/)
  assert.match(actions,/console\.error\('start onboarding save failed',\{code:boundedCode\(error\.code\)\}\)/)
})

test('Spanish Start Here presents common church roles in Spanish',()=>{
  assert.match(page,/church_admin:'Administrador de iglesia'/)
  assert.match(page,/member:'Miembro'/)
  assert.match(page,/leader:'Líder'/)
  assert.match(page,/roleLabel\(membership\.role,lang\)/)
})

test('first-login tour stays focused on core member-safe destinations',()=>{
  const tourLine=page.split('\n').find((line)=>line.trim().startsWith('const tour='))||''
  for(const path of ['/','/learning','/groups','/calendar','/guide','/prayer','/documents','/updates','/notifications']) assert.match(tourLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
  for(const path of ['/outreach','/teams','/network','/fundraising']) assert.doesNotMatch(tourLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
  assert.match(page,/You do not need every tool on your first day/)
  assert.match(page,/No necesitas todas las herramientas el primer día/)
})

test('finish onboarding blocks repeat taps and gives bilingual pending guidance',()=>{
  assert.match(page,/StartSubmitButton label=\{t\.finish\} pendingLabel=\{t\.saving\}/)
  assert.match(page,/Saving — keep this page open/)
  assert.match(page,/Guardando — mantén esta página abierta/)
  assert.match(submit,/useFormStatus/)
  assert.match(submit,/disabled=\{pending\}/)
  assert.match(submit,/pending\?pendingLabel:label/)
})
