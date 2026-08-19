'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const num=(f:FormData,k:string,fallback:number)=>{const n=Number(f.get(k));return Number.isFinite(n)?n:fallback}
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'course'
const audiences=['new_convert','member','teacher_training','leadership','general']
const stages=['new_convert','foundation','outreach','teaching','leadership','specialized']
const isoDate=/^\d{4}-\d{2}-\d{2}$/
const addDaysIso=(iso:string,days:number)=>{const [y,m,d]=iso.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d+days));return dt.toISOString().slice(0,10)}

async function manager(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createCourse(formData:FormData){
  const {supabase,userId,churchId}=await manager()
  const title=text(formData,'title')
  if(!title)redirect('/learning/admin?error='+encodeURIComponent('Course title is required.'))
  const base=slugify(text(formData,'slug')||title)
  let slug=base
  const {data:existing}=await supabase.from('courses').select('id').eq('church_id',churchId).eq('slug',slug).maybeSingle()
  if(existing)slug=`${base}-${Date.now().toString().slice(-6)}`
  const languageCode=text(formData,'language_code')==='es'?'es':'en'
  const audience=audiences.includes(text(formData,'audience_level'))?text(formData,'audience_level'):'general'
  const stage=stages.includes(text(formData,'pathway_stage'))?text(formData,'pathway_stage'):'foundation'
  const translationKey=text(formData,'translation_key')||null
  const {error}=await supabase.from('courses').insert({church_id:churchId,title,slug,description:text(formData,'description')||null,category:text(formData,'category')||'discipleship',estimated_minutes:num(formData,'estimated_minutes',0)||null,passing_score:Math.max(0,Math.min(100,num(formData,'passing_score',80))),badge_name:text(formData,'badge_name')||null,published:false,created_by:userId,language_code:languageCode,audience_level:audience,translation_key:translationKey,pathway_stage:stage,pathway_order:Math.max(0,num(formData,'pathway_order',100)),curriculum_version:text(formData,'curriculum_version')||'1.0',source_revision:text(formData,'source_revision')||null})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');redirect('/learning/admin?created=1')
}

export async function updateCourseSettings(formData:FormData){
  const {supabase,churchId}=await manager()
  const courseId=text(formData,'course_id')
  if(!courseId)redirect('/learning/admin?error='+encodeURIComponent('Course not found.'))
  const languageCode=text(formData,'language_code')==='es'?'es':'en'
  const audience=audiences.includes(text(formData,'audience_level'))?text(formData,'audience_level'):'general'
  const stage=stages.includes(text(formData,'pathway_stage'))?text(formData,'pathway_stage'):'foundation'
  const {error}=await supabase.from('courses').update({
    title:text(formData,'title'),description:text(formData,'description')||null,category:text(formData,'category')||'discipleship',estimated_minutes:num(formData,'estimated_minutes',0)||null,passing_score:Math.max(0,Math.min(100,num(formData,'passing_score',80))),badge_name:text(formData,'badge_name')||null,language_code:languageCode,audience_level:audience,translation_key:text(formData,'translation_key')||null,pathway_stage:stage,pathway_order:Math.max(0,num(formData,'pathway_order',100)),curriculum_version:text(formData,'curriculum_version')||'1.0',source_revision:text(formData,'source_revision')||null
  }).eq('id',courseId).eq('church_id',churchId)
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning');revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect('/learning/admin?settings=1')
}

export async function addLesson(formData:FormData){
  const {supabase,churchId}=await manager()
  const courseId=text(formData,'course_id');const title=text(formData,'title')
  if(!courseId||!title)redirect('/learning/admin?error='+encodeURIComponent('Course and lesson title are required.'))
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect('/learning/admin?error='+encodeURIComponent('Course not found.'))
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const position=(last?.position??0)+1
  const content={summary:text(formData,'summary')||'',body:text(formData,'body')||''}
  const {error}=await supabase.from('course_modules').insert({course_id:courseId,position,title,content})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect('/learning/admin?lesson=1')
}

export async function createCourseSession(formData:FormData){
  const {supabase,churchId}=await manager()
  const courseId=text(formData,'course_id')
  const title=text(formData,'title')
  const sessionDate=text(formData,'session_date')
  const startsAt=text(formData,'starts_at')||null
  const instructorName=text(formData,'instructor_name')||null
  const notes=text(formData,'notes')||null
  if(!courseId||!title||!isoDate.test(sessionDate))redirect('/learning/admin?error='+encodeURIComponent('Class name and valid class date are required.'))
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect('/learning/admin?error='+encodeURIComponent('Course not found.'))
  const requested=Array.from(new Set(formData.getAll('module_ids').map(v=>String(v).trim()).filter(Boolean)))
  let moduleIds:string[]=[]
  if(requested.length){
    const {data:owned}=await supabase.from('course_modules').select('id').eq('course_id',courseId).in('id',requested)
    moduleIds=(owned??[]).map((m:any)=>m.id)
  }
  const {error}=await supabase.from('course_sessions').insert({course_id:courseId,church_id:churchId,session_date:sessionDate,starts_at:startsAt,title,instructor_name:instructorName,module_ids:moduleIds,status:'scheduled',notes})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect(`/learning/admin?session=1#course-${courseId}`)
}

export async function createWeeklyCourseSeries(formData:FormData){
  const {supabase,churchId}=await manager()
  const courseId=text(formData,'course_id')
  const firstDate=text(formData,'first_date')
  const startsAt=text(formData,'starts_at')||null
  const instructorName=text(formData,'instructor_name')||null
  if(!courseId||!isoDate.test(firstDate))redirect('/learning/admin?error='+encodeURIComponent('A valid first class date is required.'))
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect('/learning/admin?error='+encodeURIComponent('Course not found.'))
  const {data:existing}=await supabase.from('course_sessions').select('id').eq('course_id',courseId).limit(1)
  if(existing?.length)redirect(`/learning/admin?error=${encodeURIComponent('This course already has classroom sessions. Add extra meetings individually instead of generating a duplicate series.')}#course-${courseId}`)
  const {data:modules,error:modulesError}=await supabase.from('course_modules').select('id,position,title').eq('course_id',courseId).order('position')
  if(modulesError)redirect('/learning/admin?error='+encodeURIComponent(modulesError.message))
  if(!modules?.length)redirect(`/learning/admin?error=${encodeURIComponent('Add course lessons before generating the weekly series.')}#course-${courseId}`)
  const skipDates=new Set(text(formData,'skip_dates').split(/[\n,;]+/).map(v=>v.trim()).filter(v=>isoDate.test(v)))
  let date=firstDate
  const rows=modules.map((module:any)=>{
    while(skipDates.has(date))date=addDaysIso(date,7)
    const row={course_id:courseId,church_id:churchId,session_date:date,starts_at:startsAt,title:`${module.position}. ${module.title}`,instructor_name:instructorName,module_ids:[module.id],status:'scheduled'}
    date=addDaysIso(date,7)
    return row
  })
  const {error}=await supabase.from('course_sessions').insert(rows)
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect(`/learning/admin?series=1#course-${courseId}`)
}

export async function toggleCoursePublished(formData:FormData){
  const {supabase,churchId}=await manager()
  const courseId=text(formData,'course_id');const published=text(formData,'published')==='1'
  const {error}=await supabase.from('courses').update({published}).eq('id',courseId).eq('church_id',churchId)
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning');revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect('/learning/admin?published=1')
}

export async function createAssessment(formData:FormData){
  const {supabase,userId,churchId}=await manager()
  const courseId=text(formData,'course_id');const title=text(formData,'title')
  if(!courseId||!title)redirect('/learning/admin?error='+encodeURIComponent('Assessment title is required.'))
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect('/learning/admin?error='+encodeURIComponent('Course not found.'))
  const moduleId=text(formData,'module_id')||null
  const maxRaw=text(formData,'max_attempts');const maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null
  const {error}=await supabase.from('course_assessments').insert({course_id:courseId,module_id:moduleId,title,assessment_type:text(formData,'assessment_type')||'lesson_quiz',passing_score:Math.max(0,Math.min(100,num(formData,'passing_score',80))),max_attempts:maxAttempts,required:formData.get('required')==='on',published:formData.get('published')==='on',created_by:userId})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');revalidatePath(`/learning/${courseId}`);redirect('/learning/admin?assessment=1')
}

export async function addQuestion(formData:FormData){
  const {supabase}=await manager()
  const assessmentId=text(formData,'assessment_id');const type=text(formData,'question_type')||'multiple_choice';const prompt=text(formData,'prompt')
  let options:any[]=[];let correct:any=null
  if(type==='true_false'){
    options=['true','false'];correct=text(formData,'correct_answer').toLowerCase()==='false'?'false':'true'
  }else{
    options=text(formData,'options').split('\n').map(v=>v.trim()).filter(Boolean).map((label,i)=>({value:String(i+1),label}))
    if(type==='multi_select')correct=text(formData,'correct_answer').split(',').map(v=>v.trim()).filter(Boolean).sort()
    else correct=text(formData,'correct_answer').trim()
  }
  if(!assessmentId||!prompt||correct==null)redirect('/learning/admin?error='+encodeURIComponent('Question and correct answer are required.'))
  const {error}=await supabase.rpc('create_assessment_question',{p_assessment_id:assessmentId,p_question_type:type,p_prompt:prompt,p_options:options,p_correct_answer:correct,p_points:Math.max(1,num(formData,'points',1)),p_explanation:text(formData,'explanation')||null})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');redirect('/learning/admin?question=1')
}
