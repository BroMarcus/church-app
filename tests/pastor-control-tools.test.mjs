import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('finance foundation is pastor or church-admin only and enables RLS everywhere',async()=>{
  const source=await read('supabase/migrations/20260820154000_pastor_finance_foundation.sql')
  for(const table of ['church_finance_accounts','church_finance_transactions','church_contribution_batches','church_bills','church_finance_audit_log']){
    assert.match(source,new RegExp(`alter table public\\.${table} enable row level security`,'i'))
  }
  assert.match(source,/private\.has_church_role\(p_church_id,array\['pastor','church_admin'\]\)/)
  assert.doesNotMatch(source,/pastor_finance_access[\s\S]{0,300}ministry_leader/)
  assert.doesNotMatch(source,/pastor_finance_access[\s\S]{0,300}group_leader/)
})

test('finance oversight stores aggregate contribution batches and no donor identity',async()=>{
  const source=await read('supabase/migrations/20260820154000_pastor_finance_foundation.sql')
  const start=source.indexOf('create table if not exists public.church_contribution_batches')
  const end=source.indexOf('create table if not exists public.church_bills')
  const contributionTable=source.slice(start,end)
  for(const aggregate of ['tithe_amount','offering_amount','missions_amount','building_amount','other_amount'])assert.match(contributionTable,new RegExp(aggregate))
  assert.doesNotMatch(contributionTable,/donor|giver|contributor_name|member_id|user_id/i)
})

test('finance corrections preserve history and never delete records from server actions',async()=>{
  const source=await read('src/app/church/finance/actions.ts')
  assert.doesNotMatch(source,/\.delete\s*\(/)
  assert.match(source,/voidContributionBatch/)
  assert.match(source,/voidManualFinanceTransaction/)
  assert.match(source,/billStatuses=new Set\(\['open','paid','cancelled'\]\)/)
  assert.match(source,/if\(!billId\|\|!billStatuses\.has\(status\)\)/)
  assert.match(source,/const payload=status==='paid'\?\{status,[^\n]+:\{status,/)
  assert.match(source,/transaction_status:'void'/)
})

test('finance server actions reauthorize pastor or church admin and hide raw database errors',async()=>{
  const source=await read('src/app/church/finance/actions.ts')
  assert.match(source,/\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  for(const operation of ['createFinanceAccount failed','createContributionBatch failed','createChurchBill failed','createManualFinanceTransaction failed'])assert.match(source,new RegExp(operation))
})

test('finance and pastor command-center code contains no explicit any escapes',async()=>{
  for(const path of ['src/app/church/finance/actions.ts','src/app/church/finance/page.tsx','src/app/church/pastor/page.tsx']){
    const source=await read(path)
    assert.doesNotMatch(source,/\bas\s+any\b|:\s*any\b|any\[\]/,`${path} must not opt out of TypeScript with any`)
  }
})

test('Pastor Command Center combines people, care, finance, groups and shared schedules',async()=>{
  const source=await read('src/app/church/pastor/page.tsx')
  assert.match(source,/church_health_snapshot/)
  assert.match(source,/pastor_finance_snapshot/)
  assert.match(source,/friendship_group_growth_metrics/)
  assert.match(source,/care_requests/)
  assert.match(source,/schedule_items/)
  assert.match(source,/team_assignments/)
  assert.match(source,/What needs attention across the church\?/)
  assert.match(source,/Individual donor histories are not shown or stored/)
})

test('finance snapshot is aggregate and permission checked inside the security-definer function',async()=>{
  const source=await read('supabase/migrations/20260820154000_pastor_finance_foundation.sql')
  assert.match(source,/create or replace function public\.pastor_finance_snapshot/)
  assert.match(source,/not private\.pastor_finance_access\(p_church_id\)/)
  assert.match(source,/total_income numeric/)
  assert.match(source,/overdue_bills_amount numeric/)
  assert.match(source,/current_account_balance numeric/)
})

test('control and finance foreign keys receive covering indexes',async()=>{
  const source=await read('supabase/migrations/20260820155000_control_finance_fk_indexes.sql')
  for(const index of ['church_schedules_ministry_church_fk_idx','ministry_team_members_church_user_fk_idx','schedule_items_schedule_church_fk_idx','church_finance_transactions_account_church_fk_idx','church_contribution_batches_account_church_fk_idx','church_bills_account_church_fk_idx'])assert.match(source,new RegExp(index))
})

test('pastoral care command-center shortcut resolves to the existing protected care queue',async()=>{
  const source=await read('src/app/help/admin/page.tsx')
  assert.match(source,/redirect\('\/help'\)/)
})
