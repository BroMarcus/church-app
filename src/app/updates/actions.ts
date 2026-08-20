'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const types=['announcement','pastoral','service_change','event','training','district','urgent']
const priorities=['normal','important','urgent']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData):'en'|'es'=>text(f,'lang')==='es'?'es':'en'
const updatesUrl=(lang:'en'|'es',extra='')=>`/updates?lang=${lang}${extra}`

async function leader(lang:'en'|'es'){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(lang==='es'?'/login?lang=es':'/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect(updatesUrl(lang))
  return {supabase,userId,churchId:membership.church_id,role:membership.role}
}

export async function createOfficialUpdate(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await leader(lang)
  const title=text(formData,'title'),body=text(formData,'body'),type=text(formData,'update_type'),priority=text(formData,'priority'),expires=text(formData,'expires_at')
  if(!title||!body)redirect(updatesUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Se requieren título y mensaje.':'Title and message are required.')))
  if(!types.includes(type)||!priorities.includes(priority))redirect(updatesUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Tipo o prioridad no válidos.':'Invalid update type or priority.')))
  let expiresUtc:string|null=null
  if(expires){const result=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:expires});if(result.error)redirect(updatesUrl(lang,'&error='+encodeURIComponent(result.error.message)));expiresUtc=result.data as string|null}
  const {error}=await supabase.from('official_updates').insert({church_id:churchId,created_by:userId,title,body,update_type:type,priority,pinned:formData.get('pinned')==='on',notify_members:formData.get('notify_members')==='on',expires_at:expiresUtc,published_at:new Date().toISOString()})
  if(error)redirect(updatesUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/updates');revalidatePath('/notifications');revalidatePath('/');redirect(updatesUrl(lang,'&created=1'))
}

export async function toggleOfficialUpdatePin(formData:FormData){
  const lang=langOf(formData),{supabase,churchId}=await leader(lang),id=text(formData,'update_id'),pinned=text(formData,'pinned')==='1'
  const {error}=await supabase.from('official_updates').update({pinned}).eq('id',id).eq('church_id',churchId)
  if(error)redirect(updatesUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/updates');revalidatePath('/');redirect(updatesUrl(lang,'&saved=1'))
}

export async function expireOfficialUpdate(formData:FormData){
  const lang=langOf(formData),{supabase,churchId}=await leader(lang),id=text(formData,'update_id')
  const {error}=await supabase.from('official_updates').update({expires_at:new Date().toISOString(),pinned:false}).eq('id',id).eq('church_id',churchId)
  if(error)redirect(updatesUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/updates');revalidatePath('/');redirect(updatesUrl(lang,'&expired=1'))
}

export async function deleteOfficialUpdate(formData:FormData){
  const lang=langOf(formData),{supabase,churchId,role}=await leader(lang),id=text(formData,'update_id')
  if(!['pastor','church_admin'].includes(role))redirect(updatesUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Solo un pastor o administrador puede eliminar permanentemente una actualización oficial.':'Only a pastor or church admin can permanently delete an official update.')))
  const {error}=await supabase.from('official_updates').delete().eq('id',id).eq('church_id',churchId)
  if(error)redirect(updatesUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/updates');revalidatePath('/');redirect(updatesUrl(lang,'&deleted=1'))
}
