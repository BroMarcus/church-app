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
