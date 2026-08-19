'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const langOf=(f?:FormData)=>String(f?.get('lang')??'')==='es'?'es':'en'
const withLang=(href:string,lang:string)=>lang==='es'&&href.startsWith('/')&&!href.startsWith('//')?`${href}${href.includes('?')?'&':'?'}lang=es`:href

export async function markRead(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  if(!data?.claims?.sub)redirect(`/login?lang=${lang}`)
  const id=String(formData.get('notification_id')??'')
  if(id)await supabase.rpc('mark_notification_read',{p_notification_id:id})
  revalidatePath('/notifications');revalidatePath('/')
}

export async function openNotification(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const id=String(formData.get('notification_id')??'')
  if(!id)redirect(`/notifications?lang=${lang}`)
  const {data:notification}=await supabase.from('notifications').select('id,href').eq('id',id).eq('user_id',userId).maybeSingle()
  if(!notification)redirect(`/notifications?lang=${lang}`)
  await supabase.rpc('mark_notification_read',{p_notification_id:id})
  revalidatePath('/notifications');revalidatePath('/')
  const href=String(notification.href??'')
  redirect(href.startsWith('/')&&!href.startsWith('//')?withLang(href,lang):`/notifications?lang=${lang}`)
}

export async function markAllRead(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  if(!data?.claims?.sub)redirect(`/login?lang=${lang}`)
  await supabase.rpc('mark_all_notifications_read')
  revalidatePath('/notifications');revalidatePath('/')
}