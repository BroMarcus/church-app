'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>
type Actor={userId:string;churchId:string;canLearning:boolean;canCalendar:boolean}
type JsonObject=Record<string,unknown>

const learningRoles=new Set(['minister','pastor','church_admin'])
const calendarRoles=new Set(['ministry_leader','minister','pastor','church_admin'])
const audiences=new Set(['new_convert','member','teacher_training','leadership','general'])
const stages=new Set(['new_convert','foundation','outreach','teaching','leadership','specialized'])
const assessmentTypes=new Set(['lesson_quiz','knowledge_check','final_exam'])
const questionTypes=new Set(['multiple_choice','true_false','multi_select'])
const eventTypes=new Set(['church','group','ministry','special_event','fundraiser'])
const sessionStatuses=new Set(['scheduled','completed','cancelled'])
const isoDate=/^\d{4}-\d{2}-\d{2}$/

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const checked=(formData:FormData,key:string)=>formData.get(key)==='on'
const integer=(formData:FormData,key:string,fallback:number)=>{const value=Number.parseInt(text(formData,key),10);return Number.isFinite(value)?value:fallback}
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const safe=(lang:string,en:string,es:string)=>lang==='es'?es:en
const contentUrl=(lang:string,section:string,extra='')=>`/content?lang=${lang}&section=${section}${extra}`
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'course'
const isRecord=(value:unknown):value is JsonObject=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)

async function actor(lang:string):Promise<{supabase:SupabaseServerClient;actor:Actor}>{
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [learningPermission,calendarPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_calendar'})
  ])
  return {supabase,actor:{userId,churchId:membership.church_id,canLearning:learningRoles.has(membership.role)||Boolean(learningPermission.data),canCalendar:calendarRoles.has(membership.role)||Boolean(calendarPermission.data)}}
}

async function learningManager(lang:string){
  const value=await actor(lang)
  if(!value.actor.canLearning)redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'You do not have curriculum editing access.','No tienes acceso para editar currículo.'))))
  return value
}

async function calendarManager(lang:string){
  const value=await actor(lang)
  if(!value.actor.canCalendar)redirect(contentUrl(lang,'lessons','&error='+encodeURIComponent(safe(lang,'You do not have calendar editing access.','No tienes acceso para editar el calendario.'))))
  return value
}

async function requireCourse(supabase:SupabaseServerClient,churchId:string,courseId:string){
  const {data}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',churchId).maybeSingle()
  return Boolean(data)
}

async function ownedModuleIds(supabase:SupabaseServerClient,courseId:string,formData:FormData){
  const requested=Array.from(new Set(formData.getAll('module_ids').map(value=>String(value).trim()).filter(Boolean)))
  if(!requested.length)return [] as string[]
  const {data}=await supabase.from('course_modules').select('id').eq('course_id',courseId).in('id',requested)
  return (data??[]).map(row=>String(row.id))
}

async function localToUtc(supabase:SupabaseServerClient,churchId:string,value:string){
  if(!value)return null
  const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value})
  if(error||typeof data!=='string')throw new Error('Invalid local date/time')
  return data
}

