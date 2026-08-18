import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,BookOpen,CheckCircle2,Clock3,LockKeyhole,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import '../learning.css'

const tier=(score:number|null)=>score===100?'Platinum':score!=null&&score>=90?'Gold':score!=null&&score>=80?'Silver':null
const niceDate=(value?:string|null)=>value?new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'

export default async function LearningTranscriptPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:membership},{data:enrollments},{data:firstSteps}]=await Promise.all([
    supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single(),
    supabase.from('course_enrollments').select('course_id,progress,final_score,completed_at,credential_earned,curriculum_version,courses(id,title,slug,category,language_code,badge_name)').eq('user_id',userId).order('updated_at',{ascending:false}),
    supabase.from('courses').select('id,title,badge_name').eq('slug','first-steps').eq('published',true).limit(1).maybeSingle()
  ])
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const rows:any[]=enrollments??[]
  const completed=rows.filter((r:any)=>r.credential_earned)
  const silver=completed.filter((r:any)=>tier(r.final_score)==='Silver').length
  const gold=completed.filter((r:any)=>tier(r.final_score)==='Gold').length
  const platinum=completed.filter((r:any)=>tier(r.final_score)==='Platinum').length

  let firstStepsRows:any[]=[]
  let finalRow:any=null
  if(firstSteps?.id){
    const [{data:modules},{data:assessments}]=await Promise.all([
      supabase.from('course_modules').select('id,position,title').eq('course_id',firstSteps.id).order('position'),
      supabase.from('course_assessments').select('id,module_id,title,assessment_type,passing_score,required').eq('course_id',firstSteps.id).eq('published',true)
    ])
    const ids=(assessments??[]).map((a:any)=>a.id)
    let attempts:any[]=[]
    if(ids.length){const r=await supabase.from('assessment_attempts').select('assessment_id,attempt_number,percentage,passed,submitted_at').eq('user_id',userId).in('assessment_id',ids).order('attempt_number');attempts=r.data??[]}
    const byAssessment=new Map<string,any[]>();for(const a of attempts){const list=byAssessment.get(a.assessment_id)??[];list.push(a);byAssessment.set(a.assessment_id,list)}
    const moduleAssessment=new Map<string,any>();for(const a of assessments??[]){if(a.module_id&&a.required)moduleAssessment.set(a.module_id,a)}
    firstStepsRows=(modules??[]).map((m:any)=>{const a=moduleAssessment.get(m.id);const tries=a?byAssessment.get(a.id)??[]:[];const passedTries=tries.filter((x:any)=>x.passed);const best=tries.length?Math.max(...tries.map((x:any)=>Number(x.percentage))):null;const passed=passedTries.length>0;return {...m,assessment:a,attempts:tries,best,passed,award:passed?tier(best):null}})
    const final=(assessments??[]).find((a:any)=>a.assessment_type==='final_exam')
    if(final){const tries=byAssessment.get(final.id)??[];const best=tries.length?Math.max(...tries.map((x:any)=>Number(x.percentage))):null;finalRow={...final,attempts:tries,best,passed:tries.some((x:any)=>x.passed),award:tries.some((x:any)=>x.passed)?tier(best):null}}
  }

  const passedClasses=firstStepsRows.filter(r=>r.passed).length
  const firstStepsEnrollment=rows.find((r:any)=>r.course_id===firstSteps?.id)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Learning Transcript</div></div><div className="row"><Link className="ghost" href="/learning">← Learning Center</Link><Link className="ghost" href="/profile">My Profile</Link></div></header>

    <section className="learning-hero card"><div><div className="pill">MY LEARNING TRANSCRIPT</div><h1>Progress you can see.</h1><p className="muted">A personal record of course progress, class tests, final scores and earned learning awards.</p></div><div className="learning-stat"><strong>{completed.length}</strong><span>courses completed</span></div></section>

    <section className="row" style={{gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <div className="card" style={{padding:'14px 16px',minWidth:150}}><BookOpen size={18}/><strong style={{display:'block',fontSize:24,marginTop:6}}>{rows.length}</strong><span className="small muted">Enrolled</span></div>
      <div className="card" style={{padding:'14px 16px',minWidth:150}}><CheckCircle2 size={18}/><strong style={{display:'block',fontSize:24,marginTop:6}}>{completed.length}</strong><span className="small muted">Completed</span></div>
      <div className="card" style={{padding:'14px 16px',minWidth:150}}><Award size={18}/><strong style={{display:'block',fontSize:24,marginTop:6}}>{silver}</strong><span className="small muted">Silver</span></div>
      <div className="card" style={{padding:'14px 16px',minWidth:150}}><Trophy size={18}/><strong style={{display:'block',fontSize:24,marginTop:6}}>{gold}</strong><span className="small muted">Gold</span></div>
      <div className="card" style={{padding:'14px 16px',minWidth:150}}><Trophy size={18}/><strong style={{display:'block',fontSize:24,marginTop:6}}>{platinum}</strong><span className="small muted">Platinum</span></div>
    </section>

    {firstSteps&&<section className="card" style={{padding:18,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><div className="pill">FIRST STEPS</div><h2 style={{margin:'8px 0 5px'}}>Class-by-class record</h2><p className="muted" style={{margin:0}}>Each class requires 80% or higher. After all 17 classes are passed, the cumulative final unlocks.</p></div><div style={{textAlign:'right'}}><strong style={{fontSize:26}}>{passedClasses}/17</strong><div className="small muted">classes passed</div></div></div><div className="progress-track" style={{marginTop:14}}><div className="progress-fill" style={{width:`${Math.round((passedClasses/17)*100)}%`}}/></div>
      <div style={{display:'grid',gap:8,marginTop:16}}>{firstStepsRows.map((r:any)=><div className="card" style={{padding:'11px 13px',display:'flex',alignItems:'center',gap:12,justifyContent:'space-between'}} key={r.id}><div className="row" style={{gap:10}}><div className="lesson-number" style={{width:34,height:34}}>{r.position}</div><div><strong>{r.title}</strong><div className="small muted">{r.attempts.length?`${r.attempts.length} attempt${r.attempts.length===1?'':'s'}`:'Not tested yet'}</div></div></div><div style={{textAlign:'right'}}>{r.passed?<><span className="pill">{r.award?.toUpperCase()??'PASSED'}</span><div className="small" style={{marginTop:4}}>{Math.round(r.best)}%</div></>:<span className="small muted">Not passed</span>}</div></div>)}</div>
      <div className="card" style={{padding:16,marginTop:14}}><div className="row" style={{gap:12,alignItems:'flex-start'}}>{passedClasses===17?<Trophy size={22}/>:<LockKeyhole size={22}/>}<div><div className="pill">CUMULATIVE FINAL</div><h3 style={{margin:'8px 0 5px'}}>First Steps Final Exam</h3>{finalRow?.passed?<p style={{margin:0}}><strong>{finalRow.award} • {Math.round(finalRow.best)}%</strong> — Final passed.</p>:passedClasses===17?<p className="muted" style={{margin:0}}>Unlocked. Open First Steps to take the 34-question final exam.</p>:<p className="muted" style={{margin:0}}>Locked until all 17 class tests are passed.</p>}</div></div></div>
      {firstStepsEnrollment?.credential_earned&&<div className="notice success" style={{marginTop:14}}><strong>{tier(firstStepsEnrollment.final_score)} First Steps completion</strong> • Final score {firstStepsEnrollment.final_score}% • Completed {niceDate(firstStepsEnrollment.completed_at)}</div>}
    </section>}

    <section><div className="pill">COURSE HISTORY</div><h2>My courses</h2><div className="course-grid">{rows.map((row:any)=>{const c=Array.isArray(row.courses)?row.courses[0]:row.courses;const score=row.final_score==null?null:Number(row.final_score);const award=row.credential_earned?tier(score):null;return <article className="card course-card" key={row.course_id}><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">{c?.category??'COURSE'}</span>{award&&<span className="pill">{award.toUpperCase()}</span>}</div><h3>{c?.title??'Course'}</h3><div className="progress-track"><div className="progress-fill" style={{width:`${row.progress??0}%`}}/></div><div className="progress-row"><span>{row.progress??0}% progress</span><span>{row.credential_earned?'Completed':'In progress'}</span></div>{score!=null&&<p className="small muted">Recorded score: {score}%</p>}{row.completed_at&&<p className="small muted"><Clock3 size={12}/> Completed {niceDate(row.completed_at)}</p>}<Link className="btn" href={`/learning/${row.course_id}`} style={{display:'inline-block',marginTop:8}}>{row.credential_earned?'Review course':'Continue course'}</Link></article>})}{!rows.length&&<div className="card empty"><h3>No courses started yet.</h3><p className="muted">Start a course in the Learning Center and your progress will appear here.</p><Link className="btn" href="/learning">Browse courses</Link></div>}</div></section>
  </main>
}
