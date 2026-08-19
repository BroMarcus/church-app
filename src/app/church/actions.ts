'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const allowedRoles=['member','group_leader','ministry_leader','minister','pastor','church_admin'] as const
const allowedStatuses=['active','inactive','visitor','pending'] as const
const progressStatuses=['not_started','in_progress','completed','waived'] as const
const teacherStatuses=['not_ready','training','approved'] as const
const trainingStatuses=['not_complete','current','expired'] as const

const value=(formData:FormData,key:string)=>String(formData.get(key)??'')
const dateOrNull=(formData:FormData,key:string)=>{const v=value(formData,key);return v||null}
const boolOrNull=(formData:FormData,key:string)=>{const v=value(formData,key);return v==='yes'?true:v==='no'?false:null}
const langOf=(formData:FormData)=>value(formData,'lang')==='es'?'es':'en'

async function requireChurchAdmin(churchId:string){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  return {supabase,userId}
}

export async function updateMembership(formData:FormData){
  const membershipId=value(formData,'membership_id')
  const role=value(formData,'role')
  const status=value(formData,'status')
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  if(!membershipId||!allowedRoles.includes(role as (typeof allowedRoles)[number])||!allowedStatuses.includes(status as (typeof allowedStatuses)[number]))redirect('/church?error='+encodeURIComponent('Invalid member update.'))
  const {data:target}=await supabase.from('church_memberships').select('id,church_id,user_id').eq('id',membershipId).single()
  if(!target)redirect('/church?error='+encodeURIComponent('Member not found.'))
  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',target.church_id).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  if(target.user_id===userId&&(status!=='active'||!['pastor','church_admin'].includes(role)))redirect('/church?error='+encodeURIComponent('You cannot remove your own admin access.'))

  const {error}=await supabase.from('church_memberships').update({role,status}).eq('id',membershipId)
  if(error)redirect('/church?error='+encodeURIComponent(error.message))
  revalidatePath('/church');revalidatePath('/');redirect('/church?saved=1')
}

export async function updateMilestones(formData:FormData){
  const churchId=value(formData,'church_id')
  const targetUserId=value(formData,'user_id')
  const lang=langOf(formData)
  const base=`/church/members/${targetUserId}?lang=${lang}`
  if(!churchId||!targetUserId)redirect(`/church?lang=${lang}&error=`+encodeURIComponent(lang==='es'?'Falta el registro del miembro.':'Missing member record.'))
  const {supabase,userId}=await requireChurchAdmin(churchId)

  const firstSteps=value(formData,'first_steps_status')
  const salt=value(formData,'salt_series_status')
  const soul=value(formData,'soul_winning_status')
  const timothys=value(formData,'timothys_status')
  const school=value(formData,'school_pastors_status')
  const teacher=value(formData,'bible_study_teacher_status')
  const child=value(formData,'child_abuse_training_status')
  const harassment=value(formData,'sexual_harassment_training_status')
  if(!progressStatuses.includes(firstSteps as any)||!progressStatuses.includes(salt as any)||!progressStatuses.includes(soul as any)||!progressStatuses.includes(timothys as any)||!progressStatuses.includes(school as any)||!teacherStatuses.includes(teacher as any)||!trainingStatuses.includes(child as any)||!trainingStatuses.includes(harassment as any))redirect(`${base}&error=`+encodeURIComponent(lang==='es'?'Valor de hito inválido.':'Invalid milestone value.'))

  const payload={
    holy_ghost_received:boolOrNull(formData,'holy_ghost_received'),holy_ghost_date:dateOrNull(formData,'holy_ghost_date'),
    baptized:boolOrNull(formData,'baptized'),baptism_date:dateOrNull(formData,'baptism_date'),
    first_steps_status:firstSteps,first_steps_completed_at:dateOrNull(formData,'first_steps_completed_at'),
    salt_series_status:salt,salt_series_completed_at:dateOrNull(formData,'salt_series_completed_at'),
    soul_winning_status:soul,soul_winning_completed_at:dateOrNull(formData,'soul_winning_completed_at'),
    bible_study_teacher_status:teacher,
    timothys_status:timothys,timothys_completed_at:dateOrNull(formData,'timothys_completed_at'),
    school_pastors_status:school,school_pastors_completed_at:dateOrNull(formData,'school_pastors_completed_at'),
    child_abuse_training_status:child,child_abuse_completed_at:dateOrNull(formData,'child_abuse_completed_at'),child_abuse_expires_at:dateOrNull(formData,'child_abuse_expires_at'),
    sexual_harassment_training_status:harassment,sexual_harassment_completed_at:dateOrNull(formData,'sexual_harassment_completed_at'),sexual_harassment_expires_at:dateOrNull(formData,'sexual_harassment_expires_at'),
    covenant_current:boolOrNull(formData,'covenant_current')??false,covenant_signed_at:dateOrNull(formData,'covenant_signed_at'),verified_by:userId,updated_at:new Date().toISOString()
  }
  const {error}=await supabase.from('member_milestones').update(payload).eq('church_id',churchId).eq('user_id',targetUserId)
  if(error)redirect(`${base}&error=`+encodeURIComponent(error.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/church');redirect(`${base}&saved=1`)
}
