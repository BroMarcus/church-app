'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveNotificationPreferences(formData:FormData){
  const lang=String(formData.get('lang')??'')==='es'?'es':'en',url=(extra='')=>`/account/notifications?lang=${lang}${extra}`
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const enabled=(key:string)=>formData.get(key)==='on'
  const {error}=await supabase.from('notification_preferences').upsert({user_id:userId,direct_messages:enabled('direct_messages'),church_updates:enabled('church_updates'),network_updates:enabled('network_updates'),groups:enabled('groups'),serving:enabled('serving'),documents:enabled('documents'),learning:enabled('learning'),pastoral_care:enabled('pastoral_care'),community:enabled('community'),updated_at:new Date().toISOString()},{onConflict:'user_id'})
  if(error)redirect(url('&error='+encodeURIComponent(error.message)))
  revalidatePath('/account/notifications');redirect(url('&saved=1'))
}