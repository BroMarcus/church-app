'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveNotificationPreferences(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const enabled=(key:string)=>formData.get(key)==='on'
  const {error}=await supabase.from('notification_preferences').upsert({
    user_id:userId,
    direct_messages:enabled('direct_messages'),
    church_updates:enabled('church_updates'),
    network_updates:enabled('network_updates'),
    groups:enabled('groups'),
    serving:enabled('serving'),
    documents:enabled('documents'),
    learning:enabled('learning'),
    pastoral_care:enabled('pastoral_care'),
    community:enabled('community'),
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'})
  if(error)redirect('/account/notifications?error='+encodeURIComponent(error.message))
  revalidatePath('/account/notifications');redirect('/account/notifications?saved=1')
}
