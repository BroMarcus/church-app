'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}
const cleanUrl=(value:string)=>{if(!value)return null;if(!/^https?:\/\//i.test(value))throw new Error('Registration link must begin with http:// or https://.');return value}

export async function createEvent(formData:FormData){
  const {supabase,userId}=await auth();const churchId=text(formData,'church_id'),title=text(formData,'title'),starts=text(formData,'starts_at'),ends=text(formData,'ends_at')
  if(!churchId||!title||!starts)redirect('/calendar?error='+encodeURIComponent('Title and start time are required.'))
  const {data:startUtc,error:startError}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:starts})
  if(startError||!startUtc)redirect('/calendar?error='+encodeURIComponent(startError?.message||'Invalid start time.'))
  let endUtc:string|null=null
  if(ends){const result=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:ends});if(result.error)redirect('/calendar?error='+encodeURIComponent(result.error.message));endUtc=result.data as string|null}
  if(endUtc&&new Date(endUtc).getTime()<new Date(startUtc as string).getTime())redirect('/calendar?error='+encodeURIComponent('End time must be after the start time.'))
  let registrationUrl:string|null=null;try{registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(e:any){redirect('/calendar?error='+encodeURIComponent(e.message))}
  const {error}=await supabase.from('events').insert({church_id:churchId,created_by:userId,title,description:text(formData,'description')||null,starts_at:startUtc,ends_at:endUtc,location:text(formData,'location')||null,event_type:text(formData,'event_type')||'church',featured:text(formData,'featured')==='on',audience_label:text(formData,'audience_label')||null,registration_url:registrationUrl})
  if(error)redirect('/calendar?error='+encodeURIComponent(error.message))
  revalidatePath('/calendar');revalidatePath('/');redirect('/calendar?created=1')
}

export async function updateEventDiscovery(formData:FormData){
  const {supabase}=await auth();const eventId=text(formData,'event_id')
  if(!eventId)redirect('/calendar?error='+encodeURIComponent('Event not found.'))
  let registrationUrl:string|null=null;try{registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(e:any){redirect('/calendar?error='+encodeURIComponent(e.message))}
  const {error}=await supabase.from('events').update({featured:text(formData,'featured')==='on',audience_label:text(formData,'audience_label')||null,registration_url:registrationUrl}).eq('id',eventId)
  if(error)redirect('/calendar?error='+encodeURIComponent(error.message))
  revalidatePath('/calendar');revalidatePath('/');redirect('/calendar?saved=1')
}

export async function setRsvp(formData:FormData){
  const {supabase,userId}=await auth();const eventId=text(formData,'event_id'),response=text(formData,'response')
  if(!['interested','going','not_going'].includes(response))redirect('/calendar?error='+encodeURIComponent('Invalid RSVP.'))
  const {error}=await supabase.from('event_rsvps').upsert({event_id:eventId,user_id:userId,response,updated_at:new Date().toISOString()},{onConflict:'event_id,user_id'})
  if(error)redirect('/calendar?error='+encodeURIComponent(error.message))
  revalidatePath('/calendar');revalidatePath('/');redirect('/calendar?rsvp=1')
}
