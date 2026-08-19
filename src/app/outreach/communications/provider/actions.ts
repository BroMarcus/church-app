'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function saveEmailProvider(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {error}=await supabase.rpc('configure_resend_email_provider',{p_church_id:membership.church_id,p_api_key:text(formData,'api_key')||null,p_email_from:text(formData,'email_from')||null,p_reply_to:text(formData,'reply_to')||null,p_enable:text(formData,'enable')==='on'})
  if(error)redirect(`/outreach/communications/provider?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/outreach/communications/provider');revalidatePath('/outreach/communications');redirect(`/outreach/communications/provider?lang=${lang}&saved=1`)
}
