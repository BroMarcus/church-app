import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarClock, CheckCircle2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'
const MINUTE=60*1000
const HOUR=60*MINUTE

type Item={id:string;userId:string;title:string;startsAt:string;endsAt:string;kind:'assignment'|'class';detail:string}

export default async function ScheduleHealthPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches
  const timeZone=church?.timezone||'UTC'
  const now=Date.now(),until=new Date(now+60*24*HOUR).toISOString()

  const [{data:assignments},{data:sessions},{data:memberships}]=await Promise.all([
    supabase.from('team_assignments').select('id,assigned_user_id,title,starts_at,call_time,notes,ministries(name)').eq('church_id',churchId).gte('starts_at',new Date(now).toISOString()).lte('starts_at',until).order('starts_at'),
    supabase.from('course_sessions').select('id,instructor_user_id,title,session_date,starts_at,status,courses(title)').eq('church_id',churchId).eq('status','scheduled').gte('session_date',new Date(now).toISOString().slice(0,10)).lte('session_date',until.slice(0,10)).not('instructor_user_id','is',null).order('session_date'),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active')
  ])
  const memberIds=(memberships??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  if(memberIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',memberIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))

  const items:Item[]=[]
  for(const a of assignments??[]){
    const ministry=Array.isArray(a.ministries)?a.ministries[0]:a.ministries
    const start=a.call_time||a.starts_at
    const end=new Date(new Date(a.starts_at).getTime()+2*HOUR).toISOString()
    items.push({id:a.id,userId:a.assigned_user_id,title:a.title,startsAt:start,endsAt:end,kind:'assignment',detail:ministry?.name||'Ministry assignment'})
  }
  for(const s of sessions??[]){
    if(!s.instructor_user_id||!s.session_date)continue
    const localTime=String(s.starts_at||'19:00:00').slice(0,8)
    // Course sessions are stored as local church date/time. Convert using the existing DB helper.
    const {data:startUtc}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:`${s.session_date}T${localTime.slice(0,5)}`})
    if(!startUtc)continue
    const course=Array.isArray(s.courses)?s.courses[0]:s.courses
    items.push({id:s.id,userId:s.instructor_user_id,title:s.title||course?.title||'Class',startsAt:startUtc,endsAt:new Date(new Date(startUtc).getTime()+90*MINUTE).toISOString(),kind:'class',detail:`Teaching • ${course?.title||'Class'}`})
  }

  const byUser=new Map<string,Item[]>()
  for(const item of items){const list=byUser.get(item.userId)??[];list.push(item);byUser.set(item.userId,list)}
  const conflicts:{userId:string;a:Item;b:Item;severity:'conflict'|'tight'}[]=[]
  for(const [userId,list] of byUser){
    const sorted=[...list].sort((x,y)=>+new Date(x.startsAt)-+new Date(y.startsAt))
    for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){
      const a=sorted[i],b=sorted[j]
      const as=+new Date(a.startsAt),ae=+new Date(a.endsAt),bs=+new Date(b.startsAt),be=+new Date(b.endsAt)
      if(bs<ae&&as<be)conflicts.push({userId,a,b,severity:'conflict'})
      else if(bs-ae>=0&&bs-ae<=60*MINUTE)conflicts.push({userId,a,b,severity:'tight'})
      else if(bs-ae>60*MINUTE)break
    }
  }

  const workload=[...byUser.entries()].map(([userId,list])=>({userId,count:list.length,name:personName(pm.get(userId))})).sort((a,b)=>b.count-a.count)
  const overloaded=workload.filter(x=>x.count>=4)
  const hard=conflicts.filter(c=>c.severity==='conflict')
  const tight=conflicts.filter(c=>c.severity==='tight')

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • Schedule Health</div></div><div className="row"><Link className="ghost" href="/calendar">Church Calendar</Link><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>

    <section className="hero card"><div><div className="pill">SCHEDULE HEALTH</div><h1>Catch overload before it becomes a problem.</h1><p>Looks ahead 60 days at ministry assignments and class-teaching responsibilities.</p></div><div className="hero-stat"><strong>{hard.length}</strong><span>direct conflicts</span></div></section>

    <section className="stat-grid"><div className="card stat-card"><AlertTriangle/><div><strong>{hard.length}</strong><span>Direct conflicts</span></div></div><div className="card stat-card"><CalendarClock/><div><strong>{tight.length}</strong><span>Tight turnarounds</span></div></div><div className="card stat-card"><Users/><div><strong>{overloaded.length}</strong><span>Heavier schedules</span></div></div><div className="card stat-card"><CheckCircle2/><div><strong>{Math.max(0,items.length-hard.length)}</strong><span>Scheduled items</span></div></div></section>

    <section className="card" style={{padding:18,marginBottom:18}}><div className="pill">CONFLICTS</div><h2>People double-booked or scheduled too tightly</h2><p className="small muted">A direct conflict means two responsibilities overlap. A tight turnaround means the next responsibility begins within 60 minutes of the previous one ending.</p><div style={{display:'grid',gap:10,marginTop:14}}>{conflicts.map((c,i)=><article key={`${c.userId}-${c.a.id}-${c.b.id}-${i}`} style={{padding:14,border:'1px solid var(--line)',borderRadius:12,background:c.severity==='conflict'?'#2c171c':'#211730'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><strong>{personName(pm.get(c.userId))}</strong><div className="small muted" style={{marginTop:4}}>{c.severity==='conflict'?'Direct overlap':'Less than one hour between responsibilities'}</div></div><span className="pill">{c.severity==='conflict'?'CONFLICT':'TIGHT'}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>{[c.a,c.b].map(x=><div key={x.id}><strong>{x.title}</strong><div className="small muted">{x.detail}</div><div className="small" style={{marginTop:4}}>{formatChurchDate(x.startsAt,timeZone,{weekday:'short',month:'short',day:'numeric'})} • {formatChurchTime(x.startsAt,timeZone)}</div></div>)}</div></article>)}{!conflicts.length&&<div className="notice success">No assignment/class conflicts found in the next 60 days.</div>}</div></section>

    <section className="card" style={{padding:18}}><div className="pill">WORKLOAD</div><h2>Who has the most scheduled responsibilities?</h2><p className="small muted">This is an operational signal, not a judgment about a person's willingness or capacity. It helps leadership notice when the same few people are carrying everything.</p><div style={{display:'grid',gap:8,marginTop:14}}>{workload.slice(0,15).map(w=><div key={w.userId} className="row" style={{justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--line)'}}><span>{w.name}</span><strong>{w.count} scheduled</strong></div>)}{!workload.length&&<p className="muted">No upcoming assignments or teaching responsibilities yet.</p>}</div></section>
  </main>
}
