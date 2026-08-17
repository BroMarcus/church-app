'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function createEvent(formData:FormData){
  const {supabase,userId}=await auth();const churchId=text(formData,'church_id'),title=text(formData,'title'),starts=text(formData,'starts_at')
  if(!churchId||!title||!starts)redirect('/calendar?error='+encodeURIComponent('Title and start time are required.'))
  const {error}=await supabase.from('events').insert({church_id:churchId,created_by:userId,title,description:text(formData,'description')||null,starts_at:new Date(starts).toISOString(),ends_at:text(formData,'ends_at')?new Date(text(formData,'ends_at')).toISOString():null,location:text(formData,'location')||null,event_type:text(formData,'event_type')||'church'})
  if(error)redirect('/calendar?error='+encodeURIComponent(error.message))
  revalidatePath('/calendar');redirect('/calendar?created=1')
}

export async function setRsvp(formData:FormData){
  const {supabase,userId}=await auth();const eventId=text(formData,'event_id'),response=text(formData,'response')
  if(!['interested','going','not_going'].includes(response))redirect('/calendar?error='+encodeURIComponent('Invalid RSVP.'))
  const {error}=await supabase.from('event_rsvps').upsert({event_id:eventId,user_id:userId,response,updated_at:new Date().toISOString()},{onConflict:'event_id,user_id'})
  if(error)redirect('/calendar?error='+encodeURIComponent(error.message))
  revalidatePath('/calendar');redirect('/calendar?rsvp=1')
}
