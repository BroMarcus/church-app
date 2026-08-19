'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function currentUser(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  return {supabase,userId}
}

async function leaderContext(groupId:string){
  const {supabase,userId}=await currentUser()
  const {data:group}=await supabase.from('groups').select('id,church_id,leader_id').eq('id',groupId).single()
  if(!group?.church_id)redirect('/groups?error='+encodeURIComponent('Group not found.'))

  const [{data:churchMembership},{data:groupMembership}]=await Promise.all([
    supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).eq('status','active').maybeSingle(),
    supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  ])
  const canManage=group.leader_id===userId||groupMembership?.role==='leader'||['minister','pastor','church_admin'].includes(churchMembership?.role??'')
  if(!canManage)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Only group leadership can schedule lessons.'))
  return {supabase,userId,group}
}

export async function assignGroupLesson(formData:FormData){
  const groupId=text(formData,'group_id'),lessonId=text(formData,'lesson_id'),scheduledFor=text(formData,'scheduled_for')
  if(!groupId||!lessonId||!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor))redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('Choose a lesson and meeting date.'))
  const {supabase,userId,group}=await leaderContext(groupId)
  const {data:lesson}=await supabase.from('friendship_group_lessons').select('id,title,lesson_number').eq('id',lessonId).eq('church_id',group.church_id).eq('published',true).maybeSingle()
  if(!lesson)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('That lesson is not available to this church.'))

  const {error}=await supabase.from('group_lesson_assignments').upsert({group_id:groupId,lesson_id:lesson.id,scheduled_for:scheduledFor,status:'scheduled',assigned_by:userId,teaching_note:text(formData,'teaching_note')||null,updated_at:new Date().toISOString()},{onConflict:'group_id,scheduled_for'})
  if(error)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}/lessons`)
  revalidatePath(`/groups/${groupId}`)
  redirect(`/groups/${groupId}/lessons?assigned=1`)
}

export async function cancelGroupLessonAssignment(formData:FormData){
  const groupId=text(formData,'group_id'),assignmentId=text(formData,'assignment_id')
  if(!groupId||!assignmentId)redirect(`/groups/${groupId}/lessons`)
  const {supabase}=await leaderContext(groupId)
  const {error}=await supabase.from('group_lesson_assignments').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',assignmentId).eq('group_id',groupId)
  if(error)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}/lessons`)
  revalidatePath(`/groups/${groupId}`)
  redirect(`/groups/${groupId}/lessons?cancelled=1`)
}
