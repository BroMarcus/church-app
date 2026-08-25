'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const categories=['prayer','pastoral','family','grief','health','benevolence','counseling','other']
const urgencies=['normal','soon','urgent']
const contacts=['in_app','phone','email','either']
const statuses=['new','in_review','contacted','closed','withdrawn']
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const helpUrl=(lang:string,status?:string)=>`/help?lang=${lang}${status?`&status=${encodeURIComponent(status)}`:''}`
const bounded=(value:string,max:number)=>value.length<=max
const validUuid=(value:string)=>uuidPattern.test(value)
const safeCode=(error:unknown)=>{
  if(!error||typeof error!=='object')return 'unknown'
  const code='code' in error?String((error as {code?:unknown}).code??'unknown'):'unknown'
  return code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
}
const logHelpError=(area:string,error:unknown)=>console.error('[help-care]',{area,code:safeCode(error)})

async function user(lang='en'){
  let supabase
  try{supabase=await createClient()}catch(error){
    logHelpError('client',error)
    redirect(helpUrl(lang,'temporary_problem'))
  }

  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}catch(error){
    logHelpError('claims_throw',error)
    redirect(helpUrl(lang,'temporary_problem'))
  }
  const {data:claims,error:claimsError}=claimsResult
  if(claimsError){
    logHelpError('claims',claimsError)
    redirect(helpUrl(lang,'temporary_problem'))
  }
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?mode=signin&lang=${lang}`)

  let membershipResult
  try{
    membershipResult=await supabase
      .from('church_memberships')
      .select('church_id,role')
      .eq('user_id',userId)
      .eq('status','active')
      .limit(1)
      .maybeSingle()
  }catch(error){
    logHelpError('membership_throw',error)
    redirect(helpUrl(lang,'temporary_problem'))
  }

  const {data:membership,error:membershipError}=membershipResult
  if(membershipError){
    logHelpError('membership',membershipError)
    redirect(helpUrl(lang,'temporary_problem'))
  }
  if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await user(lang)
  const category=text(formData,'category'),urgency=text(formData,'urgency'),preferred=text(formData,'preferred_contact'),subject=text(formData,'subject'),message=text(formData,'message')
  if(!categories.includes(category)||!urgencies.includes(urgency)||!contacts.includes(preferred)||!subject||!message||!bounded(subject,160)||!bounded(message,5000))redirect(helpUrl(lang,'invalid_request'))

  let result
  try{result=await supabase.from('care_requests').insert({church_id:churchId,user_id:userId,category,urgency,preferred_contact:preferred,subject,message})}catch(error){
    logHelpError('create_throw',error)
    redirect(helpUrl(lang,'save_failed'))
  }
  if(result.error){
    logHelpError('create',result.error)
    redirect(helpUrl(lang,'save_failed'))
  }
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'created'))
}

export async function updateCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,churchId,role}=await user(lang)
  if(!['pastor','church_admin'].includes(role))redirect(helpUrl(lang,'not_authorized'))

  const id=text(formData,'request_id'),status=text(formData,'status'),assigned=text(formData,'assigned_to')||null,note=text(formData,'leadership_note')||null
  if(!validUuid(id)||!statuses.includes(status)||(assigned&&!validUuid(assigned))||(note&&!bounded(note,2000)))redirect(helpUrl(lang,'invalid_update'))

  let result
  try{
    result=await supabase
      .from('care_requests')
      .update({status,assigned_to:assigned,leadership_note:note})
      .eq('id',id)
      .eq('church_id',churchId)
      .select('id')
      .maybeSingle()
  }catch(error){
    logHelpError('update_throw',error)
    redirect(helpUrl(lang,'save_failed'))
  }

  const {data,error}=result
  if(error){
    logHelpError('update',error)
    redirect(helpUrl(lang,'save_failed'))
  }
  if(!data?.id)redirect(helpUrl(lang,'request_not_found'))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'saved'))
}

export async function withdrawCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase}=await user(lang),id=text(formData,'request_id')
  if(!validUuid(id))redirect(helpUrl(lang,'request_not_found'))

  let result
  try{result=await supabase.rpc('withdraw_my_care_request',{p_request_id:id})}catch(error){
    logHelpError('withdraw_throw',error)
    redirect(helpUrl(lang,'withdraw_failed'))
  }
  const {data,error}=result
  if(error){
    logHelpError('withdraw',error)
    redirect(helpUrl(lang,'withdraw_failed'))
  }
  if(!data)redirect(helpUrl(lang,'request_not_found'))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'withdrawn'))
}