'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const roles=['member','group_leader','ministry_leader','minister'] as const
const path=(lang:string,status?:string)=>`/church/invites?lang=${lang==='es'?'es':'en'}${status?`&status=${encodeURIComponent(status)}`:''}`
const boundedCode=(value:unknown)=>String(value??'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const validEmail=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const inviteIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function admin(lang:string){
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(claimsError){
    console.error('church invite auth lookup failed',{errorCode:boundedCode(claimsError.code)})
    redirect(path(lang,'access_unavailable'))
  }
  if(!userId)redirect(`/login?lang=${lang==='es'?'es':'en'}&next=${encodeURIComponent(path(lang))}`)
  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(membershipError){
    console.error('church invite membership lookup failed',{errorCode:boundedCode(membershipError.code)})
    redirect(path(lang,'access_unavailable'))
  }
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect(path(lang,'not_authorized'))
  return {supabase,userId,churchId:membership.church_id}
}

export async function createChurchInvite(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const {supabase,userId,churchId}=await admin(lang)
  const email=text(formData,'email').toLowerCase(),role=text(formData,'role') as (typeof roles)[number]
  const days=Math.max(1,Math.min(30,Number.parseInt(text(formData,'expires_days')||'7',10)||7))
  if(!validEmail(email))redirect(path(lang,'invalid_email'))
  if(!roles.includes(role))redirect(path(lang,'role_not_allowed'))
  const expiresAt=new Date(Date.now()+days*24*60*60*1000).toISOString()
  const {error}=await supabase.from('church_invites').insert({church_id:churchId,email,role,created_by:userId,expires_at:expiresAt})
  if(error){
    console.error('church invite creation failed',{errorCode:boundedCode(error.code)})
    redirect(path(lang,error.code==='23505'?'duplicate_open':'create_failed'))
  }
  revalidatePath('/church/invites');redirect(path(lang,'created'))
}

export async function revokeChurchInvite(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const {supabase,churchId}=await admin(lang)
  const inviteId=text(formData,'invite_id').slice(0,80)
  if(!inviteId||!inviteIdPattern.test(inviteId))redirect(path(lang,'invite_missing'))
  const {data,error}=await supabase.from('church_invites').update({revoked_at:new Date().toISOString()}).eq('id',inviteId).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).select('id').maybeSingle()
  if(error){console.error('church invite revoke failed',{errorCode:boundedCode(error.code)});redirect(path(lang,'revoke_failed'))}
  if(!data?.id)redirect(path(lang,'invite_not_open'))
  revalidatePath('/church/invites');redirect(path(lang,'revoked'))
}
