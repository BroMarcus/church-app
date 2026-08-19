'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function requireAdmin(churchId:string){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect('/')
  return {supabase,userId}
}

export async function reviewReportedMilestone(formData:FormData){
  const reportId=text(formData,'report_id')
  const churchId=text(formData,'church_id')
  const decision=text(formData,'decision')
  const memberUserId=text(formData,'member_user_id')||null
  if(!reportId||!churchId||!['verified','dismissed'].includes(decision))redirect('/church/milestone-review?error='+encodeURIComponent('Invalid milestone review.'))
  const {supabase,userId}=await requireAdmin(churchId)
  const {data:reported,error:reportedError}=await supabase.from('reported_milestones').select('id,church_id,milestone_type,occurred_on,status').eq('id',reportId).eq('church_id',churchId).single()
  if(reportedError||!reported)redirect('/church/milestone-review?error='+encodeURIComponent('Reported milestone not found.'))
  if(reported.status!=='pending')redirect('/church/milestone-review?error='+encodeURIComponent('This milestone has already been reviewed.'))

  if(decision==='verified'){
    if(!memberUserId)redirect('/church/milestone-review?error='+encodeURIComponent('Choose the member whose Journey should be updated.'))
    const {data:member}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',memberUserId).eq('status','active').single()
    if(!member)redirect('/church/milestone-review?error='+encodeURIComponent('That member is not active in this church.'))
    const {data:existing}=await supabase.from('member_milestones').select('id').eq('church_id',churchId).eq('user_id',memberUserId).maybeSingle()
    const milestoneUpdate=reported.milestone_type==='baptism'
      ? {baptized:true,baptism_date:reported.occurred_on||null,verified_by:userId,updated_at:new Date().toISOString()}
      : {holy_ghost_received:true,holy_ghost_date:reported.occurred_on||null,verified_by:userId,updated_at:new Date().toISOString()}
    const save=existing
      ? await supabase.from('member_milestones').update(milestoneUpdate).eq('id',existing.id)
      : await supabase.from('member_milestones').insert({church_id:churchId,user_id:memberUserId,...milestoneUpdate})
    if(save.error)redirect('/church/milestone-review?error='+encodeURIComponent(save.error.message))
  }

  const {error}=await supabase.from('reported_milestones').update({status:decision,member_user_id:memberUserId,verified_by:userId,verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',reportId)
  if(error)redirect('/church/milestone-review?error='+encodeURIComponent(error.message))
  revalidatePath('/church/milestone-review');revalidatePath('/church/analytics');revalidatePath('/church');
  if(memberUserId)revalidatePath(`/church/members/${memberUserId}`)
  redirect('/church/milestone-review?reviewed=1')
}
