'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const roles=['member','group_leader','ministry_leader','minister'] as const
const path=(lang:string,suffix='')=>`/church/invites${lang==='es'?'?lang=es'+(suffix?'&'+suffix:''):(suffix?'?'+suffix:'')}`

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
  const lang=text(formData,'lang')==='es'?'es':'en'
  const email=text(formData,'email').toLowerCase(),role=text(formData,'role') as (typeof roles)[number]
  const days=Math.max(1,Math.min(30,Number.parseInt(text(formData,'expires_days')||'7',10)||7))
  if(!email||!email.includes('@'))redirect(path(lang,'error='+encodeURIComponent(lang==='es'?'Escribe un correo electrónico válido.':'Enter a valid email address.')))
  if(!roles.includes(role))redirect(path(lang,'error='+encodeURIComponent(lang==='es'?'Ese rol no está permitido para invitaciones.':'That invite role is not allowed.')))
  const expiresAt=new Date(Date.now()+days*24*60*60*1000).toISOString()
  const {error}=await supabase.from('church_invites').insert({church_id:churchId,email,role,created_by:userId,expires_at:expiresAt})
  if(error){
    const message=error.code==='23505'
      ?(lang==='es'?'Ya existe una invitación abierta para este correo. Revócala primero si necesitas reemplazarla.':'There is already an open invitation for this email address. Revoke it first if you need to replace it.')
      :(lang==='es'?'No se pudo crear la invitación. Inténtalo de nuevo.':error.message)
    redirect(path(lang,'error='+encodeURIComponent(message)))
  }
  revalidatePath('/church/invites');redirect(path(lang,'created=1'))
}

export async function revokeChurchInvite(formData:FormData){
  const {supabase,churchId}=await admin();const inviteId=text(formData,'invite_id');const lang=text(formData,'lang')==='es'?'es':'en'
  if(!inviteId)redirect(path(lang,'error='+encodeURIComponent(lang==='es'?'No se encontró la invitación.':'Invitation not found.')))
  const {error}=await supabase.from('church_invites').update({revoked_at:new Date().toISOString()}).eq('id',inviteId).eq('church_id',churchId).is('redeemed_at',null)
  if(error)redirect(path(lang,'error='+encodeURIComponent(lang==='es'?'No se pudo revocar la invitación. Inténtalo de nuevo.':error.message)))
  revalidatePath('/church/invites');redirect(path(lang,'revoked=1'))
}
