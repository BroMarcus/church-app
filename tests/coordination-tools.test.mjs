import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('coordination view reuses existing sources instead of creating another workflow store',async()=>{
  const source=await read('src/app/church/coordination/page.tsx')
  for(const sourceName of ['outreach_contacts','groups','member_tasks','church_schedules','schedule_items','team_assignments'])assert.match(source,new RegExp(sourceName))
  assert.match(source,/does not create a second task system/i)
})

test('coordination page exposes no mutation or delete path',async()=>{
  const source=await read('src/app/church/coordination/page.tsx')
  assert.doesNotMatch(source,/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/)
  assert.match(source,/href="\/outreach"/)
  assert.match(source,/href="\/calendar\/manage"/)
})

test('coordination page answers Bible-study, group-leader and today-schedule questions',async()=>{
  const source=await read('src/app/church/coordination/page.tsx')
  assert.match(source,/Bible-study interests with no owner/)
  assert.match(source,/Who is leading group\?/)
  assert.match(source,/Preaching, worship, teams and ministry roles/)
  assert.match(source,/assignment_status','scheduled'/)
})

test('coordination route requires a leadership role or an existing management permission',async()=>{
  const source=await read('src/app/church/coordination/page.tsx')
  for(const permission of ['manage_teams','manage_groups','manage_outreach'])assert.match(source,new RegExp(permission))
  assert.match(source,/group_leader/)
  assert.match(source,/ministry_leader/)
})

test('coordination implementation contains no explicit any escapes',async()=>{
  const source=await read('src/app/church/coordination/page.tsx')
  assert.doesNotMatch(source,/\bas\s+any\b|:\s*any\b|any\[\]/)
})
