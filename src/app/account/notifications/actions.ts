'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const bounded=(value:unknown)=>String(value||'unknown').slice(0,80)

export async function saveNotificationPreferences(formData:FormData){
  const lang=String(formData.get('lang')??'')==='es'?'es':'en',url=(extra='')=>`/account/notifications?lang=${lang}${extra}`
  const supabase=await createClient(),{data:claims,error:claimsError}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(claimsError){
    console.error('Notification preferences auth state unavailable',{code:bounded(claimsError.code)})
    redirect(url('&status=auth_unavailable'))
  }
  if(!userId)redirect(`/login?lang=${lang}`)
  const enabled=(key:string)=>formData.get(key)==='on'

  let saveError:unknown=null
  try{
    const result=await supabase.from('notification_preferences').upsert({user_id:userId,direct_messages:enabled('direct_messages'),church_updates:enabled('church_updates'),network_updates:enabled('network_updates'),groups:enabled('groups'),serving:enabled('serving'),documents:enabled('documents'),learning:enabled('learning'),pastoral_care:enabled('pastoral_care'),community:enabled('community'),updated_at:new Date().toISOString()},{onConflict:'user_id'})
    saveError=result.error
  }catch(error){
    console.error('Notification preferences save request failed',{kind:error instanceof Error?bounded(error.name):bounded(typeof error)})
    redirect(url('&status=save_failed'))
  }
  if(saveError){
    const candidate=saveError as {code?:unknown}
    console.error('Notification preferences save failed',{code:bounded(candidate?.code)})
    redirect(url('&status=save_failed'))
  }
  revalidatePath('/account/notifications');redirect(url('&saved=1'))
}
