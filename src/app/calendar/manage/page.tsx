import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarClock,ClipboardList,Plane,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createMemberTask,reviewTimeOff,setMemberTaskStatus } from '../actions'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'

const nameOf=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function ChurchScheduleManagePage({searchParams}:{searchParams:Promise<{lang?:string;task_created?:string;task_saved?:string;reviewed?:string;error?:string}>}){
  const query=await searchParams,lang=query.lang==='es'?'es':'en',es=lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_teams'})
  const canManage=['ministry_leader','minister','pastor','church_admin'].includes(membership.role)||Boolean(custom)
  if(!canManage)redirect(l('/calendar/my'))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches,timeZone=church?.timezone||'UTC'
  const today=new Date().toISOString().slice(0,10)
  const [{data:memberRows},{data:tasks},{data:timeOff}]=await Promise.all([
    supabase.from('church_memberships').select('user_id,role').eq('church_id',membership.church_id).eq('status','active'),
    supabase.from('member_tasks').select('id,assigned_to,created_by,title,notes,due_at,status,priority').eq('church_id',membership.church_id).in('status',['open','in_progress']).order('due_at',{ascending:true,nullsFirst:false}).limit(100),
    supabase.from('member_time_off').select('id,user_id,starts_on,ends_on,notes,status').eq('church_id',membership.church_id).gte('ends_on',today).order('starts_on').limit(100)
  ])
  const ids=Array.from(new Set([...(memberRows??[]).map((m:any)=>m.user_id),...(tasks??[]).map((t:any)=>t.assigned_to),...(timeOff??[]).map((r:any)=>r.user_id)]))
  let profiles:any[]=[];if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map(p=>[p.id,p]))
  const members=(memberRows??[]).map((m:any)=>({id:m.user_id,name:nameOf(pm.get(m.user_id)),role:m.role})).sort((a,b)=>a.name.localeCompare(b.name))
  const pending=(timeOff??[]).filter((r:any)=>r.status==='pending'),approved=(timeOff??[]).filter((r:any)=>r.status==='approved')

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Horario de la Iglesia':'Church Schedule'}</div></div><div className="row"><Link className="ghost" href="/calendar/manage?lang=en">English</Link><Link className="ghost" href="/calendar/manage?lang=es">Español</Link><Link className="ghost" href={l('/calendar')}>{es?'Calendario':'Calendar'}</Link><Link className="ghost" href={l('/calendar/my')}>{es?'Mi Horario':'My Schedule'}</Link></div></header>
    <section className="hero card"><div><div className="pill"><CalendarClock size={11}/> {es?'HORARIO DE LA IGLESIA':'CHURCH SCHEDULE'}</div><h1>{es?'Coordina personas, tareas y disponibilidad.':'Coordinate people, tasks and availability.'}</h1><p>{es?'Este es el lado de liderazgo de la programación. No expone información privada fuera de las personas autorizadas.':'This is the leadership side of scheduling. It stays inside the authorized scheduling permission boundary.'}</p></div><div className="hero-stat"><strong>{pending.length}</strong><span>{es?'solicitudes por revisar':'availability items to review'}</span></div></section>
    {query.task_created&&<div className="notice success">{es?'Tarea asignada.':'Task assigned.'}</div>}{query.task_saved&&<div className="notice success">{es?'Tarea actualizada.':'Task updated.'}</div>}{query.reviewed&&<div className="notice success">{es?'Disponibilidad revisada.':'Availability reviewed.'}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:18}}><div className="pill"><ClipboardList size={11}/> {es?'ASIGNAR TAREA':'ASSIGN TASK'}</div><h2>{es?'Dale a alguien un siguiente paso claro.':'Give someone a clear next step.'}</h2><form action={createMemberTask} style={{display:'grid',gap:10}}><input type="hidden" name="church_id" value={membership.church_id}/><input type="hidden" name="back" value="/calendar/manage"/><input type="hidden" name="lang" value={lang}/><div className="report-grid"><label className="field"><span>{es?'Persona':'Person'}</span><select name="assigned_to" required defaultValue=""><option value="" disabled>{es?'Seleccionar persona':'Choose person'}</option>{members.map(m=><option value={m.id} key={m.id}>{m.name} • {String(m.role).replaceAll('_',' ')}</option>)}</select></label><label className="field"><span>{es?'Fecha límite':'Due'}</span><input type="datetime-local" name="due_at"/></label><label className="field"><span>{es?'Prioridad':'Priority'}</span><select name="priority" defaultValue="normal"><option value="low">{es?'Baja':'Low'}</option><option value="normal">{es?'Normal':'Normal'}</option><option value="high">{es?'Alta':'High'}</option></select></label></div><label className="field"><span>{es?'Tarea':'Task'}</span><input name="title" required maxLength={180}/></label><label className="field"><span>{es?'Notas':'Notes'}</span><textarea name="notes" rows={2}/></label><button className="btn">{es?'Asignar tarea':'Assign task'}</button></form></section>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:18}}>
      <section className="card" style={{padding:18}}><div className="pill"><ClipboardList size={11}/> {es?'TAREAS ABIERTAS':'OPEN TASKS'}</div><h2>{tasks?.length??0} {es?'pendientes':'outstanding'}</h2><div style={{display:'grid',gap:8}}>{(tasks??[]).map((t:any)=><article className="notice" style={{margin:0}} key={t.id}><strong>{nameOf(pm.get(t.assigned_to))}</strong> • {t.title}<div className="small muted">{t.priority}{t.due_at?` • ${formatChurchDate(t.due_at,timeZone,{month:'short',day:'numeric'})} ${formatChurchTime(t.due_at,timeZone)}`:''}</div>{t.notes&&<div className="small">{t.notes}</div>}<form action={setMemberTaskStatus} style={{marginTop:7}}><input type="hidden" name="task_id" value={t.id}/><input type="hidden" name="status" value="completed"/><input type="hidden" name="back" value="/calendar/manage"/><input type="hidden" name="lang" value={lang}/><button className="ghost">{es?'Marcar terminada':'Mark complete'}</button></form></article>)}{!tasks?.length&&<p className="muted">{es?'No hay tareas abiertas.':'No open tasks.'}</p>}</div></section>

      <section className="card" style={{padding:18}}><div className="pill"><Plane size={11}/> {es?'DISPONIBILIDAD':'AVAILABILITY'}</div><h2>{es?'Tiempo no disponible':'Unavailable dates'}</h2><div style={{display:'grid',gap:8}}>{pending.map((r:any)=><article className="notice" style={{margin:0}} key={r.id}><strong>{nameOf(pm.get(r.user_id))}</strong><div>{r.starts_on===r.ends_on?r.starts_on:`${r.starts_on} → ${r.ends_on}`}</div>{r.notes&&<div className="small muted">{r.notes}</div>}<div className="row" style={{gap:7,marginTop:8}}><form action={reviewTimeOff}><input type="hidden" name="request_id" value={r.id}/><input type="hidden" name="status" value="approved"/><input type="hidden" name="lang" value={lang}/><button className="btn">{es?'Aprobar':'Approve'}</button></form><form action={reviewTimeOff}><input type="hidden" name="request_id" value={r.id}/><input type="hidden" name="status" value="declined"/><input type="hidden" name="lang" value={lang}/><button className="ghost">{es?'Rechazar':'Decline'}</button></form></div></article>)}{!pending.length&&<p className="muted">{es?'Nada espera revisión.':'Nothing waiting for review.'}</p>}</div>{approved.length>0&&<details style={{marginTop:12}}><summary style={{cursor:'pointer',fontWeight:800}}>{es?'Ver fechas aprobadas':'View approved dates'} ({approved.length})</summary><div style={{display:'grid',gap:6,marginTop:8}}>{approved.map((r:any)=><div className="small muted" key={r.id}><strong>{nameOf(pm.get(r.user_id))}</strong> • {r.starts_on===r.ends_on?r.starts_on:`${r.starts_on} → ${r.ends_on}`}</div>)}</div></details>}</section>
    </div>
  </main>
}