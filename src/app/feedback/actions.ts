'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function submitPilotFeedback(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  const lang=text(formData,'lang')==='es'?'es':'en'
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
  const message=text(formData,'message')
  const type=['general','confusing','bug','idea'].includes(text(formData,'feedback_type'))?text(formData,'feedback_type'):'general'
  const pagePath=text(formData,'page_path').slice(0,300)||null
  if(message.length<3)redirect(`/feedback?lang=${lang}&error_code=message_short`)
  const {error}=await supabase.from('pilot_feedback').insert({church_id:membership.church_id,user_id:userId,feedback_type:type,message:message.slice(0,4000),page_path:pagePath,language_code:lang})
  if(error){
    console.error('Pilot feedback save failed',{code:error.code??'unknown'})
    redirect(`/feedback?lang=${lang}&error_code=save_failed`)
  }
  redirect(`/feedback?lang=${lang}&sent=1`)
}
