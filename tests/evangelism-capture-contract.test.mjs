import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const actions=fs.readFileSync(new URL('../src/app/outreach/actions.ts', import.meta.url),'utf8')
const page=fs.readFileSync(new URL('../src/app/outreach/page.tsx', import.meta.url),'utf8')

test('evangelism quick add requires a full name and one reconnect channel',()=>{
  assert.match(actions,/First and last name are required/)
  assert.match(actions,/if\(!phone&&!email\)/)
  assert.match(page,/name="last_name" required/)
  assert.match(page,/Phone or email is required for follow-up/)
})

test('evangelism quick add captures all approved entry sources',()=>{
  for(const source of ['church_service','friendship_group','outreach','event','leader_entry']){
    assert.match(actions,new RegExp(source))
    assert.match(page,new RegExp(`value="${source}"`))
  }
})

test('source detail is persisted and visible in the follow-up queue',()=>{
  assert.match(actions,/source_label:nullable\(formData,'source_label'\)\|\|sourceLabel/)
  assert.match(page,/Source detail/)
  assert.match(page,/c\.source_label/)
})
