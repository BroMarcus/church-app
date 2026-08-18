import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,CheckCircle2,ClipboardCheck,Clock3,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import '../../learning.css'

const tier=(score:number|null)=>score===100?'Platinum':score!=null&&score>=90?'Gold':score!=null&&score>=80?'Silver':null
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Unnamed member'

export default async function FirstStepsRosterPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  const {data:course}=await supabase.from('courses').select('id,title').eq('church_id',churchId).eq('slug','first-steps').limit(1).maybeSingle()
  if(!course)redirect('/learning/admin')

  const [{data:enrollments},{data:modules},{data:assessments},{data:sessions}]=await Promise.all([
    supabase.from('course_enrollments').select('user_id,progress,final_score,completed_at,credential_earned,updated_at').eq('course_id',course.id).order('updated_at',{ascending:false}),
    supabase.from('course_modules').select('id,position,title').eq('course_id',course.id).order('position'),
    supabase.from('course_assessments').select('id,module_id,assessment_type,required,published').eq('course_id',course.id).eq('required',true).eq('published',true),
    supabase.from('course_sessions').select('id,session_date,title,status').eq('course_id',course.id).eq('church_id',churchId).order('session_date')
  ])
  const students:any[]=enrollments??[]
  const studentIds=students.map(s=>s.user_id)
  let profiles:any[]=[];let attempts:any[]=[];let attendance:any[]=[]
  const assessmentIds=(assessments??[]).map(a=>a.id)
  const sessionIds=(sessions??[]).map(s=>s.id)
  if(studentIds.length){
    const reads:any[]=[supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',studentIds)]
    if(assessmentIds.length)reads.push(supabase.from('assessment_attempts').select('user_id,assessment_id,percentage,passed,submitted_at').in('user_id',studentIds).in('assessment_id',assessmentIds))
    if(sessionIds.length)reads.push(supabase.from('course_session_attendance').select('user_id,session_id,attendance_status').in('user_id',studentIds).in('session_id',sessionIds))
    const results=await Promise.all(reads)
    profiles=results[0].data??[]
    let cursor=1
    if(assessmentIds.length){attempts=results[cursor].data??[];cursor++}
    if(sessionIds.length){attendance=results[cursor].data??[]}
  }

  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const requiredClassAssessments=(assessments??[]).filter(a=>a.module_id&&a.assessment_type!=='final_exam')
  const finalAssessment=(assessments??[]).find(a=>a.assessment_type==='final_exam')
  const attemptsByUser=new Map<string,any[]>();for(const a of attempts){const list=attemptsByUser.get(a.user_id)??[];list.push(a);attemptsByUser.set(a.user_id,list)}
  const attendanceByUser=new Map<string,any[]>();for(const a of attendance){const list=attendanceByUser.get(a.user_id)??[];list.push(a);attendanceByUser.set(a.user_id,list)}

  const rows=students.map((s:any)=>{
    const userAttempts=attemptsByUser.get(s.user_id)??[]
    const passedAssessmentIds=new Set(userAttempts.filter((a:any)=>a.passed).map((a:any)=>a.assessment_id))
    const classesPassed=requiredClassAssessments.filter(a=>passedAssessmentIds.has(a.id)).length
    const finalAttempts=finalAssessment?userAttempts.filter((a:any)=>a.assessment_id===finalAssessment.id):[]
    const finalBest=finalAttempts.length?Math.max(...finalAttempts.map((a:any)=>Number(a.percentage))):null
    const finalPassed=finalAttempts.some((a:any)=>a.passed)
    const attend=attendanceByUser.get(s.user_id)??[]
    const statusCount=(status:string)=>attend.filter((a:any)=>a.attendance_status===status).length
    return {...s,name:personName(pm.get(s.user_id)),classesPassed,finalBest,finalPassed,award:s.credential_earned?tier(s.final_score):finalPassed?tier(finalBest):null,present:statusCount('present'),absent:statusCount('absent'),excused:statusCount('excused'),makeup:statusCount('makeup_completed')}
  }).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  const completed=rows.filter(r=>r.credential_earned).length
  const finalReady=rows.filter(r=>!r.credential_earned&&r.classesPassed===(modules?.length??0)).length
  const needsClass=rows.filter(r=>r.classesPassed<(modules?.length??0)).length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • First Steps Roster</div></div><div className="row"><Link className="ghost" href="/learning/admin">← Learning Studio</Link><Link className="ghost" href="/learning">Learning Center</Link></div></header>

    <section className="learning-hero card"><div><div className="pill">FIRST STEPS LEADER VIEW</div><h1>Know where every student stands.</h1><p className="muted">Class-test progress, final readiness and classroom attendance in one leadership view.</p></div><div className="learning-stat"><strong>{rows.length}</strong><span>student{rows.length===1?'':'s'} enrolled</span></div></section>

    <section className="row" style={{gap:10,marginBottom:18,flexWrap:'wrap'}}><div className="card" style={{padding:'14px 16px',minWidth:170}}><Users size={18}/><strong style={{display:'block',fontSize:24,marginTop:5}}>{rows.length}</strong><span className="small muted">Enrolled</span></div><div className="card" style={{padding:'14px 16px',minWidth:170}}><ClipboardCheck size={18}/><strong style={{display:'block',fontSize:24,marginTop:5}}>{needsClass}</strong><span className="small muted">Working on classes</span></div><div className="card" style={{padding:'14px 16px',minWidth:170}}><Award size={18}/><strong style={{display:'block',fontSize:24,marginTop:5}}>{finalReady}</strong><span className="small muted">Final ready</span></div><div className="card" style={{padding:'14px 16px',minWidth:170}}><CheckCircle2 size={18}/><strong style={{display:'block',fontSize:24,marginTop:5}}>{completed}</strong><span className="small muted">Completed</span></div></section>

    <section style={{display:'grid',gap:12}}>{rows.map((r:any)=>{const pct=modules?.length?Math.round((r.classesPassed/modules.length)*100):0;const state=r.credential_earned?'Completed':r.classesPassed===(modules?.length??0)?'Final ready':'In progress';return <article className="card" style={{padding:18}} key={r.user_id}><div className="row" style={{justifyContent:'space-between',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="row" style={{gap:7,flexWrap:'wrap'}}><span className="pill">{state.toUpperCase()}</span>{r.award&&<span className="pill">{r.award.toUpperCase()}</span>}</div><h2 style={{margin:'8px 0 4px'}}>{r.name}</h2><p className="small muted" style={{margin:0}}>{r.classesPassed}/{modules?.length??0} class tests passed{r.finalBest!=null?` • Final ${Math.round(r.finalBest)}%`:''}</p></div><Link className="ghost" href={`/church/members/${r.user_id}`}>Open member record →</Link></div><div className="progress-track" style={{marginTop:12}}><div className="progress-fill" style={{width:`${pct}%`}}/></div><div className="progress-row"><span>{pct}% First Steps classes</span><span>{r.credential_earned?`Completed${r.award?` • ${r.award}`:''}`:r.classesPassed===(modules?.length??0)?'Final unlocked':'Continue classes'}</span></div><div className="row" style={{gap:8,flexWrap:'wrap',marginTop:12}}><span className="pill"><Clock3 size={10}/> Present {r.present}</span><span className="pill">Absent {r.absent}</span><span className="pill">Excused {r.excused}</span><span className="pill">Make-up {r.makeup}</span></div></article>})}{!rows.length&&<div className="card empty"><h3>No First Steps students enrolled yet.</h3><p className="muted">Students will appear here as soon as they start the published First Steps course.</p></div>}</section>

    <section className="card" style={{padding:18,marginTop:18}}><div className="pill">CLASSROOM RECORD</div><h3 style={{margin:'8px 0 5px'}}>{sessions?.length??0} classroom session{sessions?.length===1?'':'s'} scheduled</h3><p className="muted" style={{margin:0}}>Attendance supports the in-person course record. Test completion remains the requirement for class completion; attendance and make-up status are tracked separately.</p></section>
  </main>
}
