import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,CheckCircle2,GraduationCap,UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const pct=(value:number,total:number)=>total?Math.round((value/total)*100):0

export default async function TeacherDashboard(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:canManage}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  const allowed=['minister','pastor','church_admin'].includes(membership.role)||Boolean(canManage)
  if(!allowed)redirect('/learning')

  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:coursesData}=await supabase.from('courses').select('id,title,published,language_code,pathway_stage').eq('church_id',membership.church_id).order('pathway_order')
  const courses=coursesData??[]
  const courseIds=courses.map(c=>c.id)
  let sessions:any[]=[]
  let enrollments:any[]=[]
  let attendance:any[]=[]
  if(courseIds.length){
    const [s,e]=await Promise.all([
      supabase.from('course_sessions').select('id,course_id,title,session_date,starts_at,instructor_name,status,module_ids').eq('church_id',membership.church_id).in('course_id',courseIds).order('session_date',{ascending:true}),
      supabase.from('course_enrollments').select('course_id,user_id,progress,final_score,credential_earned,completed_at').in('course_id',courseIds)
    ])
    sessions=s.data??[]
    enrollments=e.data??[]
    const sessionIds=sessions.map(s=>s.id)
    if(sessionIds.length){
      const a=await supabase.from('course_session_attendance').select('session_id,user_id,attendance_status').in('session_id',sessionIds)
      attendance=a.data??[]
    }
  }

  const now=new Date().toISOString().slice(0,10)
  const upcoming=sessions.filter(s=>s.session_date>=now&&s.status!=='cancelled').slice(0,12)
  const completed=enrollments.filter(e=>Boolean(e.completed_at)||e.progress>=100)
  const credentialed=enrollments.filter(e=>e.credential_earned)
  const present=attendance.filter(a=>a.attendance_status==='present').length

  return <main className="shell">
    <header className="topbar"><div><Link className="brand" href="/learning">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Teacher Dashboard</div></div><div className="row"><Link className="ghost" href="/learning/admin/course-builder">Class Builder</Link><Link className="ghost" href="/learning/admin">Learning Admin</Link></div></header>

    <section className="hero card"><div><div className="pill">TEACHER DASHBOARD</div><h1>Teach people, not spreadsheets.</h1><p className="muted">See upcoming classes, learner progress and attendance from the same course records members use.</p></div></section>

    <section className="stat-grid">
      <div className="card stat-card"><BookOpen/><div><strong>{courses.length}</strong><span>courses</span></div></div>
      <div className="card stat-card"><CalendarDays/><div><strong>{upcoming.length}</strong><span>upcoming classes</span></div></div>
      <div className="card stat-card"><UsersRound/><div><strong>{enrollments.length}</strong><span>enrollments</span></div></div>
      <div className="card stat-card"><GraduationCap/><div><strong>{credentialed.length}</strong><span>credentials earned</span></div></div>
    </section>

    <div className="content-grid" style={{marginTop:18}}>
      <section className="card" style={{padding:20}}><div className="pill">UPCOMING CLASSES</div><h2>What is coming next</h2>{upcoming.length?<div style={{display:'grid',gap:10}}>{upcoming.map(s=><article className="card" style={{padding:14}} key={s.id}><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><strong>{s.title}</strong><div className="small muted">{s.session_date}{s.starts_at?` • ${String(s.starts_at).slice(0,5)}`:''}{s.instructor_name?` • ${s.instructor_name}`:''}</div></div><Link className="ghost" href={`/learning/admin/sessions/${s.id}`}>Open roster</Link></div></article>)}</div>:<p className="muted">No upcoming classroom sessions are scheduled yet.</p>}</section>

      <aside className="card" style={{padding:20}}><div className="pill">CLASSROOM SNAPSHOT</div><h2>{pct(completed.length,enrollments.length)}% completion</h2><p className="muted">{completed.length} of {enrollments.length} enrollments are complete. {present} recorded attendance entries are marked present.</p><Link className="btn" href="/learning/admin/course-builder">Build or edit a class</Link></aside>
    </div>

    <section className="card" style={{padding:20,marginTop:18}}><div className="pill">COURSE PROGRESS</div><h2>Where learners stand</h2><div style={{display:'grid',gap:10}}>{courses.map(course=>{const rows=enrollments.filter(e=>e.course_id===course.id);const done=rows.filter(e=>Boolean(e.completed_at)||e.progress>=100).length;const avg=rows.length?Math.round(rows.reduce((sum,e)=>sum+Number(e.progress||0),0)/rows.length):0;return <article className="card" style={{padding:14}} key={course.id}><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><strong>{course.title}</strong><div className="small muted">{rows.length} enrolled • {done} complete • average progress {avg}%</div></div><div className="row"><span className="pill">{course.published?'PUBLISHED':'DRAFT'}</span><Link className="ghost" href={`/learning/admin/course-builder/${course.id}`}>Edit class</Link></div></div></article>})}{!courses.length&&<p className="muted">No courses have been created for this church yet.</p>}</div></section>

    <section className="card" style={{padding:18,marginTop:18}}><CheckCircle2 size={18}/><h3>One learning record</h3><p className="muted">Classroom attendance, self-paced progress, assessments and credentials all stay tied to the same course and member records.</p></section>
  </main>
}
