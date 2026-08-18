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
const lessonMaterialReady=(module:any)=>{const content=module?.content;if(!content||typeof content!=='object')return false;return Object.entries(content).some(([key,value])=>key!=='summary'&&value!=null&&String(value).trim()!=='')}
const list=(value:any)=>Array.isArray(value)?value:[]

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
  const qBy=new Map<string,any[]>();for(const q of questions){const rows=qBy.get(q.assessment_id)??[];rows.push(q);qBy.set(q.assessment_id,rows)}
  const aBy=new Map<string,any[]>();for(const a of attempts){const rows=aBy.get(a.assessment_id)??[];rows.push(a);aBy.set(a.assessment_id,rows)}
  const assessmentRows=(assessments??[]).map((a:any)=>({...a,questions:qBy.get(a.id)??[],attempts:aBy.get(a.id)??[]}))
  const assessmentsByModule=new Map<string,any[]>();for(const a of assessmentRows){if(!a.module_id)continue;const rows=assessmentsByModule.get(a.module_id)??[];rows.push(a);assessmentsByModule.set(a.module_id,rows)}
  const courseAssessments=assessmentRows.filter((a:any)=>!a.module_id)

  const completeIds=new Set((moduleProgress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
  const progress=enrollment?.progress??0
  const credential=Boolean(enrollment?.credential_earned)
  const overallScore=enrollment?.final_score==null?null:Number(enrollment.final_score)
  const overallTier=credential?awardTier(overallScore):null
  const isEs=(course.language_code??'en')==='es'
  const requiredAssessments=assessmentRows.filter((a:any)=>a.required).length
  const lessonReadyCount=(modules??[]).filter(lessonMaterialReady).length
  const classTestsReady=assessmentRows.filter((a:any)=>a.module_id&&a.required).length
  const isFirstSteps=course.slug==='first-steps'

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Learning Center</div></div><div className="row">{translation&&<Link className="ghost" href={`/learning/${translation.id}`}><Languages size={14}/>{translation.language_code==='es'?'Español':'English'}</Link>}<Link className="ghost" href={`/learning?lang=${course.language_code??'en'}`}>← Learning</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="course-detail-hero card"><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.category||'COURSE'}</div><div className="pill">{isEs?'ESPAÑOL':'ENGLISH'}</div><div className="pill">VERSION {course.curriculum_version??'1.0'}</div></div><h1>{course.title}</h1><p className="muted">{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hours':'Self paced'}</span><span><Award size={13}/> {course.badge_name||'Completion credential'}</span>{course.source_revision&&<span>{course.source_revision}</span>}{requiredAssessments>0&&<span>{requiredAssessments} required test{requiredAssessments===1?'':'s'}</span>}</div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% class progress</span><span>{completeIds.size}/{modules?.length??0} classes</span></div></section>

    <section className="card" style={{padding:18,marginBottom:14}}><div className="row" style={{alignItems:'flex-start',gap:12}}><Trophy size={22}/><div><div className="pill">COMPLETION STANDARD</div><h3 style={{margin:'8px 0 6px'}}>{isFirstSteps?'Learn it. Pass the class test. Complete the class.':'Finish the required learning and pass the required tests.'}</h3><p className="muted" style={{margin:'0 0 8px'}}>{isFirstSteps?'Each First Steps class is completed only after its required class test is passed with at least 80%.':'Required assessments must be passed with at least 80% before completion is awarded.'}</p><strong>Silver 80–89% • Gold 90–99% • Platinum 100%</strong></div></div></section>

    {isFirstSteps&&<section className="card" style={{padding:18,marginBottom:14}}><div className="pill">FIRST STEPS ROADMAP</div><h2 style={{margin:'8px 0 6px'}}>17 classes. One clear discipleship path.</h2><p className="muted" style={{marginTop:0}}>The full class sequence is mapped. Source-backed lesson material and required class tests are being built from the church material already provided.</p><div className="row" style={{gap:10,flexWrap:'wrap',marginTop:12}}><div className="pill">{modules?.length??0} CLASSES MAPPED</div><div className="pill">{lessonReadyCount}/{modules?.length??0} MATERIALS READY</div><div className="pill">{classTestsReady}/{modules?.length??0} TESTS READY</div></div></section>}

    {query.saved&&<div className="notice success">Lesson progress saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    {credential&&<section className="course-complete card"><div className="pill">{overallTier?`${overallTier.toUpperCase()} OVERALL`:'COMPLETED'}</div><h2>Credential earned: {course.badge_name||course.title}</h2><p>{overallScore!=null?`Overall required-test average: ${overallScore}%. `:''}Every required class and test for this course has been completed. Leadership can use this verified learning record in your discipleship and ministry pathway.</p></section>}
    {!enrollment&&<form action={startCourse} className="card" style={{padding:18,marginBottom:14}}><input type="hidden" name="course_id" value={courseId}/><p className="muted">{isEs?'Comienza el curso para registrar tu progreso.':'Start the course to begin tracking class completion.'}</p><button className="btn">{isEs?'Comenzar ':'Start '}{course.title}</button></form>}

    <section className="course-list">{(modules??[]).map((module:any)=>{
      const done=completeIds.has(module.id)
      const summary=module.content?.summary||'Lesson content will be added by church leadership.'
      const materialReady=lessonMaterialReady(module)
      const moduleTests=assessmentsByModule.get(module.id)??[]
      const requiredTests=moduleTests.filter((a:any)=>a.required)
      const passed=requiredTests.length>0&&requiredTests.every((a:any)=>a.attempts.some((x:any)=>x.passed))
      const bestScores=requiredTests.map((a:any)=>Math.max(...a.attempts.filter((x:any)=>x.passed).map((x:any)=>Number(x.percentage)),0)).filter((x:number)=>x>0)
      const classScore=passed&&bestScores.length?Math.round(bestScores.reduce((s:number,n:number)=>s+n,0)/bestScores.length):null
      const classTier=awardTier(classScore)
      const objectives=list(module.content?.objectives)
      const sections=list(module.content?.sections)
      const refs=list(module.content?.scripture_refs)
      const review=list(module.content?.review_points)
      return <div key={module.id} style={{display:'grid',gap:10}}><article className="card lesson-card"><div className="lesson-number">{module.position}</div><div className="lesson-copy"><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">OUTLINE READY</span><span className="pill">{materialReady?'MATERIAL READY':'MATERIAL PENDING'}</span><span className="pill">{requiredTests.length?'TEST READY':'TEST PENDING'}</span>{classTier&&<span className="pill">{classTier.toUpperCase()} • {classScore}%</span>}</div><h3>{module.title}</h3><p>{summary}</p>{module.content?.source_label&&<p className="small muted">Source: {module.content.source_label}</p>}{materialReady?<details style={{marginTop:10}}><summary style={{cursor:'pointer',fontWeight:700}}>Open class material</summary><div style={{display:'grid',gap:14,marginTop:12}}>{objectives.length>0&&<div><strong>Learning goals</strong><ul>{objectives.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></div>}{sections.map((section:any,i:number)=><div key={i}><h4 style={{margin:'0 0 6px'}}>{String(section?.heading??`Section ${i+1}`)}</h4><p className="muted" style={{margin:0,lineHeight:1.6}}>{String(section?.body??'')}</p></div>)}{refs.length>0&&<div><strong>Key Scriptures</strong><p className="muted">{refs.map(String).join(' • ')}</p></div>}{review.length>0&&<div><strong>Review before the test</strong><ul>{review.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></div>}</div></details>:<p className="small muted">Full lesson material is being organized from the provided church sources.</p>}</div><div className="lesson-status">{(done||passed)&&<span className="complete-chip"><CheckCircle2 size={12}/> {classTier?`${classTier} complete`:'Complete'}</span>}{requiredTests.length?<span className="small muted">Pass the class test below to complete.</span>:isFirstSteps?<button className="ghost" disabled>Test pending</button>:<form action={setModuleComplete}><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="complete" value={done?'0':'1'}/><button className={done?'ghost':'btn'} disabled={!enrollment||(!done&&!materialReady)}>{done?'Undo':materialReady?(isEs?'Marcar completo':'Mark complete'):'Material pending'}</button></form>}</div></article>{moduleTests.map((a:any)=><details className="card" style={{padding:14}} key={a.id}><summary style={{cursor:'pointer',fontWeight:800}}>{a.title} • {a.attempts.some((x:any)=>x.passed)?'Passed':'Open test'}</summary><div style={{marginTop:12}}><AssessmentCard assessment={a} courseId={courseId}/></div></details>)}</div>
    })}</section>

    <SessionSchedule courseId={courseId} userId={userId}/>
    {courseAssessments.length>0&&<section className="assessment-section"><div className="pill">COURSE ASSESSMENTS</div><h2>{isEs?'Evaluaciones finales':'Course-wide assessments'}</h2><p className="muted">These assessments apply to the course as a whole in addition to any individual class tests.</p>{courseAssessments.map((a:any)=><AssessmentCard assessment={a} courseId={courseId} key={a.id}/>)}</section>}
  </main>
}
