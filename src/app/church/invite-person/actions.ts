'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const allowedInviteRoles=new Set(['member','group_leader','ministry_leader','minister'])
const path=(lang:string,status?:string,created?:string)=>`/church/invite-person?lang=${lang==='es'?'es':'en'}${status?`&status=${encodeURIComponent(status)}`:''}${created?`&created=${encodeURIComponent(created)}`:''}`
const boundedCode=(value:unknown)=>String(value??'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const validEmail=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const validText=(value:string,max:number)=>value.length<=max

export async function createKnownPersonInvite(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(claimsError){
    console.error('known-person invite auth lookup failed',{errorCode:boundedCode(claimsError.code)})
    redirect(path(lang,'access_unavailable'))
  }
  if(!userId)redirect(`/login?lang=${lang}&next=${encodeURIComponent(path(lang))}`)

  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(membershipError){
    console.error('known-person invite membership lookup failed',{errorCode:boundedCode(membershipError.code)})
    redirect(path(lang,'access_unavailable'))
  }
  if(!membership?.church_id)redirect(path(lang,'not_authorized'))

  const {data:custom,error:permissionError}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_members'})
  if(permissionError){
    console.error('known-person invite permission lookup failed',{errorCode:boundedCode(permissionError.code)})
    redirect(path(lang,'access_unavailable'))
  }
  const isChurchAdmin=['pastor','church_admin'].includes(membership.role)
  const canInvite=isChurchAdmin||Boolean(custom)
  if(!canInvite)redirect(path(lang,'not_authorized'))

  const requestedRole=text(formData,'role')||'member'
  const email=text(formData,'email').toLowerCase()
  const firstName=text(formData,'first_name')
  const lastName=text(formData,'last_name')
  const phone=text(formData,'phone')
  if(!allowedInviteRoles.has(requestedRole))redirect(path(lang,'role_not_allowed'))
  // `manage_members` can authorize inviting a person, but it must not become a way
  // to preassign leadership authority. Elevated starting roles remain Pastor/Church Admin only,
  // matching the role options rendered by the page.
  if(requestedRole!=='member'&&!isChurchAdmin)redirect(path(lang,'role_not_allowed'))
  if(!validEmail(email))redirect(path(lang,'invalid_email'))
  if(!validText(firstName,80)||!validText(lastName,80)||!validText(phone,40))redirect(path(lang,'input_too_long'))

  const {data,error}=await supabase.rpc('create_known_person_invitation',{p_church_id:membership.church_id,p_email:email,p_first_name:firstName||null,p_last_name:lastName||null,p_phone:phone||null,p_role:requestedRole})
  if(error){
    console.error('createKnownPersonInvite failed',{errorCode:boundedCode(error.code)})
    redirect(path(lang,'create_failed'))
  }
  const row:any=Array.isArray(data)?data[0]:data
  if(!row?.invite_id)redirect(path(lang,'create_failed'))
  redirect(path(lang,'created',String(row.invite_id).slice(0,80)))
}