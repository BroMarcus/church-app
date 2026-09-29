import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,ChevronLeft,ChevronRight,FileText,LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AssessmentCard } from '../../assessment-card'
import { setModuleComplete } from '../../../actions'
import '../../../learning.css'
import '../../assessment.css'

const list=(value:any)=>Array.isArray(value)?value:[]

export default async function LessonPage({params}:{params:Promise<{courseId:string;moduleId:string}>}){
  const {courseId,moduleId}=await params
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:course},{data:module},{data:enrollment},{data:modules},{data:assessments},{data:moduleProgress}]=await Promise.all([
    supabase.from('courses').select('id,title,church_id,language_code,published,source_url,source_label').eq('id',courseId).eq('published',true).maybeSingle(),
    supabase.from('course_modules').select('*').eq('id',moduleId).eq('course_id',courseId).maybeSingle(),
    supabase.from('course_enrollments').select('course_id,user_id').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_modules').select('id,title,position').eq('course_id',courseId).order('position'),
    supabase.from('course_assessments').select('id,title,assessment_type,passing_score,max_attempts,module_id,required,checkpoint_section').eq('course_id',courseId).eq('module_id',moduleId).eq('published',true).order('checkpoint_section',{ascending:true,nullsFirst:false}).order('created_at'),
    supabase.from('course_module_progress').select('completed,completed_at').eq('course_id',courseId).eq('module_id',moduleId).eq('user_id',userId).maybeSingle()
  ])
  if(!course||!module)redirect(`/learning/${courseId}`)
  if(!enrollment)redirect(`/learning/${courseId}?error=${encodeURIComponent('Start the course before opening a lesson.')}`)

  const currentPosition=Number(module.position??0)
  const priorModuleIds=(modules??[]).filter((m:any)=>Number(m.position)<currentPosition).map((m:any)=>m.id)
  if(priorModuleIds.length){
    const {data:priorRequired}=await supabase.from('course_assessments').select('id').eq('course_id',courseId).eq('required',true).eq('published',true).in('module_id',priorModuleIds)
    const priorAssessmentIds=(priorRequired??[]).map((a:any)=>a.id)
    if(priorAssessmentIds.length){
      const {data:priorPassed}=await supabase.from('assessment_attempts').select('assessment_id').eq('user_id',userId).eq('passed',true).in('assessment_id',priorAssessmentIds)
      const passedIds=new Set((priorPassed??[]).map((a:any)=>a.assessment_id))
      if(priorAssessmentIds.some((id:string)=>!passedIds.has(id))){
        const message=(course.language_code??'en')==='es'?'Completa primero las evaluaciones requeridas de las lecciones anteriores.':'Complete the required tests in earlier lessons before opening this lesson.'
        redirect(`/learning/${courseId}?error=${encodeURIComponent(message)}`)
      }
    }
  }

  const assessmentIds=(assessments??[]).map((a:any)=>a.id)
  let questions:any[]=[];let attempts:any[]=[]
  if(assessmentIds.length){const [q,a]=await Promise.all([
    supabase.from('assessment_questions').select('id,assessment_id,position,question_type,prompt,options,points').in('assessment_id',assessmentIds).order('position'),
    supabase.from('assessment_attempts').select('assessment_id,attempt_number,percentage,passed,submitted_at').eq('user_id',userId).in('assessment_id',assessmentIds).order('attempt_number')
  ]);questions=q.data??[];attempts=a.data??[]}
  const qBy=new Map<string,any[]>(),aBy=new Map<string,any[]>()
  for(const q of questions){const rows=qBy.get(q.assessment_id)??[];rows.push(q);qBy.set(q.assessment_id,rows)}
  for(const a of attempts){const rows=aBy.get(a.assessment_id)??[];rows.push(a);aBy.set(a.assessment_id,rows)}
  const rows=(assessments??[]).map((a:any)=>({...a,questions:qBy.get(a.id)??[],attempts:aBy.get(a.id)??[]}))
  const passed=(a:any)=>a.attempts.some((x:any)=>x.passed)
  const sections=list(module.content?.sections)
  const resources=list(module.content?.resources).map((item:any,resourceIndex:number)=>({...item,__resource_index:resourceIndex})).filter((item:any)=>item?.audience!=='teacher')
  const hasTrackedResources=resources.length>0
  const checkpoints=rows.filter((a:any)=>a.checkpoint_section!=null)
  const endTests=rows.filter((a:any)=>a.checkpoint_section==null)
  const sectionUnlocked=(sectionNumber:number)=>checkpoints.filter((a:any)=>Number(a.checkpoint_section)<sectionNumber&&a.required).every(passed)
  const requiredCheckpoints=checkpoints.filter((a:any)=>a.required)
  const requiredEndTests=endTests.filter((a:any)=>a.required)
  const hasRequiredAssessment=requiredCheckpoints.length+requiredEndTests.length>0
  const allSectionCheckpointsPassed=requiredCheckpoints.every(passed)
  const allEndTestsPassed=requiredEndTests.every(passed)
  const lessonPassed=hasRequiredAssessment?(allSectionCheckpointsPassed&&allEndTestsPassed):Boolean(moduleProgress?.completed)
  const index=(modules??[]).findIndex((m:any)=>m.id===moduleId),prev=index>0?(modules??[])[index-1]:null,next=index>=0&&index<(modules??[]).length-1?(modules??[])[index+1]:null
  const isEs=(course.language_code??'en')==='es',t=(en:string,es:string)=>isEs?es:en

  return <main className="shell">
    <header className="topbar"><div><Link className="brand" href="/">Kingdom <span>Network</span></Link><div className="small muted">{course.title} • {module.title}</div></div><div className="row"><Link className="ghost" href={`/learning/${courseId}`}><ChevronLeft size={14}/> {t('Course','Curso')}</Link></div></header>

    <section className="card" style={{padding:22,marginBottom:18}}><div className="pill">{t(`LESSON ${module.position}`,`LECCIÓN ${module.position}`)}</div><h1 style={{margin:'9px 0 6px'}}>{module.title}</h1><p className="muted">{module.content?.summary||t('Work through each section in order. Short checkpoints unlock the next section when they are assigned.','Avanza por cada sección en orden. Los cuestionarios cortos desbloquean la siguiente sección cuando estén asignados.')}</p><div className="row" style={{gap:8,flexWrap:'wrap'}}><span className="pill">{sections.length} {t('SECTIONS','SECCIONES')}</span><span className="pill">{checkpoints.length} {t('SHORT QUIZZES','CUESTIONARIOS')}</span><span className="pill">{endTests.length} {t('LESSON TESTS','PRUEBAS')}</span>{lessonPassed&&<span className="complete-chip"><CheckCircle2 size={12}/> {t('Lesson passed','Lección aprobada')}</span>}</div></section>

    {list(module.content?.objectives).length>0&&<section className="card" style={{padding:18,marginBottom:14}}><div className="pill">{t('LEARNING GOALS','METAS DE APRENDIZAJE')}</div><ul>{list(module.content.objectives).map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></section>}

    {resources.length>0&&<section className="card" style={{padding:18,marginBottom:16}}><div className="pill"><FileText size={12}/> {t('LESSON MATERIALS','MATERIALES DE LA LECCIÓN')}</div><div style={{display:'grid',gap:10,marginTop:12}}>{resources.map((resource:any,i:number)=>{const start=Number(resource?.page_start||0),end=Number(resource?.page_end||0),pages=start>0&&end>0?(start===end?t(`Page ${start}`,`Página ${start}`):t(`Pages ${start}–${end}`,`Páginas ${start}–${end}`)):'';return <div key={i} className="row" style={{justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong>{String(resource?.label||t('Course material','Material del curso'))}</strong>{pages&&<div className="small muted">{pages}</div>}</div><Link className="ghost" href={`/learning/${courseId}/lesson/${moduleId}/source?resource=${resource.__resource_index}`}>{t('Open in One Kingdom','Abrir en One Kingdom')} →</Link></div>})}</div></section>}

    <section style={{display:'grid',gap:16}}>{sections.map((section:any,i:number)=>{const n=i+1,unlocked=sectionUnlocked(n),sectionQuizzes=checkpoints.filter((a:any)=>Number(a.checkpoint_section)===n);return <div key={n} style={{display:'grid',gap:10}}>{unlocked?<><article className="card" style={{padding:20}}><div className="pill">{t(`SECTION ${n}`,`SECCIÓN ${n}`)}</div><h2 style={{margin:'9px 0 8px'}}>{String(section?.heading??t(`Section ${n}`,`Sección ${n}`))}</h2><div className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.75}}>{String(section?.body??'')}</div></article>{sectionQuizzes.map((a:any)=><section key={a.id}><div className="pill" style={{marginBottom:7}}>{t('QUICK CHECK','REPASO RÁPIDO')}</div><AssessmentCard assessment={a} courseId={courseId}/></section>)}{sectionQuizzes.length===0&&n<sections.length&&<div className="notice">{t('No short quiz is assigned after this section yet, so you may continue.','Todavía no hay un cuestionario corto después de esta sección, así que puedes continuar.')}</div>}</>:<article className="card" style={{padding:18}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><LockKeyhole size={20}/><div><strong>{t(`Section ${n} is locked`,`La sección ${n} está bloqueada`)}</strong><p className="small muted" style={{marginBottom:0}}>{t('Pass the required quick check above to continue.','Aprueba el cuestionario requerido anterior para continuar.')}</p></div></div></article>}</div>})}</section>

    {allSectionCheckpointsPassed&&<section style={{marginTop:22}}><div className="pill">{t('LESSON CHECKPOINT','EVALUACIÓN DE LA LECCIÓN')}</div><h2>{t('Finish this lesson','Termina esta lección')}</h2>{endTests.length?endTests.map((a:any)=><AssessmentCard assessment={a} courseId={courseId} key={a.id}/>):<div className="card" style={{padding:18}}><p className="muted">{t('No end-of-lesson test is assigned yet.','Todavía no hay una prueba final de esta lección.')}</p></div>}</section>}

    {!hasRequiredAssessment&&<section className="card" style={{padding:18,marginTop:22}}><div className="pill">{t('NO REQUIRED ASSESSMENT','SIN EVALUACIÓN REQUERIDA')}</div><h2>{lessonPassed?t('Lesson complete','Lección completada'):t('Finish this lesson','Termina esta lección')}</h2><p className="muted">{lessonPassed?t('No required test was provided for this lesson. Your completion is saved.','No se proporcionó una prueba requerida para esta lección. Tu finalización está guardada.'):hasTrackedResources?t('One Kingdom will complete this lesson automatically after every required learner material above is verified.','One Kingdom completará esta lección automáticamente después de verificar todos los materiales requeridos para alumnos que aparecen arriba.'):t('No required test or tracked material is provided for this lesson. Mark it complete when you finish.','No se proporciona una prueba requerida ni material con seguimiento para esta lección. Márcala como completada cuando termines.')}</p>{!lessonPassed&&!hasTrackedResources&&<form action={setModuleComplete}><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="module_id" value={moduleId}/><input type="hidden" name="complete" value="1"/><button className="btn">{t('Mark lesson complete','Marcar lección como completada')}</button></form>}</section>}

    {list(module.content?.scripture_refs).length>0&&<section className="card" style={{padding:18,marginTop:18}}><div className="pill">{t('KEY SCRIPTURES','ESCRITURAS CLAVE')}</div><p>{list(module.content.scripture_refs).map(String).join(' • ')}</p></section>}
    {list(module.content?.review_points).length>0&&<section className="card" style={{padding:18,marginTop:14}}><div className="pill">{t('REVIEW','REPASO')}</div><ul>{list(module.content.review_points).map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></section>}

    <div className="row" style={{justifyContent:'space-between',marginTop:22,flexWrap:'wrap'}}>{prev?<Link className="ghost" href={`/learning/${courseId}/lesson/${prev.id}`}><ChevronLeft size={14}/> {prev.title}</Link>:<span/>}{next&&lessonPassed?<Link className="btn" href={`/learning/${courseId}/lesson/${next.id}`}>{t('Next lesson','Siguiente lección')} <ChevronRight size={14}/></Link>:next?<span className="small muted">{t('Pass the required lesson test to unlock Next lesson.','Aprueba la prueba requerida para desbloquear la siguiente lección.')}</span>:<Link className="btn" href={`/learning/${courseId}`}>{t('Return to course final','Volver al examen final')} <ChevronRight size={14}/></Link>}</div>
  </main>
}
