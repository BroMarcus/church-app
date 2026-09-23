import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('authorized Friendship Group Leaders self-create atomically without broadening groups RLS',async()=>{
  const [migration,action,groupsPage,portalPage]=await Promise.all([
    read('supabase/migrations/20260821065901_friendship_group_self_create.sql'),read('src/app/groups/self-create-actions.ts'),read('src/app/groups/page.tsx'),read('src/app/groups/[groupId]/portal/page.tsx')
  ])
  assert.match(migration,/security definer/i)
  assert.match(migration,/has_church_permission\(p_church_id,'lead_own_group'\)/)
  assert.match(migration,/Already connected to an active Friendship Group/)
  assert.match(migration,/insert into public\.group_memberships\(group_id,user_id,role\) values\(v_group_id,v_user,'member'\)/)
  assert.doesNotMatch(migration,/create policy .*groups_insert/i)
  assert.match(action,/create_own_friendship_group/)
  assert.match(action,/lead_own_group/)
  assert.match(action,/redirect\(`\/groups\/\$\{groupId\}\/portal`\)/)
  assert.match(groupsPage,/Create Your Group/)
  assert.match(groupsPage,/canSelfCreate=!canManage&&Boolean\(leadOwnPermission\.data\)/)
  assert.match(groupsPage,/mine&&g\.group_type==='friendship'\?`\/groups\/\$\{g\.id\}\/portal`/)
  assert.match(portalPage,/r\.user_id===group\.leader_id\?'leader':r\.role/)
})
