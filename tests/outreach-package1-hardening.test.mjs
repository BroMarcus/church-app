import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const lifecycle=read('supabase/migrations/20260826181000_harden_outreach_source_link_lifecycle.sql')
const ownerPrivacy=read('supabase/migrations/20260826182500_outreach_owner_and_public_group_privacy.sql')
const intakeGuard=read('supabase/migrations/20260826183000_guard_public_outreach_intake.sql')
const publicPage=read('src/app/connect/[token]/page.tsx')
const publicLoading=read('src/app/connect/[token]/loading.tsx')
const connectActions=read('src/app/connect/actions.ts')
const outreachActions=read('src/app/outreach/actions.ts')

test('public intake pause is enforced at the database mutation boundary',()=>{
  assert.match(intakeGuard,/create or replace function private\.guard_outreach_connection_receipt/i)
  assert.match(intakeGuard,/before insert on public\.outreach_connection_receipts/i)
  assert.match(intakeGuard,/feature_key='outreach'/i)
  assert.match(intakeGuard,/fs\.enabled=false/i)
  assert.match(intakeGuard,/Church connection intake is paused/i)
  assert.match(intakeGuard,/not exists\([\s\S]*church_feature_settings[\s\S]*feature_key='outreach'[\s\S]*enabled=false/i)
})

test('one request UUID cannot be replayed against another church or source link',()=>{
  assert.match(intakeGuard,/v_existing\.source_link_id<>new\.source_link_id/i)
  assert.match(intakeGuard,/v_existing\.church_id<>new\.church_id/i)
  assert.match(intakeGuard,/v_source_church<>new\.church_id/i)
  assert.match(intakeGuard,/Connection request does not match its original source/i)
})

test('invalid inactive expired and paused source links fail closed',()=>{
  assert.match(lifecycle,/l\.active=true/i)
  assert.match(lifecycle,/l\.expires_at is null or l\.expires_at>now\(\)/i)
  assert.match(intakeGuard,/l\.active=true/i)
  assert.match(intakeGuard,/l\.expires_at is null or l\.expires_at>now\(\)/i)
  assert.match(publicPage,/LINK NOT AVAILABLE/)
  assert.match(publicPage,/expired, paused, or inactive/i)
})

test('anonymous Friendship Group source never returns or renders private location data',()=>{
  assert.match(ownerPrivacy,/g\.name,null::text,g\.meeting_day/i)
  assert.match(intakeGuard,/g\.name,null::text,g\.meeting_day/i)
  assert.doesNotMatch(publicPage,/source\.group_location_label/)
  assert.match(publicPage,/Exact\/private[\s\S]*locations are never rendered/i)
})

test('critical public states remain bilingual and loading is explicit',()=>{
  assert.match(publicPage,/LINK NOT AVAILABLE/)
  assert.match(publicPage,/ENLACE NO DISPONIBLE/)
  assert.match(publicPage,/English/)
  assert.match(publicPage,/Español/)
  assert.match(publicPage,/RECEIVED — SAFE REVIEW/)
  assert.match(publicPage,/RECIBIDO — REVISIÓN SEGURA/)
  assert.match(publicLoading,/Loading your church connection/)
  assert.match(publicLoading,/Cargando su conexión con la iglesia/)
})

test('account handoff preserves selected language without claiming membership',()=>{
  assert.match(publicPage,/\/join\/\$\{source\.church_slug\}\?lang=\$\{lang\}/)
  assert.match(publicPage,/does not automatically grant membership/i)
})

test('public guest capture never writes official milestone truth',()=>{
  const submit=lifecycle.split('create or replace function public.submit_outreach_connection')[1]??''
  assert.doesNotMatch(submit,/insert into public\.member_milestones/i)
  assert.doesNotMatch(submit,/update public\.member_milestones/i)
  assert.doesNotMatch(submit,/baptized\s*=/i)
  assert.doesNotMatch(submit,/holy_ghost_received\s*=/i)
  assert.match(submit,/first_steps_interest/i)
})

test('exact phone and exact email matching stay same-church and name alone is not identity proof',()=>{
  assert.match(lifecycle,/o\.church_id=v_link\.church_id/i)
  assert.match(lifecycle,/o\.email_normalized=v_email/i)
  assert.match(lifecycle,/o\.phone_normalized=v_phone_digits/i)
  assert.doesNotMatch(lifecycle,/lower\(trim\(o\.first_name\)\)/i)
})

test('leader Outreach actions never redirect raw database provider messages',()=>{
  assert.match(outreachActions,/OUTREACH_TIME_CONVERSION_FAILED/)
  assert.match(outreachActions,/We could not save that Outreach change/)
  assert.match(outreachActions,/We could not save that follow-up entry with certainty/)
  assert.doesNotMatch(outreachActions,/redirect\([^\n]*error\.message/i)
  assert.doesNotMatch(outreachActions,/redirect\([^\n]*updateError\.message/i)
  assert.doesNotMatch(outreachActions,/e\.message\|\|/i)
  assert.doesNotMatch(connectActions,/redirect\([^\n]*error\.message/i)
})

test('explicit manage_outreach ownership is preferred without modifying shared role assignments',()=>{
  assert.match(ownerPrivacy,/church_role_assignments a/i)
  assert.match(ownerPrivacy,/r\.permissions->>'manage_outreach'/i)
  assert.doesNotMatch(ownerPrivacy,/insert into public\.church_role_assignments/i)
  assert.doesNotMatch(ownerPrivacy,/update public\.church_role_assignments/i)
  assert.doesNotMatch(ownerPrivacy,/delete from public\.church_role_assignments/i)
})
