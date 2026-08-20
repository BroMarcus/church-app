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
  assert.match(action,/disabled=\{status\.pending\|\|cooling\}/)
  assert.match(action,/aria-disabled=\{status\.pending\|\|cooling\}/)
  assert.match(action,/localStorage\.setItem/)
})

test('password recovery lands in browser reset page instead of server callback',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const updatePage=await read('src/app/auth/update-password/page.tsx')
  assert.match(actions,/const recoveryUrl=.*\/auth\/update-password/)
  assert.match(actions,/resetPasswordForEmail\(email,\{redirectTo:recoveryUrl\(lang,inviteId\)\}\)/)
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
  const action=await read('src/app/church/invite-person/actions.ts')
  const page=await read('src/app/church/invite-person/page.tsx')
  assert.match(action,/allowedInviteRoles=new Set\(\['member','group_leader','ministry_leader','minister'\]\)/)
  assert.match(action,/!allowedInviteRoles\.has\(requestedRole\)/)
  assert.doesNotMatch(page,/\['church_admin'.*'Church admin'/s)
  assert.match(page,/never preassigned by invitation/)
})

test('database invite RPC also blocks pastor and church admin preassignment',async()=>{
  const source=await read('supabase/migrations/20260820013700_disallow_privileged_invite_role_preassignment.sql')
  assert.match(source,/v_role not in \('member','group_leader','ministry_leader','minister'\)/)
  assert.match(source,/Privileged pastor\/admin roles must be assigned after the account is verified/)
})

test('Kingdom Guide uses live approved resource schema and excludes unfinished material',async()=>{
  const source=await read('src/app/guide/page.tsx')
  for(const field of ['approved_for_members','ministry_area','source_year','topic_tags','scripture_refs','archive_status','source_label','source_scope','official_source','library_kind','organization_status']) assert.match(source,new RegExp(field))
  assert.match(source,/\.eq\('approved_for_members',true\)/)
  assert.match(source,/\.not\('archive_status','in','\(draft,retired\)'\)/)
})

test('personal schedule planning module exists and writes through server actions',async()=>{
  const page=await read('src/app/personal-planning/page.tsx')
  const actions=await read('src/app/personal-planning/actions.ts')
  assert.match(page,/Personal Planning/)
  assert.match(page,/addPersonalTask/)
  assert.match(page,/addUnavailableDate/)
  assert.match(actions,/export async function addPersonalTask/)
  assert.match(actions,/export async function addUnavailableDate/)
  assert.match(actions,/church_personal_tasks/)
  assert.match(actions,/church_member_unavailability/)
})

test('learning progress action validates course, module, membership and enrollment',async()=>{
  const source=await read('src/app/learning/[courseId]/actions.ts')
  assert.match(source,/course_modules/)
  assert.match(source,/church_memberships/)
  assert.match(source,/course_enrollments/)
  assert.match(source,/Module does not belong to this course/)
})

test('database migration enforces enrollment before module progress',async()=>{
  const source=await read('supabase/migrations/20260820024000_learning_progress_enrollment_guard.sql')
  assert.match(source,/course_enrollments/)
  assert.match(source,/raise exception 'Active course enrollment is required/)
})

test('storage tenant policies use object path, never church name',async()=>{
  const source=await read('supabase/migrations/20260817161200_phase3_foundation_and_launch.sql')
  assert.match(source,/storage\.foldername\(name\)/)
  assert.doesNotMatch(source,/churches\.name.*storage/s)
})

test('private member detail leadership access fails closed for multi-church users',async()=>{
  const source=await read('supabase/migrations/20260818121400_member_private_details.sql')
  assert.match(source,/church_id/)
  assert.match(source,/auth\.uid\(\)/)
})

test('messages do not redirect raw database error text to members',async()=>{
  const source=await read('src/app/messages/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
})

test('imports do not redirect raw database error text to leaders',async()=>{
  const source=await read('src/app/church/import/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
})

test('fundraising does not expose raw database errors and preserves validation',async()=>{
  const source=await read('src/app/fundraising/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  assert.match(source,/goal_amount/)
})

test('member admin actions reauthorize pastor or church admin server-side',async()=>{
  const source=await read('src/app/church/members/actions.ts')
  assert.match(source,/pastor/)
  assert.match(source,/church_admin/)
  assert.match(source,/auth\.getClaims/)
})

test('security-definer migration removes broad execute before restoring intended grants',async()=>{
  const source=await read('supabase/migrations/20260820031500_security_definer_api_surface.sql')
  assert.match(source,/revoke execute on function/)
  assert.match(source,/grant execute on function/)
})
