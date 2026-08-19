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

async function requireChurchAdmin(supabase:any,userId:string,churchId:string,contactId:string,lang:'en'|'es'){
  const {data:membership}=await supabase.from('church_memberships').select('role,status').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect(contactHref(contactId,lang,'error',lang==='es'?'Solo un pastor o administrador puede cambiar la conexión de miembro.':'Only a pastor or church admin can change a member connection.'))
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
  await requireChurchAdmin(supabase,userId,contact.church_id,contactId,lang)
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

export async function linkOutreachToExistingMember(formData:FormData){
  const lang=await requestLanguage()
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const contactId=text(formData,'contact_id'),memberUserId=text(formData,'member_user_id')
  if(!contactId||!memberUserId)redirect(lang==='es'?'/outreach?lang=es':'/outreach')
  const {data:contact}=await supabase.from('outreach_contacts').select('id,church_id,member_user_id').eq('id',contactId).maybeSingle()
  if(!contact)redirect('/outreach?error='+encodeURIComponent(lang==='es'?'No se encontró la persona en Evangelismo.':'Outreach contact not found.'))
  await requireChurchAdmin(supabase,userId,contact.church_id,contactId,lang)
  if(contact.member_user_id)redirect(contactHref(contactId,lang,'error',lang==='es'?'Este registro ya está conectado a una cuenta de miembro.':'This Outreach record is already linked to a member account.'))
  const {data:target}=await supabase.from('church_memberships').select('user_id,status').eq('church_id',contact.church_id).eq('user_id',memberUserId).eq('status','active').maybeSingle()
  if(!target)redirect(contactHref(contactId,lang,'error',lang==='es'?'El miembro seleccionado no pertenece activamente a esta iglesia.':'The selected member is not an active member of this church.'))
  const {data:alreadyLinked}=await supabase.from('outreach_contacts').select('id').eq('church_id',contact.church_id).eq('member_user_id',memberUserId).neq('id',contactId).limit(1).maybeSingle()
  if(alreadyLinked)redirect(contactHref(contactId,lang,'error',lang==='es'?'Ese miembro ya está conectado a otro registro de Evangelismo. Revise el registro existente antes de unir duplicados.':'That member is already linked to another Outreach record. Review the existing record before combining duplicates.'))
  const {error}=await supabase.from('outreach_contacts').update({member_user_id:memberUserId,updated_at:new Date().toISOString()}).eq('id',contactId).eq('church_id',contact.church_id).is('member_user_id',null)
  if(error)redirect(contactHref(contactId,lang,'error',error.message))
  revalidatePath('/outreach');revalidatePath(`/outreach/${contactId}`);revalidatePath('/church/analytics');revalidatePath('/journey')
  redirect(contactHref(contactId,lang,'linked','1'))
}
