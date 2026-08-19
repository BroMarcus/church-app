'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const split=(v:string)=>v.split(',').map(x=>x.trim()).filter(Boolean)

export async function organizeMedia(formData:FormData){
 const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login')
 const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single();if(!membership?.church_id||!['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role))redirect('/')
 const id=text(formData,'asset_id');if(!id)redirect('/media?view=inbox&error=Invalid%20asset')
 const payload={title:text(formData,'title'),asset_type:text(formData,'asset_type')||'other',ministry_area:text(formData,'ministry_area')||null,language_code:text(formData,'language_code')||'en',description:text(formData,'description')||null,topic_tags:split(text(formData,'topic_tags')),source_label:text(formData,'source_label')||null,archive_status:'current',organization_status:'organized',approved_for_members:text(formData,'approved_for_members')==='on',can_edit_copy:text(formData,'can_edit_copy')==='on',updated_at:new Date().toISOString()}
 const {error}=await supabase.from('media_assets').update(payload).eq('id',id).eq('church_id',membership.church_id);if(error)redirect('/media?view=inbox&error='+encodeURIComponent(error.message))
 revalidatePath('/media');redirect('/media?organized=1')
}