function cleanUrl(value:string){
  if(!value)return null
  if(!/^https?:\/\//i.test(value))throw new Error('Invalid URL')
  return value
}

function parseQuestion(formData:FormData,allowUnchangedAnswer:boolean){
  const questionType=text(formData,'question_type')||'multiple_choice'
  if(!questionTypes.has(questionType))throw new Error('Invalid question type')
  const rawAnswer=text(formData,'correct_answer')
  let options:unknown=[]
  let correctAnswer:unknown=null
  if(questionType==='true_false'){
    options=['true','false']
    if(rawAnswer)correctAnswer=rawAnswer.toLowerCase()==='false'?'false':'true'
  }else{
    options=text(formData,'options').split('\n').map(value=>value.trim()).filter(Boolean).map((label,index)=>({value:String(index+1),label}))
    if(rawAnswer)correctAnswer=questionType==='multi_select'?rawAnswer.split(',').map(value=>value.trim()).filter(Boolean).sort():rawAnswer
  }
  if(!allowUnchangedAnswer&&correctAnswer===null)throw new Error('Correct answer is required')
  return {questionType,options,correctAnswer}
}

function refreshLearning(courseId?:string){
  revalidatePath('/content');revalidatePath('/learning');revalidatePath('/learning/manage');revalidatePath('/learning/admin');if(courseId)revalidatePath(`/learning/${courseId}`)
}
function refreshCalendar(){revalidatePath('/content');revalidatePath('/calendar');revalidatePath('/calendar/my');revalidatePath('/');revalidatePath('/today')}

export async function createContentCourse(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),title=text(formData,'title')
  if(title.length<2)redirect(contentUrl(lang,'courses','&error='+encodeURIComponent(safe(lang,'Course title is required.','Se requiere el título del curso.'))))
  const base=slugify(title)
  let slug=base
  const {data:existing}=await supabase.from('courses').select('id').eq('church_id',person.churchId).eq('slug',slug).maybeSingle()
  if(existing)slug=`${base}-${Date.now().toString().slice(-6)}`
  const audience=audiences.has(text(formData,'audience_level'))?text(formData,'audience_level'):'general'
  const stage=stages.has(text(formData,'pathway_stage'))?text(formData,'pathway_stage'):'foundation'
  const {error}=await supabase.from('courses').insert({church_id:person.churchId,title,slug,description:text(formData,'description')||null,category:text(formData,'category')||'discipleship',passing_score:Math.max(0,Math.min(100,integer(formData,'passing_score',80))),published:false,created_by:person.userId,language_code:text(formData,'language_code')==='es'?'es':'en',audience_level:audience,pathway_stage:stage,pathway_order:Math.max(0,integer(formData,'pathway_order',100)),curriculum_version:text(formData,'curriculum_version')||'1.0'})
  if(error){console.error('createContentCourse failed',{churchId:person.churchId,code:error.code,message:error.message});redirect(contentUrl(lang,'courses','&error='+encodeURIComponent(safe(lang,'We could not create that course.','No pudimos crear ese curso.'))))}
  refreshLearning();redirect(contentUrl(lang,'courses','&created=course'))
}

