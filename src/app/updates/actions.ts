'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const types=['announcement','pastoral','service_change','event','training','district','urgent']
const priorities=['normal','important','urgent']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function leader(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/updates')
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createOfficialUpdate(formData:FormData){
  const {supabase,userId,churchId}=await leader()
  const title=text(formData,'title'),body=text(formData,'body'),type=text(formData,'update_type'),priority=text(formData,'priority'),expires=text(formData,'expires_at')
  if(!title||!body)redirect('/updates?error='+encodeURIComponent('Title and message are required.'))
  if(!types.includes(type)||!priorities.includes(priority))redirect('/updates?error='+encodeURIComponent('Invalid update type or priority.'))
  let expiresUtc:string|null=null
  if(expires){const result=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:expires});if(result.error)redirect('/updates?error='+encodeURIComponent(result.error.message));expiresUtc=result.data as string|null}
  const {error}=await supabase.from('official_updates').insert({church_id:churchId,created_by:userId,title,body,update_type:type,priority,pinned:formData.get('pinned')==='on',expires_at:expiresUtc,published_at:new Date().toISOString()})
  if(error)redirect('/updates?error='+encodeURIComponent(error.message))
  revalidatePath('/updates');revalidatePath('/');redirect('/updates?created=1')
}

export async function toggleOfficialUpdatePin(formData:FormData){
  const {supabase,churchId}=await leader();const id=text(formData,'update_id'),pinned=text(formData,'pinned')==='1'
  const {error}=await supabase.from('official_updates').update({pinned}).eq('id',id).eq('church_id',churchId)
  if(error)redirect('/updates?error='+encodeURIComponent(error.message))
  revalidatePath('/updates');revalidatePath('/');redirect('/updates?saved=1')
}

export async function expireOfficialUpdate(formData:FormData){
  const {supabase,churchId}=await leader();const id=text(formData,'update_id')
  const {error}=await supabase.from('official_updates').update({expires_at:new Date().toISOString(),pinned:false}).eq('id',id).eq('church_id',churchId)
  if(error)redirect('/updates?error='+encodeURIComponent(error.message))
  revalidatePath('/updates');revalidatePath('/');redirect('/updates?expired=1')
}

export async function deleteOfficialUpdate(formData:FormData){
  const {supabase,churchId,role}=await leader();const id=text(formData,'update_id')
  if(!['pastor','church_admin'].includes(role))redirect('/updates?error='+encodeURIComponent('Only a pastor or church admin can permanently delete an official update.'))
  const {error}=await supabase.from('official_updates').delete().eq('id',id).eq('church_id',churchId)
  if(error)redirect('/updates?error='+encodeURIComponent(error.message))
  revalidatePath('/updates');revalidatePath('/');redirect('/updates?deleted=1')
}
