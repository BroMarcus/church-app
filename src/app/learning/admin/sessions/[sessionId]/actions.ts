'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const allowed=new Set(['present','absent','excused','makeup_completed'])

export async function saveSessionAttendance(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const sessionId=String(formData.get('session_id')??'')
  const {data:session}=await supabase.from('course_sessions').select('id,course_id,church_id').eq('id',sessionId).single()
  if(!session)redirect('/learning')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',session.church_id).eq('user_id',actorId).eq('status','active').single()
  if(!membership||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')

  const rows:Array<Record<string,any>>=[]
  for(const [key,value] of formData.entries()){
    if(!key.startsWith('attendance:'))continue
    const userId=key.slice('attendance:'.length)
    const status=String(value)
    if(!userId||!allowed.has(status))continue
    rows.push({session_id:sessionId,user_id:userId,attendance_status:status,recorded_by:actorId,recorded_at:new Date().toISOString()})
  }
  if(rows.length){
    const {error}=await supabase.from('course_session_attendance').upsert(rows,{onConflict:'session_id,user_id'})
    if(error)redirect(`/learning/admin/sessions/${sessionId}?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath(`/learning/admin/sessions/${sessionId}`)
  revalidatePath(`/learning/${session.course_id}`)
  redirect(`/learning/admin/sessions/${sessionId}?saved=1`)
}
