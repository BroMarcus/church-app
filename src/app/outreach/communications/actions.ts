'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const lang=(f:FormData)=>text(f,'lang')==='es'?'es':'en'

async function manager(){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_outreach'})
  if(!['pastor','church_admin','ministry_leader','minister'].includes(membership.role)&&!custom)redirect('/outreach')
  return {supabase,userId,churchId:membership.church_id}
}

export async function updateCommunicationTemplate(formData:FormData){
  const {supabase,churchId}=await manager();const language=lang(formData),id=text(formData,'template_id')
  if(!id)redirect(`/outreach/communications?lang=${language}&error=${encodeURIComponent(language==='es'?'Plantilla no encontrada.':'Template not found.')}`)
  const delay=Math.max(0,Number.parseInt(text(formData,'delay_minutes')||'0',10)||0)
  const payload={name:text(formData,'name'),subject:text(formData,'subject')||null,body:text(formData,'body'),delay_minutes:delay,active:text(formData,'active')==='on',updated_at:new Date().toISOString()}
  if(!payload.name||!payload.body)redirect(`/outreach/communications?lang=${language}&error=${encodeURIComponent(language==='es'?'Nombre y mensaje son obligatorios.':'Template name and message are required.')}`)
  const {error}=await supabase.from('communication_templates').update(payload).eq('id',id).eq('church_id',churchId)
  if(error)redirect(`/outreach/communications?lang=${language}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/outreach/communications');redirect(`/outreach/communications?lang=${language}&template_saved=1`)
}

export async function cancelQueuedCommunication(formData:FormData){
  const {supabase,churchId}=await manager();const language=lang(formData),id=text(formData,'outbox_id')
  if(id){const {error}=await supabase.from('communication_outbox').update({status:'cancelled',cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('church_id',churchId).in('status',['queued','waiting_provider','failed']);if(error)redirect(`/outreach/communications?lang=${language}&error=${encodeURIComponent(error.message)}`)}
  revalidatePath('/outreach/communications');redirect(`/outreach/communications?lang=${language}&cancelled=1`)
}

export async function suppressContactCommunications(formData:FormData){
  const {supabase,churchId}=await manager();const language=lang(formData),contactId=text(formData,'contact_id')
  if(!contactId)redirect(`/outreach/communications?lang=${language}`)
  const now=new Date().toISOString()
  const {error}=await supabase.from('outreach_contacts').update({email_consent:false,sms_consent:false,messaging_consent:false,communication_opt_out_at:now,updated_at:now}).eq('id',contactId).eq('church_id',churchId)
  if(error)redirect(`/outreach/communications?lang=${language}&error=${encodeURIComponent(error.message)}`)
  await supabase.from('communication_outbox').update({status:'suppressed',error_message:'Communication opt-out recorded',updated_at:now}).eq('contact_id',contactId).in('status',['queued','waiting_provider','failed'])
  revalidatePath('/outreach');revalidatePath('/outreach/communications');redirect(`/outreach/communications?lang=${language}&opted_out=1`)
}
