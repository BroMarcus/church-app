import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const bridge=read('supabase/migrations/20260826184500_friendship_group_outreach_bridge.sql')
const reportContract=read('supabase/migrations/20260826185000_group_report_guest_outreach_contract.sql')
const groupActions=read('src/app/groups/actions.ts')

test('Friendship Group visit bridge reuses the public duplicate-safe Outreach resolver',()=>{
  assert.match(bridge,/record_friendship_group_outreach_visit/i)
  assert.match(bridge,/from public\.submit_outreach_connection\(/i)
  assert.match(bridge,/private\.can_operate_group\(v_link\.source_group_id\)/i)
  assert.match(bridge,/l\.source_type='friendship_group'/i)
})

test('trusted group reports can preserve first second and third visit metadata',()=>{
  assert.match(bridge,/p_visit_ordinal smallint/i)
  assert.match(bridge,/p_visit_ordinal<1 or p_visit_ordinal>3/i)
  assert.match(bridge,/set visit_ordinal=p_visit_ordinal/i)
  assert.match(bridge,/reported_visit_ordinal/i)
  assert.match(bridge,/reported_occurred_at/i)
  assert.match(bridge,/v_report\.reported_visit_ordinal|v_review\.reported_visit_ordinal/i)
})

test('current group report guests use stable report-slot idempotency keys',()=>{
  assert.match(reportContract,/record_group_report_guest_outreach/i)
  assert.match(reportContract,/md5\(v_report\.id::text\|\|':guest:'\|\|p_guest_slot::text\)::uuid/i)
  assert.match(reportContract,/record_friendship_group_outreach_visit/i)
})

test('name alone remains report data rather than weak identity evidence',()=>{
  assert.match(reportContract,/name without a stable contact key/i)
  assert.match(reportContract,/needs_identity/i)
  assert.match(reportContract,/p_phone[\s\S]*p_email/i)
})

test('existing group report no longer direct-inserts Outreach contacts',()=>{
  const submit=groupActions.split('export async function submitGroupReport')[1]??''
  assert.match(submit,/record_group_report_guest_outreach/)
  assert.doesNotMatch(submit,/from\('outreach_contacts'\)\.insert/)
  assert.match(submit,/guestNeedsIdentity/)
  assert.match(submit,/guestSyncFailed/)
  assert.match(submit,/Report saved\./)
})

test('reported baptism and Holy Ghost names stay pending review, not official milestones',()=>{
  const submit=groupActions.split('export async function submitGroupReport')[1]??''
  assert.match(submit,/reported_milestones/)
  assert.match(submit,/status:'pending'/)
  assert.doesNotMatch(submit,/from\('member_milestones'\)\.insert/)
  assert.doesNotMatch(submit,/from\('member_milestones'\)\.update/)
})
