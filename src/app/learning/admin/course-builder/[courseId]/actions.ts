'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const bool=(f:FormData,k:string)=>f.get(k)==='on'||f.get(k)==='1'||f.get(k)==='true'
const integer=(f:FormData,k:string,fallback:number)=>{const n=Number(f.get(k));return Number.isInteger(n)?n:fallback}
const lang=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const path=(courseId:string,language:'en'|'es',params?:Record<string,string>)=>{
  const q=new URLSearchParams()
  if(language==='es')q.set('lang','es')
  for(const [k,v] of Object.entries(params??{}))if(v)q.set(k,v)
  const query=q.toString()
  return `/learning/admin/course-builder/${courseId}${query?`?${query}`:''}`
}
const refresh=(courseId:string)=>{
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
  revalidatePath('/learning/admin')
  revalidatePath('/learning')
  revalidatePath(`/learning/${courseId}`)
}
const safeError=(courseId:string,language:'en'|'es',message?:string):never=>redirect(path(courseId,language,{error:message|| (language==='es'?'No pudimos guardar ese cambio. Nada se publicó.':'We could not save that change. Nothing was published.')}))
const success=(courseId:string,language:'en'|'es',message:string):never=>{refresh(courseId);redirect(path(courseId,language,{saved:message}))}

async function manager(courseId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:customLearningAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!customLearningAccess)redirect('/learning')
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
  if(!lessons.length)lessons=lines.filter(l=>l.length>=5&&l.length<=100).slice(0,16).map((l,i)=>({position:i+1,title:l.slice(0,140),summary:''}))
  return {version:1,method:'source_text_structure',lessons,assessment:{title:'Course Final Review',passing_score:80,required:true},notes:'Draft structure only. Leadership must compare every lesson and assessment against the approved source before publishing.'}
}

function parseQuestion(formData:FormData){
  const type=text(formData,'question_type')||'multiple_choice'
  const prompt=text(formData,'prompt')
  const rawCorrect=text(formData,'correct_answer')
  let options:any[]=[];let correct:any=null
  if(type==='true_false'){
    options=['true','false']
    correct=rawCorrect.toLowerCase()==='false'?'false':'true'
  }else{
    options=text(formData,'options').split('\n').map(v=>v.trim()).filter(Boolean).slice(0,12).map((label,i)=>({value:String(i+1),label}))
    correct=type==='multi_select'?rawCorrect.split(',').map(v=>v.trim()).filter(Boolean).sort():rawCorrect
  }
  return {type,prompt,options,correct,points:Math.max(1,integer(formData,'points',1)),explanation:text(formData,'explanation')||null}
}

export async function addBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),title=text(formData,'title'),language=lang(formData)
  if(!courseId||!title)safeError(courseId||'missing',language,language==='es'?'Escribe un título para la lección.':'Enter a lesson title.')
  const {supabase}=await manager(courseId)
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const {error}=await supabase.from('course_modules').insert({course_id:courseId,position:(last?.position??0)+1,title:title.slice(0,140),content:{summary:text(formData,'summary'),body:text(formData,'body')}})
  if(error){console.error('course builder add lesson failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Lección agregada.':'Lesson added.')
}

export async function updateBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),language=lang(formData)
  if(!courseId||!moduleId)safeError(courseId||'missing',language)
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('update_course_module_builder',{p_module_id:moduleId,p_title:text(formData,'title'),p_summary:text(formData,'summary'),p_body:text(formData,'body')})
  if(error){console.error('course builder update lesson failed',{courseId,moduleId,message:error.message});safeError(courseId,language,error.message.includes('learner history')?(language==='es'?'Esta lección ya tiene progreso de alumnos. Crea una nueva versión del curso para cambiar su contenido.':'This lesson already has learner history. Create a new course version to change its content.'):undefined)}
  success(courseId,language,language==='es'?'Lección actualizada.':'Lesson updated.')
}

export async function moveBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),language=lang(formData),direction=integer(formData,'direction',0)
  if(!courseId||!moduleId||![-1,1].includes(direction))safeError(courseId||'missing',language)
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('move_course_module_builder',{p_module_id:moduleId,p_direction:direction})
  if(error){console.error('course builder move lesson failed',{courseId,moduleId,message:error.message});safeError(courseId,language,error.message.includes('progress')?(language==='es'?'El orden está bloqueado porque ya existe progreso de alumnos.':'Lesson order is locked because learner progress already exists.'):undefined)}
  success(courseId,language,language==='es'?'Orden de lecciones actualizado.':'Lesson order updated.')
}

