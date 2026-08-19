import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createWeeklyCourseSeries } from '../actions'
import '../studio.css'

export default async function WeeklySeriesSetup({searchParams}:{searchParams:Promise<{course?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:courses}=await supabase.from('courses').select('id,title,category,published').eq('church_id',churchId).order('pathway_order').order('title')
  const ids=(courses??[]).map((c:any)=>c.id)
  let modules:any[]=[];let sessions:any[]=[]
  if(ids.length){
    const [m,s]=await Promise.all([
      supabase.from('course_modules').select('course_id,id,position,title').in('course_id',ids).order('position'),
      supabase.from('course_sessions').select('course_id,id').in('course_id',ids)
    ])
    modules=m.data??[];sessions=s.data??[]
  }
  const moduleCount=new Map<string,number>()
  for(const m of modules)moduleCount.set(m.course_id,(moduleCount.get(m.course_id)??0)+1)
  const sessionCount=new Map<string,number>()
  for(const s of sessions)sessionCount.set(s.course_id,(sessionCount.get(s.course_id)??0)+1)
  const eligible=(courses??[]).filter((c:any)=>(moduleCount.get(c.id)??0)>0&&(sessionCount.get(c.id)??0)===0)
  const selected=eligible.find((c:any)=>c.id===query.course)??eligible[0]??null

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Weekly Series Setup</div></div><div className="row"><Link className="ghost" href="/learning/admin">← Learning Studio</Link><Link className="ghost" href="/learning">Learning</Link></div></header>

    <section className="card" style={{padding:20,marginBottom:16}}><div className="pill">FAST CLASSROOM SETUP</div><h1 style={{margin:'10px 0 6px'}}>Build a full weekly class series.</h1><p className="muted" style={{marginBottom:0}}>Pick a course, choose the first meeting date, add the teacher and any holiday dates. Kingdom Network creates one weekly classroom meeting per lesson, in lesson order.</p></section>

    {query.error&&<div className="notice error" style={{marginBottom:16}}>{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:16}}><h2 style={{marginTop:0}}>Courses ready for a series</h2>{eligible.length?<div style={{display:'grid',gap:8}}>{eligible.map((course:any)=><Link href={`/learning/admin/weekly-series?course=${course.id}`} className="card" style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}} key={course.id}><div><strong>{course.title}</strong><div className="small muted">{course.category||'Course'} • {moduleCount.get(course.id)??0} lessons</div></div>{selected?.id===course.id?<span className="pill"><CheckCircle2 size={11}/> SELECTED</span>:<span className="ghost">Choose</span>}</Link>)}</div>:<div className="empty"><h3>No unscheduled courses need a series right now.</h3><p className="muted">Courses with existing classroom sessions are protected from duplicate auto-scheduling. You can still add individual meetings from Learning Studio.</p></div>}</section>

    {selected&&<section className="card" style={{padding:18}}><div className="row" style={{gap:10,alignItems:'center'}}><CalendarDays size={22}/><div><div className="pill">BUILD SERIES</div><h2 style={{margin:'6px 0 0'}}>{selected.title}</h2></div></div><p className="small muted">This will create {moduleCount.get(selected.id)??0} weekly meetings. Each meeting will automatically connect to its matching lesson.</p><form action={createWeeklyCourseSeries} className="studio-grid" style={{marginTop:12}}><input type="hidden" name="course_id" value={selected.id}/><label><span>First class date</span><input name="first_date" type="date" required/></label><label><span>Start time</span><input name="starts_at" type="time"/></label><label><span>Teacher</span><input name="instructor_name" placeholder="Teacher name"/></label><label className="wide"><span>Holiday / skip dates</span><textarea name="skip_dates" rows={4} placeholder={'One date per line, for example:\n2026-11-26\n2026-12-24\n2026-12-31'}/><small className="muted">Use YYYY-MM-DD. A skipped week pushes the remaining lessons forward automatically.</small></label><button className="btn wide"><CalendarDays size={14}/> Build {moduleCount.get(selected.id)??0}-week series</button></form></section>}
  </main>
}
