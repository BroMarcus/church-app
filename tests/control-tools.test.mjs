import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('control tools migration creates roster and shared schedule tables with RLS',async()=>{
  const source=await read('supabase/migrations/20260820145500_control_tools_team_schedule_foundation.sql')
  for(const table of ['ministry_team_members','church_schedules','schedule_items']){
    assert.match(source,new RegExp(`create table if not exists public\\.${table}`,'i'))
    assert.match(source,new RegExp(`alter table public\\.${table} enable row level security`,'i'))
  }
  assert.match(source,/assignment_status text not null default 'scheduled'/)
  assert.match(source,/assignment_status in \('scheduled','removed'\)/)
})

test('shared schedule RLS keeps church isolation and allows schedule participants to see one lineup',async()=>{
  const source=await read('supabase/migrations/20260820145500_control_tools_team_schedule_foundation.sql')
  assert.match(source,/private\.is_church_member\(church_id\)/)
  assert.match(source,/mtm\.user_id=\(select auth\.uid\(\)\)/)
  assert.match(source,/gm\.user_id=\(select auth\.uid\(\)\)/)
  assert.match(source,/drop policy if exists assignments_read on public\.team_assignments/)
  assert.match(source,/schedule_item_id is not null/)
  assert.match(source,/s\.church_id=team_assignments\.church_id/)
})

test('control tools preserve history instead of deleting roster or schedule assignments',async()=>{
  const teamActions=await read('src/app/teams/manage/actions.ts')
  const scheduleActions=await read('src/app/calendar/manage/actions.ts')
  assert.doesNotMatch(teamActions,/\.delete\s*\(/)
  assert.doesNotMatch(scheduleActions,/\.delete\s*\(/)
  assert.match(teamActions,/member_status:'active'/)
  assert.match(scheduleActions,/assignment_status:'removed'/)
  assert.match(scheduleActions,/status:'cancelled'/)
})

test('new control tool server code contains no explicit any escapes',async()=>{
  const files=[
    'src/app/teams/manage/actions.ts',
    'src/app/teams/manage/page.tsx',
    'src/app/calendar/manage/actions.ts',
    'src/app/calendar/manage/page.tsx',
    'src/app/calendar/shared/page.tsx'
  ]
  for(const file of files){
    const source=await read(file)
    assert.doesNotMatch(source,/\bas\s+any\b|:\s*any\b|any\[\]/,`${file} must not opt out of TypeScript with any`)
  }
})

test('control tools never redirect raw database error messages to members or leaders',async()=>{
  const teamActions=await read('src/app/teams/manage/actions.ts')
  const scheduleActions=await read('src/app/calendar/manage/actions.ts')
  assert.doesNotMatch(teamActions,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(scheduleActions,/encodeURIComponent\(error\.message\)/)
  assert.match(teamActions,/console\.error\('createTeam failed'/)
  assert.match(scheduleActions,/console\.error\('createSchedule failed'/)
})

test('shared scheduling has conflict detection and documented intentional overrides',async()=>{
  const source=await read('src/app/calendar/manage/actions.ts')
  assert.match(source,/member_time_off/)
  assert.match(source,/90\*60\*1000/)
  assert.match(source,/schedule_override_reason/)
  assert.match(source,/overrideReason\.length<5/)
  assert.match(source,/schedule_conflict_summary/)
})

test('leader control screens follow the simple roster then schedule workflow',async()=>{
  const teams=await read('src/app/teams/manage/page.tsx')
  const schedules=await read('src/app/calendar/manage/page.tsx')
  const shared=await read('src/app/calendar/shared/page.tsx')
  assert.match(teams,/Teams, roles and people/)
  assert.match(teams,/Open schedules/)
  assert.match(schedules,/1 • PICK A SCHEDULE/)
  assert.match(schedules,/2 • ADD A DATE \/ SERVICE/)
  assert.match(schedules,/3 • WHO IS DOING WHAT/)
  assert.match(shared,/See the whole lineup together/)
  assert.match(shared,/assignment_status','scheduled'/)
})