export async function deleteBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),language=lang(formData)
  if(text(formData,'confirm_delete')!=='yes')safeError(courseId,language,language==='es'?'Confirma la eliminación primero.':'Confirm deletion first.')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('delete_course_module_builder',{p_module_id:moduleId})
  if(error){console.error('course builder delete lesson failed',{courseId,moduleId,message:error.message});safeError(courseId,language,error.message.includes('learner')?(language==='es'?'No se puede borrar porque existe historial de alumnos.':'This lesson cannot be deleted because learner history exists.'):error.message.includes('classroom')?(language==='es'?'Desconecta esta lección de sus reuniones de clase antes de borrarla.':'Unlink this lesson from classroom sessions before deleting it.'):undefined)}
  success(courseId,language,language==='es'?'Lección eliminada.':'Lesson deleted.')
}

export async function createLessonShells(formData:FormData){
  const courseId=text(formData,'course_id'),raw=text(formData,'lesson_titles'),language=lang(formData)
  if(!courseId||!raw)safeError(courseId||'missing',language)
  const {supabase}=await manager(courseId)
  const titles=raw.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,40)
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const start=(last?.position??0)+1
  const {error}=await supabase.from('course_modules').insert(titles.map((title,i)=>({course_id:courseId,position:start+i,title:title.slice(0,140),content:{summary:'Draft lesson shell — review source material and add teaching content before publishing.',body:''}})))
  if(error){console.error('course builder create lesson shells failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Lecciones de borrador creadas.':'Draft lessons created.')
}

export async function createBuilderAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData),title=text(formData,'title')
  if(!courseId||!title)safeError(courseId||'missing',language,language==='es'?'Escribe un título para la prueba.':'Enter an assessment title.')
  const {supabase,userId}=await manager(courseId)
  const assessmentType=['lesson_quiz','knowledge_check','final_exam'].includes(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  const passing=Math.max(assessmentType==='final_exam'||bool(formData,'required')?80:0,Math.min(100,integer(formData,'passing_score',80)))
  const maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null
  const moduleId=text(formData,'module_id')||null
  const {error}=await supabase.from('course_assessments').insert({course_id:courseId,module_id:moduleId,title:title.slice(0,180),assessment_type:assessmentType,passing_score:passing,max_attempts:maxAttempts,required:bool(formData,'required'),published:false,created_by:userId})
  if(error){console.error('course builder create assessment failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Prueba creada como borrador.':'Assessment created as a draft.')
}

export async function createCourseAssessmentShell(formData:FormData){
  if(!formData.get('assessment_type'))formData.set('assessment_type','final_exam')
  if(!formData.get('required'))formData.set('required','on')
  return createBuilderAssessment(formData)
}

export async function updateBuilderAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id'),language=lang(formData)
  if(!courseId||!assessmentId)safeError(courseId||'missing',language)
  const {supabase}=await manager(courseId)
  const type=['lesson_quiz','knowledge_check','final_exam'].includes(text(formData,'assessment_type'))?text(formData,'assessment_type'):'lesson_quiz'
  const required=bool(formData,'required'),passing=Math.max(type==='final_exam'||required?80:0,Math.min(100,integer(formData,'passing_score',80)))
  const maxRaw=text(formData,'max_attempts'),maxAttempts=maxRaw?Math.max(1,Number(maxRaw)):null
  const {error}=await supabase.rpc('update_course_assessment_builder',{p_assessment_id:assessmentId,p_title:text(formData,'title'),p_module_id:text(formData,'module_id')||null,p_assessment_type:type,p_passing_score:passing,p_max_attempts:maxAttempts,p_required:required,p_published:bool(formData,'published')})
  if(error){console.error('course builder update assessment failed',{courseId,assessmentId,message:error.message});safeError(courseId,language,error.message.includes('learner attempts')?(language==='es'?'Esta prueba ya tiene intentos. Crea una nueva versión en vez de reescribirla.':'This assessment already has learner attempts. Create a new version instead of rewriting it.'):error.message.includes('questions')?(language==='es'?'La prueba todavía no cumple la cantidad requerida de preguntas para publicarse.':'This assessment does not yet meet the required question count for publishing.'):undefined)}
  success(courseId,language,language==='es'?'Prueba actualizada.':'Assessment updated.')
}

export async function deleteBuilderAssessment(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id'),language=lang(formData)
  if(text(formData,'confirm_delete')!=='yes')safeError(courseId,language,language==='es'?'Confirma la eliminación primero.':'Confirm deletion first.')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('delete_course_assessment_builder',{p_assessment_id:assessmentId})
  if(error){console.error('course builder delete assessment failed',{courseId,assessmentId,message:error.message});safeError(courseId,language,error.message.includes('attempt')?(language==='es'?'No se puede borrar porque existen intentos de alumnos.':'This assessment cannot be deleted because learner attempts exist.'):undefined)}
  success(courseId,language,language==='es'?'Prueba eliminada.':'Assessment deleted.')
}

