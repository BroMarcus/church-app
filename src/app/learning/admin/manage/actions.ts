'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const num=(f:FormData,k:string,fallback:number)=>{const n=Number(f.get(k));return Number.isFinite(n)?n:fallback}
const types=['lesson_quiz','knowledge_check','final_exam']

async function manager(courseId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!custom)redirect('/learning')
  const {data:course}=await supabase.from('courses').select('id,church_id').eq('id',courseId).eq('church_id',membership.church_id).maybeSingle()
  if(!course)redirect('/learning/admin/manage?error='+encodeURIComponent('Course not found.'))
  return{supabase,userId,churchId:membership.church_id}
}

const back=(courseId:string,extra='')=>`/learning/admin/manage/${courseId}${extra}`
const safeErr=(courseId:string,message:string)=>redirect(back(courseId,`?error=${encodeURIComponent(message)}`))
const parseSections=(raw:string,title:string)=>{
  const chunks=raw.split(/\n\s*---\s*\n/g).map(v=>v.trim()).filter(Boolean)
  if(!chunks.length)return[]
  return chunks.slice(0,20).map((chunk,i)=>{const lines=chunk.split(/\r?\n/);const first=String(lines.shift()??'').trim();const hasHeading=first.length<=120&&lines.length>0;return{heading:hasHeading?first:`${title} — Section ${i+1}`,body:hasHeading?lines.join('\n').trim():chunk}}).filter(s=>s.body)
}

export async function updateLesson(formData:FormData){
  const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),title=text(formData,'title')
  if(!courseId||!moduleId||!title)safeErr(courseId,'Course, lesson and title are required.')
  const {supabase}=await manager(courseId)
  const {data:module}=await supabase.from('course_modules').select('id,content').eq('id',moduleId).eq('course_id',courseId).maybeSingle()
  if(!module)safeErr(courseId,'Lesson not found.')
  const sections=parseSections(text(formData,'sections_text'),title)
  if(!sections.length)safeErr(courseId,'Add at least one lesson section with content.')
  const current:any=module!.content&&typeof module!.content==='object'?module!.content:{}
  const content={...current,summary:text(formData,'summary')||'',sections}
  delete content.body
  const {error}=await supabase.from('course_modules').update({title,content,position:Math.max(1,num(formData,'position',1))}).eq('id',moduleId).eq('course_id',courseId)
  if(error){console.error('updateLesson failed',{message:error.message});safeErr(courseId,'We could not save that lesson.')}
  revalidatePath(back(courseId));revalidatePath(`/learning/${courseId}`);revalidatePath(`/learning/${courseId}/lesson/${moduleId}`);redirect(back(courseId,'?lesson_saved=1'))
}

export async function deleteLessonSafely(formData:FormData){
  const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id')
  if(!courseId||!moduleId)safeErr(courseId,'Lesson not found.')
  const {supabase}=await manager(courseId)
  const [{count:progress},{count:assessments},{count:assets},{data:sessions}]=await Promise.all([
    supabase.from('course_module_progress').select('*',{count:'exact',head:true}).eq('module_id',moduleId),
    supabase.from('course_assessments').select('*',{count:'exact',head:true}).eq('module_id',moduleId),
    supabase.from('course_module_assets').select('*',{count:'exact',head:true}).eq('module_id',moduleId),
    supabase.from('course_sessions').select('id,module_ids').eq('course_id',courseId)
  ])
  const scheduled=(sessions??[]).some((s:any)=>Array.isArray(s.module_ids)&&s.module_ids.includes(moduleId))
  if((progress??0)>0||(assessments??0)>0||(assets??0)>0||scheduled)safeErr(courseId,'This lesson already has learner progress, assessments, files or scheduled class history. Keep it for the record and create a new lesson/version instead.')
  const {error}=await supabase.from('course_modules').delete().eq('id',moduleId).eq('course_id',courseId)
  if(error){console.error('deleteLessonSafely failed',{message:error.message});safeErr(courseId,'We could not delete that unused lesson.')}
  revalidatePath(back(courseId));revalidatePath(`/learning/${courseId}`);redirect(back(courseId,'?lesson_deleted=1'))
}

export async function createStructuredAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),title=text(formData,'title'),moduleId=text(formData,'module_id')||null,type=types.includes(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  if(!courseId||!title)safeErr(courseId,'Assessment title is required.')
  const {supabase,userId}=await manager(courseId)
  if(moduleId){const {data:owned}=await supabase.from('course_modules').select('id').eq('id',moduleId).eq('course_id',courseId).maybeSingle();if(!owned)safeErr(courseId,'That lesson does not belong to this course.')}
  const rawCheckpoint=text(formData,'checkpoint_section'),checkpoint=moduleId&&rawCheckpoint?Math.max(1,Number.parseInt(rawCheckpoint,10)||1):null
  const required=formData.get('required')==='on',passing=Math.max(required?80:0,Math.min(100,num(formData,'passing_score',80))),maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null
  const {error}=await supabase.from('course_assessments').insert({course_id:courseId,module_id:moduleId,title,assessment_type:type,passing_score:passing,max_attempts:maxAttempts,required,published:false,checkpoint_section:checkpoint,created_by:userId})
  if(error){console.error('createStructuredAssessment failed',{message:error.message});safeErr(courseId,'We could not create that assessment draft.')}
  revalidatePath(back(courseId));redirect(back(courseId,'?assessment_created=1'))
}

