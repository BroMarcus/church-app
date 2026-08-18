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

export async function openNotification(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const id=String(formData.get('notification_id')??'')
  if(!id)redirect('/notifications')
  const {data:notification}=await supabase.from('notifications').select('id,href').eq('id',id).eq('user_id',userId).maybeSingle()
  if(!notification)redirect('/notifications')
  await supabase.rpc('mark_notification_read',{p_notification_id:id})
  revalidatePath('/notifications');revalidatePath('/')
  const href=String(notification.href??'')
  redirect(href.startsWith('/')&&!href.startsWith('//')?href:'/notifications')
}

export async function markAllRead(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  if(!data?.claims?.sub)redirect('/login')
  await supabase.rpc('mark_all_notifications_read')
  revalidatePath('/notifications');revalidatePath('/')
}
