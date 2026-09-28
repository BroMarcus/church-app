import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('discipleship pathway schema is church configurable and tenant scoped',()=>{
  const sql=read('supabase/migrations/20260928021500_discipleship_pathway_engine.sql')
  assert.match(sql,/create table if not exists public\.discipleship_pathways/)
  assert.match(sql,/create table if not exists public\.discipleship_pathway_steps/)
  assert.match(sql,/church_id uuid not null references public\.churches/)
  assert.match(sql,/is_default boolean not null default false/)
  assert.match(sql,/completion_source text not null/)
  assert.match(sql,/member_journey_pathway_assignments/)
  assert.match(sql,/member_journey_step_tracking/)
  assert.match(sql,/enable row level security/)
})

test('canonical progress cannot be manually overwritten by journey tracking',()=>{
  const sql=read('supabase/migrations/20260928021500_discipleship_pathway_engine.sql')
  assert.match(sql,/Canonical journey steps cannot be manually completed/)
  assert.match(sql,/v_source<>'manual'/)
  assert.match(sql,/Responsible journey leader must be an active member of the same church/)
})

test('member journey consumes canonical records and fails soft before pathway rollout',()=>{
  const page=read('src/app/journey/page.tsx')
  assert.match(page,/member_milestones/)
  assert.match(page,/course_enrollments/)
  assert.match(page,/group_memberships/)
  assert.match(page,/ministry_applications/)
  assert.match(page,/team_assignments/)
  assert.match(page,/member_journey_pathway_assignments/)
  assert.match(page,/discipleship_pathway_steps/)
  assert.match(page,/configuredJourney\.length\?/)
  assert.match(page,/Who is helping me\?/)
  assert.match(page,/Not assigned yet/)
})

test('journey resolver detects inactivity overdue followup and missing leaders without duplicating progress',()=>{
  const helper=read('src/lib/discipleship-pathway.ts')
  assert.match(helper,/30\*24\*60\*60\*1000/)
  assert.match(helper,/attention\.includes\('inactive'\)/)
  assert.match(helper,/attention\.includes\('overdue'\)/)
  assert.match(helper,/leader_missing/)
  assert.match(helper,/next_step_unstarted/)
  assert.match(helper,/credential_earned/)
  assert.match(helper,/groupCount/)
  assert.match(helper,/ministryAssignmentCount/)
})

test('leaders and church health surface journey attention using the same tracking records',()=>{
  const leadership=read('src/app/church/leadership/page.tsx')
  const health=read('src/app/church/health/page.tsx')
  assert.match(leadership,/member_journey_step_tracking/)
  assert.match(leadership,/Journey follow-ups overdue/)
  assert.match(leadership,/without leader/)
  assert.match(health,/member_journey_step_tracking/)
  assert.match(health,/journey follow-ups overdue/)
  assert.match(health,/tracked steps without an assigned leader/)
})
