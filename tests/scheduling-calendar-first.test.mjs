import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('ministry operations uses the canonical shared scheduling engine',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  const actions=await read('src/app/calendar/manage/actions.ts')
  const migration=await read('supabase/migrations/20260820145500_control_tools_team_schedule_foundation.sql')
  assert.match(page,/createScheduleAssignment/)
  assert.match(actions,/\.from\('schedule_items'\)/)
  assert.match(actions,/\.from\('team_assignments'\)/)
  assert.match(migration,/create table if not exists public\.church_schedules/)
  assert.match(migration,/create table if not exists public\.schedule_items/)
  assert.match(migration,/schedule_item_id uuid references public\.schedule_items/)
})

test('leader scheduling is calendar-first with a fast date to person to assignment flow',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  const css=await read('src/app/calendar/calendar.css')
  assert.match(page,/CALENDAR-FIRST SCHEDULING/)
  assert.match(page,/2 • PICK A DATE/)
  assert.match(page,/3 • QUICK ASSIGN/)
  assert.match(page,/schedule-grid/)
  assert.match(page,/selected-date/)
  assert.match(page,/name="assigned_user_id"/)
  assert.match(page,/name="role_label"/)
  assert.match(page,/action=\{createScheduleAssignment\}/)
  assert.match(page,/Optional details/)
  assert.match(css,/@media \(max-width:760px\)/)
})

test('preaching quick assignments preserve the founder assignment types',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  for(const role of ['Main Message','5 Spot','Testimony','Other']) assert.ok(page.includes(role),`missing ${role}`)
  assert.match(page,/selected\?\.schedule_type==='preaching'/)
})

test('calendar-first quick scheduling keeps conflict and time-off safeguards',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  const actions=await read('src/app/calendar/manage/actions.ts')
  assert.match(actions,/async function assignmentConflicts/)
  assert.match(actions,/member_time_off/)
  assert.match(actions,/90\*60\*1000/)
  assert.match(actions,/schedule_override/)
  assert.match(actions,/schedule_override_reason/)
  assert.match(actions,/schedule_conflict_summary/)
  assert.match(page,/Leadership intentionally approves a conflict/)
})

test('month loading stays bounded instead of loading full scheduling history',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  assert.match(page,/monthStartUtc/)
  assert.match(page,/monthEndUtc/)
  assert.match(page,/\.gte\('starts_at',monthStartUtc\)\.lt\('starts_at',monthEndUtc\)/)
  assert.match(page,/\.limit\(180\)/)
})