export async function addBuilderQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),assessmentId=text(formData,'assessment_id'),language=lang(formData),q=parseQuestion(formData)
  if(!courseId||!assessmentId||!q.prompt||q.correct==null||q.correct==='')safeError(courseId||'missing',language,language==='es'?'La pregunta y la respuesta correcta son obligatorias.':'Question and correct answer are required.')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('create_assessment_question',{p_assessment_id:assessmentId,p_question_type:q.type,p_prompt:q.prompt,p_options:q.options,p_correct_answer:q.correct,p_points:q.points,p_explanation:q.explanation})
  if(error){console.error('course builder add question failed',{courseId,assessmentId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Pregunta agregada de forma segura.':'Question added securely.')
}

export async function updateBuilderQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),questionId=text(formData,'question_id'),language=lang(formData),q=parseQuestion(formData)
  if(!courseId||!questionId||!q.prompt||q.correct==null||q.correct==='')safeError(courseId||'missing',language,language==='es'?'Vuelve a escribir la respuesta correcta para guardar una pregunta editada.':'Re-enter the correct answer to save an edited question.')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('update_assessment_question',{p_question_id:questionId,p_question_type:q.type,p_prompt:q.prompt,p_options:q.options,p_correct_answer:q.correct,p_points:q.points,p_explanation:q.explanation})
  if(error){console.error('course builder update question failed',{courseId,questionId,message:error.message});safeError(courseId,language,error.message.includes('attempted')?(language==='es'?'La pregunta está bloqueada porque ya existen intentos de alumnos.':'This question is locked because learner attempts already exist.'):undefined)}
  success(courseId,language,language==='es'?'Pregunta actualizada.':'Question updated.')
}

export async function moveBuilderQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),questionId=text(formData,'question_id'),language=lang(formData),direction=integer(formData,'direction',0)
  if(!courseId||!questionId||![-1,1].includes(direction))safeError(courseId||'missing',language)
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('move_assessment_question_builder',{p_question_id:questionId,p_direction:direction})
  if(error){console.error('course builder move question failed',{courseId,questionId,message:error.message});safeError(courseId,language,error.message.includes('attempted')?(language==='es'?'El orden está bloqueado porque ya existen intentos.':'Question order is locked because attempts already exist.'):undefined)}
  success(courseId,language,language==='es'?'Orden de preguntas actualizado.':'Question order updated.')
}

export async function deleteBuilderQuestion(formData:FormData){
  const courseId=text(formData,'course_id'),questionId=text(formData,'question_id'),language=lang(formData)
  if(text(formData,'confirm_delete')!=='yes')safeError(courseId,language,language==='es'?'Confirma la eliminación primero.':'Confirm deletion first.')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('delete_assessment_question',{p_question_id:questionId})
  if(error){console.error('course builder delete question failed',{courseId,questionId,message:error.message});safeError(courseId,language,error.message.includes('attempted')?(language==='es'?'No se puede borrar porque ya existen intentos.':'This question cannot be deleted because attempts already exist.'):undefined)}
  success(courseId,language,language==='es'?'Pregunta eliminada.':'Question deleted.')
}

export async function saveBuilderCourse(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData)
  if(!courseId)safeError('missing',language)
  const {supabase,churchId}=await manager(courseId)
  const {error}=await supabase.from('courses').update({title:text(formData,'title').slice(0,180),description:text(formData,'description')||null,badge_name:text(formData,'badge_name')||null,passing_score:Math.max(80,Math.min(100,integer(formData,'passing_score',80))),language_code:text(formData,'language_code')==='es'?'es':'en'}).eq('id',courseId).eq('church_id',churchId)
  if(error){console.error('course builder save course failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Curso guardado.':'Course saved.')
}

export async function setBuilderCoursePublished(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData),published=bool(formData,'published')
  const {supabase,churchId}=await manager(courseId)
  const {data:course}=await supabase.from('courses').select('archived_at').eq('id',courseId).eq('church_id',churchId).single()
  if(published&&course?.archived_at)safeError(courseId,language,language==='es'?'Restaura el curso antes de publicarlo.':'Restore the course before publishing it.')
  const {error}=await supabase.from('courses').update({published}).eq('id',courseId).eq('church_id',churchId)
  if(error){console.error('course builder publish failed',{courseId,message:error.message});safeError(courseId,language,language==='es'?'El curso todavía no cumple todos los requisitos de publicación. Revisa lecciones, pruebas y cantidades de preguntas.':'The course is not ready to publish yet. Review lessons, assessments, and required question counts.')}
  success(courseId,language,published?(language==='es'?'Curso publicado.':'Course published.'):(language==='es'?'Curso ocultado de los miembros.':'Course unpublished.'))
}

