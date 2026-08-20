import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Vercel automatic Git deployment stays disabled during release audit',async()=>{
  const config=JSON.parse(await read('vercel.json'))
  assert.equal(config.git?.deploymentEnabled,false)
})

test('production dependency manifest contains no floating latest versions',async()=>{
  const pkg=JSON.parse(await read('package.json'))
  for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
    assert.notEqual(version,'latest',`${name} must not float on latest`)
  }
})

test('root layout keeps PageGuide behind Suspense for not-found prerender safety',async()=>{
  const source=await read('src/app/layout.tsx')
  assert.match(source,/import \{ Suspense \} from 'react'/)
  assert.match(source,/<Suspense fallback=\{null\}><PageGuide\/><\/Suspense>/)
})

test('public auth routes bypass session refresh middleware',async()=>{
  const source=await read('src/lib/supabase/proxy.ts')
  for(const route of ['/login','/auth/callback','/auth/confirm','/auth/verify','/auth/update-password']) assert.match(source,new RegExp(route.replaceAll('/','\\/')))
  assert.match(source,/publicAuthPrefixes\.some/)
  assert.match(source,/return NextResponse\.next\(\{request\}\)/)
})

test('login UI prevents duplicate auth and email submissions',async()=>{
  const page=await read('src/app/login/page.tsx')
  const submit=await read('src/app/login/pending-submit.tsx')
  const action=await read('src/app/login/pending-action.tsx')
  assert.match(page,/PendingSubmit/)
  assert.match(page,/PendingAction/)
  assert.match(submit,/useFormStatus/)
  assert.match(submit,/disabled=\{status\.pending\}/)
  assert.match(action,/const cooling=remaining>0/)
  assert.match(action,/disabled=\{status\.pending\|\|cooling\}/)
  assert.match(action,/aria-disabled=\{status\.pending\|\|cooling\}/)
})

test('password recovery lands in browser reset page instead of server callback',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const updatePage=await read('src/app/auth/update-password/page.tsx')
  assert.match(actions,/const recoveryUrl=.*\/auth\/update-password/)
  assert.match(actions,/resetPasswordForEmail\(email,\{redirectTo:recoveryUrl\(lang\)\}\)/)
  assert.doesNotMatch(actions,/resetPasswordForEmail\(email,\{redirectTo:callbackUrl/)
  assert.match(updatePage,/exchangeCodeForSession\(code\)/)
  assert.match(updatePage,/onAuthStateChange/)
  assert.match(updatePage,/event==='PASSWORD_RECOVERY'/)
  assert.match(updatePage,/updateUser\(\{password\}\)/)
})

test('auth callback rejects protocol-relative redirect destinations',async()=>{
  const source=await read('src/app/auth/callback/route.ts')
  assert.match(source,/raw\.startsWith\('\/'\).*?!raw\.startsWith\('\/\/'\)/s)
  assert.match(source,/requested\.origin===canonical\.origin/)
})

test('private invite flow cannot preassign pastor or church admin',async()=>{
  const action=await read('src/app/church/invites/actions.ts')
  assert.match(action,/\['member','group_leader','ministry_leader','minister'\]\.includes\(role\)/)
  assert.doesNotMatch(action,/\['member','group_leader','ministry_leader','minister','church_admin','pastor'\]/)
})

test('database invite RPC also blocks pastor and church admin preassignment',async()=>{
  const migration=await read('supabase/migrations/20260819093000_pilot_security_hardening.sql')
  assert.match(migration,/v_role not in \('member','group_leader','ministry_leader','minister'\)/)
})

test('Kingdom Guide uses live approved resource schema and excludes unfinished material',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/\.from\('media_assets'\)/)
  assert.match(source,/\.eq\('approved_for_members',true\)/)
  assert.match(source,/\.not\('archive_status','in','\(draft,retired\)'\)/)
})

test('personal schedule planning module exists and writes through server actions',async()=>{
  const page=await read('src/app/calendar/my/page.tsx')
  const actions=await read('src/app/calendar/my/actions.ts')
  assert.match(page,/Personal Planning/)
  assert.match(actions,/createPersonalTask/)
  assert.match(actions,/addUnavailableDate/)
})

test('learning progress action validates course, module, membership and enrollment',async()=>{
  const actions=await read('src/app/learning/[courseId]/lesson/[moduleId]/actions.ts')
  assert.match(actions,/course_enrollments/)
  assert.match(actions,/church_memberships/)
  assert.match(actions,/course_modules/)
})

test('database migration enforces enrollment before module progress',async()=>{
  const migration=await read('supabase/migrations/20260819122000_learning_progress_enrollment_guard.sql')
  assert.match(migration,/course_enrollments/)
  assert.match(migration,/not enrolled/i)
})

test('storage tenant policies use object path, never church name',async()=>{
  const migration=await read('supabase/migrations/20260819143000_storage_tenant_policy_hardening.sql')
  assert.match(migration,/storage\.foldername/)
  assert.doesNotMatch(migration,/churches\.name/)
})

test('private member detail leadership access fails closed for multi-church users',async()=>{
  const migration=await read('supabase/migrations/20260819152000_private_member_detail_tenant_hardening.sql')
  assert.match(migration,/has_church_role/)
  assert.match(migration,/church_id/)
})

test('messages do not redirect raw database error text to members',async()=>{
  const actions=await read('src/app/messages/actions.ts')
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
})

test('imports do not redirect raw database error text to leaders',async()=>{
  const actions=await read('src/app/church/import/actions.ts')
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
})

test('fundraising does not expose raw database errors and preserves validation',async()=>{
  const actions=await read('src/app/fundraising/actions.ts')
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
  assert.match(actions,/amount/i)
})

test('member admin actions reauthorize pastor or church admin server-side',async()=>{
  const actions=await read('src/app/church/member-control/actions.ts')
  assert.match(actions,/pastor/)
  assert.match(actions,/church_admin/)
})

test('security-definer migration removes broad execute before restoring intended grants',async()=>{
  const migration=await read('supabase/migrations/20260819181500_security_definer_execute_hardening.sql')
  assert.match(migration,/revoke execute/i)
  assert.match(migration,/grant execute/i)
})
