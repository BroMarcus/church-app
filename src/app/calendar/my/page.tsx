import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,BookOpen,CalendarDays,Clock,MapPin,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'
import { PersonalPlanning } from './personal-planning'

const copy={
  en:{title:'My Schedule',subtitle:'Your assignments, tasks, classes, events and group rhythm in one place.',church:'Church Calendar',home:'Home',conflicts:'SCHEDULE CHECK',conflictTitle:'Possible schedule conflicts',conflictBody:'These items start close together. Review the details before committing to both.',assignments:'MINISTRY ASSIGNMENTS',events:'EVENTS I’M GOING TO',classes:'CLASSES',groups:'FRIENDSHIP GROUPS',noneAssignments:'No upcoming ministry assignments.',noneEvents:'No upcoming events marked Going.',noneClasses:'No upcoming classes on your schedule.',noneGroups:'You are not connected to a group yet.',call:'Call time',role:'Your role'},
  es:{title:'Mi Horario',subtitle:'Tus asignaciones, tareas, clases, eventos y grupos en un solo lugar.',church:'Calendario de la Iglesia',home:'Inicio',conflicts:'REVISIÓN DE HORARIO',conflictTitle:'Posibles conflictos de horario',conflictBody:'Estos elementos comienzan muy cerca uno del otro. Revisa los detalles antes de comprometerte con ambos.',assignments:'ASIGNACIONES DE MINISTERIO',events:'EVENTOS A LOS QUE VOY',classes:'CLASES',groups:'GRUPOS DE AMISTAD',noneAssignments:'No tienes asignaciones próximas.',noneEvents:'No tienes eventos próximos marcados como Voy a ir.',noneClasses:'No tienes clases próximas en tu horario.',noneGroups:'Todavía no estás conectado a un grupo.',call:'Hora de llegada',role:'Tu rol'}
} as const

type TimedItem={id:string;label:string;kind:string;starts:number}

