'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function markRead(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  if(!data?.claims?.sub)redirect('/login')
  const id=String(formData.get('notification_id')??'')
  if(id)await supabase.rpc('mark_notification_read',{p_notification_id:id})
  revalidatePath('/notifications');revalidatePath('/')
}

export async function markAllRead(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  if(!data?.claims?.sub)redirect('/login')
  await supabase.rpc('mark_all_notifications_read')
  revalidatePath('/notifications');revalidatePath('/')
}
