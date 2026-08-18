'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function startCourse(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id')
  if(!courseId)redirect('/learning?error='+encodeURIComponent('Course not found.'))
  const {data:course}=await supabase.from('courses').select('id,church_id,published').eq('id',courseId).single()
  if(!course?.published)redirect('/learning?error='+encodeURIComponent('This course is not available yet.'))
  const {data:membership}=course.church_id?await supabase.from('church_memberships').select('role').eq('church_id',course.church_id).eq('user_id',userId).eq('status','active').single():{data:null as any}
  if(course.church_id&&!membership)redirect('/learning?error='+encodeURIComponent('You are not a member of this church.'))
  const {data:reqs}=await supabase.from('course_prerequisites').select('prerequisite_type,required_course_id,milestone_key,required_value,allowed_roles,display_text,hard_block').eq('course_id',courseId)
  let milestones:any={}
  if(course.church_id&&(reqs??[]).some((r:any)=>r.prerequisite_type==='milestone')){
    const result=await supabase.from('member_milestones').select('*').eq('church_id',course.church_id).eq('user_id',userId).maybeSingle();milestones=result.data??{}
  }
  const requiredCourseIds=(reqs??[]).filter((r:any)=>r.prerequisite_type==='course'&&r.required_course_id).map((r:any)=>r.required_course_id)
  const completedCourses=new Set<string>()
  if(requiredCourseIds.length){const result=await supabase.from('course_enrollments').select('course_id').eq('user_id',userId).eq('credential_earned',true).in('course_id',requiredCourseIds);for(const r of result.data??[])completedCourses.add(r.course_id)}
  const missing=(reqs??[]).filter((r:any)=>{if(!r.hard_block)return false;if(r.prerequisite_type==='course')return !completedCourses.has(r.required_course_id);if(r.prerequisite_type==='role')return !(r.allowed_roles??[]).includes(membership?.role);if(r.prerequisite_type==='milestone')return String(milestones?.[r.milestone_key]??'')!==String(r.required_value??'');return false})
  if(missing.length)redirect('/learning?error='+encodeURIComponent('Complete prerequisite first: '+missing.map((r:any)=>r.display_text).join(', ')))

  const {error}=await supabase.from('course_enrollments').upsert({course_id:courseId,user_id:userId,progress:0,credential_earned:false,updated_at:new Date().toISOString()},{onConflict:'course_id,user_id',ignoreDuplicates:true})
  if(error)redirect('/learning?error='+encodeURIComponent(error.message))
  revalidatePath('/learning');redirect(`/learning/${courseId}`)
}

export async function setModuleComplete(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),complete=text(formData,'complete')==='1';const now=new Date().toISOString()
  const {error}=await supabase.from('course_module_progress').upsert({user_id:userId,course_id:courseId,module_id:moduleId,completed:complete,completed_at:complete?now:null,updated_at:now},{onConflict:'user_id,module_id'})
  if(error)redirect(`/learning/${courseId}?error=`+encodeURIComponent(error.message))
  const {error:refreshError}=await supabase.rpc('refresh_my_course_completion',{p_course_id:courseId})
  if(refreshError)redirect(`/learning/${courseId}?error=`+encodeURIComponent(refreshError.message))
  revalidatePath(`/learning/${courseId}`);revalidatePath('/learning');redirect(`/learning/${courseId}?saved=1`)
}
