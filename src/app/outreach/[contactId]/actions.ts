'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function createOutreachMemberInvite(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const contactId=text(formData,'contact_id')
  if(!contactId)redirect('/outreach')
  const {data:contact}=await supabase.from('outreach_contacts').select('id,church_id,email,member_user_id').eq('id',contactId).maybeSingle()
  if(!contact)redirect('/outreach?error='+encodeURIComponent('Outreach contact not found.'))
  const {data:membership}=await supabase.from('church_memberships').select('role,status').eq('church_id',contact.church_id).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect(`/outreach/${contactId}?error=`+encodeURIComponent('Only a pastor or church admin can create member invitations.'))
  if(contact.member_user_id)redirect(`/outreach/${contactId}?error=`+encodeURIComponent('This Outreach contact is already linked to a Kingdom Network member.'))
  const email=String(contact.email??'').trim().toLowerCase()
  if(!email)redirect(`/outreach/${contactId}?error=`+encodeURIComponent('Add an email address to the Outreach contact before creating an account invitation.'))
  const {data:existing}=await supabase.from('church_invites').select('id').eq('church_id',contact.church_id).eq('outreach_contact_id',contactId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(existing?.id)redirect(`/outreach/${contactId}?invite=${existing.id}`)
  const {data:invite,error}=await supabase.from('church_invites').insert({church_id:contact.church_id,email,role:'member',created_by:userId,expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString(),outreach_contact_id:contactId}).select('id').single()
  if(error||!invite)redirect(`/outreach/${contactId}?error=`+encodeURIComponent(error?.message??'Unable to create invitation.'))
  revalidatePath('/church/invites');revalidatePath('/outreach');revalidatePath(`/outreach/${contactId}`)
  redirect(`/outreach/${contactId}?invite=${invite.id}`)
}
