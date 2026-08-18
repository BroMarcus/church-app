import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,CheckCircle2,Clock,Languages,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { setModuleComplete,startCourse } from '../actions'
import { AssessmentCard } from './assessment-card'
import { SessionSchedule } from './session-schedule'
import '../learning.css'
import './assessment.css'

const awardTier=(score:number|null)=>score===100?'Platinum':score!=null&&score>=90?'Gold':score!=null&&score>=80?'Silver':null

export default async function CoursePage({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const [{courseId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:course},{data:modules},{data:enrollment},{data:moduleProgress},{data:assessments}]=await Promise.all([
    supabase.from('courses').select('*').eq('id',courseId).eq('published',true).single(),
    supabase.from('course_modules').select('*').eq('course_id',courseId).order('position'),
    supabase.from('course_enrollments').select('*').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_module_progress').select('module_id,completed,completed_at').eq('course_id',courseId).eq('user_id',userId),
    supabase.from('course_assessments').select('id,title,assessment_type,passing_score,max_attempts,module_id,required').eq('course_id',courseId).eq('published',true).order('created_at')
  ])
  if(!course)redirect('/learning')

  let translation:any=null
  if(course.translation_key){
    const result=await supabase.from('courses').select('id,title,language_code').eq('church_id',course.church_id).eq('translation_key',course.translation_key).neq('id',course.id).eq('published',true).limit(1).maybeSingle()
    translation=result.data
  }

  const assessmentIds=(assessments??[]).map((a:any)=>a.id)
  let questions:any[]=[]
  let attempts:any[]=[]
  if(assessmentIds.length){
    const [q,a]=await Promise.all([
      supabase.from('assessment_questions').select('id,assessment_id,position,question_type,prompt,options,points').in('assessment_id',assessmentIds).order('position'),
      supabase.from('assessment_attempts').select('assessment_id,attempt_number,percentage,passed,submitted_at').eq('user_id',userId).in('assessment_id',assessmentIds).order('attempt_number')
    ])
    questions=q.data??[]
    attempts=a.data??[]
  }
  const qBy=new Map<string,any[]>();for(const q of questions){const list=qBy.get(q.assessment_id)??[];list.push(q);qBy.set(q.assessment_id,list)}
  const aBy=new Map<string,any[]>();for(const a of attempts){const list=aBy.get(a.assessment_id)??[];list.push(a);aBy.set(a.assessment_id,list)}
  const assessmentRows=(assessments??[]).map((a:any)=>({...a,questions:qBy.get(a.id)??[],attempts:aBy.get(a.id)??[]}))

  const completeIds=new Set((moduleProgress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
  const progress=enrollment?.progress??0
  const credential=Boolean(enrollment?.credential_earned)
  const finalScore=enrollment?.final_score==null?null:Number(enrollment.final_score)
  const tier=credential?awardTier(finalScore):null
  const isEs=(course.language_code??'en')==='es'
  const requiredAssessments=(assessments??[]).filter((a:any)=>a.required).length
  const hasFinalExam=(assessments??[]).some((a:any)=>a.required&&a.assessment_type==='final_exam')

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Learning Center</div></div><div className="row">{translation&&<Link className="ghost" href={`/learning/${translation.id}`}><Languages size={14}/>{translation.language_code==='es'?'Español':'English'}</Link>}<Link className="ghost" href={`/learning?lang=${course.language_code??'en'}`}>← Learning</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="course-detail-hero card"><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.category||'COURSE'}</div><div className="pill">{isEs?'ESPAÑOL':'ENGLISH'}</div><div className="pill">VERSION {course.curriculum_version??'1.0'}</div></div><h1>{course.title}</h1><p className="muted">{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hours':'Self paced'}</span><span><Award size={13}/> {course.badge_name||'Completion credential'}</span>{course.source_revision&&<span>{course.source_revision}</span>}{requiredAssessments>0&&<span>{requiredAssessments} required assessment{requiredAssessments===1?'':'s'}</span>}</div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% lesson progress</span><span>{completeIds.size}/{modules?.length??0} lessons</span></div></section>

    <section className="card" style={{padding:18,marginBottom:14}}><div className="row" style={{alignItems:'flex-start',gap:12}}><Trophy size={22}/><div><div className="pill">COURSE COMPLETION STANDARD</div><h3 style={{margin:'8px 0 6px'}}>Finish the lessons. Pass the final exam. Earn your level.</h3><p className="muted" style={{margin:'0 0 8px'}}>A course is complete only after every required lesson is finished and the required final exam score is at least 80%.</p><strong>Silver 80–89% • Gold 90–99% • Platinum 100%</strong>{!hasFinalExam&&<div className="notice" style={{marginTop:12}}>Final exam is being prepared. Course completion stays locked until the exam is published.</div>}</div></div></section>

    {query.saved&&<div className="notice success">Lesson progress saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    {credential&&<section className="course-complete card"><div className="pill">{tier?`${tier.toUpperCase()} COMPLETION`:'COMPLETED'}</div><h2>{tier?`${tier} award earned`: 'Credential earned'}: {course.badge_name||course.title}</h2><p>{finalScore!=null?`Final exam score: ${finalScore}%. `:''}You completed every required lesson and passed the required final exam. Leadership can use this verified learning record in your discipleship and ministry pathway.</p></section>}
    {!enrollment&&<form action={startCourse} className="card" style={{padding:18,marginBottom:14}}><input type="hidden" name="course_id" value={courseId}/><p className="muted">{isEs?'Comienza el curso para registrar tu progreso.':'Start the course to begin tracking lesson completion.'}</p><button className="btn">{isEs?'Comenzar ':'Start '}{course.title}</button></form>}
    <section className="course-list">{(modules??[]).map((module:any)=>{const done=completeIds.has(module.id);const summary=module.content?.summary||'Lesson content will be added by church leadership.';return <article className="card lesson-card" key={module.id}><div className="lesson-number">{module.position}</div><div className="lesson-copy"><h3>{module.title}</h3><p>{summary}</p></div><div className="lesson-status">{done&&<span className="complete-chip"><CheckCircle2 size={12}/> Complete</span>}<form action={setModuleComplete}><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="complete" value={done?'0':'1'}/><button className={done?'ghost':'btn'} disabled={!enrollment}>{done?'Undo':isEs?'Marcar completo':'Mark complete'}</button></form></div></article>})}</section>
    <SessionSchedule courseId={courseId} userId={userId}/>
    {assessmentRows.length>0&&<section className="assessment-section"><div className="pill">ASSESSMENTS</div><h2>{isEs?'Evaluaciones y comprobaciones':'Knowledge checks & exams'}</h2><p className="muted">{isEs?'Las calificaciones se calculan de forma segura y se guardan con tu historial de aprendizaje. El examen final requerido debe ser de 80% o más para completar el curso.':'Scores are calculated securely and stored with your learning record. The required final exam must be 80% or higher before the course can be completed.'}</p>{assessmentRows.map((a:any)=><AssessmentCard assessment={a} courseId={courseId} key={a.id}/>)}</section>}
  </main>
}
