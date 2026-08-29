'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const checked=(formData:FormData,key:string)=>text(formData,key)==='on'
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const withMessage=(path:string,key:string,value:string,lang:'en'|'es')=>`${path}?${key}=${encodeURIComponent(value)}&lang=${lang}`

const friendly=(lang:'en'|'es',kind:'link'|'submit'|'toggle')=>{
  if(kind==='link')return lang==='es'?'No se pudo preparar el enlace. Revise el tipo de enlace e inténtelo otra vez.':'We could not prepare that link. Check the link type and try again.'
  if(kind==='toggle')return lang==='es'?'No se pudo cambiar ese enlace. Inténtelo otra vez.':'We could not change that link. Try again.'
  return lang==='es'?'No pudimos guardar su conexión con certeza. No la envíe repetidamente; vuelva a abrir este enlace e inténtelo una vez más.':'We could not save your connection with certainty. Please do not submit repeatedly; reopen this link and try once more.'
}

export async function createConnectionLink(formData:FormData){
  const lang=langOf(formData)
  const churchId=text(formData,'church_id')
  const sourceType=text(formData,'source_type')||'member_invite'
  if(!churchId)redirect(withMessage('/connect','error',friendly(lang,'link'),lang))
  const supabase=await createClient()
  const {error}=await supabase.rpc('create_outreach_source_link',{
    p_church_id:churchId,
    p_source_type:sourceType,
    p_source_group_id:text(formData,'source_group_id')||null,
    p_source_event_id:text(formData,'source_event_id')||null,
    p_source_label:text(formData,'source_label')||null,
    p_language_code:lang
  })
  if(error)redirect(withMessage('/connect','error',friendly(lang,'link'),lang))
  revalidatePath('/connect')
  redirect(`/connect?created=1&lang=${lang}`)
}

export async function setConnectionLinkActive(formData:FormData){
  const lang=langOf(formData)
  const id=text(formData,'id')
  if(!id)redirect(withMessage('/connect','error',friendly(lang,'toggle'),lang))
  const supabase=await createClient()
  const {error}=await supabase.rpc('set_outreach_source_link_active',{p_link_id:id,p_active:text(formData,'active')==='true'})
  if(error)redirect(withMessage('/connect','error',friendly(lang,'toggle'),lang))
  revalidatePath('/connect')
  redirect(`/connect?saved=1&lang=${lang}`)
}

export async function submitConnectionCard(formData:FormData){
  const lang=langOf(formData)
  const token=text(formData,'token')
  const requestKey=text(formData,'request_key')
  if(!token||!requestKey)redirect(`/connect/${encodeURIComponent(token||'missing')}?error=1&lang=${lang}`)
  const supabase=await createClient()
  const {data,error}=await supabase.rpc('submit_outreach_connection',{
    p_token:token,
    p_request_key:requestKey,
    p_first_name:text(formData,'first_name'),
    p_last_name:text(formData,'last_name')||null,
    p_phone:text(formData,'phone')||null,
    p_email:text(formData,'email')||null,
    p_language:lang,
    p_email_consent:checked(formData,'email_consent'),
    p_sms_consent:checked(formData,'sms_consent'),
    p_bible_study_interest:checked(formData,'bible_study_interest'),
    p_first_steps_interest:checked(formData,'first_steps_interest'),
    p_prayer_request:text(formData,'prayer_request')||null
  })
  if(error)redirect(`/connect/${encodeURIComponent(token)}?error=1&lang=${lang}`)
  const row=Array.isArray(data)?data[0]:data
  const result=String((row as any)?.result??'')
  redirect(`/connect/${encodeURIComponent(token)}?status=${result==='needs_review'?'review':'connected'}&lang=${lang}`)
}
