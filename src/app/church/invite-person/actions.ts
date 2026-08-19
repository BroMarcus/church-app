'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function createKnownPersonInvite(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data,error}=await supabase.rpc('create_known_person_invitation',{p_church_id:membership.church_id,p_email:text(formData,'email'),p_first_name:text(formData,'first_name')||null,p_last_name:text(formData,'last_name')||null,p_phone:text(formData,'phone')||null,p_role:text(formData,'role')||'member'})
  if(error)redirect(`/church/invite-person?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  const row:any=Array.isArray(data)?data[0]:data
  if(!row?.invite_id)redirect(`/church/invite-person?lang=${lang}&error=${encodeURIComponent(lang==='es'?'No se pudo crear la invitación.':'Invitation could not be created.')}`)
  redirect(`/church/invite-person?lang=${lang}&created=${encodeURIComponent(row.invite_id)}`)
}
