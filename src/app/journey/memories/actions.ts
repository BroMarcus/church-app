'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const types=['prayer','journal','testimony','spiritual_note']

async function owner(){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createJourneyEntry(formData:FormData){
  const {supabase,userId,churchId}=await owner();const lang=text(formData,'lang')==='es'?'es':'en';const type=text(formData,'entry_type'),body=text(formData,'body')
  if(!types.includes(type)||!body)redirect(`/journey/memories?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Elige un tipo y escribe algo para guardar.':'Choose an entry type and write something to save.')}`)
  const share=type==='testimony'&&text(formData,'share_with_church')==='on'
  const payload={church_id:churchId,user_id:userId,entry_type:type,title:text(formData,'title')||null,body,scripture_ref:text(formData,'scripture_ref')||null,occurred_on:text(formData,'occurred_on')||null,prayer_status:type==='prayer'?'open':null,visibility:share?'church_share':'private',share_status:share?'pending':'not_requested'}
  const {error}=await supabase.from('journey_entries').insert(payload)
  if(error)redirect(`/journey/memories?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/journey/memories');redirect(`/journey/memories?lang=${lang}&saved=1`)
}

export async function markPrayerAnswered(formData:FormData){
  const {supabase,userId}=await owner();const lang=text(formData,'lang')==='es'?'es':'en';const id=text(formData,'entry_id')
  if(!id)redirect(`/journey/memories?lang=${lang}`)
  const {error}=await supabase.from('journey_entries').update({prayer_status:'answered',answered_on:text(formData,'answered_on')||new Date().toISOString().slice(0,10),answer_note:text(formData,'answer_note')||null}).eq('id',id).eq('user_id',userId).eq('entry_type','prayer')
  if(error)redirect(`/journey/memories?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/journey/memories');redirect(`/journey/memories?lang=${lang}&answered=1`)
}

export async function deleteJourneyEntry(formData:FormData){
  const {supabase,userId}=await owner();const lang=text(formData,'lang')==='es'?'es':'en';const id=text(formData,'entry_id')
  if(id)await supabase.from('journey_entries').delete().eq('id',id).eq('user_id',userId)
  revalidatePath('/journey/memories');redirect(`/journey/memories?lang=${lang}&deleted=1`)
}
