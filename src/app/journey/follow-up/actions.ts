'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,key:string)=>String(f.get(key)??'').trim()

export async function recordJourneyFollowup(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const trackingId=text(formData,'tracking_id'),nextDue=text(formData,'next_due_on')||null,lang=text(formData,'lang')==='es'?'es':'en'
  if(!trackingId)redirect(`/journey/follow-up?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Falta el seguimiento.':'Missing follow-up.')}`)
  const {data:tracking}=await supabase.from('member_journey_step_tracking').select('id,church_id,responsible_leader_id,step_id,discipleship_pathway_steps(completion_source)').eq('id',trackingId).maybeSingle()
  if(!tracking||tracking.responsible_leader_id!==actorId)redirect('/')
  const rawStep:any=Array.isArray((tracking as any).discipleship_pathway_steps)?(tracking as any).discipleship_pathway_steps[0]:(tracking as any).discipleship_pathway_steps
  const requestedStatus=text(formData,'manual_status')
  const update:any={last_activity_at:new Date().toISOString(),due_on:nextDue,updated_at:new Date().toISOString()}
  if(rawStep?.completion_source==='manual'){
    if(!['not_started','in_progress','completed','waived'].includes(requestedStatus))redirect(`/journey/follow-up?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Estado manual inválido.':'Invalid manual status.')}`)
    update.manual_status=requestedStatus
  }
  const {error}=await supabase.from('member_journey_step_tracking').update(update).eq('id',trackingId).eq('responsible_leader_id',actorId)
  if(error)redirect(`/journey/follow-up?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/journey/follow-up');revalidatePath('/today');revalidatePath('/church/leadership');revalidatePath('/church/health')
  redirect(`/journey/follow-up?lang=${lang}&saved=1`)
}
