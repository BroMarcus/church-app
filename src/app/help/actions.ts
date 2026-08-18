'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const categories=['prayer','pastoral','family','grief','health','benevolence','counseling','other']
const urgencies=['normal','soon','urgent']
const contacts=['in_app','phone','email','either']
const statuses=['new','in_review','contacted','closed','withdrawn']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function user(){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createCareRequest(formData:FormData){
  const {supabase,userId,churchId}=await user()
  const category=text(formData,'category'),urgency=text(formData,'urgency'),preferred=text(formData,'preferred_contact'),subject=text(formData,'subject'),message=text(formData,'message')
  if(!categories.includes(category)||!urgencies.includes(urgency)||!contacts.includes(preferred)||!subject||!message)redirect('/help?error='+encodeURIComponent('Please complete the care request form.'))
  const {error}=await supabase.from('care_requests').insert({church_id:churchId,user_id:userId,category,urgency,preferred_contact:preferred,subject,message})
  if(error)redirect('/help?error='+encodeURIComponent(error.message))
  revalidatePath('/help');revalidatePath('/church');redirect('/help?created=1')
}

export async function updateCareRequest(formData:FormData){
  const {supabase,churchId,role}=await user()
  if(!['pastor','church_admin'].includes(role))redirect('/help')
  const id=text(formData,'request_id'),status=text(formData,'status'),assigned=text(formData,'assigned_to')||null,note=text(formData,'leadership_note')||null
  if(!id||!statuses.includes(status))redirect('/help?error='+encodeURIComponent('Invalid care request update.'))
  const {error}=await supabase.from('care_requests').update({status,assigned_to:assigned,leadership_note:note}).eq('id',id).eq('church_id',churchId)
  if(error)redirect('/help?error='+encodeURIComponent(error.message))
  revalidatePath('/help');revalidatePath('/church');redirect('/help?saved=1')
}

export async function withdrawCareRequest(formData:FormData){
  const {supabase,userId}=await user();const id=text(formData,'request_id')
  if(!id)redirect('/help?error='+encodeURIComponent('Request not found.'))
  const {data,error}=await supabase.rpc('withdraw_my_care_request',{p_request_id:id})
  if(error||!data)redirect('/help?error='+encodeURIComponent(error?.message||'Request could not be withdrawn.'))
  revalidatePath('/help');revalidatePath('/church');redirect('/help?withdrawn=1')
}
