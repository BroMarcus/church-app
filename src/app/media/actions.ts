'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const split=(v:string)=>v.split(',').map(x=>x.trim()).filter(Boolean)
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const mediaUrl=(lang:string,extra='')=>`/media?lang=${lang}${extra}`

export async function organizeMedia(formData:FormData){
 const lang=langOf(formData),supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect(`/login?lang=${lang}`)
 const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single();if(!membership?.church_id)redirect('/')
 const systemAccess=['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role)
 const {data:customAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_media'})
 if(!systemAccess&&!customAccess)redirect(mediaUrl(lang))
 const id=text(formData,'asset_id');if(!id)redirect(mediaUrl(lang,'&view=inbox&error='+encodeURIComponent(lang==='es'?'Archivo inválido.':'Invalid asset.')))
 const payload={title:text(formData,'title'),asset_type:text(formData,'asset_type')||'other',ministry_area:text(formData,'ministry_area')||null,language_code:text(formData,'language_code')||'en',description:text(formData,'description')||null,topic_tags:split(text(formData,'topic_tags')),source_label:text(formData,'source_label')||null,archive_status:'current',organization_status:'organized',approved_for_members:text(formData,'approved_for_members')==='on',can_edit_copy:text(formData,'can_edit_copy')==='on',updated_at:new Date().toISOString()}
 const {error}=await supabase.from('media_assets').update(payload).eq('id',id).eq('church_id',membership.church_id);if(error)redirect(mediaUrl(lang,'&view=inbox&error='+encodeURIComponent(error.message)))
 revalidatePath('/media');redirect(mediaUrl(lang,'&organized=1'))
}