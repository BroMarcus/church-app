import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const page=read('src/app/start/page.tsx')
const actions=read('src/app/start/actions.ts')

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
