import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarDays, Clock, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'

const copy={
  en:{title:'My Schedule',subtitle:'Your assignments, classes and group rhythm in one place.',church:'Church Calendar',home:'Home',assignments:'MINISTRY ASSIGNMENTS',classes:'CLASSES',groups:'FRIENDSHIP GROUPS',noneAssignments:'No upcoming ministry assignments.',noneClasses:'No upcoming classes on your schedule.',noneGroups:'You are not connected to a group yet.',call:'Call time',starts:'Starts',role:'Your role'},
  es:{title:'Mi Horario',subtitle:'Tus asignaciones, clases y grupos en un solo lugar.',church:'Calendario de la Iglesia',home:'Inicio',assignments:'ASIGNACIONES DE MINISTERIO',classes:'CLASES',groups:'GRUPOS DE AMISTAD',noneAssignments:'No tienes asignaciones próximas.',noneClasses:'No tienes clases próximas en tu horario.',noneGroups:'Todavía no estás conectado a un grupo.',call:'Hora de llegada',starts:'Empieza',role:'Tu rol'}
} as const

export default async function MySchedulePage({searchParams}:{searchParams:Promise<{lang?:string}>}){
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

  const [{data:assignments},{data:enrollments},{data:groupMemberships},{data:allSessions}]=await Promise.all([
    supabase.from('team_assignments').select('id,title,starts_at,call_time,notes,ministry_id,ministries(name)').eq('church_id',membership.church_id).eq('assigned_user_id',userId).gte('starts_at',nowIso).order('starts_at').limit(30),
    supabase.from('course_enrollments').select('course_id').eq('user_id',userId),
    supabase.from('group_memberships').select('role,groups(id,name,meeting_day,meeting_time,meeting_frequency,location_label,active)').eq('user_id',userId),
    supabase.from('course_sessions').select('id,course_id,session_date,starts_at,title,instructor_user_id,status,courses(title)').eq('church_id',membership.church_id).gte('session_date',today).eq('status','scheduled').order('session_date').limit(80)
  ])
  const enrolled=new Set((enrollments??[]).map((e:any)=>e.course_id))
  const sessions=(allSessions??[]).filter((s:any)=>enrolled.has(s.course_id)||s.instructor_user_id===userId).slice(0,30)
  const groups=(groupMemberships??[]).filter((g:any)=>{const x=Array.isArray(g.groups)?g.groups[0]:g.groups;return x?.active!==false}).map((g:any)=>({...g,group:Array.isArray(g.groups)?g.groups[0]:g.groups})).filter((g:any)=>g.group)
  const niceDate=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString(lang==='es'?'es-US':'en-US',{weekday:'short',month:'short',day:'numeric'})
  const niceTime=(v:string|null)=>v?new Date(`1970-01-01T${String(v).slice(0,8)}`).toLocaleTimeString(lang==='es'?'es-US':'en-US',{hour:'numeric',minute:'2-digit'}):'—'

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {t.title}</div></div><div className="row"><Link className="ghost" href="/calendar/my?lang=en">English</Link><Link className="ghost" href="/calendar/my?lang=es">Español</Link><Link className="ghost" href={l('/calendar')}>{t.church}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>

    <section className="hero card"><div><div className="pill">{lang==='es'?'MI HORARIO':'MY SCHEDULE'}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="hero-stat"><strong>{(assignments?.length??0)+sessions.length}</strong><span>{lang==='es'?'cosas próximas':'upcoming items'}</span></div></section>

    <div style={{display:'grid',gap:18}}>
      <section className="card" style={{padding:18}}><div className="pill">{t.assignments}</div><div style={{display:'grid',gap:10,marginTop:14}}>{(assignments??[]).map((a:any)=>{const ministry=Array.isArray(a.ministries)?a.ministries[0]:a.ministries;return <article key={a.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><strong>{a.title}</strong><div className="small muted" style={{marginTop:4}}>{ministry?.name||'Ministry'}{a.notes?` • ${a.notes}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div><CalendarDays size={12} style={{verticalAlign:'middle'}}/> {formatChurchDate(a.starts_at,timeZone,{weekday:'short',month:'short',day:'numeric'})}</div><div><Clock size={12} style={{verticalAlign:'middle'}}/> {formatChurchTime(a.starts_at,timeZone)}</div>{a.call_time&&<div className="muted">{t.call}: {formatChurchTime(a.call_time,timeZone)}</div>}</div></div></article>})}{!assignments?.length&&<p className="muted">{t.noneAssignments}</p>}</div></section>

      <section className="card" style={{padding:18}}><div className="pill">{t.classes}</div><div style={{display:'grid',gap:10,marginTop:14}}>{sessions.map((s:any)=>{const course=Array.isArray(s.courses)?s.courses[0]:s.courses;return <article key={s.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><BookOpen size={15}/><strong style={{marginLeft:7}}>{s.title||course?.title||'Class'}</strong><div className="small muted" style={{marginTop:4}}>{course?.title}{s.instructor_user_id===userId?` • ${lang==='es'?'Tú enseñas':'You are teaching'}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div>{niceDate(s.session_date)}</div><div>{niceTime(s.starts_at)}</div></div></div></article>})}{!sessions.length&&<p className="muted">{t.noneClasses}</p>}</div></section>

      <section className="card" style={{padding:18}}><div className="pill">{t.groups}</div><div style={{display:'grid',gap:10,marginTop:14}}>{groups.map((g:any)=><article key={g.group.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><Users size={15}/><strong style={{marginLeft:7}}>{g.group.name}</strong><div className="small muted" style={{marginTop:4}}>{t.role}: {g.role}{g.group.location_label?` • ${g.group.location_label}`:''}</div></div><div className="small" style={{textAlign:'right'}}><div>{g.group.meeting_day||'TBD'}</div><div>{niceTime(g.group.meeting_time)} • {String(g.group.meeting_frequency||'weekly').replaceAll('_',' ')}</div></div></div></article>)}{!groups.length&&<p className="muted">{t.noneGroups}</p>}</div></section>
    </div>
  </main>
}
