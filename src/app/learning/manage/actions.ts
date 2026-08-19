'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const num=(f:FormData,k:string,fallback:number)=>{const n=Number(f.get(k));return Number.isFinite(n)?n:fallback}

async function manager(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:customAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!customAccess)redirect('/learning')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createDraftAssessment(formData:FormData){
  const {supabase,userId,churchId}=await manager()
  const courseId=text(formData,'course_id'),title=text(formData,'title'),assessmentType=text(formData,'assessment_type')||'lesson_quiz'
  if(!courseId||!title)redirect('/learning/manage?error='+encodeURIComponent('Assessment title is required.'))
  if(!['lesson_quiz','knowledge_check','final_exam'].includes(assessmentType))redirect('/learning/manage?error='+encodeURIComponent('Invalid assessment type.'))
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect('/learning/manage?error='+encodeURIComponent('Course not found.'))
  const moduleId=text(formData,'module_id')||null
  if(moduleId){const {data:module}=await supabase.from('course_modules').select('id').eq('id',moduleId).eq('course_id',courseId).maybeSingle();if(!module)redirect('/learning/manage?error='+encodeURIComponent('Selected lesson does not belong to this course.'))}
  const maxRaw=text(formData,'max_attempts');const maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null
  const {error}=await supabase.from('course_assessments').insert({course_id:courseId,module_id:moduleId,title,assessment_type:assessmentType,passing_score:Math.max(0,Math.min(100,num(formData,'passing_score',80))),max_attempts:maxAttempts,required:formData.get('required')==='on',published:false,created_by:userId})
  if(error)redirect('/learning/manage?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/manage');revalidatePath(`/learning/${courseId}`)
  redirect(`/learning/manage?assessment=1#course-${courseId}`)
}

export async function setAssessmentPublished(formData:FormData){
  const {supabase,churchId}=await manager()
  const assessmentId=text(formData,'assessment_id'),publish=text(formData,'published')==='1'
  if(!assessmentId)redirect('/learning/manage?error='+encodeURIComponent('Assessment not found.'))
  const {data:assessment}=await supabase.from('course_assessments').select('id,course_id,courses!inner(church_id)').eq('id',assessmentId).maybeSingle()
  const course:any=Array.isArray((assessment as any)?.courses)?(assessment as any)?.courses?.[0]:(assessment as any)?.courses
  if(!assessment||course?.church_id!==churchId)redirect('/learning/manage?error='+encodeURIComponent('Assessment not found in this church.'))
  const {error}=await supabase.from('course_assessments').update({published:publish,updated_at:new Date().toISOString()}).eq('id',assessmentId)
  if(error)redirect('/learning/manage?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/manage');revalidatePath('/learning/manage/assessment-upgrades');revalidatePath('/learning');revalidatePath(`/learning/${assessment.course_id}`)
  redirect(`/learning/manage?assessment_status=1#course-${assessment.course_id}`)
}
