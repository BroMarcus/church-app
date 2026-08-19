'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const score=(f:FormData,k:string)=>{const n=Number(f.get(k));return Number.isInteger(n)&&n>=1&&n<=5?n:null}
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const recommendations=['needs_practice','partner_ready','independent_ready','approved'] as const

export async function saveBibleStudyPracticum(formData:FormData){
  const churchId=text(formData,'church_id')
  const traineeId=text(formData,'trainee_user_id')
  const lang=text(formData,'lang')==='es'?'es':'en'
  const base=`/church/members/${traineeId}?lang=${lang}`
  if(!churchId||!traineeId)redirect(`/church?lang=${lang}&error=`+encodeURIComponent(lang==='es'?'Falta el registro del estudiante.':'Missing trainee record.'))
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const evaluatorId=claims?.claims?.sub
  if(!evaluatorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',evaluatorId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')

  const fields=['preparation','scripture_navigation','biblical_accuracy','clarity','listening','stays_on_topic','humility_respect','checks_understanding','follow_up_readiness'] as const
  const scores=Object.fromEntries(fields.map(k=>[k,score(formData,k)])) as Record<(typeof fields)[number],number|null>
  if(Object.values(scores).some(v=>v==null))redirect(`${base}&error=`+encodeURIComponent(lang==='es'?'Cada categoría práctica necesita un puntaje del 1 al 5.':'Every practicum category needs a score from 1 to 5.'))
  const recommendation=text(formData,'recommendation') as (typeof recommendations)[number]
  if(!recommendations.includes(recommendation))redirect(`${base}&error=`+encodeURIComponent(lang==='es'?'Recomendación de preparación inválida.':'Invalid readiness recommendation.'))

  const {error}=await supabase.from('bible_study_practicums').insert({church_id:churchId,trainee_user_id:traineeId,evaluator_user_id:evaluatorId,language_code:text(formData,'language_code')==='es'?'es':'en',study_lesson:text(formData,'study_lesson')||null,...scores,recommendation,notes:text(formData,'notes')||null})
  if(error)redirect(`${base}&error=`+encodeURIComponent(error.message))

  const milestoneStatus=recommendation==='approved'?'approved':'training'
  await supabase.from('member_milestones').update({bible_study_teacher_status:milestoneStatus,verified_by:evaluatorId,updated_at:new Date().toISOString()}).eq('church_id',churchId).eq('user_id',traineeId)
  revalidatePath(`/church/members/${traineeId}`)
  revalidatePath('/church')
  redirect(`${base}&practicum=1`)
}