export default async function MySchedulePage({searchParams}:{searchParams:Promise<{lang?:string;task_created?:string;task_saved?:string;time_off?:string;error?:string}>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en',t=copy[lang]
  const l=(p:string)=>lang==='es'?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const nowIso=new Date().toISOString(),today=nowIso.slice(0,10)

  const [{data:assignments},{data:enrollments},{data:groupMemberships},{data:allSessions},{data:goingRsvps},{data:tasks},{data:timeOff}]=await Promise.all([
    supabase.from('team_assignments').select('id,title,starts_at,call_time,notes,ministry_id,ministries(name)').eq('church_id',membership.church_id).eq('assigned_user_id',userId).gte('starts_at',nowIso).order('starts_at').limit(30),
    supabase.from('course_enrollments').select('course_id').eq('user_id',userId),
    supabase.from('group_memberships').select('role,groups(id,name,meeting_day,meeting_time,meeting_frequency,location_label,active)').eq('user_id',userId),
    supabase.from('course_sessions').select('id,course_id,session_date,starts_at,title,instructor_user_id,status,courses(title)').eq('church_id',membership.church_id).gte('session_date',today).eq('status','scheduled').order('session_date').limit(80),
    supabase.from('event_rsvps').select('event_id').eq('user_id',userId).eq('response','going'),
    supabase.from('member_tasks').select('id,title,notes,due_at,status,priority,created_by').eq('assigned_to',userId).in('status',['open','in_progress']).order('due_at',{ascending:true,nullsFirst:false}).limit(40),
    supabase.from('member_time_off').select('id,starts_on,ends_on,notes,status').eq('user_id',userId).gte('ends_on',today).order('starts_on').limit(20)
  ])
  const enrolled=new Set((enrollments??[]).map((e:any)=>e.course_id))
  const sessions:any[]=(allSessions??[] as any[]).filter((s:any)=>enrolled.has(s.course_id)||s.instructor_user_id===userId).slice(0,30)
  const groups=(groupMemberships??[]).filter((g:any)=>{const x=Array.isArray(g.groups)?g.groups[0]:g.groups;return x?.active!==false}).map((g:any)=>({...g,group:Array.isArray(g.groups)?g.groups[0]:g.groups})).filter((g:any)=>g.group)
  const eventIds=(goingRsvps??[]).map((r:any)=>r.event_id)
  let goingEvents:any[]=[]
  if(eventIds.length){const result=await supabase.from('events').select('id,title,starts_at,ends_at,location,event_type').in('id',eventIds).gte('starts_at',nowIso).order('starts_at');goingEvents=result.data??[]}

  const niceDate=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString(lang==='es'?'es-US':'en-US',{weekday:'short',month:'short',day:'numeric'})
  const niceTime=(v:string|null)=>v?new Date(`1970-01-01T${String(v).slice(0,8)}`).toLocaleTimeString(lang==='es'?'es-US':'en-US',{hour:'numeric',minute:'2-digit'}):'—'

  const timed:TimedItem[]=[]
  for(const a of assignments??[])timed.push({id:`assignment:${a.id}`,label:a.title,kind:lang==='es'?'Asignación':'Assignment',starts:new Date(a.call_time||a.starts_at).getTime()})
  for(const e of goingEvents)timed.push({id:`event:${e.id}`,label:e.title,kind:lang==='es'?'Evento':'Event',starts:new Date(e.starts_at).getTime()})
  for(const s of sessions){if(!s.starts_at)continue;const {data:utc}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:membership.church_id,p_local_datetime:`${s.session_date}T${String(s.starts_at).slice(0,5)}`});if(utc)timed.push({id:`class:${s.id}`,label:s.title||(Array.isArray(s.courses)?s.courses[0]?.title:s.courses?.title)||'Class',kind:lang==='es'?'Clase':'Class',starts:new Date(utc as string).getTime()})}
  timed.sort((a,b)=>a.starts-b.starts)
  const conflicts:{a:TimedItem;b:TimedItem}[]=[]
  for(let i=0;i<timed.length;i++)for(let j=i+1;j<timed.length;j++){const delta=timed[j].starts-timed[i].starts;if(delta>90*60*1000)break;if(timed[i].id.split(':')[0]!==timed[j].id.split(':')[0])conflicts.push({a:timed[i],b:timed[j]})}

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {t.title}</div></div><div className="row"><Link className="ghost" href="/calendar/my?lang=en">English</Link><Link className="ghost" href="/calendar/my?lang=es">Español</Link><Link className="ghost" href={l('/calendar')}>{t.church}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="hero card"><div><div className="pill">{lang==='es'?'MI HORARIO':'MY SCHEDULE'}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="hero-stat"><strong>{(assignments?.length??0)+sessions.length+goingEvents.length+(tasks?.length??0)}</strong><span>{lang==='es'?'cosas próximas':'upcoming items'}</span></div></section>
    {query.task_created&&<div className="notice success">{lang==='es'?'Tarea creada.':'Task created.'}</div>}{query.task_saved&&<div className="notice success">{lang==='es'?'Tarea actualizada.':'Task updated.'}</div>}{query.time_off&&<div className="notice success">{lang==='es'?'Fechas enviadas a liderazgo.':'Unavailable dates sent to leadership.'}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <PersonalPlanning churchId={membership.church_id} tasks={tasks??[]} timeOff={timeOff??[]} lang={lang} timeZone={timeZone}/>

    {conflicts.length>0&&<section className="card" style={{padding:18,marginBottom:18,border:'1px solid rgba(245,158,11,.35)'}}><div className="pill"><AlertTriangle size={11}/> {t.conflicts}</div><h2 style={{margin:'8px 0 5px'}}>{t.conflictTitle}</h2><p className="small muted">{t.conflictBody}</p><div style={{display:'grid',gap:8}}>{conflicts.slice(0,8).map((c,i)=><div className="notice" style={{margin:0}} key={`${c.a.id}-${c.b.id}-${i}`}><strong>{c.a.kind}: {c.a.label}</strong><span className="small"> ↔ </span><strong>{c.b.kind}: {c.b.label}</strong><div className="small muted">{formatChurchDate(new Date(c.a.starts).toISOString(),timeZone,{weekday:'short',month:'short',day:'numeric'})} • {formatChurchTime(new Date(c.a.starts).toISOString(),timeZone)} / {formatChurchTime(new Date(c.b.starts).toISOString(),timeZone)}</div></div>)}</div></section>}

    <div style={{display:'grid',gap:18}}>
      <section className="card" style={{padding:18}}><div className="pill">{t.assignments}</div><div style={{display:'grid',gap:10,marginTop:14}}>{(assignments??[]).map((a:any)=>{const ministry=Array.isArray(a.ministries)?a.ministries[0]:a.ministries;return <article key={a.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><strong>{a.title}</strong><div className="small muted" style={{marginTop:4}}>{ministry?.name||'Ministry'}{a.notes?` • ${a.notes}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div><CalendarDays size={12} style={{verticalAlign:'middle'}}/> {formatChurchDate(a.starts_at,timeZone,{weekday:'short',month:'short',day:'numeric'})}</div><div><Clock size={12} style={{verticalAlign:'middle'}}/> {formatChurchTime(a.starts_at,timeZone)}</div>{a.call_time&&<div className="muted">{t.call}: {formatChurchTime(a.call_time,timeZone)}</div>}</div></div></article>})}{!assignments?.length&&<p className="muted">{t.noneAssignments}</p>}</div></section>
      <section className="card" style={{padding:18}}><div className="pill">{t.events}</div><div style={{display:'grid',gap:10,marginTop:14}}>{goingEvents.map((e:any)=><article key={e.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><CalendarDays size={15}/><strong style={{marginLeft:7}}>{e.title}</strong>{e.location&&<div className="small muted" style={{marginTop:4}}><MapPin size={12} style={{verticalAlign:'middle'}}/> {e.location}</div>}</div><div className="small" style={{textAlign:'right'}}><div>{formatChurchDate(e.starts_at,timeZone,{weekday:'short',month:'short',day:'numeric'})}</div><div>{formatChurchTime(e.starts_at,timeZone)}{e.ends_at?` – ${formatChurchTime(e.ends_at,timeZone)}`:''}</div></div></div></article>)}{!goingEvents.length&&<p className="muted">{t.noneEvents}</p>}</div></section>
      <section className="card" style={{padding:18}}><div className="pill">{t.classes}</div><div style={{display:'grid',gap:10,marginTop:14}}>{sessions.map((s:any)=>{const course=Array.isArray(s.courses)?s.courses[0]:s.courses;return <article key={s.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><BookOpen size={15}/><strong style={{marginLeft:7}}>{s.title||course?.title||'Class'}</strong><div className="small muted" style={{marginTop:4}}>{course?.title}{s.instructor_user_id===userId?` • ${lang==='es'?'Tú enseñas':'You are teaching'}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div>{niceDate(s.session_date)}</div><div>{niceTime(s.starts_at)}</div></div></div></article>})}{!sessions.length&&<p className="muted">{t.noneClasses}</p>}</div></section>
      <section className="card" style={{padding:18}}><div className="pill">{t.groups}</div><div style={{display:'grid',gap:10,marginTop:14}}>{groups.map((g:any)=><article key={g.group.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><Users size={15}/><strong style={{marginLeft:7}}>{g.group.name}</strong><div className="small muted" style={{marginTop:4}}>{t.role}: {g.role}{g.group.location_label?` • ${g.group.location_label}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div>{g.group.meeting_day||'TBD'}</div><div>{niceTime(g.group.meeting_time)} • {String(g.group.meeting_frequency||'weekly').replaceAll('_',' ')}</div></div></div></article>)}{!groups.length&&<p className="muted">{t.noneGroups}</p>}</div></section>
    </div>
  </main>
}