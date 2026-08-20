import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../supabase/migrations/20260820113000_route_member_baptism_reports_for_verification.sql',import.meta.url),'utf8')

test('member baptism self-report is routed to pastoral verification',()=>{
  assert.match(migration,/create or replace function public\.update_my_baptism_details/i)
  assert.match(migration,/auth\.uid\(\)/i)
  assert.match(migration,/church_memberships[\s\S]+status\s*=\s*'active'/i)
  assert.match(migration,/insert into public\.reported_milestones/i)
  assert.match(migration,/milestone_type[\s\S]*'baptism'/i)
  assert.match(migration,/status[\s\S]*'pending'/i)
  assert.match(migration,/v_pending_id/i)
  assert.doesNotMatch(migration,/insert into public\.member_milestones\([\s\S]{0,200}\bbaptized\b/i)
  assert.doesNotMatch(migration,/baptized\s*=\s*excluded\.baptized/i)
  assert.doesNotMatch(migration,/baptism_date\s*=\s*excluded\.baptism_date/i)
})

test('member-entered public baptism details require a verified baptism',()=>{
  assert.match(migration,/create or replace function public\.member_public_baptism/i)
  assert.match(migration,/mm\.baptized\s*=\s*true/i)
  assert.match(migration,/mm\.show_baptism_details\s*=\s*true/i)
  assert.match(migration,/private\.is_church_member/i)
})

test('baptism RPCs remain authenticated-only at the API boundary',()=>{
  assert.match(migration,/revoke all on function public\.update_my_baptism_details\([^;]+\) from public, anon;/i)
  assert.match(migration,/revoke all on function public\.member_public_baptism\([^;]+\) from public, anon;/i)
  assert.match(migration,/grant execute on function public\.update_my_baptism_details\([^;]+\) to authenticated;/i)
  assert.match(migration,/grant execute on function public\.member_public_baptism\([^;]+\) to authenticated;/i)
})
