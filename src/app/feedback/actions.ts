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
  if(!membership?.church_id)redirect('/')
  const message=text(formData,'message')
  const type=['general','confusing','bug','idea'].includes(text(formData,'feedback_type'))?text(formData,'feedback_type'):'general'
  const pagePath=text(formData,'page_path').slice(0,300)||null
  if(message.length<3)redirect(`/feedback?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Cuéntanos un poco más para poder ayudarte.':'Tell us a little more so we can act on it.')}`)
  const {error}=await supabase.from('pilot_feedback').insert({church_id:membership.church_id,user_id:userId,feedback_type:type,message:message.slice(0,4000),page_path:pagePath,language_code:lang})
  if(error)redirect(`/feedback?lang=${lang}&error=${encodeURIComponent(lang==='es'?'No pudimos guardar tus comentarios. Inténtalo otra vez.':'We could not save your feedback. Please try again.')}`)
  redirect(`/feedback?lang=${lang}&sent=1`)
}
