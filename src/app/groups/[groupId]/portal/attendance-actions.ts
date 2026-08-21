'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const statuses=new Set(['on_time','late','missing'])
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function savePortalAttendance(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const groupId=text(formData,'group_id'),meetingDate=text(formData,'meeting_date')
  if(!uuid.test(groupId)||!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate))redirect('/groups')

  const {data:group}=await supabase.from('groups').select('id,church_id,leader_id,active,group_type').eq('id',groupId).maybeSingle()
  if(!group?.active||group.group_type!=='friendship')redirect('/groups')
  const [{data:churchMembership},{data:groupMembership}]=await Promise.all([
    supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  ])
  const canRecord=churchMembership?.status==='active'&&(
    ['pastor','church_admin'].includes(churchMembership.role)||group.leader_id===userId||['leader','assistant'].includes(groupMembership?.role??'')
  )
  if(!canRecord)redirect(`/groups/${groupId}/portal?tab=attendance&error=`+encodeURIComponent('Leader or assistant access is required to save attendance.'))

  const requested=Array.from(formData.entries())
    .filter(([key,value])=>key.startsWith('attendance_')&&typeof value==='string'&&statuses.has(value))
    .map(([key,value])=>({userId:key.slice('attendance_'.length),status:String(value)}))
    .filter(row=>uuid.test(row.userId))
  if(!requested.length)redirect(`/groups/${groupId}/portal?tab=attendance&error=`+encodeURIComponent('Mark at least one person before saving attendance.'))

  const requestedIds=Array.from(new Set(requested.map(row=>row.userId)))
  const {data:roster}=await supabase.from('group_memberships').select('user_id').eq('group_id',groupId).in('user_id',requestedIds)
  const rosterIds=new Set((roster??[]).map(row=>row.user_id))
  const now=new Date().toISOString()
  const rows=requested.filter(row=>rosterIds.has(row.userId)).map(row=>({
    group_id:groupId,user_id:row.userId,meeting_date:meetingDate,attendance_status:row.status,recorded_by:userId,updated_at:now
  }))
  if(!rows.length)redirect(`/groups/${groupId}/portal?tab=attendance&error=`+encodeURIComponent('No valid roster attendance was selected.'))

  const {error}=await supabase.from('group_attendance_drafts').upsert(rows,{onConflict:'group_id,user_id,meeting_date'})
  if(error){
    console.error('savePortalAttendance failed',{groupId,code:error.code,message:error.message})
    redirect(`/groups/${groupId}/portal?tab=attendance&error=`+encodeURIComponent('We could not save attendance. Please try again.'))
  }

  revalidatePath(`/groups/${groupId}/portal`)
  revalidatePath(`/groups/${groupId}/roster`)
  redirect(`/groups/${groupId}/portal?tab=attendance&attendance_saved=1`)
}