export async function setBuilderCourseArchived(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData),archived=bool(formData,'archived')
  const {supabase}=await manager(courseId)
  const {error}=await supabase.rpc('set_course_archived_builder',{p_course_id:courseId,p_archived:archived})
  if(error){console.error('course builder archive failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,archived?(language==='es'?'Curso archivado y ocultado.':'Course archived and unpublished.'):(language==='es'?'Curso restaurado como borrador.':'Course restored as a draft.'))
}

export async function saveSourceText(formData:FormData){
  const courseId=text(formData,'course_id'),sourceText=text(formData,'source_text').slice(0,200000),language=lang(formData)
  if(!courseId||!sourceText)safeError(courseId||'missing',language)
  const {supabase,churchId}=await manager(courseId)
  const {error}=await supabase.from('church_setup_uploads').update({source_text:sourceText,extraction_status:'source_ready'}).eq('church_id',churchId).eq('created_record_id',courseId)
  if(error){console.error('course builder source save failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Texto fuente guardado.':'Source text saved.')
}

export async function generateExtractionPlan(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData)
  if(!courseId)safeError('missing',language)
  const {supabase,churchId}=await manager(courseId)
  const {data:source}=await supabase.from('church_setup_uploads').select('id,source_text').eq('church_id',churchId).eq('created_record_id',courseId).maybeSingle()
  if(!source?.source_text)safeError(courseId,language,language==='es'?'Guarda el texto fuente primero.':'Save source text first.')
  const plan=buildExtractionPlan(source.source_text)
  const {error}=await supabase.from('church_setup_uploads').update({extraction_plan:plan,extraction_status:'proposal_ready',extraction_reviewed_at:new Date().toISOString()}).eq('id',source.id)
  if(error){console.error('course builder extraction proposal failed',{courseId,message:error.message});safeError(courseId,language)}
  success(courseId,language,language==='es'?'Propuesta creada para revisión.':'Draft structure proposed for review.')
}

export async function applyExtractionPlan(formData:FormData){
  const courseId=text(formData,'course_id'),language=lang(formData)
  if(!courseId)safeError('missing',language)
  const {supabase,userId,churchId}=await manager(courseId)
  const {data:source}=await supabase.from('church_setup_uploads').select('id,extraction_plan').eq('church_id',churchId).eq('created_record_id',courseId).maybeSingle()
  const plan:any=source?.extraction_plan
  if(!source||!plan?.lessons?.length)safeError(courseId,language,language==='es'?'No hay una propuesta lista para aplicar.':'No extraction proposal is ready to apply.')
  const {count}=await supabase.from('course_modules').select('*',{count:'exact',head:true}).eq('course_id',courseId)
  if((count??0)>0)safeError(courseId,language,language==='es'?'Este curso ya tiene lecciones. Revisa o edita las existentes.':'This course already has lessons. Review or edit the existing lessons.')
  const lessonRows=plan.lessons.slice(0,40).map((lesson:any,i:number)=>({course_id:courseId,position:i+1,title:String(lesson.title||`Lesson ${i+1}`).slice(0,140),content:{summary:String(lesson.summary||''),body:'',source_assisted:true}}))
  const {error:lessonError}=await supabase.from('course_modules').insert(lessonRows)
  if(lessonError){console.error('course builder extraction lessons failed',{courseId,message:lessonError.message});safeError(courseId,language)}
  const {count:assessmentCount}=await supabase.from('course_assessments').select('*',{count:'exact',head:true}).eq('course_id',courseId)
  if((assessmentCount??0)===0){
    const {error:assessmentError}=await supabase.from('course_assessments').insert({course_id:courseId,title:plan.assessment?.title||'Course Final Review',assessment_type:'final_exam',passing_score:Math.max(80,Number(plan.assessment?.passing_score||80)),required:true,published:false,created_by:userId})
    if(assessmentError){console.error('course builder extraction assessment failed',{courseId,message:assessmentError.message});safeError(courseId,language)}
  }
  await supabase.from('church_setup_uploads').update({extraction_status:'applied',extraction_applied_at:new Date().toISOString()}).eq('id',source.id)
  success(courseId,language,language==='es'?'Propuesta aplicada como borrador.':'Proposal applied as drafts.')
}
