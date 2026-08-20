import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Church Health has explicit auth/permission protection at the public RPC boundary',async()=>{
  const migration=await read('supabase/migrations/20260820053000_existing_account_invite_redemption.sql')
  assert.match(migration,/create or replace function public\.church_health_snapshot/)
  assert.match(migration,/if auth\.uid\(\) is null then/)
  assert.match(migration,/private\.has_church_permission\(p_church_id,'view_leadership'\)/)
  assert.match(migration,/private\.has_church_permission\(p_church_id,'manage_members'\)/)
  assert.match(migration,/revoke all on function public\.church_member_relationship_confidence\(uuid\) from authenticated/)
  assert.match(migration,/revoke all on function public\.church_member_relationship_confidence\(uuid\) from anon/)
})

test('Church Health provides loading and recoverable error states',async()=>{
  const loading=await read('src/app/church/health/loading.tsx')
  const error=await read('src/app/church/health/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Cargando la salud de la iglesia/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your church data was not changed/)
  assert.match(error,/Los datos de tu iglesia no fueron modificados/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('Pilot Readiness provides loading and recoverable error states',async()=>{
  const loading=await read('src/app/church/readiness/loading.tsx')
  const error=await read('src/app/church/readiness/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Revisando la configuración de tu iglesia/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Nothing in your church setup was changed/)
  assert.match(error,/No se cambió nada en la configuración de tu iglesia/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('main login/signup route has visible loading and safe retry states',async()=>{
  const loading=await read('src/app/login/loading.tsx')
  const error=await read('src/app/login/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Abriendo el inicio de sesión/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your account was not changed/)
  assert.match(error,/Tu cuenta no fue modificada/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('church signup route has visible loading and safe retry states',async()=>{
  const loading=await read('src/app/join/[slug]/loading.tsx')
  const error=await read('src/app/join/[slug]/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Abriendo el registro de la iglesia/)
  assert.match(error,/role="alert"/)
  assert.match(error,/No account or church record was changed/)
  assert.match(error,/No se cambió ninguna cuenta ni registro de iglesia/)
  assert.match(error,/\/login\?mode=signin/)
})

test('backup admin promotion is limited to active verified church members',async()=>{
  const page=await read('src/app/church/admin-backup/page.tsx')
  const actions=await read('src/app/church/admin-backup/actions.ts')
  assert.match(page,/\.eq\('relationship_status','member'\)/)
  assert.match(page,/Only active formal members/)
  assert.match(page,/miembros formales activos/)
  assert.match(actions,/target\.relationship_status!=='member'/)
  assert.match(actions,/Only a verified church member can become a backup admin/)
  assert.match(actions,/\.eq\('relationship_status','member'\)/)
  assert.match(actions,/console\.error\('backup admin promotion failed'/)
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
})

test('Kingdom Guide has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/guide/loading.tsx')
  const error=await read('src/app/guide/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Preparando tu ayuda/)
  assert.match(error,/role="alert"/)
  assert.match(error,/No information was changed/)
  assert.match(error,/No se cambió ninguna información/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('Start Here has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/start/loading.tsx')
  const error=await read('src/app/start/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Preparando tus primeros pasos/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your account and progress were not changed/)
  assert.match(error,/Tu cuenta y tu progreso no fueron modificados/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('Church Builder has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/church/launch/loading.tsx')
  const error=await read('src/app/church/launch/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Revisando qué necesita tu iglesia después/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Nothing in your church setup was changed/)
  assert.match(error,/No se cambió nada en la configuración de tu iglesia/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('My Today has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/today/loading.tsx')
  const error=await read('src/app/today/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Preparando tu día/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your tasks and church information were not changed/)
  assert.match(error,/Tus tareas y la información de la iglesia no fueron modificadas/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('My Journey has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/journey/loading.tsx')
  const error=await read('src/app/journey/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Preparando tu camino/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your Journey progress was not changed/)
  assert.match(error,/El progreso de tu Camino no fue modificado/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})

test('Learning Center has bilingual loading and safe retry states',async()=>{
  const loading=await read('src/app/learning/loading.tsx')
  const error=await read('src/app/learning/error.tsx')
  assert.match(loading,/aria-busy="true"/)
  assert.match(loading,/Preparando tus clases/)
  assert.match(error,/role="alert"/)
  assert.match(error,/Your course progress was not changed/)
  assert.match(error,/El progreso de tus cursos no fue modificado/)
  assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
})
