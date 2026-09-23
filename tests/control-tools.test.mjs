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

test('control tools preserve history while allowing scoped Friendship Group roster removal',async()=>{
  const teamActions=await read('src/app/teams/manage/actions.ts')
  const scheduleActions=await read('src/app/calendar/manage/actions.ts')
  const groupRosterActions=await read('src/app/groups/[groupId]/roster/actions.ts')
  assert.doesNotMatch(teamActions,/\.delete\s*\(/)
  assert.doesNotMatch(scheduleActions,/\.delete\s*\(/)
  assert.match(groupRosterActions,/from\('group_memberships'\)\.delete\(\)\.eq\('group_id',groupId\)\.eq\('user_id',memberUserId\)/)
  assert.doesNotMatch(groupRosterActions,/from\('group_report_attendance'\)\.delete\s*\(/)
  assert.doesNotMatch(groupRosterActions,/from\('group_reports'\)\.delete\s*\(/)
  assert.match(groupRosterActions,/memberUserId===leaderId/)
  assert.match(teamActions,/member_status:'active'/)
  assert.match(scheduleActions,/assignment_status:'removed'/)
  assert.match(scheduleActions,/\['scheduled','cancelled'\]\.includes\(status\)/)
  assert.match(scheduleActions,/\.from\('schedule_items'\)\.update\(\{[^}]*status[^}]*updated_at/s)
})

test('new control tool server code contains no explicit any escapes',async()=>{
  const files=[
    'src/app/teams/manage/actions.ts',
    'src/app/teams/manage/page.tsx',
    'src/app/calendar/manage/actions.ts',
    'src/app/calendar/manage/page.tsx',
    'src/app/calendar/shared/page.tsx',
    'src/app/groups/[groupId]/roster/actions.ts',
    'src/app/groups/[groupId]/roster/page.tsx',
    'src/app/rosters/page.tsx',
    'src/app/content/actions.ts',
    'src/app/content/page.tsx'
  ]
  for(const file of files){
    const source=await read(file)
    assert.doesNotMatch(source,/\bas\s+any\b|:\s*any\b|any\[\]/,`${file} must not opt out of TypeScript with any`)
  }
})

test('control tools never redirect raw database error messages to members or leaders',async()=>{
  const teamActions=await read('src/app/teams/manage/actions.ts')
  const scheduleActions=await read('src/app/calendar/manage/actions.ts')
  const groupRosterActions=await read('src/app/groups/[groupId]/roster/actions.ts')
  const contentActions=await read('src/app/content/actions.ts')
  assert.doesNotMatch(teamActions,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(scheduleActions,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(groupRosterActions,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(contentActions,/encodeURIComponent\(error\.message\)/)
  assert.match(teamActions,/console\.error\('createTeam failed'/)
  assert.match(scheduleActions,/console\.error\('createSchedule failed'/)
  assert.match(groupRosterActions,/console\.error\('addRosterMember failed'/)
  assert.match(contentActions,/console\.error\('createContentLesson failed'/)
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
  const rosterHub=await read('src/app/rosters/page.tsx')
  assert.match(teams,/Teams, roles and people/)
  assert.match(teams,/Open schedules/)
  assert.match(schedules,/1 • PICK A SCHEDULE/)
  assert.match(schedules,/2 • ADD A DATE \/ SERVICE/)
  assert.match(schedules,/3 • WHO IS DOING WHAT/)
  assert.match(shared,/See the whole lineup together/)
  assert.match(shared,/assignment_status','scheduled'/)
  assert.match(rosterHub,/Rosters without the paperwork/)
  assert.match(rosterHub,/teams\/manage/)
  assert.match(rosterHub,/groups\/\$\{group\.id\}\/roster/)
})

test('Friendship Group roll sheet respects contact privacy and shows recent attendance',async()=>{
  const page=await read('src/app/groups/[groupId]/roster/page.tsx')
  const actions=await read('src/app/groups/[groupId]/roster/actions.ts')
  assert.match(page,/show_contact_email/)
  assert.match(page,/Not shared/)
  assert.match(page,/group_report_attendance/)
  assert.match(page,/attendance_status/)
  assert.match(page,/updateRosterMember/)
  assert.match(page,/addRosterMember/)
  assert.match(actions,/update_group_member_status/)
  assert.match(actions,/only one active Friendship Group/)
  assert.doesNotMatch(page,/member_private_details/)
})

test('Content Studio gives create and edit tools for church-owned content',async()=>{
  const page=await read('src/app/content/page.tsx')
  const actions=await read('src/app/content/actions.ts')
  for(const phrase of ['Create course','Edit course','Create lesson','Edit lesson','Create classroom session','Edit class','Create event','Edit event','Create assessment draft','Edit assessment'])assert.match(page,new RegExp(phrase))
  for(const action of ['createContentCourse','updateContentCourse','createContentLesson','updateContentLesson','createContentClass','updateContentClass','createContentEvent','updateContentEvent','createContentAssessment','updateContentAssessment','createContentQuestion','updateContentQuestion'])assert.match(actions,new RegExp(`export async function ${action}`))
  assert.match(page,/AssetUploader/)
  assert.match(page,/EventFlyerUploader/)
})

test('assessment question editing preserves private answer keys unless intentionally replaced',async()=>{
  const migration=await read('supabase/migrations/20260820223000_preserve_assessment_answer_key_on_blank_edit.sql')
  const bridge=await read('supabase/migrations/20260820152500_secure_assessment_question_edit.sql')
  const page=await read('src/app/content/page.tsx')
  assert.match(migration,/private\.assessment_answer_keys/)
  assert.match(migration,/if p_correct_answer is not null then/)
  assert.match(migration,/auth\.uid\(\) is null/)
  assert.match(migration,/private\.has_church_role/)
  assert.match(migration,/has_church_permission\(v_church,'manage_learning'\)/)
  assert.match(migration,/assessment_attempts/)
  assert.match(bridge,/revoke all on function private\.update_assessment_question_impl/)
  assert.match(bridge,/grant execute on function private\.update_assessment_question_impl[^\n]*authenticated/)
  assert.match(page,/new correct answer/i)
  assert.match(page,/blank to keep the existing answer key/i)
  assert.doesNotMatch(page,/assessment_answer_keys/)
})

test('Content Studio event editing validates local church time and does not expose raw database errors',async()=>{
  const actions=await read('src/app/content/actions.ts')
  assert.match(actions,/church_local_datetime_to_utc/)
  assert.match(actions,/endsAt&&new Date\(endsAt\)<new Date\(startsAt\)/)
  assert.match(actions,/basic_public_listing/)
  assert.match(actions,/registration_url/)
  assert.doesNotMatch(actions,/redirect\([^\n]*error\.message/)
})
