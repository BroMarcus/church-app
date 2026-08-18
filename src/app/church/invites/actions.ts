'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const roles=['member','group_leader','ministry_leader','minister'] as const

async function admin(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createChurchInvite(formData:FormData){
  const {supabase,userId,churchId}=await admin()
  const email=text(formData,'email').toLowerCase(),role=text(formData,'role') as (typeof roles)[number]
  const days=Math.max(1,Math.min(30,Number.parseInt(text(formData,'expires_days')||'7',10)||7))
  if(!email||!email.includes('@'))redirect('/church/invites?error='+encodeURIComponent('Enter a valid email address.'))
  if(!roles.includes(role))redirect('/church/invites?error='+encodeURIComponent('That invite role is not allowed.'))
  const expiresAt=new Date(Date.now()+days*24*60*60*1000).toISOString()
  const {error}=await supabase.from('church_invites').insert({church_id:churchId,email,role,created_by:userId,expires_at:expiresAt})
  if(error){const message=error.code==='23505'?'There is already an open invitation for this email address. Revoke it first if you need to replace it.':error.message;redirect('/church/invites?error='+encodeURIComponent(message))}
  revalidatePath('/church/invites');redirect('/church/invites?created=1')
}

export async function revokeChurchInvite(formData:FormData){
  const {supabase,churchId}=await admin();const inviteId=text(formData,'invite_id')
  if(!inviteId)redirect('/church/invites?error='+encodeURIComponent('Invitation not found.'))
  const {error}=await supabase.from('church_invites').update({revoked_at:new Date().toISOString()}).eq('id',inviteId).eq('church_id',churchId).is('redeemed_at',null)
  if(error)redirect('/church/invites?error='+encodeURIComponent(error.message))
  revalidatePath('/church/invites');redirect('/church/invites?revoked=1')
}
