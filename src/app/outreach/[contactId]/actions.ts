'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function requestLanguage(){
  const h=await headers()
  const referer=h.get('referer')
  if(!referer)return 'en' as const
  try{return new URL(referer).searchParams.get('lang')==='es'?'es' as const:'en' as const}catch{return 'en' as const}
}

function contactHref(contactId:string,lang:'en'|'es',key?:string,value?:string){
  const params=new URLSearchParams()
  if(key&&value)params.set(key,value)
  if(lang==='es')params.set('lang','es')
  const query=params.toString()
  return `/outreach/${contactId}${query?`?${query}`:''}`
}

export async function createOutreachMemberInvite(formData:FormData){
  const lang=await requestLanguage()
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const contactId=text(formData,'contact_id')
  if(!contactId)redirect(lang==='es'?'/outreach?lang=es':'/outreach')
  const {data:contact}=await supabase.from('outreach_contacts').select('id,church_id,email,member_user_id').eq('id',contactId).maybeSingle()
  if(!contact)redirect(`/outreach${lang==='es'?'?lang=es&':'?'}error=`+encodeURIComponent(lang==='es'?'No se encontró la persona en Evangelismo.':'Outreach contact not found.'))
  const {data:membership}=await supabase.from('church_memberships').select('role,status').eq('church_id',contact.church_id).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect(contactHref(contactId,lang,'error',lang==='es'?'Solo un pastor o administrador puede crear invitaciones de miembros.':'Only a pastor or church admin can create member invitations.'))
  if(contact.member_user_id)redirect(contactHref(contactId,lang,'error',lang==='es'?'Esta persona ya está conectada a un miembro de Kingdom Network.':'This Outreach contact is already linked to a Kingdom Network member.'))
  const email=String(contact.email??'').trim().toLowerCase()
  if(!email)redirect(contactHref(contactId,lang,'error',lang==='es'?'Agregue un correo electrónico antes de crear una invitación de cuenta.':'Add an email address to the Outreach contact before creating an account invitation.'))

  const {data:existing}=await supabase.from('church_invites')
    .select('id,outreach_contact_id,expires_at')
    .eq('church_id',contact.church_id)
    .eq('email',email)
    .is('redeemed_at',null)
    .is('revoked_at',null)
    .order('created_at',{ascending:false})
    .limit(1)
    .maybeSingle()

  if(existing?.id){
    if(existing.outreach_contact_id&&existing.outreach_contact_id!==contactId){
      redirect(contactHref(contactId,lang,'error',lang==='es'?'Ya existe una invitación abierta para este correo vinculada a otra persona en Evangelismo.':'An open invitation for this email is already linked to another Outreach person.'))
    }
    const refreshNeeded=existing.outreach_contact_id!==contactId||new Date(existing.expires_at).getTime()<=Date.now()
    if(refreshNeeded){
      const {error:updateError}=await supabase.from('church_invites').update({outreach_contact_id:contactId,expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()}).eq('id',existing.id)
      if(updateError)redirect(contactHref(contactId,lang,'error',lang==='es'?'No se pudo preparar la invitación. Inténtelo de nuevo.':updateError.message))
    }
    revalidatePath('/church/invites');revalidatePath('/outreach');revalidatePath(`/outreach/${contactId}`)
    redirect(contactHref(contactId,lang,'invite',existing.id))
  }

  const {data:invite,error}=await supabase.from('church_invites').insert({church_id:contact.church_id,email,role:'member',created_by:userId,expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString(),outreach_contact_id:contactId}).select('id').single()
  if(error||!invite)redirect(contactHref(contactId,lang,'error',lang==='es'?'No se pudo crear la invitación. Inténtelo de nuevo.':(error?.message??'Unable to create invitation.')))
  revalidatePath('/church/invites');revalidatePath('/outreach');revalidatePath(`/outreach/${contactId}`)
  redirect(contactHref(contactId,lang,'invite',invite.id))
}
