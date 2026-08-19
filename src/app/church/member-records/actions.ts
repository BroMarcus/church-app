'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const nullable=(f:FormData,k:string)=>text(f,k)||null

async function requireRecordsManager(churchId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership)redirect('/')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_members'})
  if(!['pastor','church_admin'].includes(membership.role)&&!custom)redirect('/')
  return {supabase,userId}
}

export async function updateMemberDetails(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),lang=text(formData,'lang')==='es'?'es':'en'
  const base=`/church/members/${targetUserId}?lang=${lang}`
  if(!churchId||!targetUserId)redirect(`/church/member-records?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Falta el registro del miembro.':'Missing member record.')}`)
  const {supabase}=await requireRecordsManager(churchId)
  const {data:target}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',targetUserId).maybeSingle()
  if(!target)redirect(`/church/member-records?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Miembro no encontrado.':'Member not found.')}`)

  const first=text(formData,'first_name'),last=text(formData,'last_name'),display=text(formData,'display_name')
  const profileUpdate={first_name:first||null,last_name:last||null,display_name:display||[first,last].filter(Boolean).join(' ')||null,contact_email:nullable(formData,'contact_email'),updated_at:new Date().toISOString()}
  const {error:profileError}=await supabase.from('profiles').update(profileUpdate).eq('id',targetUserId)
  if(profileError)redirect(`${base}&error=${encodeURIComponent(profileError.message)}`)

  const privateUpdate={user_id:targetUserId,phone:nullable(formData,'phone'),address_line1:nullable(formData,'address_line1'),address_line2:nullable(formData,'address_line2'),city:nullable(formData,'city'),state:nullable(formData,'state'),postal_code:nullable(formData,'postal_code'),birthday:nullable(formData,'birthday'),marriage_anniversary:nullable(formData,'marriage_anniversary'),updated_at:new Date().toISOString()}
  const {error:detailsError}=await supabase.from('member_private_details').upsert(privateUpdate,{onConflict:'user_id'})
  if(detailsError)redirect(`${base}&error=${encodeURIComponent(detailsError.message)}`)

  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/church/member-records');revalidatePath('/directory');revalidatePath('/church/analytics')
  redirect(`${base}&details_saved=1`)
}

export async function updateMemberRelationship(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),relationship=text(formData,'relationship_status'),lang=text(formData,'lang')==='es'?'es':'en'
  const base=`/church/members/${targetUserId}?lang=${lang}`
  if(!churchId||!targetUserId||!['guest','attendee','member','inactive'].includes(relationship))redirect(`${base}&error=${encodeURIComponent(lang==='es'?'Relación con la iglesia inválida.':'Invalid church relationship status.')}`)
  const {supabase}=await requireRecordsManager(churchId)
  const {error}=await supabase.rpc('update_member_relationship_status',{p_church_id:churchId,p_user_id:targetUserId,p_relationship_status:relationship})
  if(error)redirect(`${base}&error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/church/member-records');revalidatePath('/church/analytics');revalidatePath('/church')
  redirect(`${base}&relationship_saved=1`)
}
