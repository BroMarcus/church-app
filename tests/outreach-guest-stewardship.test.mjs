import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const migration=read('supabase/migrations/20260826180000_outreach_source_links_and_history.sql')
const reviewHardening=read('supabase/migrations/20260826180500_harden_outreach_connection_reviews.sql')
const lifecycleHardening=read('supabase/migrations/20260826181000_harden_outreach_source_link_lifecycle.sql')
const followupHardening=read('supabase/migrations/20260826181500_keep_outreach_followup_due_after_return.sql')
const policyHardening=read('supabase/migrations/20260826182000_scope_outreach_write_policies.sql')
const publicPage=read('src/app/connect/[token]/page.tsx')
const sharePage=read('src/app/connect/page.tsx')
const nav=read('src/components/mobile-nav.tsx')
const navShell=read('src/components/mobile-nav-shell.tsx')

test('source-aware interaction history preserves structured attribution and idempotency',()=>{
  for(const column of ['source_type','source_label','source_group_id','source_event_id','referrer_user_id','visit_ordinal','source_key'])assert.match(migration,new RegExp(`add column if not exists ${column}`,'i'))
  assert.match(migration,/outreach_interactions_source_key_unique_idx/i)
  assert.match(migration,/source_key=v_source_key/i)
  assert.match(migration,/connect:'\|\|p_request_key::text/i)
})

test('public connection submission is retry-safe and does not require an Auth account',()=>{
  assert.match(migration,/create table if not exists public\.outreach_connection_receipts/i)
  assert.match(migration,/insert into public\.outreach_connection_receipts/i)
  assert.match(migration,/on conflict\(request_key\) do nothing/i)
  assert.match(lifecycleHardening,/grant execute on function public\.submit_outreach_connection[\s\S]*to anon,authenticated,service_role/i)
  assert.doesNotMatch(publicPage,/redirect\('\/login'\)/i)
})

test('duplicate matching uses same-church phone or email and ambiguous matches fail closed',()=>{
  assert.match(lifecycleHardening,/o\.church_id=v_link\.church_id/i)
  assert.match(lifecycleHardening,/o\.email_normalized=v_email/i)
  assert.match(lifecycleHardening,/o\.phone_normalized=v_phone_digits/i)
  assert.match(lifecycleHardening,/if v_candidate_count>1 or v_linked_candidate_count>0 then/i)
  assert.match(lifecycleHardening,/outreach_connection_reviews/i)
  assert.match(lifecycleHardening,/return query select 'needs_review'::text/i)
  assert.doesNotMatch(lifecycleHardening,/lower\(trim\(o\.first_name\)\).*v_first_name/i)
})

test('anonymous matching never silently mutates an already-linked member',()=>{
  assert.match(lifecycleHardening,/count\(distinct o\.id\) filter \(where o\.member_user_id is not null\)/i)
  assert.match(lifecycleHardening,/v_linked_candidate_count>0/i)
  const reviewBeforeTouch=lifecycleHardening.indexOf("if v_candidate_count>1 or v_linked_candidate_count>0 then")
  const touch=lifecycleHardening.indexOf('private.apply_outreach_source_touch')
  assert.ok(reviewBeforeTouch>=0&&touch>reviewBeforeTouch)
})

test('ordinary source links cannot grant membership, group roster membership, or roles',()=>{
  const submitSection=lifecycleHardening.split('create or replace function public.submit_outreach_connection')[1]??''
  assert.doesNotMatch(submitSection,/insert into public\.church_memberships/i)
  assert.doesNotMatch(submitSection,/insert into public\.group_memberships/i)
  assert.doesNotMatch(submitSection,/church_role_assignments/i)
  assert.match(publicPage,/does not automatically grant membership/i)
})

test('member invite links do not make the inviter the private follow-up owner',()=>{
  assert.match(migration,/private\.outreach_owner_for_source_link/i)
  assert.match(migration,/cm\.role in \('pastor','church_admin'\)/i)
  assert.match(migration,/referrer_user_id[\s\S]*v_link\.created_by/i)
  assert.doesNotMatch(migration,/assigned_to\s*=\s*v_link\.created_by/i)
})

test('Friendship Group links are limited to a group the member belongs to or operates',()=>{
  assert.match(migration,/p_source_type='friendship_group'/i)
  assert.match(migration,/group_memberships gm where gm\.group_id=g\.id and gm\.user_id=v_user/i)
  assert.match(migration,/private\.can_operate_group\(g\.id\)/i)
})

test('inactive members cannot keep resolving or reactivating old connection links',()=>{
  assert.match(lifecycleHardening,/private\.is_church_member\(v_link\.church_id\)/i)
  assert.match(lifecycleHardening,/cm\.church_id=l\.church_id and cm\.user_id=l\.created_by and cm\.status='active'/i)
  assert.match(lifecycleHardening,/source_type<>'friendship_group' or g\.id is not null/i)
})

test('return visits always leave a valid next follow-up window',()=>{
  assert.match(followupHardening,/when follow_up_due_at is null or follow_up_due_at<=v_now then v_now\+interval '24 hours'/i)
  assert.match(followupHardening,/else least\(follow_up_due_at,v_now\+interval '24 hours'\)/i)
  assert.match(followupHardening,/last_contacted_at=case[\s\S]*visit','service_attendance'/i)
})

test('all direct Outreach read/write paths use explicit scoped authority',()=>{
  for(const policy of ['outreach_read','outreach_insert','outreach_update','outreach_interactions_read','outreach_interactions_insert','outreach_interactions_delete']){
    assert.match(policyHardening,new RegExp(`drop policy if exists ${policy}`,'i'))
    assert.match(policyHardening,new RegExp(`create policy ${policy}`,'i'))
  }
  assert.match(policyHardening,/source_group_id is not null and private\.can_operate_group\(source_group_id\)/i)
  assert.match(policyHardening,/has_church_permission\(church_id,'manage_outreach'\)/i)
  assert.doesNotMatch(policyHardening,/ministry_leader|role==='minister'|\['group_leader','ministry_leader','minister'/i)
})

test('ordinary members cannot direct-insert a private Outreach record',()=>{
  const insertSection=policyHardening.split('-- CONTACT INSERT')[1]?.split('-- CONTACT UPDATE')[0]??''
  assert.match(insertSection,/private\.has_church_role\(church_id,array\['pastor','church_admin'\]\)/i)
  assert.match(insertSection,/private\.has_church_permission\(church_id,'manage_outreach'\)/i)
  assert.match(insertSection,/source_group_id is not null and private\.can_operate_group\(source_group_id\)/i)
  assert.doesNotMatch(insertSection,/source_group_id is null\s+or/i)
})

test('normal Outreach owners cannot silently erase interaction history',()=>{
  const deleteSection=policyHardening.split('-- INTERACTION DELETE')[1]??''
  assert.match(deleteSection,/has_church_role\(church_id,array\['pastor','church_admin'\]\)/i)
  assert.match(deleteSection,/has_church_permission\(church_id,'manage_outreach'\)/i)
  assert.doesNotMatch(deleteSection,/recorded_by\s*=\s*auth\.uid/i)
})

test('legacy ministry titles no longer create church-wide Outreach read access',()=>{
  const policySection=policyHardening
  assert.match(policySection,/source_group_id is not null and private\.can_operate_group\(source_group_id\)/i)
  assert.match(policySection,/has_church_permission\(church_id,'manage_outreach'\)/i)
  assert.doesNotMatch(policySection,/group_leader'::text, 'ministry_leader'::text, 'minister/i)
  assert.doesNotMatch(policySection,/array\['group_leader','ministry_leader','minister'/i)
  assert.match(navShell,/canManageOutreach:isPrivileged\|\|manageOutreach/)
  assert.doesNotMatch(navShell,/canManageOutreach:isPrivileged\|\|role==='minister'/)
})

test('ambiguous identity review is centralized to explicit church-wide Outreach authority',()=>{
  assert.match(reviewHardening,/has_church_role\(church_id,array\['pastor','church_admin'\]\)/i)
  assert.match(reviewHardening,/has_church_permission\(church_id,'manage_outreach'\)/i)
  assert.doesNotMatch(reviewHardening,/can_operate_group/i)
})

test('public connect card is bilingual, minimal, privacy-aware, and offers optional account handoff',()=>{
  assert.match(publicPage,/First name/)
  assert.match(publicPage,/Nombre/)
  assert.match(publicPage,/Phone/)
  assert.match(publicPage,/Teléfono/)
  assert.match(publicPage,/Non-confidential prayer request/)
  assert.match(publicPage,/Petición de oración no confidencial/)
  assert.match(publicPage,/\/join\/\$\{source\.church_slug\}/)
  assert.match(publicPage,/You do not need an account to connect/)
  assert.match(publicPage,/No necesita una cuenta para conectarse/)
})

test('sharing is visible to normal members and church-wide tools use explicit Outreach authority',()=>{
  assert.match(nav,/\['\/connect','Invite \/ Connect',UserPlus\]/)
  assert.match(nav,/\['\/outreach\/reviews','Connection Review',UserPlus,'outreach'\]/)
  assert.match(sharePage,/source_type" value="member_invite"/)
  assert.match(sharePage,/current_user_has_church_permission/)
  assert.match(sharePage,/p_permission_key:'manage_outreach'/)
})
