'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const num=(f:FormData,k:string,fallback:number)=>{const n=Number(f.get(k));return Number.isFinite(n)?n:fallback}
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'course'

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
  const audience=text(formData,'audience_level')||'general'
  const translationKey=text(formData,'translation_key')||null
  const {error}=await supabase.from('courses').insert({church_id:churchId,title,slug,description:text(formData,'description')||null,category:text(formData,'category')||'discipleship',estimated_minutes:num(formData,'estimated_minutes',0)||null,passing_score:Math.max(0,Math.min(100,num(formData,'passing_score',80))),badge_name:text(formData,'badge_name')||null,published:false,created_by:userId,language_code:languageCode,audience_level:audience,translation_key:translationKey})
  if(error)redirect('/learning/admin?error='+encodeURIComponent(error.message))
  revalidatePath('/learning/admin');redirect('/learning/admin?created=1')
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
