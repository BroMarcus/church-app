import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group portal preserves approved Kingdom Network visual tokens',async()=>{
  const css=await read('src/app/groups/[groupId]/portal/portal.css')
  assert.match(css,/#0A0F1C/);assert.match(css,/#E0B457/);assert.match(css,/#B8863A/);assert.match(css,/Cormorant Garamond/);assert.match(css,/Inter/);assert.match(css,/linear-gradient\(135deg,#F0CB7C/);assert.match(css,/box-shadow:0 8px 30px -8px/)
})

test('Friendship Group portal exposes approved functional sections using real group props',async()=>{
  const source=await read('src/app/groups/[groupId]/portal/portal-client.tsx')
  for(const label of ['Overview','Attendance','Report','Lessons','Members','Prayer'])assert.match(source,new RegExp(label))
  assert.match(source,/Browse All Groups/);assert.match(source,/Take attendance for this week/);assert.match(source,/Fill out & send weekly report/);assert.match(source,/Invite someone \/ assign weekly roles/);assert.doesNotMatch(source,/Young Adults Group/);assert.doesNotMatch(source,/Pastor Reyes/)
})

test('Friendship Group portal server page reads existing Groups system instead of creating a parallel schema',async()=>{
  const source=await read('src/app/groups/[groupId]/portal/page.tsx')
  assert.match(source,/from\('groups'\)/);assert.match(source,/from\('group_memberships'\)/);assert.match(source,/from\('group_reports'\)/);assert.match(source,/from\('group_lesson_assignments'\)/);assert.match(source,/from\('prayer_requests'\)/);assert.doesNotMatch(source,/from\('friendship_groups'\)/)
})

test('Friendship Group attendance tab persists drafts through protected server action',async()=>{
  const [client,action,migration,page]=await Promise.all([read('src/app/groups/[groupId]/portal/portal-client.tsx'),read('src/app/groups/[groupId]/portal/attendance-actions.ts'),read('supabase/migrations/20260821064238_friendship_group_attendance_drafts.sql'),read('src/app/groups/[groupId]/portal/page.tsx')])
  assert.match(client,/savePortalAttendance/);assert.match(client,/Save Attendance/);assert.doesNotMatch(client,/visual-only/);assert.match(action,/from\('group_attendance_drafts'\)\.upsert/);assert.match(action,/onConflict:'group_id,user_id,meeting_date'/);assert.match(page,/from\('group_attendance_drafts'\)/);assert.match(migration,/enable row level security/);assert.match(migration,/private\.can_operate_group\(group_id\)/);assert.match(migration,/group_attendance_drafts_unique unique \(group_id,user_id,meeting_date\)/)
})

test('Friendship Group guidelines are group-readable and leader-managed',async()=>{
  const [client,action,migration,page]=await Promise.all([read('src/app/groups/[groupId]/portal/portal-client.tsx'),read('src/app/groups/[groupId]/portal/guidelines-actions.ts'),read('supabase/migrations/20260821064851_friendship_group_guidelines.sql'),read('src/app/groups/[groupId]/portal/page.tsx')])
  assert.match(client,/GROUP GUIDELINES \/ FOUR G'S/);assert.match(client,/saveGroupGuidelines/);assert.match(action,/from\('group_guidelines'\)\.upsert/);assert.match(page,/from\('group_guidelines'\)/);assert.match(migration,/group_guidelines_read/);assert.match(migration,/private\.can_manage_group\(group_id\)/)
})

test('Friendship Group weekly roles reuse the existing protected schedule system',async()=>{
  const [client,page]=await Promise.all([read('src/app/groups/[groupId]/portal/portal-client.tsx'),read('src/app/groups/[groupId]/portal/page.tsx')])
  assert.match(page,/from\('church_schedules'\)/);assert.match(page,/from\('schedule_items'\)/);assert.match(page,/from\('team_assignments'\)/);assert.match(client,/THIS WEEK'S ROLES/);assert.match(client,/Assign \/ Edit Weekly Roles/);assert.match(client,/\/calendar\/manage\?schedule=/)
})

test('ordinary Friendship Group members do not receive leader operation tabs or deep-link surfaces',async()=>{
  const [client,page]=await Promise.all([read('src/app/groups/[groupId]/portal/portal-client.tsx'),read('src/app/groups/[groupId]/portal/page.tsx')])
  assert.match(client,/useState\(canReport\|\|!\['attendance','report'\]\.includes\(initialTab\)\?initialTab:'overview'\)/)
  assert.match(client,/const tabs=canReport\?/)
  assert.match(client,/\{canReport&&<>\<article className="fgp-card"\>\<span className="fgp-kicker"\>\{t\.quick\}/)
  assert.match(client,/tab==='attendance'&&canReport/)
  assert.match(client,/tab==='report'&&canReport/)
  assert.match(page,/requestedTab=query\.tab&&validTabs\.has\(query\.tab\)\?query\.tab:'overview'/)
  assert.match(page,/initialTab=canReport\|\|!\['attendance','report'\]\.includes\(requestedTab\)\?requestedTab:'overview'/)
})
