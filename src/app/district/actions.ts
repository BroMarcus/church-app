'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function districtAdmin(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role,churches(district_id)').eq('user_id',userId).eq('status','active').limit(1).single()
  const church:any=Array.isArray(membership?.churches)?membership?.churches[0]:membership?.churches
  if(membership?.role!=='district_admin'||!church?.district_id)redirect('/')
  return {supabase,userId,districtId:church.district_id as string}
}

export async function updateDistrictSettings(formData:FormData){
  const {supabase,districtId}=await districtAdmin()
  const website=text(formData,'website_url')||null
  if(website&&!/^https?:\/\//i.test(website))redirect('/district?error='+encodeURIComponent('Website must begin with http:// or https://.'))
  const {error}=await supabase.from('districts').update({name:text(formData,'name'),timezone:text(formData,'timezone')||'America/Los_Angeles',website_url:website,contact_email:text(formData,'contact_email')||null,contact_phone:text(formData,'contact_phone')||null}).eq('id',districtId)
  if(error)redirect('/district?error='+encodeURIComponent(error.message))
  revalidatePath('/district');revalidatePath('/network');redirect('/district?settings=1')
}

export async function createDistrictUpdate(formData:FormData){
  const {supabase,userId,districtId}=await districtAdmin()
  const title=text(formData,'title'),body=text(formData,'body'),priority=text(formData,'priority')||'normal',expires=text(formData,'expires_at')
  if(!title||!body||!['normal','important','urgent'].includes(priority))redirect('/district?error='+encodeURIComponent('Title, message and a valid priority are required.'))
  let expiresUtc:string|null=null
  if(expires){const r=await supabase.rpc('district_local_datetime_to_utc',{p_district_id:districtId,p_local_datetime:expires});if(r.error)redirect('/district?error='+encodeURIComponent(r.error.message));expiresUtc=r.data as string|null}
  const {error}=await supabase.from('district_updates').insert({district_id:districtId,created_by:userId,title,body,priority,pinned:formData.get('pinned')==='on',notify_members:formData.get('notify_members')==='on',expires_at:expiresUtc})
  if(error)redirect('/district?error='+encodeURIComponent(error.message))
  revalidatePath('/district');revalidatePath('/network');revalidatePath('/notifications');redirect('/district?update=1')
}

export async function createDistrictEvent(formData:FormData){
  const {supabase,userId,districtId}=await districtAdmin()
  const title=text(formData,'title'),starts=text(formData,'starts_at'),ends=text(formData,'ends_at'),registration=text(formData,'registration_url')||null
  if(!title||!starts)redirect('/district?error='+encodeURIComponent('Event title and start time are required.'))
  if(registration&&!/^https?:\/\//i.test(registration))redirect('/district?error='+encodeURIComponent('Registration link must begin with http:// or https://.'))
  const startResult=await supabase.rpc('district_local_datetime_to_utc',{p_district_id:districtId,p_local_datetime:starts})
  if(startResult.error||!startResult.data)redirect('/district?error='+encodeURIComponent(startResult.error?.message||'Invalid event time.'))
  let endUtc:string|null=null
  if(ends){const r=await supabase.rpc('district_local_datetime_to_utc',{p_district_id:districtId,p_local_datetime:ends});if(r.error)redirect('/district?error='+encodeURIComponent(r.error.message));endUtc=r.data as string|null}
  if(endUtc&&new Date(endUtc).getTime()<new Date(startResult.data as string).getTime())redirect('/district?error='+encodeURIComponent('End time must be after start time.'))
  const {error}=await supabase.from('events').insert({district_id:districtId,church_id:null,created_by:userId,title,description:text(formData,'description')||null,starts_at:startResult.data,ends_at:endUtc,location:text(formData,'location')||null,event_type:'district',featured:formData.get('featured')==='on',audience_label:text(formData,'audience_label')||null,registration_url:registration})
  if(error)redirect('/district?error='+encodeURIComponent(error.message))
  revalidatePath('/district');revalidatePath('/network');revalidatePath('/calendar');revalidatePath('/');redirect('/district?event=1')
}
