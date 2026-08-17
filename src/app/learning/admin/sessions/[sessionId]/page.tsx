import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveSessionAttendance } from './actions'
import './roster.css'

const fmtDate=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})

export default async function SessionRosterPage({params,searchParams}:{params:Promise<{sessionId:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const [{sessionId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:session}=await supabase.from('course_sessions').select('id,course_id,church_id,session_date,starts_at,title,instructor_name,courses(title)').eq('id',sessionId).single()
  if(!session)redirect('/learning')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',session.church_id).eq('user_id',actorId).eq('status','active').single()
  if(!membership||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')

  const {data:enrollments}=await supabase.from('course_enrollments').select('user_id').eq('course_id',session.course_id)
  const ids=Array.from(new Set((enrollments??[]).map((e:any)=>e.user_id)))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const {data:attendance}=ids.length?await supabase.from('course_session_attendance').select('user_id,attendance_status').eq('session_id',sessionId).in('user_id',ids):{data:[] as any[]}
  const am=new Map((attendance??[]).map((a:any)=>[a.user_id,a.attendance_status]))
  const rows=profiles.map((p:any)=>({...p,name:p.display_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'Member',status:am.get(p.id)||'present'})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const counts={present:0,absent:0,excused:0,makeup_completed:0} as Record<string,number>
  for(const row of rows)counts[row.status]=(counts[row.status]??0)+1
  const course:any=Array.isArray(session.courses)?session.courses[0]:session.courses

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Learning Studio • Attendance</div></div><div className="row"><Link className="ghost" href={`/learning/${session.course_id}`}>← Course</Link><Link className="ghost" href="/learning/admin">Learning Studio</Link></div></header>
    <section className="card roster-hero"><div><div className="pill">CLASS ROSTER</div><h1>{session.title}</h1><div className="roster-meta"><CalendarDays size={12}/> {fmtDate(session.session_date)} • {session.instructor_name||'Instructor TBD'} • {course?.title||'Course'}</div></div><UsersRound/></section>
    {query.saved&&<div className="notice success">Attendance saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    <form action={saveSessionAttendance} className="card roster-form"><input type="hidden" name="session_id" value={session.id}/><div className="roster-summary"><span>{rows.length} enrolled</span><span>{counts.present} present</span><span>{counts.absent} absent</span><span>{counts.excused} excused</span><span>{counts.makeup_completed} make-up complete</span></div><div className="roster-table">{rows.map((row:any)=><div className="roster-row" key={row.id}><div className="roster-person"><strong>{row.name}</strong><span>{am.has(row.id)?'Attendance previously recorded':'Not yet recorded — defaults to present'}</span></div><select name={`attendance:${row.id}`} defaultValue={row.status}><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option><option value="makeup_completed">Make-up completed</option></select></div>)}{!rows.length&&<div className="empty"><h3>No enrolled students yet.</h3><p className="muted">Students will appear here after they start or are enrolled in this course.</p></div>}</div><div className="roster-save"><div><strong>Save the class record</strong><div className="small muted">Attendance is separate from online lesson completion.</div></div><button className="btn" disabled={!rows.length}>Save attendance</button></div></form>
  </main>
}
