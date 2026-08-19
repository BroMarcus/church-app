'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const courseUrl=(courseId:string,lang:'en'|'es',extra='')=>`/learning/${courseId}${lang==='es'?'?lang=es'+(extra?`&${extra}`:''):extra?`?${extra}`:''}`
const learningUrl=(lang:'en'|'es',message?:string)=>`/learning?lang=${lang}${message?`&error=${encodeURIComponent(message)}`:''}`
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function startCourse(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id')
  if(!courseId)redirect('/learning?error='+encodeURIComponent('Course not found.'))
  const {data:course}=await supabase.from('courses').select('id,church_id,published,language_code').eq('id',courseId).single()
  const lang: 'en'|'es'=course?.language_code==='es'?'es':'en'
  if(!course?.published)redirect(learningUrl(lang,lang==='es'?'Este curso todavía no está disponible.':'This course is not available yet.'))
  const {data:membership}=course.church_id?await supabase.from('church_memberships').select('role').eq('church_id',course.church_id).eq('user_id',userId).eq('status','active').single():{data:null as any}
  if(course.church_id&&!membership)redirect(learningUrl(lang,lang==='es'?'No tienes acceso activo a esta iglesia.':'You do not have active access to this church.'))
  const {data:reqs}=await supabase.from('course_prerequisites').select('prerequisite_type,required_course_id,milestone_key,required_value,allowed_roles,display_text,hard_block').eq('course_id',courseId)
  let milestones:any={}
  if(course.church_id&&(reqs??[]).some((r:any)=>r.prerequisite_type==='milestone')){
    const result=await supabase.from('member_milestones').select('*').eq('church_id',course.church_id).eq('user_id',userId).maybeSingle();milestones=result.data??{}
  }
  const requiredCourseIds=(reqs??[]).filter((r:any)=>r.prerequisite_type==='course'&&r.required_course_id).map((r:any)=>r.required_course_id)
  const completedCourses=new Set<string>()
  if(requiredCourseIds.length){const result=await supabase.from('course_enrollments').select('course_id').eq('user_id',userId).eq('credential_earned',true).in('course_id',requiredCourseIds);for(const r of result.data??[])completedCourses.add(r.course_id)}
  const missing=(reqs??[]).filter((r:any)=>{if(!r.hard_block)return false;if(r.prerequisite_type==='course')return !completedCourses.has(r.required_course_id);if(r.prerequisite_type==='role')return !(r.allowed_roles??[]).includes(membership?.role);if(r.prerequisite_type==='milestone')return String(milestones?.[r.milestone_key]??'')!==String(r.required_value??'');return false})
  if(missing.length){
    const details=missing.map((r:any)=>r.display_text).join(', ')
    redirect(learningUrl(lang,lang==='es'?`Completa primero este requisito: ${details}`:`Complete prerequisite first: ${details}`))
  }

  const {error}=await supabase.from('course_enrollments').upsert({course_id:courseId,user_id:userId,progress:0,credential_earned:false,updated_at:new Date().toISOString()},{onConflict:'course_id,user_id',ignoreDuplicates:true})
  if(error)redirect(learningUrl(lang,lang==='es'?'No pudimos comenzar el curso. Inténtalo otra vez.':'We could not start the course. Please try again.'))
  revalidatePath('/learning');redirect(courseUrl(courseId,lang))
}

export async function setModuleComplete(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),complete=text(formData,'complete')==='1';const now=new Date().toISOString()
  if(!courseId||!moduleId)redirect('/learning?error='+encodeURIComponent('Lesson not found.'))

  const [{data:course},{data:module}]=await Promise.all([
    supabase.from('courses').select('id,church_id,published,language_code').eq('id',courseId).maybeSingle(),
    supabase.from('course_modules').select('id,course_id').eq('id',moduleId).maybeSingle()
  ])
  const lang: 'en'|'es'=course?.language_code==='es'?'es':'en'
  if(!course?.published||module?.course_id!==courseId)redirect(learningUrl(lang,lang==='es'?'No encontramos esta lección en el curso.':'We could not find this lesson in the course.'))
  if(course.church_id){
    const {data:membership}=await supabase.from('church_memberships').select('user_id').eq('church_id',course.church_id).eq('user_id',userId).eq('status','active').maybeSingle()
    if(!membership)redirect(learningUrl(lang,lang==='es'?'No tienes acceso activo a esta iglesia.':'You do not have active access to this church.'))
  }
  const {data:enrollment}=await supabase.from('course_enrollments').select('course_id').eq('course_id',courseId).eq('user_id',userId).maybeSingle()
  if(!enrollment)redirect(courseUrl(courseId,lang,'error='+encodeURIComponent(lang==='es'?'Comienza el curso antes de guardar el progreso.':'Start the course before saving lesson progress.')))

  const {error}=await supabase.from('course_module_progress').upsert({user_id:userId,course_id:courseId,module_id:moduleId,completed:complete,completed_at:complete?now:null,updated_at:now},{onConflict:'user_id,module_id'})
  if(error)redirect(courseUrl(courseId,lang,'error='+encodeURIComponent(lang==='es'?'No pudimos guardar tu progreso. Inténtalo otra vez.':'We could not save your progress. Please try again.')))
  const {error:refreshError}=await supabase.rpc('refresh_my_course_completion',{p_course_id:courseId})
  if(refreshError)redirect(courseUrl(courseId,lang,'error='+encodeURIComponent(lang==='es'?'La lección se guardó, pero no pudimos actualizar el progreso total. Vuelve a abrir el curso.':'The lesson saved, but total course progress could not refresh. Reopen the course and try again.')))
  revalidatePath(`/learning/${courseId}`);revalidatePath('/learning');redirect(courseUrl(courseId,lang,'saved=1'))
}
