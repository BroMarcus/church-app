'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const categories=['prayer','pastoral','family','grief','health','benevolence','counseling','other']
const urgencies=['normal','soon','urgent']
const contacts=['in_app','phone','email','either']
const statuses=['new','in_review','contacted','closed','withdrawn']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const helpUrl=(lang:string,status?:string)=>`/help?lang=${lang}${status?`&status=${encodeURIComponent(status)}`:''}`
const bounded=(value:string,max:number)=>value.length<=max
const safeCode=(error:unknown)=>{
  if(!error||typeof error!=='object')return 'unknown'
  const code='code' in error?String((error as {code?:unknown}).code??'unknown'):'unknown'
  return code.slice(0,80)
}
const logHelpError=(area:string,error:unknown)=>console.error('[help-care]',{area,code:safeCode(error)})

async function user(lang='en'){
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  if(claimsError)logHelpError('claims',claimsError)
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)

  const {data:membership,error:membershipError}=await supabase
    .from('church_memberships')
    .select('church_id,role')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()

  if(membershipError){
    logHelpError('membership',membershipError)
    redirect(helpUrl(lang,'temporary_problem'))
  }
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await user(lang)
  const category=text(formData,'category'),urgency=text(formData,'urgency'),preferred=text(formData,'preferred_contact'),subject=text(formData,'subject'),message=text(formData,'message')
  if(!categories.includes(category)||!urgencies.includes(urgency)||!contacts.includes(preferred)||!subject||!message||!bounded(subject,160)||!bounded(message,5000))redirect(helpUrl(lang,'invalid_request'))

  const {error}=await supabase.from('care_requests').insert({church_id:churchId,user_id:userId,category,urgency,preferred_contact:preferred,subject,message})
  if(error){
    logHelpError('create',error)
    redirect(helpUrl(lang,'save_failed'))
  }
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'created'))
}

export async function updateCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,churchId,role}=await user(lang)
  if(!['pastor','church_admin'].includes(role))redirect(helpUrl(lang,'not_authorized'))

  const id=text(formData,'request_id'),status=text(formData,'status'),assigned=text(formData,'assigned_to')||null,note=text(formData,'leadership_note')||null
  if(!id||!bounded(id,100)||!statuses.includes(status)||(assigned&&!bounded(assigned,100))||(note&&!bounded(note,2000)))redirect(helpUrl(lang,'invalid_update'))

  const {data,error}=await supabase
    .from('care_requests')
    .update({status,assigned_to:assigned,leadership_note:note})
    .eq('id',id)
    .eq('church_id',churchId)
    .select('id')
    .maybeSingle()

  if(error){
    logHelpError('update',error)
    redirect(helpUrl(lang,'save_failed'))
  }
  if(!data?.id)redirect(helpUrl(lang,'request_not_found'))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'saved'))
}

export async function withdrawCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase}=await user(lang),id=text(formData,'request_id')
  if(!id||!bounded(id,100))redirect(helpUrl(lang,'request_not_found'))

  const {data,error}=await supabase.rpc('withdraw_my_care_request',{p_request_id:id})
  if(error){
    logHelpError('withdraw',error)
    redirect(helpUrl(lang,'withdraw_failed'))
  }
  if(!data)redirect(helpUrl(lang,'request_not_found'))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'withdrawn'))
}
