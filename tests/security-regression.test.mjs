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
  assert.match(action,/disabled=\{status\.pending\}/)
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

test('Kingdom Guide uses live approved resource schema and excludes unfinished material',async()=>{
  const source=await read('src/app/guide/page.tsx')
  for(const field of ['approved_for_members','ministry_area','source_year','topic_tags','scripture_refs','archive_status','source_label','source_scope','official_source','library_kind','organization_status']) assert.match(source,new RegExp(field))
  assert.match(source,/\.eq\('approved_for_members',true\)/)
  assert.match(source,/\.not\('archive_status','in','\(draft,retired\)'\)/)
  for(const stale of ['member_visible','resource_year','scripture_references','authority_level','source_authority']) assert.doesNotMatch(source,new RegExp(stale))
})

test('personal schedule planning module exists and writes through server actions',async()=>{
  const page=await read('src/app/calendar/my/page.tsx')
  const panel=await read('src/app/calendar/my/personal-planning.tsx')
  const actions=await read('src/app/calendar/my/actions.ts')
  assert.match(page,/import \{ PersonalPlanning \} from '\.\/personal-planning'/)
  for(const action of ['createPersonalTask','updatePersonalTask','submitTimeOff','cancelTimeOff']) assert.match(panel,new RegExp(action))
  assert.match(actions,/memberContext/)
  assert.match(actions,/\.eq\('assigned_to',userId\)/)
  assert.match(actions,/\.eq\('user_id',userId\)/)
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
})

test('learning progress action validates course, module, membership and enrollment',async()=>{
  const source=await read('src/app/learning/actions.ts')
  assert.match(source,/module\?\.course_id!==courseId/)
  assert.match(source,/church_memberships/)
  assert.match(source,/course_enrollments/)
  assert.match(source,/Start the course before saving lesson progress/)
})

test('database migration enforces enrollment before module progress',async()=>{
  const source=await read('supabase/migrations/20260819235700_enforce_module_progress_enrollment_scope.sql')
  assert.match(source,/Lesson does not belong to this course/)
  assert.match(source,/Course enrollment is required before saving lesson progress/)
  assert.match(source,/before insert or update on public\.course_module_progress/i)
})

test('storage tenant policies use object path, never church name',async()=>{
  const source=await read('supabase/migrations/20260819234706_fully_qualify_storage_object_paths.sql')
  assert.doesNotMatch(source,/foldername\(c\.name\)/)
  assert.match(source,/foldername\(storage\.objects\.name\)/)
})

test('private member detail leadership access fails closed for multi-church users',async()=>{
  const source=await read('supabase/migrations/20260819234424_harden_member_private_details_isolation.sql')
  assert.match(source,/count\(distinct cm\.church_id\)/i)
  assert.match(source,/and 1 =/i)
})

test('messages do not redirect raw database error text to members',async()=>{
  const source=await read('src/app/messages/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  assert.match(source,/console\.error\('sendDirectMessage failed'/)
})

test('imports do not redirect raw database error text to leaders',async()=>{
  const source=await read('src/app/church/import/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(source,/encodeURIComponent\(batchError\?\.message/)
})

test('fundraising does not expose raw database errors and preserves validation',async()=>{
  const source=await read('src/app/fundraising/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  assert.match(source,/goal<=0/)
  assert.match(source,/endsAt.*startsAt/s)
})

test('member admin actions reauthorize pastor or church admin server-side',async()=>{
  const source=await read('src/app/church/members/[userId]/admin-actions.ts')
  assert.match(source,/\['pastor','church_admin'\]\.includes\(actor\.role\)/)
  assert.match(source,/Member not found in this church/)
  assert.match(source,/You cannot remove your own admin access/)
})

test('security-definer migration removes broad execute before restoring intended grants',async()=>{
  const source=await read('supabase/migrations/20260819234537_lock_down_security_definer_execute_grants.sql')
  assert.match(source,/revoke all on function %s from public, anon, authenticated/i)
  assert.match(source,/get_public_signup_status_for_church\(text\) to anon,authenticated/i)
  assert.match(source,/configure_resend_email_provider.*to authenticated/i)
})
