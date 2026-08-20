'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const checked=(formData:FormData,key:string)=>formData.get(key)==='on'
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const rosterUrl=(groupId:string,lang:string,extra='')=>`/groups/${groupId}/roster?lang=${lang}${extra}`
const safe=(lang:string,en:string,es:string)=>lang==='es'?es:en

async function currentUser(lang:string){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  return {supabase,userId}
}

async function requireRosterManager(groupId:string,lang:string){
  const {supabase,userId}=await currentUser(lang)
  const {data:group,error}=await supabase.from('groups').select('id,church_id,leader_id,active').eq('id',groupId).maybeSingle()
  if(error||!group?.active)redirect('/groups')
  const [{data:churchMembership},{data:groupMembership}]=await Promise.all([
    supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  ])
  const canManage=churchMembership?.status==='active'&&(['pastor','church_admin'].includes(churchMembership.role)||group.leader_id===userId||groupMembership?.role==='leader')
  if(!canManage)redirect(rosterUrl(groupId,lang,'&error='+encodeURIComponent(safe(lang,'Leader access is required to edit this roster.','Se requiere acceso de líder para editar esta lista.'))))
  return {supabase,userId,churchId:group.church_id}
}

export async function addRosterMember(formData:FormData){
  const lang=langOf(formData),groupId=text(formData,'group_id'),memberUserId=text(formData,'user_id'),role=text(formData,'role')||'member'
  if(!groupId||!memberUserId||!['member','assistant','leader'].includes(role))redirect('/groups')
  const {supabase,churchId}=await requireRosterManager(groupId,lang)
  const {data:churchMember}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',memberUserId).eq('status','active').maybeSingle()
  if(!churchMember)redirect(rosterUrl(groupId,lang,'&error='+encodeURIComponent(safe(lang,'Choose an active member of this church.','Escoge un miembro activo de esta iglesia.'))))
  const {error}=await supabase.from('group_memberships').upsert({group_id:groupId,user_id:memberUserId,role},{onConflict:'group_id,user_id'})
  if(error){
    console.error('addRosterMember failed',{groupId,memberUserId,code:error.code,message:error.message})
    const message=error.message.includes('only one active Friendship Group')?safe(lang,'That person already belongs to another active Friendship Group. Transfer them before adding them here.','Esa persona ya pertenece a otro Grupo de Amistad activo. Transfiérela antes de agregarla aquí.'):safe(lang,'We could not add that person to the group.','No pudimos agregar a esa persona al grupo.')
    redirect(rosterUrl(groupId,lang,'&error='+encodeURIComponent(message)))
  }
  revalidatePath(`/groups/${groupId}`);revalidatePath(`/groups/${groupId}/roster`);revalidatePath('/groups')
  redirect(rosterUrl(groupId,lang,'&member_added=1'))
}

export async function updateRosterMember(formData:FormData){
  const lang=langOf(formData),groupId=text(formData,'group_id'),memberUserId=text(formData,'user_id'),role=text(formData,'group_role')||'member'
  if(!groupId||!memberUserId||!['member','assistant','leader'].includes(role))redirect('/groups')
  const {supabase}=await requireRosterManager(groupId,lang)
  const {error}=await supabase.rpc('update_group_member_status',{
    p_group_id:groupId,
    p_user_id:memberUserId,
    p_group_role:role,
    p_member_title:text(formData,'member_title')||null,
    p_mark_baptized:checked(formData,'mark_baptized'),
    p_mark_holy_ghost:checked(formData,'mark_holy_ghost')
  })
  if(error){
    console.error('updateRosterMember failed',{groupId,memberUserId,code:error.code,message:error.message})
    redirect(rosterUrl(groupId,lang,'&error='+encodeURIComponent(safe(lang,'We could not save that roster change.','No pudimos guardar ese cambio de la lista.'))))
  }
  revalidatePath(`/groups/${groupId}`);revalidatePath(`/groups/${groupId}/roster`);revalidatePath(`/directory/${memberUserId}`);revalidatePath('/journey')
  redirect(rosterUrl(groupId,lang,'&member_saved=1'))
}