export async function updateContentCourse(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),courseId=text(formData,'course_id'),title=text(formData,'title')
  if(!courseId||title.length<2)redirect(contentUrl(lang,'courses','&error='+encodeURIComponent(safe(lang,'Course title is required.','Se requiere el título del curso.'))))
  const audience=audiences.has(text(formData,'audience_level'))?text(formData,'audience_level'):'general'
  const stage=stages.has(text(formData,'pathway_stage'))?text(formData,'pathway_stage'):'foundation'
  const {error}=await supabase.from('courses').update({title,description:text(formData,'description')||null,category:text(formData,'category')||'discipleship',passing_score:Math.max(0,Math.min(100,integer(formData,'passing_score',80))),language_code:text(formData,'language_code')==='es'?'es':'en',audience_level:audience,pathway_stage:stage,pathway_order:Math.max(0,integer(formData,'pathway_order',100)),curriculum_version:text(formData,'curriculum_version')||'1.0'}).eq('id',courseId).eq('church_id',person.churchId)
  if(error){console.error('updateContentCourse failed',{courseId,code:error.code,message:error.message});redirect(contentUrl(lang,'courses','&error='+encodeURIComponent(safe(lang,'We could not save that course.','No pudimos guardar ese curso.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'courses','&saved=course'))
}

export async function createContentLesson(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),courseId=text(formData,'course_id'),title=text(formData,'title')
  if(!courseId||title.length<2||!await requireCourse(supabase,person.churchId,courseId))redirect(contentUrl(lang,'lessons','&error='+encodeURIComponent(safe(lang,'Choose a course and enter a lesson title.','Escoge un curso e ingresa el título de la lección.'))))
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const content={summary:text(formData,'summary'),body:text(formData,'body')}
  const {error}=await supabase.from('course_modules').insert({course_id:courseId,position:Number(last?.position??0)+1,title,content})
  if(error){console.error('createContentLesson failed',{courseId,code:error.code,message:error.message});redirect(contentUrl(lang,'lessons','&error='+encodeURIComponent(safe(lang,'We could not create that lesson.','No pudimos crear esa lección.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'lessons','&created=lesson'))
}

export async function updateContentLesson(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),moduleId=text(formData,'module_id'),title=text(formData,'title')
  if(!moduleId||title.length<2)redirect(contentUrl(lang,'lessons'))
  const {data:module}=await supabase.from('course_modules').select('id,course_id,content').eq('id',moduleId).maybeSingle()
  if(!module||!await requireCourse(supabase,person.churchId,String(module.course_id)))redirect(contentUrl(lang,'lessons','&error='+encodeURIComponent(safe(lang,'Lesson not found.','No se encontró la lección.'))))
  const existingContent:JsonObject=isRecord(module.content)?module.content:{}
  const content={...existingContent,summary:text(formData,'summary'),body:text(formData,'body')}
  const {error}=await supabase.from('course_modules').update({title,content}).eq('id',moduleId).eq('course_id',module.course_id)
  if(error){console.error('updateContentLesson failed',{moduleId,code:error.code,message:error.message});redirect(contentUrl(lang,'lessons','&error='+encodeURIComponent(safe(lang,'We could not save that lesson.','No pudimos guardar esa lección.'))))}
  refreshLearning(String(module.course_id));redirect(contentUrl(lang,'lessons','&saved=lesson'))
}

export async function createContentClass(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),courseId=text(formData,'course_id'),title=text(formData,'title'),sessionDate=text(formData,'session_date')
  if(!courseId||title.length<2||!isoDate.test(sessionDate)||!await requireCourse(supabase,person.churchId,courseId))redirect(contentUrl(lang,'classes','&error='+encodeURIComponent(safe(lang,'Course, class name and date are required.','Se requieren curso, nombre de clase y fecha.'))))
  const moduleIds=await ownedModuleIds(supabase,courseId,formData)
  const {error}=await supabase.from('course_sessions').insert({course_id:courseId,church_id:person.churchId,session_date:sessionDate,starts_at:text(formData,'starts_at')||null,title,instructor_name:text(formData,'instructor_name')||null,module_ids:moduleIds,status:'scheduled',notes:text(formData,'notes')||null})
  if(error){console.error('createContentClass failed',{courseId,code:error.code,message:error.message});redirect(contentUrl(lang,'classes','&error='+encodeURIComponent(safe(lang,'We could not create that class session.','No pudimos crear esa sesión de clase.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'classes','&created=class'))
}

export async function updateContentClass(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),sessionId=text(formData,'session_id'),title=text(formData,'title'),sessionDate=text(formData,'session_date'),status=text(formData,'status')
  if(!sessionId||title.length<2||!isoDate.test(sessionDate)||!sessionStatuses.has(status))redirect(contentUrl(lang,'classes','&error='+encodeURIComponent(safe(lang,'Enter valid class details.','Ingresa información válida de la clase.'))))
  const {data:session}=await supabase.from('course_sessions').select('course_id').eq('id',sessionId).eq('church_id',person.churchId).maybeSingle()
  if(!session)redirect(contentUrl(lang,'classes','&error='+encodeURIComponent(safe(lang,'Class session not found.','No se encontró la sesión de clase.'))))
  const courseId=String(session.course_id),moduleIds=await ownedModuleIds(supabase,courseId,formData)
  const {error}=await supabase.from('course_sessions').update({session_date:sessionDate,starts_at:text(formData,'starts_at')||null,title,instructor_name:text(formData,'instructor_name')||null,module_ids:moduleIds,status,notes:text(formData,'notes')||null}).eq('id',sessionId).eq('church_id',person.churchId)
  if(error){console.error('updateContentClass failed',{sessionId,code:error.code,message:error.message});redirect(contentUrl(lang,'classes','&error='+encodeURIComponent(safe(lang,'We could not save that class session.','No pudimos guardar esa sesión de clase.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'classes','&saved=class'))
}

export async function createContentEvent(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await calendarManager(lang),title=text(formData,'title'),eventType=eventTypes.has(text(formData,'event_type'))?text(formData,'event_type'):'church'
  if(title.length<2)redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Event title is required.','Se requiere el título del evento.'))))
  let startsAt:string|null=null,endsAt:string|null=null,registrationUrl:string|null=null
  try{startsAt=await localToUtc(supabase,person.churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,person.churchId,text(formData,'ends_at'));registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(error:unknown){console.error('createContentEvent validation failed',{error});redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Check the event date, time and link.','Revisa la fecha, hora y enlace del evento.'))))}
  if(!startsAt||endsAt&&new Date(endsAt)<new Date(startsAt))redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Enter a valid start and end time.','Ingresa una hora de inicio y fin válidas.'))))
  const contactEmail=text(formData,'contact_email')||null
  if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Enter a valid contact email.','Ingresa un correo de contacto válido.'))))
  const basic=checked(formData,'basic_public_listing')
  const {error}=await supabase.from('events').insert({church_id:person.churchId,created_by:person.userId,title,description:basic?null:text(formData,'description')||null,starts_at:startsAt,ends_at:endsAt,location:text(formData,'location')||null,event_type:eventType,featured:basic?false:checked(formData,'featured'),audience_label:basic?null:text(formData,'audience_label')||null,registration_url:basic?null:registrationUrl,contact_name:text(formData,'contact_name')||null,contact_email:contactEmail,contact_phone:text(formData,'contact_phone')||null,basic_public_listing:basic})
  if(error){console.error('createContentEvent failed',{churchId:person.churchId,code:error.code,message:error.message});redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'We could not create that event.','No pudimos crear ese evento.'))))}
  refreshCalendar();redirect(contentUrl(lang,'events','&created=event'))
}

export async function updateContentEvent(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await calendarManager(lang),eventId=text(formData,'event_id'),title=text(formData,'title'),eventType=eventTypes.has(text(formData,'event_type'))?text(formData,'event_type'):'church'
  if(!eventId||title.length<2)redirect(contentUrl(lang,'events'))
  const {data:event}=await supabase.from('events').select('id').eq('id',eventId).eq('church_id',person.churchId).maybeSingle()
  if(!event)redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Event not found.','No se encontró el evento.'))))
  let startsAt:string|null=null,endsAt:string|null=null,registrationUrl:string|null=null
  try{startsAt=await localToUtc(supabase,person.churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,person.churchId,text(formData,'ends_at'));registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(error:unknown){console.error('updateContentEvent validation failed',{eventId,error});redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Check the event date, time and link.','Revisa la fecha, hora y enlace del evento.'))))}
  if(!startsAt||endsAt&&new Date(endsAt)<new Date(startsAt))redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Enter a valid start and end time.','Ingresa una hora de inicio y fin válidas.'))))
  const contactEmail=text(formData,'contact_email')||null
  if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'Enter a valid contact email.','Ingresa un correo de contacto válido.'))))
  const basic=checked(formData,'basic_public_listing')
  const {error}=await supabase.from('events').update({title,description:basic?null:text(formData,'description')||null,starts_at:startsAt,ends_at:endsAt,location:text(formData,'location')||null,event_type:eventType,featured:basic?false:checked(formData,'featured'),audience_label:basic?null:text(formData,'audience_label')||null,registration_url:basic?null:registrationUrl,contact_name:text(formData,'contact_name')||null,contact_email:contactEmail,contact_phone:text(formData,'contact_phone')||null,basic_public_listing:basic,updated_at:new Date().toISOString()}).eq('id',eventId).eq('church_id',person.churchId)
  if(error){console.error('updateContentEvent failed',{eventId,code:error.code,message:error.message});redirect(contentUrl(lang,'events','&error='+encodeURIComponent(safe(lang,'We could not save that event.','No pudimos guardar ese evento.'))))}
  refreshCalendar();redirect(contentUrl(lang,'events','&saved=event'))
}

export async function createContentAssessment(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),courseId=text(formData,'course_id'),title=text(formData,'title'),assessmentType=assessmentTypes.has(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  if(!courseId||title.length<2||!await requireCourse(supabase,person.churchId,courseId))redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'Choose a course and enter an assessment title.','Escoge un curso e ingresa el título de la evaluación.'))))
  const moduleId=text(formData,'module_id')||null
  if(moduleId){const {data:module}=await supabase.from('course_modules').select('id').eq('id',moduleId).eq('course_id',courseId).maybeSingle();if(!module)redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'That lesson is not in this course.','Esa lección no pertenece a este curso.'))))}
  const required=checked(formData,'required'),passing=Math.max(required||assessmentType==='final_exam'?80:0,Math.min(100,integer(formData,'passing_score',80)))
  const maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number.parseInt(maxRaw,10)||1):null
  const {error}=await supabase.from('course_assessments').insert({course_id:courseId,module_id:moduleId,title,assessment_type:assessmentType,passing_score:passing,max_attempts:maxAttempts,required,published:false,created_by:person.userId})
  if(error){console.error('createContentAssessment failed',{courseId,code:error.code,message:error.message});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'We could not create that assessment.','No pudimos crear esa evaluación.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'assessments','&created=assessment'))
}

export async function updateContentAssessment(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await learningManager(lang),assessmentId=text(formData,'assessment_id'),title=text(formData,'title'),assessmentType=assessmentTypes.has(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  if(!assessmentId||title.length<2)redirect(contentUrl(lang,'assessments'))
  const {data:assessment}=await supabase.from('course_assessments').select('id,course_id').eq('id',assessmentId).maybeSingle()
  if(!assessment||!await requireCourse(supabase,person.churchId,String(assessment.course_id)))redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'Assessment not found.','No se encontró la evaluación.'))))
  const courseId=String(assessment.course_id),moduleId=text(formData,'module_id')||null
  if(moduleId){const {data:module}=await supabase.from('course_modules').select('id').eq('id',moduleId).eq('course_id',courseId).maybeSingle();if(!module)redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'That lesson is not in this course.','Esa lección no pertenece a este curso.'))))}
  const required=checked(formData,'required'),passing=Math.max(required||assessmentType==='final_exam'?80:0,Math.min(100,integer(formData,'passing_score',80)))
  const maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number.parseInt(maxRaw,10)||1):null
  const {error}=await supabase.from('course_assessments').update({module_id:moduleId,title,assessment_type:assessmentType,passing_score:passing,max_attempts:maxAttempts,required,updated_at:new Date().toISOString()}).eq('id',assessmentId)
  if(error){console.error('updateContentAssessment failed',{assessmentId,code:error.code,message:error.message});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'We could not save that assessment.','No pudimos guardar esa evaluación.'))))}
  refreshLearning(courseId);redirect(contentUrl(lang,'assessments','&saved=assessment'))
}

