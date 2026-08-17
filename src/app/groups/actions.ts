'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const number=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)

async function currentUser(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return {supabase,userId}}

export async function createGroup(formData:FormData){
  const {supabase,userId}=await currentUser()
  const churchId=text(formData,'church_id'),name=text(formData,'name'),groupType=text(formData,'group_type')||'friendship',leaderId=text(formData,'leader_id')||null
  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/groups')
  if(!name)redirect('/groups?error='+encodeURIComponent('Group name is required.'))
  const {data:group,error}=await supabase.from('groups').insert({church_id:churchId,name,group_type:groupType,leader_id:leaderId,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null}).select('id').single()
  if(error||!group)redirect('/groups?error='+encodeURIComponent(error?.message??'Unable to create group.'))
  if(leaderId)await supabase.from('group_memberships').upsert({group_id:group.id,user_id:leaderId,role:'leader'})
  revalidatePath('/groups');redirect(`/groups/${group.id}`)
}

export async function addGroupMember(formData:FormData){
  const {supabase}=await currentUser()
  const groupId=text(formData,'group_id'),userId=text(formData,'user_id'),role=text(formData,'role')||'member'
  if(!groupId||!userId)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a member.'))
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
