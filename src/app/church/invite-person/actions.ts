'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const allowedInviteRoles=new Set(['member','group_leader','ministry_leader','minister'])
const path=(lang:string,status?:string,created?:string)=>`/church/invite-person?lang=${lang==='es'?'es':'en'}${status?`&status=${encodeURIComponent(status)}`:''}${created?`&created=${encodeURIComponent(created)}`:''}`

export async function createKnownPersonInvite(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const supabase=await createClient();const {data:claims,error:claimsError}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(claimsError)console.error('known-person invite auth lookup failed',{code:claimsError.code})
  if(!userId)redirect(`/login?lang=${lang}&next=${encodeURIComponent(path(lang))}`)
  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(membershipError)console.error('known-person invite membership lookup failed',{code:membershipError.code})
  if(!membership?.church_id)redirect('/')
  const requestedRole=text(formData,'role')||'member'
  if(!allowedInviteRoles.has(requestedRole))redirect(path(lang,'role_not_allowed'))
  const {data,error}=await supabase.rpc('create_known_person_invitation',{p_church_id:membership.church_id,p_email:text(formData,'email'),p_first_name:text(formData,'first_name')||null,p_last_name:text(formData,'last_name')||null,p_phone:text(formData,'phone')||null,p_role:requestedRole})
  if(error){console.error('createKnownPersonInvite failed',{code:error.code});redirect(path(lang,'create_failed'))}
  const row:any=Array.isArray(data)?data[0]:data
  if(!row?.invite_id)redirect(path(lang,'create_failed'))
  redirect(path(lang,'created',row.invite_id))
}