export async function createContentQuestion(formData:FormData){
  const lang=langOf(formData),{supabase}=await learningManager(lang),assessmentId=text(formData,'assessment_id'),prompt=text(formData,'prompt')
  if(!assessmentId||prompt.length<2)redirect(contentUrl(lang,'assessments'))
  let parsed:ReturnType<typeof parseQuestion>
  try{parsed=parseQuestion(formData,false)}catch(error:unknown){console.error('createContentQuestion validation failed',{assessmentId,error});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'Enter a valid question and correct answer.','Ingresa una pregunta y respuesta correcta válidas.'))))}
  const {error}=await supabase.rpc('create_assessment_question',{p_assessment_id:assessmentId,p_question_type:parsed.questionType,p_prompt:prompt,p_options:parsed.options,p_correct_answer:parsed.correctAnswer,p_points:Math.max(1,integer(formData,'points',1)),p_explanation:text(formData,'explanation')||null})
  if(error){console.error('createContentQuestion failed',{assessmentId,code:error.code,message:error.message});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'We could not add that question.','No pudimos agregar esa pregunta.'))))}
  refreshLearning();redirect(contentUrl(lang,'assessments','&created=question'))
}

export async function updateContentQuestion(formData:FormData){
  const lang=langOf(formData),{supabase}=await learningManager(lang),questionId=text(formData,'question_id'),prompt=text(formData,'prompt')
  if(!questionId||prompt.length<2)redirect(contentUrl(lang,'assessments'))
  let parsed:ReturnType<typeof parseQuestion>
  try{parsed=parseQuestion(formData,true)}catch(error:unknown){console.error('updateContentQuestion validation failed',{questionId,error});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'Enter a valid question.','Ingresa una pregunta válida.'))))}
  const {error}=await supabase.rpc('update_assessment_question',{p_question_id:questionId,p_question_type:parsed.questionType,p_prompt:prompt,p_options:parsed.options,p_correct_answer:parsed.correctAnswer,p_points:Math.max(1,integer(formData,'points',1)),p_explanation:text(formData,'explanation')||null})
  if(error){console.error('updateContentQuestion failed',{questionId,code:error.code,message:error.message});redirect(contentUrl(lang,'assessments','&error='+encodeURIComponent(safe(lang,'We could not save that question.','No pudimos guardar esa pregunta.'))))}
  refreshLearning();redirect(contentUrl(lang,'assessments','&saved=question'))
}
