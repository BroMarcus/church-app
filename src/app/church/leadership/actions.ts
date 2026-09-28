'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const faithfulness=['not_reviewed','developing','faithful','concern'] as const
const approval=['not_reviewed','approved','hold'] as const
const tracks=['friendship_group','ministry','teaching','general'] as const

export async function saveLeadershipReview(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const churchId=text(formData,'church_id'),userId=text(formData,'user_id'),track=text(formData,'leadership_track')||'friendship_group'
  const faith=text(formData,'faithfulness_status'),pastoral=text(formData,'pastoral_approval_status'),notes=text(formData,'notes')||null
  if(!churchId||!userId||!tracks.includes(track as any)||!faithfulness.includes(faith as any)||!approval.includes(pastoral as any))redirect('/church/leadership?error='+encodeURIComponent('Invalid leadership review.'))
  const {data:actor}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',actorId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const payload={church_id:churchId,user_id:userId,leadership_track:track,faithfulness_status:faith,pastoral_approval_status:pastoral,notes,reviewed_by:actorId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  const {error}=await supabase.from('leadership_development_reviews').upsert(payload,{onConflict:'church_id,user_id,leadership_track'})
  if(error)redirect('/church/leadership?error='+encodeURIComponent(error.message))
  revalidatePath('/church/leadership');revalidatePath('/church');revalidatePath('/church/analytics')
  redirect('/church/leadership?saved=1')
}


export async function saveJourneyFollowup(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const churchId=text(formData,'church_id'),userId=text(formData,'user_id'),stepId=text(formData,'step_id')
  const leaderId=text(formData,'responsible_leader_id')||null,dueOn=text(formData,'due_on')||null
  if(!churchId||!userId||!stepId)redirect('/church/leadership?error='+encodeURIComponent('Missing journey follow-up information.'))
  const {data:actor}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',actorId).eq('status','active').maybeSingle()
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_members'})
  if(!actor||(!['pastor','church_admin'].includes(actor.role)&&!custom))redirect('/')
  const [{data:target},{data:step}]=await Promise.all([
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle(),
    supabase.from('discipleship_pathway_steps').select('id').eq('church_id',churchId).eq('id',stepId).eq('active',true).maybeSingle()
  ])
  if(!target||!step)redirect('/church/leadership?error='+encodeURIComponent('Journey member or step was not found.'))
  if(leaderId){
    const {data:leader}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',leaderId).eq('status','active').maybeSingle()
    if(!leader)redirect('/church/leadership?error='+encodeURIComponent('Responsible leader must be active in this church.'))
  }
  const payload={church_id:churchId,user_id:userId,step_id:stepId,responsible_leader_id:leaderId,due_on:dueOn,created_by:actorId,last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  const {error}=await supabase.from('member_journey_step_tracking').upsert(payload,{onConflict:'church_id,user_id,step_id'})
  if(error)redirect('/church/leadership?error='+encodeURIComponent(error.message))
  revalidatePath('/church/leadership');revalidatePath('/church/health');revalidatePath('/journey');revalidatePath('/today')
  redirect('/church/leadership?saved=journey')
}
