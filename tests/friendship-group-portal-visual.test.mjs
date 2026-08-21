import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group portal preserves approved Kingdom Network visual tokens',async()=>{
  const css=await read('src/app/groups/[groupId]/portal/portal.css')
  assert.match(css,/#0A0F1C/)
  assert.match(css,/#E0B457/)
  assert.match(css,/#B8863A/)
  assert.match(css,/Cormorant Garamond/)
  assert.match(css,/Inter/)
  assert.match(css,/linear-gradient\(135deg,#F0CB7C/)
  assert.match(css,/box-shadow:0 8px 30px -8px/)
})

test('Friendship Group portal exposes approved functional sections using real group props',async()=>{
  const source=await read('src/app/groups/[groupId]/portal/portal-client.tsx')
  for(const label of ['Overview','Attendance','Report','Lessons','Members','Prayer'])assert.match(source,new RegExp(label))
  assert.match(source,/Browse All Groups/)
  assert.match(source,/Take attendance for this week/)
  assert.match(source,/Fill out & send weekly report/)
  assert.match(source,/Invite someone to your group/)
  assert.doesNotMatch(source,/Young Adults Group/)
  assert.doesNotMatch(source,/Pastor Reyes/)
})

test('Friendship Group portal server page reads existing Groups system instead of creating a parallel schema',async()=>{
  const source=await read('src/app/groups/[groupId]/portal/page.tsx')
  assert.match(source,/from\('groups'\)/)
  assert.match(source,/from\('group_memberships'\)/)
  assert.match(source,/from\('group_reports'\)/)
  assert.match(source,/from\('group_lesson_assignments'\)/)
  assert.match(source,/from\('prayer_requests'\)/)
  assert.doesNotMatch(source,/from\('friendship_groups'\)/)
})
