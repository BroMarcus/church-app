import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const sql=read('supabase/migrations/20260826170000_secure_outreach_account_claim.sql')
const [triggerSql,existingJoinSql='']=sql.split('create or replace function public.join_public_church_existing_account')

test('auth INSERT trigger never claims pre-existing Outreach history',()=>{
  assert.match(triggerSql,/Never attach a pre-existing Outreach row here by email OR typed phone/i)
  assert.doesNotMatch(triggerSql,/update\s+public\.outreach_contacts[\s\S]*?set\s+member_user_id\s*=\s*new\.id/i)
  assert.match(triggerSql,/v_unlinked_candidate_exists/)
  assert.match(triggerSql,/if not v_unlinked_candidate_exists then/i)
})

test('existing-account automatic claim requires a verified account email',()=>{
  assert.match(existingJoinSql,/u\.email_confirmed_at/)
  assert.match(existingJoinSql,/if v_email is null or v_email_confirmed_at is null then/i)
  assert.match(existingJoinSql,/A verified account email is required/i)
})

test('phone is conflict detection only and cannot authorize an Outreach claim',()=>{
  assert.match(existingJoinSql,/v_email_match_count=1/)
  assert.match(existingJoinSql,/v_phone_match_count/)
  assert.match(existingJoinSql,/If the typed phone points at a DIFFERENT unlinked record, fail closed/i)
  assert.match(existingJoinSql,/if v_phone_conflict then\s*v_outreach_id:=null;/i)
  assert.doesNotMatch(existingJoinSql,/if\s+v_phone_match_count\s*=\s*1[\s\S]*?into\s+v_outreach_id/i)
})

test('ambiguous candidates remain unlinked instead of creating another duplicate contact',()=>{
  assert.match(existingJoinSql,/elsif v_email_match_count=0 and v_phone_match_count=0 then/i)
  assert.match(existingJoinSql,/Ambiguous or phone-only candidates intentionally remain unlinked/i)
})
