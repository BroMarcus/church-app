import Link from 'next/link'
import {redirect} from 'next/navigation'
import {BookOpen,CalendarDays,CheckCircle2,ClipboardCheck,UsersRound} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'

const fmtDate=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})

export default async function TeacherDashboard(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!custom)redirect('/learning')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const today=new Date().toISOString().slice(0,10)
  const [{data:courses},{data:sessions}]=await Promise.all([
    supabase.from('courses').select('id,title,published').eq('church_id',churchId).order('title'),
    supabase.from('course_sessions').select('id,course_id,session_date,starts_at,title,instructor_user_id,instructor_name,status,module_ids').eq('church_id',churchId).gte('session_date',today).order('session_date').limit(40)
  ])
  const courseIds=(courses??[]).map((c:any)=>c.id)
  let enrollments:any[]=[]
  if(courseIds.length){
    const {data}=await supabase.from('course_enrollments').select('course_id,user_id,progress,completed_at').in('course_id',courseIds)
    enrollments=data??[]
  }
  const courseMap=new Map((courses??[]).map((c:any)=>[c.id,c]))
  const counts=new Map<string,{learners:number;completed:number}>()
  for(const row of enrollments){const current=counts.get(row.course_id)??{learners:0,completed:0};current.learners+=1;if(row.completed_at)current.completed+=1;counts.set(row.course_id,current)}
  const mine=(sessions??[]).filter((s:any)=>s.instructor_user_id===userId)
  const visible=mine.length?mine:(sessions??[])

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name||'Church'} • Teacher Dashboard</div></div><div className="row"><Link className="ghost" href="/learning/admin/course-builder">Class Builder</Link><Link className="ghost" href="/learning/admin">Learning Studio</Link><Link className="ghost" href="/learning">← Learning</Link></div></header>
    <section className="hero card"><div><div className="pill">TEACHER DASHBOARD</div><h1>Teach the class. Keep the records simple.</h1><p>Upcoming classes, rosters, attendance and course progress are gathered here. Course content is edited in Class Builder so teachers and curriculum leaders use the same source.</p></div><div className="hero-stat"><strong>{visible.length}</strong><span>upcoming class{visible.length===1?'':'es'}</span></div></section>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10,marginBottom:18}}><div className="card" style={{padding:16}}><BookOpen size={18}/><strong style={{display:'block',fontSize:26}}>{courses?.length||0}</strong><span className="small muted">church courses</span></div><div className="card" style={{padding:16}}><UsersRound size={18}/><strong style={{display:'block',fontSize:26}}>{enrollments.length}</strong><span className="small muted">course enrollments</span></div><div className="card" style={{padding:16}}><CheckCircle2 size={18}/><strong style={{display:'block',fontSize:26}}>{enrollments.filter((e:any)=>e.completed_at).length}</strong><span className="small muted">completed enrollments</span></div></section>
    <div className="section-heading"><div><div className="pill">UPCOMING</div><h2>{mine.length?'My teaching schedule':'Church class schedule'}</h2></div><span className="small muted">Open a class to record attendance.</span></div>
    <section style={{display:'grid',gap:10,marginBottom:20}}>{visible.map((session:any)=>{const course:any=courseMap.get(session.course_id);return <article className="card" style={{padding:16}} key={session.id}><div className="row" style={{justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">{fmtDate(session.session_date)}</span><span className="pill">{String(session.status||'scheduled').replaceAll('_',' ').toUpperCase()}</span></div><h3 style={{margin:'8px 0 4px'}}>{session.title}</h3><div className="small muted">{course?.title||'Course'}{session.instructor_name?` • ${session.instructor_name}`:''}{session.starts_at?` • ${String(session.starts_at).slice(0,5)}`:''}</div></div><Link className="btn" href={`/learning/admin/sessions/${session.id}`}><ClipboardCheck size={14}/> Roster & attendance</Link></div></article>})}{!visible.length&&<div className="card empty"><CalendarDays size={28}/><h3>No upcoming classes are scheduled.</h3><p className="muted">Use Learning Studio to create a classroom session, or use Class Builder to prepare the course first.</p><Link className="btn" href="/learning/admin">Schedule a class →</Link></div>}</section>
    <div className="section-heading"><div><div className="pill">COURSES</div><h2>Learner progress at a glance</h2></div><Link className="ghost" href="/learning/admin/course-builder">Open Class Builder →</Link></div>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:10}}>{(courses??[]).map((course:any)=>{const count=counts.get(course.id)??{learners:0,completed:0};return <article className="card" style={{padding:16}} key={course.id}><div className="row" style={{justifyContent:'space-between',gap:8}}><strong>{course.title}</strong><span className="pill">{course.published?'LIVE':'DRAFT'}</span></div><div className="small muted" style={{marginTop:8}}>{count.learners} learner{count.learners===1?'':'s'} • {count.completed} completed</div><div className="row" style={{marginTop:12,gap:8,flexWrap:'wrap'}}><Link className="ghost" href={`/learning/admin/course-builder/${course.id}`}>Edit class</Link><Link className="ghost" href={`/learning/${course.id}`}>View learner course</Link></div></article>})}</section>
  </main>
}