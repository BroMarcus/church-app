import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Tap and Go understands the core plain-language control requests',async()=>{
  const source=await read('src/lib/kingdom-guide-command.ts')
  for(const intent of ['group_roster','group_absences','lesson_builder','today_schedule','schedule_manage','team_manage','finance','pastor_center','content_event','content_learning','outreach'])assert.match(source,new RegExp(intent))
  assert.match(source,/missed group/)
  assert.match(source,/who is preaching/)
  assert.match(source,/help me build/)
  assert.match(source,/bible study/)
})

test('Tap and Go never performs silent write mutations',async()=>{
  const source=await read('src/app/guide/tap/page.tsx')
  assert.doesNotMatch(source,/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/)
  assert.match(source,/Anything that changes church records takes you to the normal reviewed form/)
})

test('Tap and Go routes finance and pastor views only for pastor or church admin',async()=>{
  const source=await read('src/app/guide/tap/page.tsx')
  assert.match(source,/const isPastor=\['pastor','church_admin'\]/)
  assert.match(source,/intent==='finance'&&isPastor/)
  assert.match(source,/intent==='pastor_center'&&isPastor/)
})

test('Tap and Go batches latest group attendance instead of pulling one group at a time',async()=>{
  const source=await read('src/app/guide/tap/page.tsx')
  assert.match(source,/\.from\('group_reports'\).*\.in\('group_id',groupIds\)/s)
  assert.match(source,/\.from\('group_report_attendance'\).*\.in\('group_report_id',reportIds\)/s)
  assert.doesNotMatch(source,/for\s*\([^)]*managedGroups[^)]*\)[\s\S]{0,300}await supabase/)
})

test('Tap and Go implementation contains no explicit any escapes',async()=>{
  for(const path of ['src/lib/kingdom-guide-command.ts','src/app/guide/tap/page.tsx']){
    const source=await read(path)
    assert.doesNotMatch(source,/\bas\s+any\b|:\s*any\b|any\[\]/)
  }
})

test('Tap and Go is directly discoverable from mobile navigation',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/\['\/guide\/tap','Tap & Go'/)
})
