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


test('outreach person can update only the next action without rewriting unrelated contact fields',()=>{
  assert.match(actions,/export async function updateOutreachNextAction/)
  assert.match(actions,/update\(\{next_action:nextAction,follow_up_due_at:followUp,updated_at:/)
  assert.doesNotMatch(actions,/updateOutreachNextAction[\s\S]{0,1600}service_count:/)
})


test('follow-up interaction history can retain visit source context',()=>{
  const history=fs.readFileSync(new URL('../src/app/outreach/outreach-history.tsx', import.meta.url),'utf8')
  const migration=fs.readFileSync(new URL('../supabase/migrations/20260928024500_outreach_actionable_followup_fields.sql', import.meta.url),'utf8')
  assert.match(actions,/source_type:interactionSource/)
  assert.match(actions,/source_label:interactionSource/)
  assert.match(history,/name="source_type"/)
  assert.match(history,/name="source_label"/)
  assert.match(history,/row\.source_label/)
  assert.match(migration,/alter table public\.outreach_interactions/)
  assert.match(migration,/add column if not exists source_type text/)
})


test('quick add and interaction logging are retry-safe',()=>{
  const migration=fs.readFileSync(new URL('../supabase/migrations/20260928024500_outreach_actionable_followup_fields.sql', import.meta.url),'utf8')
  const history=fs.readFileSync(new URL('../src/app/outreach/outreach-history.tsx', import.meta.url),'utf8')
  assert.match(migration,/create_request_key uuid/)
  assert.match(migration,/outreach_contacts_create_request_key_unique_idx/)
  assert.match(migration,/request_key uuid/)
  assert.match(migration,/outreach_interactions_request_key_unique_idx/)
  assert.match(page,/name="request_key" value=\{randomUUID\(\)\}/)
  assert.match(history,/name="request_key" value=\{randomUUID\(\)\}/)
  assert.match(actions,/eq\('create_request_key',requestKey\)/)
  assert.match(actions,/eq\('request_key',requestKey\)/)
})

test('duplicate guest capture opens one existing record instead of creating another',()=>{
  assert.match(actions,/email_normalized/)
  assert.match(actions,/phone_normalized/)
  assert.match(actions,/duplicate','1'/)
})

test('interaction return path is constrained to Outreach routes',()=>{
  assert.match(actions,/safeOutreachReturn/)
  assert.match(actions,/\^\\\/outreach/)
  const detail=fs.readFileSync(new URL('../src/app/outreach/[contactId]/page.tsx', import.meta.url),'utf8')
  assert.match(detail,/returnTo=\{\x60\/outreach\/\$\{contactId\}\x60\}/)
})


test('quick add is hidden from users without outreach manage authority',()=>{
  assert.match(page,/current_user_has_church_permission/)
  assert.match(page,/p_permission_key:'manage_outreach'/)
  assert.match(page,/const canManageOutreach=/)
  assert.match(page,/Only the people assigned to you/)
  assert.match(page,/canManageOutreach\?<section className="card create-outreach"/)
})


test('new guests receive a useful next action without extra capture steps',()=>{
  assert.match(actions,/const defaultNextAction=/)
  assert.match(actions,/Schedule Bible study/)
  assert.match(actions,/Invite to First Steps/)
  assert.match(actions,/Thank them and invite them back/)
  assert.match(actions,/next_action:nullable\(formData,'next_action'\)\|\|defaultNextAction/)
})

test('Bible study and First Steps interest drive the recommended person next step',()=>{
  const detail=fs.readFileSync(new URL('../src/app/outreach/[contactId]/page.tsx', import.meta.url),'utf8')
  assert.match(detail,/contact\.bible_study_interest/)
  assert.match(detail,/Schedule the Bible study/)
  assert.match(detail,/contact\.first_steps_interest/)
  assert.match(detail,/Invite them to First Steps/)
})


test('Outreach forms expose a slow-network pending state',()=>{
  const submit=fs.readFileSync(new URL('../src/app/outreach/outreach-submit-button.tsx', import.meta.url),'utf8')
  const detail=fs.readFileSync(new URL('../src/app/outreach/[contactId]/page.tsx', import.meta.url),'utf8')
  const history=fs.readFileSync(new URL('../src/app/outreach/outreach-history.tsx', import.meta.url),'utf8')
  assert.match(submit,/useFormStatus/)
  assert.match(submit,/disabled=\{isPending\}/)
  assert.match(page,/pending=\{es\?'Agregando…':'Adding…'\}/)
  assert.match(page,/pending=\{es\?'Guardando…':'Saving…'\}/)
  assert.match(detail,/pending=\{t\('Saving…','Guardando…'\)\}/)
  assert.match(history,/pending=\{es\?'Guardando…':'Saving…'\}/)
})
