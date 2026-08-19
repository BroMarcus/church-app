'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function manager(courseId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',membership.church_id).single()
  if(!course)redirect('/learning/admin')
  return {supabase,userId,churchId:membership.church_id}
}

const cleanLine=(v:string)=>v.replace(/^[-•*\s]+/,'').replace(/\s+/g,' ').trim()
const headingLike=(line:string)=>/^(lesson|chapter|unit|session|class|week|module)\s+\d+/i.test(line)||/^\d{1,2}[.)-]\s+\S+/.test(line)||(line.length>=5&&line.length<=80&&line===line.toUpperCase()&&/[A-Z]/.test(line))
function buildExtractionPlan(source:string){
  const lines=source.replace(/\r/g,'').split('\n').map(cleanLine).filter(Boolean)
  const sections:{title:string;body:string[]}[]=[]
  let current:{title:string;body:string[]}|null=null
  for(const raw of lines){
    const line=cleanLine(raw)
    if(headingLike(line)){
      if(current)sections.push(current)
      current={title:line.replace(/^(lesson|chapter|unit|session|class|week|module)\s+\d+\s*[:.\-]?\s*/i,'').replace(/^\d{1,2}[.)-]\s*/,''),body:[]}
    }else if(current)current.body.push(line)
  }
  if(current)sections.push(current)
  let lessons=sections.filter(s=>s.title).slice(0,40).map((s,i)=>({position:i+1,title:s.title.slice(0,140),summary:s.body.join(' ').slice(0,360)}))
  if(!lessons.length){
    lessons=lines.filter(l=>l.length>=5&&l.length<=100).slice(0,16).map((l,i)=>({position:i+1,title:l.slice(0,140),summary:''}))
  }
  return {version:1,method:'source_text_structure',lessons,assessment:{title:'Course Final Review',passing_score:80,required:true},notes:'Draft structure only. Leadership must compare every lesson and assessment against the approved source before publishing.'}
}

export async function addBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),title=text(formData,'title')
  if(!courseId||!title)return
  const {supabase}=await manager(courseId)
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  await supabase.from('course_modules').insert({course_id:courseId,position:(last?.position??0)+1,title,content:{summary:text(formData,'summary'),body:text(formData,'body')}})
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function createLessonShells(formData:FormData){
  const courseId=text(formData,'course_id')
  const raw=text(formData,'lesson_titles')
  if(!courseId||!raw)return
  const {supabase}=await manager(courseId)
  const titles=raw.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,40)
  if(!titles.length)return
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const start=(last?.position??0)+1
  await supabase.from('course_modules').insert(titles.map((title,i)=>({course_id:courseId,position:start+i,title,content:{summary:'Draft lesson shell — review source material and add teaching content before publishing.',body:''}})))
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function createCourseAssessmentShell(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,userId}=await manager(courseId)
  const title=text(formData,'title')||'Course Final Review'
  await supabase.from('course_assessments').insert({course_id:courseId,title,assessment_type:'final_exam',passing_score:Math.max(0,Math.min(100,Number(formData.get('passing_score')||80))),required:true,published:false,created_by:userId})
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function saveBuilderCourse(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,churchId}=await manager(courseId)
  await supabase.from('courses').update({title:text(formData,'title'),description:text(formData,'description')||null,badge_name:text(formData,'badge_name')||null,passing_score:Math.max(0,Math.min(100,Number(formData.get('passing_score')||80))),language_code:text(formData,'language_code')==='es'?'es':'en'}).eq('id',courseId).eq('church_id',churchId)
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
  revalidatePath('/learning/admin')
}

export async function saveSourceText(formData:FormData){
  const courseId=text(formData,'course_id'),sourceText=text(formData,'source_text').slice(0,200000)
  if(!courseId||!sourceText)return
  const {supabase,churchId}=await manager(courseId)
  await supabase.from('church_setup_uploads').update({source_text:sourceText,extraction_status:'source_ready'}).eq('church_id',churchId).eq('created_record_id',courseId)
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function generateExtractionPlan(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,churchId}=await manager(courseId)
  const {data:source}=await supabase.from('church_setup_uploads').select('id,source_text').eq('church_id',churchId).eq('created_record_id',courseId).maybeSingle()
  if(!source?.source_text)return
  const plan=buildExtractionPlan(source.source_text)
  await supabase.from('church_setup_uploads').update({extraction_plan:plan,extraction_status:'proposal_ready',extraction_reviewed_at:new Date().toISOString()}).eq('id',source.id)
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function applyExtractionPlan(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,userId,churchId}=await manager(courseId)
  const {data:source}=await supabase.from('church_setup_uploads').select('id,extraction_plan').eq('church_id',churchId).eq('created_record_id',courseId).maybeSingle()
  const plan:any=source?.extraction_plan
  if(!source||!plan?.lessons?.length)return
  const {count}=await supabase.from('course_modules').select('*',{count:'exact',head:true}).eq('course_id',courseId)
  if((count??0)>0)return
  const lessonRows=plan.lessons.slice(0,40).map((lesson:any,i:number)=>({course_id:courseId,position:i+1,title:String(lesson.title||`Lesson ${i+1}`).slice(0,140),content:{summary:String(lesson.summary||''),body:'',source_assisted:true}}))
  await supabase.from('course_modules').insert(lessonRows)
  const {count:assessmentCount}=await supabase.from('course_assessments').select('*',{count:'exact',head:true}).eq('course_id',courseId)
  if((assessmentCount??0)===0)await supabase.from('course_assessments').insert({course_id:courseId,title:plan.assessment?.title||'Course Final Review',assessment_type:'final_exam',passing_score:Number(plan.assessment?.passing_score||80),required:true,published:false,created_by:userId})
  await supabase.from('church_setup_uploads').update({extraction_status:'applied',extraction_applied_at:new Date().toISOString()}).eq('id',source.id)
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
  revalidatePath('/learning/admin')
}
