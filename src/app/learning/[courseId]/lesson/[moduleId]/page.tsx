import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,ChevronLeft,ChevronRight,LockKeyhole } from 'lucide-react'
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
    supabase.from('courses').select('id,title,church_id,language_code,published').eq('id',courseId).eq('published',true).maybeSingle(),
    supabase.from('course_modules').select('*').eq('id',moduleId).eq('course_id',courseId).maybeSingle(),
    supabase.from('course_enrollments').select('course_id,user_id').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_modules').select('id,title,position').eq('course_id',courseId).order('position'),
    supabase.from('course_assessments').select('id,title,assessment_type,passing_score,max_attempts,module_id,required,checkpoint_section').eq('course_id',courseId).eq('module_id',moduleId).eq('published',true).order('checkpoint_section',{ascending:true,nullsFirst:false}).order('created_at'),
    supabase.from('course_module_progress').select('completed,completed_at').eq('course_id',courseId).eq('module_id',moduleId).eq('user_id',userId).maybeSingle()
  ])
  if(!course||!module)redirect(`/learning/${courseId}`)
  if(!enrollment)redirect(`/learning/${courseId}?error=${encodeURIComponent('Start the course before opening a lesson.')}`)

  const {data:assetRows}=await supabase.from('course_module_assets').select('id,title,asset_type,storage_path,position').eq('module_id',moduleId).order('position')
  const learnerAssets=await Promise.all((assetRows??[]).map(async(asset:any)=>{const signed=await supabase.storage.from('learning-assets').createSignedUrl(asset.storage_path,900);return {...asset,url:signed.data?.signedUrl??null}}))

  const currentPosition=Number(module.position??0)
  const priorModuleIds=(modules??[]).filter((m:any)=>Number(m.position)<currentPosition).map((m:any)=>m.id)
  if(priorModuleIds.length){
    const [{data:priorRequired},{data:priorProgress}]=await Promise.all([
      supabase.from('course_assessments').select('id,module_id').eq('course_id',courseId).eq('required',true).eq('published',true).in('module_id',priorModuleIds),
      supabase.from('course_module_progress').select('module_id,completed').eq('course_id',courseId).eq('user_id',userId).in('module_id',priorModuleIds)
    ])
    const priorAssessmentIds=(priorRequired??[]).map((a:any)=>a.id)
    let priorPassed:any[]=[]
    if(priorAssessmentIds.length){const result=await supabase.from('assessment_attempts').select('assessment_id').eq('user_id',userId).eq('passed',true).in('assessment_id',priorAssessmentIds);priorPassed=result.data??[]}
    const passedIds=new Set(priorPassed.map((a:any)=>a.assessment_id))
    const completedPriorModules=new Set((priorProgress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
    const requiredByModule=new Map<string,string[]>()
    for(const a of priorRequired??[]){const ids=requiredByModule.get(a.module_id)??[];ids.push(a.id);requiredByModule.set(a.module_id,ids)}
    const blocked=priorModuleIds.some((id:string)=>{const required=requiredByModule.get(id)??[];return required.length?required.some(assessmentId=>!passedIds.has(assessmentId)):!completedPriorModules.has(id)})
    if(blocked){
      const message=(course.language_code??'en')==='es'?'Completa primero las lecciones y evaluaciones requeridas anteriores.':'Complete the earlier required lessons and tests before opening this lesson.'
      redirect(`/learning/${courseId}?error=${encodeURIComponent(message)}`)
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

    {String(module.content?.body??'').trim()&&<section className="card" style={{padding:20,marginBottom:16}}><div className="pill">{t('LESSON MATERIAL','MATERIAL DE LA LECCIÓN')}</div><div className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.75,marginTop:10}}>{String(module.content.body)}</div></section>}

    {learnerAssets.length>0&&<section className="card" style={{padding:18,marginBottom:16}}><div className="pill">{t('LESSON FILES','ARCHIVOS DE LA LECCIÓN')}</div><h2 style={{margin:'8px 0 10px'}}>{t('Materials for this lesson','Materiales para esta lección')}</h2><div style={{display:'grid',gap:8}}>{learnerAssets.map((asset:any)=><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}} key={asset.id}><div><strong>{asset.title}</strong><div className="small muted">{String(asset.asset_type??'resource').replaceAll('_',' ')}</div></div>{asset.url?<a className="ghost" href={asset.url} target="_blank" rel="noreferrer">{t('Open material','Abrir material')}</a>:<span className="small muted">{t('File unavailable','Archivo no disponible')}</span>}</div>)}</div></section>}

    <section style={{display:'grid',gap:16}}>{sections.map((section:any,i:number)=>{const n=i+1,unlocked=sectionUnlocked(n),sectionQuizzes=checkpoints.filter((a:any)=>Number(a.checkpoint_section)===n);return <div key={n} style={{display:'grid',gap:10}}>{unlocked?<><article className="card" style={{padding:20}}><div className="pill">{t(`SECTION ${n}`,`SECCIÓN ${n}`)}</div><h2 style={{margin:'9px 0 8px'}}>{String(section?.heading??t(`Section ${n}`,`Sección ${n}`))}</h2><div className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.75}}>{String(section?.body??'')}</div></article>{sectionQuizzes.map((a:any)=><section key={a.id}><div className="pill" style={{marginBottom:7}}>{t('QUICK CHECK','REPASO RÁPIDO')}</div><AssessmentCard assessment={a} courseId={courseId}/></section>)}{sectionQuizzes.length===0&&n<sections.length&&<div className="notice">{t('No short quiz is assigned after this section yet, so you may continue.','Todavía no hay un cuestionario corto después de esta sección, así que puedes continuar.')}</div>}</>:<article className="card" style={{padding:18}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><LockKeyhole size={20}/><div><strong>{t(`Section ${n} is locked`,`La sección ${n} está bloqueada`)}</strong><p className="small muted" style={{marginBottom:0}}>{t('Pass the required quick check above to continue.','Aprueba el cuestionario requerido anterior para continuar.')}</p></div></div></article>}</div>})}</section>

    {allSectionCheckpointsPassed&&<section style={{marginTop:22}}><div className="pill">{t('LESSON CHECKPOINT','EVALUACIÓN DE LA LECCIÓN')}</div><h2>{t('Finish this lesson','Termina esta lección')}</h2>{endTests.length?endTests.map((a:any)=><AssessmentCard assessment={a} courseId={courseId} key={a.id}/>):<div className="card" style={{padding:18}}><p className="muted">{t('No end-of-lesson test is assigned yet.','Todavía no hay una prueba final de esta lección.')}</p></div>}</section>}

    {!hasRequiredAssessment&&<section className="card" style={{padding:18,marginTop:22}}><div className="pill">{t('NO REQUIRED ASSESSMENT','SIN EVALUACIÓN REQUERIDA')}</div><h2>{lessonPassed?t('Lesson complete','Lección completada'):t('Finish this lesson','Termina esta lección')}</h2><p className="muted">{lessonPassed?t('No required test was provided for this lesson. Your completion is saved.','No se proporcionó una prueba requerida para esta lección. Tu finalización está guardada.'):t('No required test is provided for this lesson. When you have finished the lesson material, mark it complete to save your place.','No se proporciona una prueba requerida para esta lección. Cuando termines el material, marca la lección como completada para guardar tu lugar.')}</p>{!lessonPassed&&<form action={setModuleComplete}><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="module_id" value={moduleId}/><input type="hidden" name="complete" value="1"/><button className="btn">{t('Mark lesson complete','Marcar lección como completada')}</button></form>}</section>}

    {list(module.content?.scripture_refs).length>0&&<section className="card" style={{padding:18,marginTop:18}}><div className="pill">{t('KEY SCRIPTURES','ESCRITURAS CLAVE')}</div><p>{list(module.content.scripture_refs).map(String).join(' • ')}</p></section>}
    {list(module.content?.review_points).length>0&&<section className="card" style={{padding:18,marginTop:14}}><div className="pill">{t('REVIEW','REPASO')}</div><ul>{list(module.content.review_points).map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></section>}

    <div className="row" style={{justifyContent:'space-between',marginTop:22,flexWrap:'wrap'}}>{prev?<Link className="ghost" href={`/learning/${courseId}/lesson/${prev.id}`}><ChevronLeft size={14}/> {prev.title}</Link>:<span/>}{next&&lessonPassed?<Link className="btn" href={`/learning/${courseId}/lesson/${next.id}`}>{t('Next lesson','Siguiente lección')} <ChevronRight size={14}/></Link>:next?<span className="small muted">{t('Pass the required lesson test to unlock Next lesson.','Aprueba la prueba requerida para desbloquear la siguiente lección.')}</span>:<Link className="btn" href={`/learning/${courseId}`}>{t('Return to course final','Volver al examen final')} <ChevronRight size={14}/></Link>}</div>
  </main>
}