export async function updateAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id'),title=text(formData,'title'),moduleId=text(formData,'module_id')||null,type=types.includes(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  if(!courseId||!assessmentId||!title)safeErr(courseId,'Assessment details are incomplete.')
  const {supabase}=await manager(courseId)
  const {data:assessment}=await supabase.from('course_assessments').select('id').eq('id',assessmentId).eq('course_id',courseId).maybeSingle();if(!assessment)safeErr(courseId,'Assessment not found.')
  if(moduleId){const {data:owned}=await supabase.from('course_modules').select('id').eq('id',moduleId).eq('course_id',courseId).maybeSingle();if(!owned)safeErr(courseId,'That lesson does not belong to this course.')}
  const required=formData.get('required')==='on',passing=Math.max(required?80:0,Math.min(100,num(formData,'passing_score',80))),maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null,rawCheckpoint=text(formData,'checkpoint_section'),checkpoint=moduleId&&rawCheckpoint?Math.max(1,Number.parseInt(rawCheckpoint,10)||1):null,published=formData.get('published')==='on'
  const {error}=await supabase.from('course_assessments').update({title,module_id:moduleId,assessment_type:type,passing_score:passing,max_attempts:maxAttempts,required,published,checkpoint_section:checkpoint}).eq('id',assessmentId).eq('course_id',courseId)
  if(error){console.error('updateAssessment failed',{message:error.message});safeErr(courseId,published?'Publishing requires the correct number of questions and valid course readiness. Review the assessment and try again.':'We could not save that assessment.')}
  revalidatePath(back(courseId));revalidatePath(`/learning/${courseId}`);redirect(back(courseId,'?assessment_saved=1'))
}

export async function archiveOrDeleteAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id')
  if(!courseId||!assessmentId)safeErr(courseId,'Assessment not found.')
  const {supabase}=await manager(courseId)
  const {count:attempts}=await supabase.from('assessment_attempts').select('*',{count:'exact',head:true}).eq('assessment_id',assessmentId)
  if((attempts??0)>0){const {error}=await supabase.from('course_assessments').update({published:false,required:false,checkpoint_section:null}).eq('id',assessmentId).eq('course_id',courseId);if(error){console.error('archiveAssessment failed',{message:error.message});safeErr(courseId,'We could not archive that assessment.')}revalidatePath(back(courseId));revalidatePath(`/learning/${courseId}`);redirect(back(courseId,'?assessment_archived=1'))}
  const {error}=await supabase.from('course_assessments').delete().eq('id',assessmentId).eq('course_id',courseId)
  if(error){console.error('deleteAssessment failed',{message:error.message});safeErr(courseId,'We could not delete that unused assessment.')}
  revalidatePath(back(courseId));revalidatePath(`/learning/${courseId}`);redirect(back(courseId,'?assessment_deleted=1'))
}

function questionPayload(formData:FormData){
  const type=text(formData,'question_type')||'multiple_choice',prompt=text(formData,'prompt'),points=Math.max(1,num(formData,'points',1)),explanation=text(formData,'explanation')||null
  let options:any[]=[];let correct:any=null
  if(type==='true_false'){options=['true','false'];const raw=text(formData,'correct_answer').toLowerCase();correct=raw==='false'?'false':'true'}
  else{options=text(formData,'options').split('\n').map(v=>v.trim()).filter(Boolean).map((label,i)=>({value:String(i+1),label}));correct=type==='multi_select'?text(formData,'correct_answer').split(',').map(v=>v.trim()).filter(Boolean).sort():text(formData,'correct_answer')}
  return{type,prompt,points,explanation,options,correct}
}

export async function createQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id');if(!courseId||!assessmentId)safeErr(courseId,'Assessment not found.')
  const {supabase}=await manager(courseId);const p=questionPayload(formData);if(!p.prompt||p.correct==null)safeErr(courseId,'Question and correct answer are required.')
  const {data:owned}=await supabase.from('course_assessments').select('id').eq('id',assessmentId).eq('course_id',courseId).maybeSingle();if(!owned)safeErr(courseId,'Assessment not found.')
  const {error}=await supabase.rpc('create_assessment_question',{p_assessment_id:assessmentId,p_question_type:p.type,p_prompt:p.prompt,p_options:p.options,p_correct_answer:p.correct,p_points:p.points,p_explanation:p.explanation})
  if(error){console.error('createQuestion failed',{message:error.message});safeErr(courseId,'We could not add that question. Check the 5–10 checkpoint / 20–25 final-exam limits.')}
  revalidatePath(back(courseId));redirect(back(courseId,'?question_created=1'))
}

export async function updateQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),questionId=text(formData,'question_id');if(!courseId||!questionId)safeErr(courseId,'Question not found.')
  const {supabase}=await manager(courseId);const p=questionPayload(formData);if(!p.prompt||p.correct==null)safeErr(courseId,'Question and correct answer are required.')
  const {error}=await supabase.rpc('update_assessment_question',{p_question_id:questionId,p_question_type:p.type,p_prompt:p.prompt,p_options:p.options,p_correct_answer:p.correct,p_points:p.points,p_explanation:p.explanation})
  if(error){console.error('updateQuestion failed',{message:error.message});safeErr(courseId,error.message.includes('attempted')?'This assessment already has learner attempts. Create a new assessment version instead of rewriting history.':'We could not save that question.')}
  revalidatePath(back(courseId));redirect(back(courseId,'?question_saved=1'))
}

export async function deleteQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),questionId=text(formData,'question_id');if(!courseId||!questionId)safeErr(courseId,'Question not found.')
  const {supabase}=await manager(courseId);const {error}=await supabase.rpc('delete_assessment_question',{p_question_id:questionId})
  if(error){console.error('deleteQuestion failed',{message:error.message});safeErr(courseId,error.message.includes('attempted')?'This question is part of learner history and cannot be deleted. Create a new assessment version instead.':'We could not delete that question.')}
  revalidatePath(back(courseId));redirect(back(courseId,'?question_deleted=1'))
}
