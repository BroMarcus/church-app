import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const health=read('supabase/migrations/20260826183500_connect_outreach_history_to_church_health.sql')
const assignment=read('supabase/migrations/20260826184000_guard_outreach_reassignment.sql')
const outreachPage=read('src/app/outreach/page.tsx')

test('Church Health derives first and return connection signals from canonical interactions',()=>{
  assert.match(health,/from public\.outreach_interactions oi/i)
  assert.match(health,/row_number\(\) over\(partition by oi\.contact_id/i)
  assert.match(health,/oi\.source_key is not null/i)
  assert.match(health,/oi\.source_type is not null/i)
  assert.match(health,/first_source_connections/i)
  assert.match(health,/return_source_connections/i)
  assert.match(health,/attributed_source_touches/i)
  assert.doesNotMatch(health,/create table/i)
})

test('reporting window cannot relabel an old returning person as a first connection',()=>{
  const rank=health.indexOf('row_number() over(partition by oi.contact_id')
  const windowFilter=health.indexOf('occurred_at>=now()-make_interval')
  assert.ok(rank>=0&&windowFilter>rank)
})

test('Outreach makes overdue due-soon and unassigned attention obvious',()=>{
  assert.match(outreachPage,/Follow-ups overdue/)
  assert.match(outreachPage,/Due in 48 hours/)
  assert.match(outreachPage,/Unassigned/)
  assert.match(outreachPage,/follow-up.*overdue/is)
  assert.match(outreachPage,/no follow-up owner/i)
  assert.match(outreachPage,/if\(ao!==bo\)return ao\?-1:1/)
})

test('assignment remains an explicit privacy grant',()=>{
  assert.match(assignment,/assigned_to is an access grant/i)
  assert.match(assignment,/private\.has_church_role\(new\.church_id,array\['pastor','church_admin'\]\)/i)
  assert.match(assignment,/private\.has_church_permission\(new\.church_id,'manage_outreach'\)/i)
  assert.match(assignment,/private\.is_outreach_assignee_target\(new\.church_id,new\.assigned_to,new\.source_group_id\)/i)
})

test('scoped leaders can only hand off to group or church-wide Outreach authority',()=>{
  assert.match(assignment,/gm\.role in \('leader','assistant'\)/i)
  assert.match(assignment,/g\.leader_id=p_user_id/i)
  assert.match(assignment,/r\.permissions->>'manage_outreach'/i)
  assert.match(assignment,/cm\.role in \('pastor','church_admin'\)/i)
  assert.match(assignment,/Follow-up assignment requires an eligible Outreach or group leader/i)
})

test('church-wide Outreach authority may intentionally delegate one contact to an active member',()=>{
  assert.match(assignment,/Church-wide authorized leaders intentionally may delegate one specific contact/i)
  assert.match(assignment,/Assigned follow-up person must be an active church member/i)
  assert.match(assignment,/if not v_actor_churchwide[\s\S]*is_outreach_assignee_target/i)
})
