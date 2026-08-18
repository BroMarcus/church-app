'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const number=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)
const frequencies=['weekly','biweekly','monthly','seasonal','other']
const languages=['en','es','bilingual']

async function currentUser(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return {supabase,userId}}

export async function createGroup(formData:FormData){
  const {supabase,userId}=await currentUser()
  const churchId=text(formData,'church_id'),name=text(formData,'name'),groupType=text(formData,'group_type')||'friendship',leaderId=text(formData,'leader_id')||null
  const frequency=text(formData,'meeting_frequency')||'weekly',language=text(formData,'language_code')||'en'
  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/groups')
  if(!name||!frequencies.includes(frequency)||!languages.includes(language))redirect('/groups?error='+encodeURIComponent('Valid group name, frequency and language are required.'))
  const capacity=text(formData,'capacity')?number(formData,'capacity'):null
  const {data:group,error}=await supabase.from('groups').insert({church_id:churchId,name,group_type:groupType,leader_id:leaderId,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency,language_code:language,capacity,location_label:text(formData,'location_label')||null,accepting_members:text(formData,'accepting_members')==='on'}).select('id').single()
  if(error||!group)redirect('/groups?error='+encodeURIComponent(error?.message??'Unable to create group.'))
  if(leaderId)await supabase.from('group_memberships').upsert({group_id:group.id,user_id:leaderId,role:'leader'})
  revalidatePath('/groups');redirect(`/groups/${group.id}`)
}

export async function updateGroupDetails(formData:FormData){
  const {supabase}=await currentUser();const groupId=text(formData,'group_id'),name=text(formData,'name'),frequency=text(formData,'meeting_frequency'),language=text(formData,'language_code')
  if(!groupId||!name||!frequencies.includes(frequency)||!languages.includes(language))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Invalid group details.'))
  const capacity=text(formData,'capacity')?number(formData,'capacity'):null
  const {error}=await supabase.from('groups').update({name,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency,language_code:language,capacity,location_label:text(formData,'location_label')||null,accepting_members:text(formData,'accepting_members')==='on'}).eq('id',groupId)
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?details=1`)
}

export async function updateGroupPrivateDetails(formData:FormData){
  const {supabase,userId}=await currentUser();const groupId=text(formData,'group_id')
  if(!groupId)redirect('/groups')
  const {error}=await supabase.from('group_private_details').upsert({group_id:groupId,meeting_address:text(formData,'meeting_address')||null,access_notes:text(formData,'access_notes')||null,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'})
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}?private=1`)
}

export async function addGroupMember(formData:FormData){
  const {supabase}=await currentUser()
  const groupId=text(formData,'group_id'),userId=text(formData,'user_id'),role=text(formData,'role')||'member'
  if(!groupId||!userId||!['member','assistant','leader'].includes(role))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a valid member and role.'))
  const {error}=await supabase.from('group_memberships').upsert({group_id:groupId,user_id:userId,role},{onConflict:'group_id,user_id'})
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?member=1`)
}

export async function submitGroupReport(formData:FormData){
  const {supabase,userId}=await currentUser()
  const groupId=text(formData,'group_id')
  const {error}=await supabase.from('group_reports').insert({group_id:groupId,submitted_by:userId,meeting_date:text(formData,'meeting_date'),attendance_count:number(formData,'attendance_count'),first_time_guests:number(formData,'first_time_guests'),active_bible_studies:number(formData,'active_bible_studies'),baptisms:number(formData,'baptisms'),holy_ghost_received:number(formData,'holy_ghost_received'),lesson_title:text(formData,'lesson_title')||null,follow_up_notes:text(formData,'follow_up_notes')||null})
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}?reported=1`)
}
