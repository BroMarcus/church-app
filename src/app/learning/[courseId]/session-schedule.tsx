import Link from 'next/link'
import { CalendarDays,CheckCircle2,Clock,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './sessions.css'

const fmtDate=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})
const fmtTime=(v?:string|null)=>v?new Date(`1970-01-01T${v}`).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'Time TBD'

export async function SessionSchedule({courseId,userId}:{courseId:string;userId:string}){
  const supabase=await createClient()
  const [{data:sessions},{data:membership}]=await Promise.all([
    supabase.from('course_sessions').select('*').eq('course_id',courseId).order('session_date'),
    supabase.from('church_memberships').select('role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  ])
  if(!sessions?.length)return null
  const ids=sessions.map((s:any)=>s.id)
  const {data:attendance}=await supabase.from('course_session_attendance').select('session_id,attendance_status').eq('user_id',userId).in('session_id',ids)
  const am=new Map((attendance??[]).map((a:any)=>[a.session_id,a.attendance_status]))
  const canManage=['minister','pastor','church_admin'].includes(membership?.role??'')
  const today=new Date().toISOString().slice(0,10)

  return <section className="session-section"><div className="section-heading"><div><div className="pill">CLASSROOM SCHEDULE</div><h2>In-person sessions</h2><p className="small muted">Online modules and classroom attendance are tracked separately but stay connected.</p></div><CalendarDays/></div><div className="session-list">{sessions.map((s:any)=>{const status=am.get(s.id);const past=s.session_date<today;return <article className={`card session-card ${past?'past':''}`} key={s.id}><div className="session-date"><strong>{fmtDate(s.session_date)}</strong><span><Clock size={12}/> {fmtTime(s.starts_at)}</span></div><div className="session-copy"><h3>{s.title}</h3><span><UserRound size={12}/> {s.instructor_name||'Instructor TBD'}</span><span className="small muted">{s.module_ids?.length??0} learning module{(s.module_ids?.length??0)===1?'':'s'} connected</span></div><div className="session-status">{status?<span className={`attendance-chip ${status}`}>{status==='makeup_completed'?<><CheckCircle2 size={11}/> Make-up complete</>:status.replaceAll('_',' ')}</span>:<span className="attendance-chip unrecorded">{past?'Not recorded':'Upcoming'}</span>}{canManage&&<Link className="ghost" href={`/learning/admin/sessions/${s.id}`}>Roster</Link>}</div></article>})}</div></section>
}
