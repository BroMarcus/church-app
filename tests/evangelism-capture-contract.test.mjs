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


test('follow-up records carry a human next action and First Steps interest',()=>{
  assert.match(actions,/next_action:nullable\(formData,'next_action'\)/)
  assert.match(actions,/first_steps_interest:checked\(formData,'first_steps_interest'\)/)
  assert.match(page,/name="next_action"/)
  assert.match(page,/name="first_steps_interest"/)
  assert.match(page,/First Steps interest/)
})

test('actionable follow-up schema is additive and bounded',()=>{
  const migration=fs.readFileSync(new URL('../supabase/migrations/20260928024500_outreach_actionable_followup_fields.sql', import.meta.url),'utf8')
  assert.match(migration,/add column if not exists first_steps_interest boolean not null default false/)
  assert.match(migration,/add column if not exists next_action text/)
  assert.match(migration,/char_length\(next_action\) <= 500/)
})
