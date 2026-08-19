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
const helpUrl=(lang:string,extra='')=>`/help?lang=${lang}${extra}`

async function user(lang='en'){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await user(lang)
  const category=text(formData,'category'),urgency=text(formData,'urgency'),preferred=text(formData,'preferred_contact'),subject=text(formData,'subject'),message=text(formData,'message')
  if(!categories.includes(category)||!urgencies.includes(urgency)||!contacts.includes(preferred)||!subject||!message)redirect(helpUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Completa la solicitud de cuidado.':'Please complete the care request form.')))
  const {error}=await supabase.from('care_requests').insert({church_id:churchId,user_id:userId,category,urgency,preferred_contact:preferred,subject,message})
  if(error)redirect(helpUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'&created=1'))
}

export async function updateCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,churchId,role}=await user(lang)
  if(!['pastor','church_admin'].includes(role))redirect(helpUrl(lang))
  const id=text(formData,'request_id'),status=text(formData,'status'),assigned=text(formData,'assigned_to')||null,note=text(formData,'leadership_note')||null
  if(!id||!statuses.includes(status))redirect(helpUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Actualización de cuidado inválida.':'Invalid care request update.')))
  const {error}=await supabase.from('care_requests').update({status,assigned_to:assigned,leadership_note:note}).eq('id',id).eq('church_id',churchId)
  if(error)redirect(helpUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'&saved=1'))
}

export async function withdrawCareRequest(formData:FormData){
  const lang=langOf(formData),{supabase,userId}=await user(lang);const id=text(formData,'request_id')
  if(!id)redirect(helpUrl(lang,'&error='+encodeURIComponent(lang==='es'?'No encontramos la solicitud.':'Request not found.')))
  const {data,error}=await supabase.rpc('withdraw_my_care_request',{p_request_id:id})
  if(error||!data)redirect(helpUrl(lang,'&error='+encodeURIComponent(error?.message||(lang==='es'?'No pudimos retirar la solicitud.':'Request could not be withdrawn.'))))
  revalidatePath('/help');revalidatePath('/church');redirect(helpUrl(lang,'&withdrawn=1'))
}