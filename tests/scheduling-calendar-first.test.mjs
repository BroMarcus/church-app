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


test('preaching year plan and 5 Spot workflow stay attached to canonical scheduling',async()=>{
  const page=await read('src/app/calendar/manage/page.tsx')
  const actions=await read('src/app/calendar/manage/actions.ts')
  const migration=await read('supabase/migrations/20260928023000_scheduling_preaching_operations.sql')
  assert.match(migration,/create table if not exists public\.schedule_month_plans/)
  assert.match(migration,/foreign key\(schedule_id,church_id\)[\s\S]*references public\.church_schedules/)
  assert.match(migration,/create table if not exists public\.five_spot_requests/)
  assert.match(migration,/submitted','coaching','ready_for_review','approved','scheduled','completed/)
  assert.match(migration,/five_spot_requests_submit/)
  assert.match(migration,/five_spot_requests_leadership_manage/)
  assert.match(page,/12-MONTH PREACHING PLAN/)
  assert.match(page,/5 SPOT COACHING QUEUE/)
  assert.match(page,/Monthly Theme/)
  assert.match(page,/Monthly Scripture/)
  assert.match(actions,/saveScheduleMonthPlan/)
  assert.match(actions,/reviewFiveSpotRequest/)
})

test('approved 5 Spots become scheduled only through a real shared assignment',async()=>{
  const actions=await read('src/app/calendar/manage/actions.ts')
  const migration=await read('supabase/migrations/20260928023000_scheduling_preaching_operations.sql')
  assert.match(actions,/roleLabel\.trim\(\)\.toLowerCase\(\)==='5 spot'/)
  assert.match(actions,/\.eq\('status','approved'\)/)
  assert.match(actions,/status:'scheduled',scheduled_assignment_id:createdAssignment\.id/)
  assert.match(actions,/scheduled:\['completed'\]/)
  assert.match(migration,/Scheduled 5 Spot requests must link to an assignment/)
  assert.match(migration,/5 Spot assignment must belong to the requester/)
  assert.match(migration,/5 Spot request must link to a 5 Spot assignment/)
})

test('members can request a 5 Spot without receiving leadership permissions',async()=>{
  const page=await read('src/app/calendar/five-spot/page.tsx')
  const actions=await read('src/app/calendar/five-spot/actions.ts')
  const migration=await read('supabase/migrations/20260928023000_scheduling_preaching_operations.sql')
  for(const field of ['scripture','title_idea','main_thought','short_outline']) assert.match(page,new RegExp(`name="${field}"`))
  assert.match(actions,/requester_user_id:userId/)
  assert.match(actions,/status:'submitted'/)
  assert.match(migration,/requester_user_id=\(select auth\.uid\(\)\)/)
  assert.match(migration,/created_by=\(select auth\.uid\(\)\)/)
  assert.match(migration,/status='submitted'/)
})
