import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,BookOpen,CheckCircle2,Clock,Languages,LockKeyhole,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startCourse } from '../actions'
import { AssessmentCard } from './assessment-card'
import { SessionSchedule } from './session-schedule'
import '../learning.css'
import './assessment.css'

const awardTier=(score:number|null)=>score===100?'Platinum':score!=null&&score>=90?'Gold':score!=null&&score>=80?'Silver':null
const lessonMaterialReady=(module:any)=>{const content=module?.content;if(!content||typeof content!=='object')return false;return Array.isArray(content.sections)&&content.sections.some((s:any)=>String(s?.body??'').trim()!=='')}

export default async function CoursePage({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const [{courseId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims(),userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:course},{data:modules},{data:enrollment},{data:moduleProgress},{data:assessments}]=await Promise.all([
    supabase.from('courses').select('*').eq('id',courseId).eq('published',true).single(),
    supabase.from('course_modules').select('*').eq('course_id',courseId).order('position'),
    supabase.from('course_enrollments').select('*').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_module_progress').select('module_id,completed,completed_at').eq('course_id',courseId).eq('user_id',userId),
    supabase.from('course_assessments').select('id,title,assessment_type,passing_score,max_attempts,module_id,required,checkpoint_section').eq('course_id',courseId).eq('published',true).order('created_at')
  ])
  if(!course)redirect('/learning')

  let translation:any=null
  if(course.translation_key){const result=await supabase.from('courses').select('id,title,language_code').eq('church_id',course.church_id).eq('translation_key',course.translation_key).neq('id',course.id).eq('published',true).limit(1).maybeSingle();translation=result.data}
  const assessmentIds=(assessments??[]).map((a:any)=>a.id)
  let questions:any[]=[];let attempts:any[]=[]
  if(assessmentIds.length){const [q,a]=await Promise.all([
    supabase.from('assessment_questions').select('id,assessment_id,position,question_type,prompt,options,points').in('assessment_id',assessmentIds).order('position'),
    supabase.from('assessment_attempts').select('assessment_id,attempt_number,percentage,passed,submitted_at').eq('user_id',userId).in('assessment_id',assessmentIds).order('attempt_number')
  ]);questions=q.data??[];attempts=a.data??[]}
  const qBy=new Map<string,any[]>(),aBy=new Map<string,any[]>()
  for(const q of questions){const rows=qBy.get(q.assessment_id)??[];rows.push(q);qBy.set(q.assessment_id,rows)}
  for(const a of attempts){const rows=aBy.get(a.assessment_id)??[];rows.push(a);aBy.set(a.assessment_id,rows)}
  const coursePassing=Math.max(0,Math.min(100,Number(course.passing_score??80)))
  const assessmentRows=(assessments??[]).map((a:any)=>{const effectivePassing=Math.max(coursePassing,Number(a.passing_score??80));const normalizedAttempts=(aBy.get(a.id)??[]).map((x:any)=>({...x,passed:Number(x.percentage)>=effectivePassing}));return {...a,passing_score:effectivePassing,questions:qBy.get(a.id)??[],attempts:normalizedAttempts}})
  const passed=(a:any)=>a.attempts.some((x:any)=>x.passed)
  const moduleAssessments=new Map<string,any[]>();for(const a of assessmentRows){if(a.module_id){const rows=moduleAssessments.get(a.module_id)??[];rows.push(a);moduleAssessments.set(a.module_id,rows)}}
  const courseAssessments=assessmentRows.filter((a:any)=>!a.module_id)
  const requiredModuleAssessments=assessmentRows.filter((a:any)=>a.module_id&&a.required)
  const modulesWithRequired=(modules??[]).filter((m:any)=>(moduleAssessments.get(m.id)??[]).some((a:any)=>a.required))
  const passedModuleIds=new Set(modulesWithRequired.filter((m:any)=>(moduleAssessments.get(m.id)??[]).filter((a:any)=>a.required).every(passed)).map((m:any)=>m.id))
  const allRequiredCheckpointsPassed=requiredModuleAssessments.every(passed)
  const finalExam=courseAssessments.find((a:any)=>a.assessment_type==='final_exam')
  const completeIds=new Set((moduleProgress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
  const moduleDone=(id:string)=>{const required=(moduleAssessments.get(id)??[]).some((a:any)=>a.required);return required?passedModuleIds.has(id):completeIds.has(id)}
  const completedModuleCount=(modules??[]).filter((m:any)=>moduleDone(m.id)).length
  const progress=(modules??[]).length?Math.round((completedModuleCount/(modules??[]).length)*100):0
  const credential=Boolean(enrollment?.credential_earned),overallScore=enrollment?.final_score==null?null:Number(enrollment.final_score),overallTier=credential?awardTier(overallScore):null
  const isEs=(course.language_code??'en')==='es',t=(en:string,sp:string)=>isEs?sp:en
  const requiredAssessments=assessmentRows.filter((a:any)=>a.required).length,lessonReadyCount=(modules??[]).filter(lessonMaterialReady).length
  const homeHref=isEs?'/?lang=es':'/'

  return <main className="shell">
    <header className="topbar"><div><Link href={homeHref} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{t('Learning Center','Centro de Aprendizaje')}</div></div><div className="row">{translation&&<Link className="ghost" href={`/learning/${translation.id}`}><Languages size={14}/>{translation.language_code==='es'?'Español':'English'}</Link>}<Link className="ghost" href={`/learning?lang=${course.language_code??'en'}`}>← {t('Learning','Aprendizaje')}</Link><Link className="ghost" href={homeHref}>{t('Home','Inicio')}</Link></div></header>
    <section className="course-detail-hero card"><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.category||'COURSE'}</div><div className="pill">{isEs?'ESPAÑOL':'ENGLISH'}</div><div className="pill">VERSION {course.curriculum_version??'1.0'}</div></div><h1>{course.title}</h1><p className="muted">{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hours':t('Self paced','A tu ritmo')}</span><span><Award size={13}/> {course.badge_name||t('Completion credential','Credencial de finalización')}</span><span>{t('Course minimum','Mínimo del curso')}: {coursePassing}%</span>{course.source_revision&&<span>{course.source_revision}</span>}{requiredAssessments>0&&<span>{requiredAssessments} {t('required checkpoint(s)','evaluación(es) requerida(s)')}</span>}</div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% {t('course progress','progreso')}</span><span>{completedModuleCount}/{modules?.length??0} {t('lessons completed','lecciones completadas')}</span></div></section>

    <section className="card" style={{padding:18,marginBottom:14}}><div className="row" style={{alignItems:'flex-start',gap:12}}><Trophy size={22}/><div><div className="pill">{t('HOW THE COURSE WORKS','CÓMO FUNCIONA EL CURSO')}</div><h3 style={{margin:'8px 0 6px'}}>{t('Start a lesson. Learn in sections. Pass the checkpoints. Finish with the final exam.','Comienza una lección. Aprende por secciones. Aprueba los cuestionarios. Termina con el examen final.')}</h3><p className="muted" style={{margin:'0 0 8px'}}>{t('Each Start button opens one lesson on its own page. When leadership has assigned short quizzes between sections, passing them unlocks the next section. Required lesson tests must be passed before the course final unlocks.','Cada botón Comenzar abre una lección en su propia página. Cuando el liderazgo asigna cuestionarios entre secciones, aprobarlos desbloquea la siguiente sección. Las pruebas requeridas deben aprobarse antes del examen final.')}</p><strong>{t('Course minimum','Mínimo del curso')}: {coursePassing}% • Silver 80–89% • Gold 90–99% • Platinum 100%</strong></div></div></section>

    <section className="card" style={{padding:18,marginBottom:14}}><div className="row" style={{gap:10,flexWrap:'wrap'}}><div className="pill">{modules?.length??0} {t('LESSONS','LECCIONES')}</div><div className="pill">{lessonReadyCount}/{modules?.length??0} {t('MATERIALS READY','MATERIALES LISTOS')}</div><div className="pill">{passedModuleIds.size}/{modulesWithRequired.length} {t('REQUIRED LESSONS PASSED','LECCIONES REQUERIDAS APROBADAS')}</div><div className="pill">{finalExam?`${finalExam.questions.length}-Q ${t('FINAL READY','FINAL LISTO')}`:t('FINAL PENDING','FINAL PENDIENTE')}</div></div></section>

    {query.saved&&<div className="notice success">{t('Lesson progress saved.','Progreso guardado.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}
    {credential&&<section className="course-complete card"><div className="pill">{overallTier?`${overallTier.toUpperCase()} ${t('COMPLETION','FINALIZACIÓN')}`:t('COMPLETED','COMPLETADO')}</div><h2>{overallTier?`${overallTier} ${t('award earned','premio obtenido')}`:t('Credential earned','Credencial obtenida')}: {course.badge_name||course.title}</h2><p>{overallScore!=null?`${t('Final exam score','Puntaje del examen final')}: ${overallScore}%. `:''}{t('Every required lesson checkpoint and the cumulative final have been passed.','Cada evaluación requerida de las lecciones y el examen final han sido aprobados.')}</p></section>}
    {!enrollment&&<form action={startCourse} className="card" style={{padding:18,marginBottom:14}}><input type="hidden" name="course_id" value={courseId}/><p className="muted">{t('Start the course to begin tracking lesson progress.','Comienza el curso para registrar tu progreso.')}</p><button className="btn">{t('Start','Comenzar')} {course.title}</button></form>}

    <section className="course-list">{(modules??[]).map((module:any)=>{const materialReady=lessonMaterialReady(module),tests=moduleAssessments.get(module.id)??[],required=tests.filter((a:any)=>a.required),done=moduleDone(module.id),started=Boolean((moduleProgress??[]).find((p:any)=>p.module_id===module.id))||tests.some((a:any)=>a.attempts.length>0);return <article className="card lesson-card" key={module.id}><div className="lesson-number">{module.position}</div><div className="lesson-copy"><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">{materialReady?t('MATERIAL READY','MATERIAL LISTO'):t('MATERIAL PENDING','MATERIAL PENDIENTE')}</span><span className="pill">{tests.length?`${tests.length} ${t('CHECKPOINT(S)','EVALUACIÓN(ES)')}`:t('QUIZ PENDING','CUESTIONARIO PENDIENTE')}</span>{done&&<span className="complete-chip"><CheckCircle2 size={12}/> {t('Complete','Completa')}</span>}</div><h3>{module.title}</h3><p>{module.content?.summary||t('Lesson content will be added by church leadership.','El liderazgo agregará el contenido de esta lección.')}</p>{module.content?.source_label&&<p className="small muted">{t('Source','Fuente')}: {module.content.source_label}</p>}</div><div className="lesson-status">{enrollment&&materialReady?<Link className={done?'ghost':'btn'} href={`/learning/${courseId}/lesson/${module.id}`}><BookOpen size={14}/> {done?t('Review','Repasar'):started?t('Continue','Continuar'):t('Start','Comenzar')}</Link>:<button className="ghost" disabled>{!enrollment?t('Start course first','Primero comienza el curso'):t('Material pending','Material pendiente')}</button>}{required.length>0&&<span className="small muted">{required.every(passed)?t('Required checkpoints passed.','Evaluaciones requeridas aprobadas.'):t('Required checkpoints remain.','Faltan evaluaciones requeridas.')}</span>}</div></article>})}</section>

    <SessionSchedule courseId={courseId} userId={userId}/>
    {courseAssessments.length>0&&<section className="assessment-section"><div className="pill">{t('COURSE FINAL','EXAMEN FINAL')}</div><h2>{t('Cumulative final exam','Examen final acumulativo')}</h2><p className="muted">{t('The final exam unlocks after all required lesson checkpoints are passed.','El examen final se desbloquea después de aprobar todas las evaluaciones requeridas de las lecciones.')}</p>{courseAssessments.map((a:any)=>a.assessment_type==='final_exam'&&!allRequiredCheckpointsPassed?<article className="card" style={{padding:18}} key={a.id}><div className="row" style={{alignItems:'flex-start',gap:12}}><LockKeyhole size={22}/><div><div className="pill">{t('FINAL LOCKED','FINAL BLOQUEADO')}</div><h3 style={{margin:'8px 0 6px'}}>{a.title}</h3><p className="muted" style={{margin:0}}>{t('Pass every required lesson checkpoint first.','Primero aprueba todas las evaluaciones requeridas de las lecciones.')}</p></div></div></article>:<AssessmentCard assessment={a} courseId={courseId} lang={isEs?'es':'en'} key={a.id}/>)}</section>}
  </main>
}
