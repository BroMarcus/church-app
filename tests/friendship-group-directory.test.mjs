import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group directory counts use church-member-only aggregate RPC',async()=>{
  const [migration,portal,groups]=await Promise.all([read('supabase/migrations/20260821070313_friendship_group_directory.sql'),read('src/app/groups/[groupId]/portal/page.tsx'),read('src/app/groups/page.tsx')])
  assert.match(migration,/security definer/i)
  assert.match(migration,/private\.is_church_member\(p_church_id\)/)
  assert.match(migration,/count\(gm\.user_id\)::bigint/)
  assert.doesNotMatch(migration,/meeting_address|prayer|report_attendance/i)
  assert.match(portal,/rpc\('list_friendship_group_directory'/)
  assert.match(portal,/members:Number\(g\.member_count\|\|0\)/)
  assert.match(groups,/rpc\('list_friendship_group_directory'/)
  assert.match(groups,/counts\.set\(row\.group_id,Number\(row\.member_count\|\|0\)\)/)
})
