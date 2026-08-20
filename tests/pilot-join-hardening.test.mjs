import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('existing-account public church join is authenticated and cannot self-elevate',()=>{
  const sql=read('supabase/migrations/20260820164600_existing_account_public_church_join.sql')
  assert.match(sql,/v_user uuid:=auth\.uid\(\)/)
  assert.match(sql,/values\(\s*v_church\.id,v_user,'member','active','guest','public_join'\s*\)/s)
  assert.match(sql,/revoke all on function public\.join_public_church_existing_account[\s\S]*from anon;/)
  assert.match(sql,/grant execute on function public\.join_public_church_existing_account[\s\S]*to authenticated;/)
  assert.doesNotMatch(sql,/p_role/i)
})

test('existing-account join is idempotent and does not silently reactivate inactive access',()=>{
  const sql=read('supabase/migrations/20260820164600_existing_account_public_church_join.sql')
  assert.match(sql,/if v_existing\.status='active' then[\s\S]*return query select v_church\.id,v_church\.name,true;/)
  assert.match(sql,/previous church access is not active/i)
  assert.match(sql,/public signup capacity has been reached/i)
})

test('login continuation is restricted to church join routes',()=>{
  const actions=read('src/app/login/actions.ts')
  assert.match(actions,/safeJoinNext/)
  assert.match(actions,/startsWith\('\/join\/'\)/)
  assert.match(actions,/!value\.startsWith\('\/\/'\)/)
  assert.match(actions,/!value\.includes\('\.\.'\)/)
})

test('public join keeps low-tech password verification and existing-account path',()=>{
  const page=read('src/app/join/[slug]/page.tsx')
  assert.match(page,/PasswordField/)
  assert.match(page,/showPassword:'Show password'/)
  assert.match(page,/showPassword:'Mostrar contraseña'/)
  assert.match(page,/Use my existing account/)
  assert.match(page,/Usar mi cuenta existente/)
  assert.match(page,/joinExistingChurch/)
})
