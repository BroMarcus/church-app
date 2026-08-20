'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type FinanceClient=Awaited<ReturnType<typeof createClient>>
type FinanceActor={supabase:FinanceClient;userId:string;churchId:string}

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const isoDate=/^\d{4}-\d{2}-\d{2}$/
const accountTypes=new Set(['checking','savings','cash','other'])
const directions=new Set(['income','expense'])
const recurrences=new Set(['none','weekly','monthly','quarterly','annual','other'])
const billStatuses=new Set(['open','paid','cancelled'])

const financeUrl=(extra='')=>`/church/finance${extra}`
const safeError=(message:string)=>financeUrl(`?error=${encodeURIComponent(message)}`)

function money(value:string,{allowZero=true,allowNegative=false}:{allowZero?:boolean;allowNegative?:boolean}={}){
  if(!value)return 0
  const parsed=Number(value.replace(/,/g,''))
  if(!Number.isFinite(parsed))return null
  const rounded=Math.round(parsed*100)/100
  if(!allowNegative&&rounded<0)return null
  if(!allowZero&&rounded<=0)return null
  return rounded
}

async function financeActor():Promise<FinanceActor>{
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

async function validAccount(supabase:FinanceClient,churchId:string,accountId:string){
  if(!accountId)return null
  const {data,error}=await supabase.from('church_finance_accounts').select('id').eq('id',accountId).eq('church_id',churchId).eq('active',true).maybeSingle()
  if(error||!data)return undefined
  return data.id
}

function refreshFinance(){
  revalidatePath('/church/finance')
  revalidatePath('/church/pastor')
}

export async function createFinanceAccount(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const name=text(formData,'name'),accountType=text(formData,'account_type')||'checking',openingBalance=money(text(formData,'opening_balance'),{allowNegative:true})
  if(!name||!accountTypes.has(accountType)||openingBalance===null)redirect(safeError('Enter a valid account name, type and opening balance.'))
  const {error}=await supabase.from('church_finance_accounts').insert({church_id:churchId,name,account_type:accountType,opening_balance:openingBalance,created_by:userId})
  if(error){console.error('createFinanceAccount failed',{code:error.code,message:error.message});redirect(safeError(error.code==='23505'?'An account with that name already exists.':'We could not create that finance account.'))}
  refreshFinance();redirect(financeUrl('?account_created=1'))
}

export async function setFinanceAccountActive(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const accountId=text(formData,'account_id'),active=text(formData,'active')==='1'
  if(!accountId)redirect(safeError('Finance account not found.'))
  const {error}=await supabase.from('church_finance_accounts').update({active,updated_at:new Date().toISOString()}).eq('id',accountId).eq('church_id',churchId)
  if(error){console.error('setFinanceAccountActive failed',{actor:userId,code:error.code,message:error.message});redirect(safeError('We could not update that finance account.'))}
  refreshFinance();redirect(financeUrl('?account_saved=1'))
}

export async function createContributionBatch(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const receivedOn=text(formData,'received_on'),accountRaw=text(formData,'account_id')
  const accountId=await validAccount(supabase,churchId,accountRaw)
  const tithe=money(text(formData,'tithe_amount')),offering=money(text(formData,'offering_amount')),missions=money(text(formData,'missions_amount')),building=money(text(formData,'building_amount')),other=money(text(formData,'other_amount'))
  if(!isoDate.test(receivedOn)||accountId===undefined||[tithe,offering,missions,building,other].some(value=>value===null))redirect(safeError('Check the contribution date, account and amounts.'))
  const total=(tithe??0)+(offering??0)+(missions??0)+(building??0)+(other??0)
  if(total<=0)redirect(safeError('Enter at least one contribution amount.'))
  const {error}=await supabase.from('church_contribution_batches').insert({church_id:churchId,account_id:accountId,received_on:receivedOn,service_label:text(formData,'service_label')||null,tithe_amount:tithe??0,offering_amount:offering??0,missions_amount:missions??0,building_amount:building??0,other_amount:other??0,notes:text(formData,'notes')||null,status:'posted',created_by:userId})
  if(error){console.error('createContributionBatch failed',{code:error.code,message:error.message});redirect(safeError('We could not save that contribution batch.'))}
  refreshFinance();redirect(financeUrl('?contribution_created=1'))
}

export async function updateContributionBatch(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const batchId=text(formData,'batch_id'),receivedOn=text(formData,'received_on'),accountRaw=text(formData,'account_id')
  const accountId=await validAccount(supabase,churchId,accountRaw)
  const tithe=money(text(formData,'tithe_amount')),offering=money(text(formData,'offering_amount')),missions=money(text(formData,'missions_amount')),building=money(text(formData,'building_amount')),other=money(text(formData,'other_amount'))
  if(!batchId||!isoDate.test(receivedOn)||accountId===undefined||[tithe,offering,missions,building,other].some(value=>value===null))redirect(safeError('Check the contribution date, account and amounts.'))
  const total=(tithe??0)+(offering??0)+(missions??0)+(building??0)+(other??0)
  if(total<=0)redirect(safeError('Enter at least one contribution amount.'))
  const {error}=await supabase.from('church_contribution_batches').update({account_id:accountId,received_on:receivedOn,service_label:text(formData,'service_label')||null,tithe_amount:tithe??0,offering_amount:offering??0,missions_amount:missions??0,building_amount:building??0,other_amount:other??0,notes:text(formData,'notes')||null,updated_by:userId}).eq('id',batchId).eq('church_id',churchId).eq('status','posted')
  if(error){console.error('updateContributionBatch failed',{code:error.code,message:error.message});redirect(safeError('We could not update that contribution batch.'))}
  refreshFinance();redirect(financeUrl('?contribution_saved=1'))
}

export async function voidContributionBatch(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const batchId=text(formData,'batch_id')
  if(!batchId)redirect(safeError('Contribution batch not found.'))
  const {error}=await supabase.from('church_contribution_batches').update({status:'void',updated_by:userId}).eq('id',batchId).eq('church_id',churchId)
  if(error){console.error('voidContributionBatch failed',{code:error.code,message:error.message});redirect(safeError('We could not void that contribution batch.'))}
  refreshFinance();redirect(financeUrl('?contribution_voided=1'))
}

export async function createChurchBill(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const vendor=text(formData,'vendor'),category=text(formData,'category')||'other',amount=money(text(formData,'amount'),{allowZero:false}),dueOn=text(formData,'due_on'),recurrence=text(formData,'recurrence')||'none',accountRaw=text(formData,'account_id')
  const accountId=await validAccount(supabase,churchId,accountRaw)
  if(!vendor||!category||amount===null||!isoDate.test(dueOn)||!recurrences.has(recurrence)||accountId===undefined)redirect(safeError('Check the bill vendor, amount, due date and account.'))
  const {error}=await supabase.from('church_bills').insert({church_id:churchId,account_id:accountId,vendor,category,amount,due_on:dueOn,recurrence,status:'open',notes:text(formData,'notes')||null,created_by:userId})
  if(error){console.error('createChurchBill failed',{code:error.code,message:error.message});redirect(safeError('We could not create that bill.'))}
  refreshFinance();redirect(financeUrl('?bill_created=1'))
}

export async function updateChurchBill(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const billId=text(formData,'bill_id'),vendor=text(formData,'vendor'),category=text(formData,'category')||'other',amount=money(text(formData,'amount'),{allowZero:false}),dueOn=text(formData,'due_on'),recurrence=text(formData,'recurrence')||'none',accountRaw=text(formData,'account_id')
  const accountId=await validAccount(supabase,churchId,accountRaw)
  if(!billId||!vendor||!category||amount===null||!isoDate.test(dueOn)||!recurrences.has(recurrence)||accountId===undefined)redirect(safeError('Check the bill details.'))
  const {error}=await supabase.from('church_bills').update({account_id:accountId,vendor,category,amount,due_on:dueOn,recurrence,notes:text(formData,'notes')||null,updated_by:userId}).eq('id',billId).eq('church_id',churchId)
  if(error){console.error('updateChurchBill failed',{code:error.code,message:error.message});redirect(safeError('We could not update that bill.'))}
  refreshFinance();redirect(financeUrl('?bill_saved=1'))
}

export async function setChurchBillStatus(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const billId=text(formData,'bill_id'),status=text(formData,'status'),paidOn=text(formData,'paid_on'),paidAmountRaw=text(formData,'paid_amount'),accountRaw=text(formData,'account_id')
  if(!billId||!billStatuses.has(status))redirect(safeError('Bill not found or status is invalid.'))
  let accountId:string|null|undefined=null
  if(accountRaw)accountId=await validAccount(supabase,churchId,accountRaw)
  if(accountId===undefined)redirect(safeError('Choose a valid active account.'))
  const paidAmount=paidAmountRaw?money(paidAmountRaw,{allowZero:false}):null
  if(status==='paid'&&(!isoDate.test(paidOn)||paidAmount===null&&paidAmountRaw))redirect(safeError('Enter a valid payment date and amount.'))
  const payload=status==='paid'?{status,paid_on:paidOn,paid_amount:paidAmount,account_id:accountId||null,updated_by:userId}:{status,paid_on:null,paid_amount:null,updated_by:userId}
  const {error}=await supabase.from('church_bills').update(payload).eq('id',billId).eq('church_id',churchId)
  if(error){console.error('setChurchBillStatus failed',{code:error.code,message:error.message});redirect(safeError('We could not update that bill status.'))}
  refreshFinance();redirect(financeUrl('?bill_status=1'))
}

export async function createManualFinanceTransaction(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const direction=text(formData,'direction'),category=text(formData,'category'),amount=money(text(formData,'amount'),{allowZero:false}),occurredOn=text(formData,'occurred_on'),accountRaw=text(formData,'account_id')
  const accountId=await validAccount(supabase,churchId,accountRaw)
  if(!directions.has(direction)||!category||amount===null||!isoDate.test(occurredOn)||accountId===undefined)redirect(safeError('Check the transaction type, category, amount, date and account.'))
  const {error}=await supabase.from('church_finance_transactions').insert({church_id:churchId,account_id:accountId,direction,category,amount,occurred_on:occurredOn,counterparty:text(formData,'counterparty')||null,memo:text(formData,'memo')||null,transaction_status:'posted',source_type:'manual',source_line:'main',created_by:userId})
  if(error){console.error('createManualFinanceTransaction failed',{code:error.code,message:error.message});redirect(safeError('We could not save that finance transaction.'))}
  refreshFinance();redirect(financeUrl('?transaction_created=1'))
}

export async function voidManualFinanceTransaction(formData:FormData){
  const {supabase,userId,churchId}=await financeActor()
  const transactionId=text(formData,'transaction_id')
  if(!transactionId)redirect(safeError('Transaction not found.'))
  const {error}=await supabase.from('church_finance_transactions').update({transaction_status:'void',updated_by:userId,updated_at:new Date().toISOString()}).eq('id',transactionId).eq('church_id',churchId).eq('source_type','manual')
  if(error){console.error('voidManualFinanceTransaction failed',{code:error.code,message:error.message});redirect(safeError('We could not void that transaction.'))}
  refreshFinance();redirect(financeUrl('?transaction_voided=1'))
}
