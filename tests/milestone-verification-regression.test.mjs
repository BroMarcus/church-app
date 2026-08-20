import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../supabase/migrations/20260820070000_route_group_milestones_for_verification.sql',import.meta.url),'utf8')

test('Friendship Group milestone reports do not directly modify official milestones',()=>{
  assert.match(migration,/create or replace function public\.update_group_member_status/i)
  assert.match(migration,/auth\.uid\(\)/i)
  assert.match(migration,/private\.has_group_role/i)
  assert.match(migration,/private\.has_church_role/i)
  assert.match(migration,/insert into public\.reported_milestones/i)
  assert.match(migration,/milestone_type\s*=\s*'baptism'|\'baptism\'/i)
  assert.match(migration,/milestone_type\s*=\s*'holy_ghost'|\'holy_ghost\'/i)
  assert.match(migration,/status\s*=\s*'pending'|\'pending\'/i)
  assert.doesNotMatch(migration,/update\s+public\.member_milestones/i)
  assert.doesNotMatch(migration,/insert\s+into\s+public\.member_milestones/i)
})

test('milestone-report RPC remains authenticated-only at the API boundary',()=>{
  assert.match(migration,/revoke all on function public\.update_group_member_status\([^;]+\) from public, anon;/i)
  assert.match(migration,/grant execute on function public\.update_group_member_status\([^;]+\) to authenticated;/i)
})

test('duplicate pending reports are suppressed',()=>{
  assert.match(migration,/rm\.member_user_id\s*=\s*p_user_id/i)
  assert.match(migration,/rm\.status\s*=\s*'pending'/i)
  assert.match(migration,/mm\.baptized\s*=\s*true/i)
  assert.match(migration,/mm\.holy_ghost_received\s*=\s*true/i)
})
