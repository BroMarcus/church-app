import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness,Clock,UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate } from '@/lib/church-time'
import { createAssignment,respondToAssignment } from './actions'
import './teams.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function TeamsPage({searchParams}:{searchParams:Promise<{created?:string;responded?:string;error?:string;member?:string;ministry?:string;lang?:string}>}){
  const query=await searchParams,es=query.lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const {data:customManage}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_teams'})
  const canManage=['ministry_leader','minister','pastor','church_admin'].includes(membership.role)||Boolean(customManage)
  let assignmentQuery=supabase.from('team_assignments').select('*').eq('church_id',churchId).gte('starts_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('starts_at').limit(100)
  if(!canManage)assignmentQuery=assignmentQuery.eq('assigned_user_id',userId)
  const [{data:assignments},{data:responses},{data:ministries},{data:churchMembers}]=await Promise.all([
    assignmentQuery,
    supabase.from('team_assignment_responses').select('*'),
    supabase.from('ministries').select('id,name').eq('church_id',churchId).eq('active',true).order('name'),
    canManage?supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active'):Promise.resolve({data:[] as any[]})
  ])
  const ids=Array.from(new Set([...(assignments??[]).map((a:any)=>a.assigned_user_id),...(churchMembers??[]).map((m:any)=>m.user_id)]))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const responseBy=new Map((responses??[]).map((r:any)=>[r.assignment_id,r]))
  const ministryBy=new Map((ministries??[]).map((m:any)=>[m.id,m.name]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const dateTime=(v:string)=>formatChurchDate(v,timeZone,{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
  const memberOptions=(churchMembers??[]).map((m:any)=>({id:m.user_id,name:personName(pm.get(m.user_id))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const preselectedMember=memberOptions.some((m:any)=>m.id===query.member)?query.member??'':''
  const preselectedMinistry=(ministries??[]).some((m:any)=>m.id===query.ministry)?query.ministry??'':''
  const handoffLoaded=Boolean(preselectedMember&&preselectedMinistry)
  const pendingMine=(assignments??[]).filter((a:any)=>a.assigned_user_id===userId&&a.confirmation_required&&!responseBy.get(a.id)).length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • {es?'Equipos':'Teams'} • {timeZone.replaceAll('_',' ')}</div></div><div className="row"><Link className="ghost" href="/teams?lang=en">English</Link><Link className="ghost" href="/teams?lang=es">Español</Link><Link className="ghost" href={l('/today')}>{es?'Mi Día':'My Today'}</Link><Link className="ghost" href={l('/calendar/my')}>{es?'Mi Horario':'My Schedule'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
    <section className="teams-hero card"><div><div className="pill">{canManage?(es?'HORARIOS DE EQUIPOS':'TEAM SCHEDULES'):(es?'MIS RESPONSABILIDADES':'MY RESPONSIBILITIES')}</div><h1>{canManage?(es?'Programa con claridad.':'Schedule with clarity.'):(es?'Sabe cuándo te toca servir.':'Know when you’re serving.')}</h1><p className="muted">{canManage?(es?'Asignaciones, horarios de llegada y respuestas en un solo lugar.':'Assignments, call times and responses in one place.'):(es?'Solo tus asignaciones, horarios y confirmaciones — sin ruido extra.':'Only your assignments, call times and confirmations — no extra noise.')}</p></div><div className="hero-stat"><strong>{canManage?(assignments?.length??0):pendingMine}</strong><span>{canManage?(es?'asignaciones próximas':'upcoming assignments'):(es?'necesitan respuesta':'need a response')}</span></div></section>
    {query.created&&<div className="notice success">{es?'Asignación creada.':'Assignment created.'}</div>}{query.responded&&<div className="notice success">{es?'Tu respuesta fue guardada.':'Your response was saved.'}</div>}{handoffLoaded&&<div className="notice success">{es?'Miembro y ministerio cargados. Agrega los detalles del servicio.':'Accepted ministry applicant loaded. Add the service details below.'}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="teams-layout"><section className="assignment-list">{(assignments??[]).map((a:any)=>{const response:any=responseBy.get(a.id);const mine=a.assigned_user_id===userId;return <article className="card assignment-card" key={a.id}><div className="assignment-head"><div><div className="assignment-person"><div className="avatar">{personName(pm.get(a.assigned_user_id)).slice(0,1).toUpperCase()}</div><div><strong>{canManage?personName(pm.get(a.assigned_user_id)):(es?'Tú':'You')}</strong><div className="small muted">{a.ministry_id?ministryBy.get(a.ministry_id)||(es?'Ministerio':'Ministry'):(es?'Equipo de la iglesia':'Church team')}</div></div></div><h2>{a.title}</h2></div><span className={`response-chip ${response?.response??''}`}>{response?.response??(a.confirmation_required?(es?'esperando respuesta':'awaiting response'):(es?'programado':'scheduled'))}</span></div><div className="assignment-meta"><span><BriefcaseBusiness size={13}/>{dateTime(a.starts_at)}</span>{a.call_time&&<span><Clock size={13}/>{es?'Llegar':'Call time'} {dateTime(a.call_time)}</span>}</div>{a.notes&&<p className="muted">{a.notes}</p>}{mine&&a.confirmation_required&&<form action={respondToAssignment} className="response-actions"><input type="hidden" name="assignment_id" value={a.id}/><label className="field"><span>{es?'Nota opcional':'Optional note'}</span><input name="note" defaultValue={response?.note??''} placeholder={es?'Algo que el líder debe saber':'Anything leadership should know'}/></label><button className="btn" name="response" value="confirmed"><UserCheck size={14}/> {es?'Sí, puedo servir':'Yes, I can serve'}</button><button className="ghost" name="response" value="declined">{es?'No puedo servir':'I can’t serve'}</button></form>}</article>})}{!assignments?.length&&<div className="card team-empty"><h3>{es?'No tienes asignaciones próximas.':'No upcoming assignments.'}</h3><p className="muted">{es?'Cuando te programen, aparecerá aquí.':'When you are scheduled, it will appear here.'}</p></div>}</section>

    <aside>{canManage?<section className="card create-assignment"><div className="pill">{es?'LIDERAZGO':'LEADERSHIP'}</div><h2>{es?'Programar miembro':'Schedule team member'}</h2><p className="small muted">{es?`Las horas se ingresan en ${timeZone.replaceAll('_',' ')}.`:`Times are entered in ${timeZone.replaceAll('_',' ')}.`}</p><form action={createAssignment}><input type="hidden" name="church_id" value={churchId}/><label className="field"><span>{es?'Persona':'Person'}</span><select name="assigned_user_id" required defaultValue={preselectedMember}><option value="" disabled>{es?'Escoger miembro':'Choose member'}</option>{memberOptions.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>{es?'Ministerio':'Ministry'}</span><select name="ministry_id" defaultValue={preselectedMinistry}><option value="">{es?'Equipo general':'General church team'}</option>{(ministries??[]).map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>{es?'Asignación':'Assignment'}</span><input name="title" required placeholder={es?'Ej. Sonido – Domingo AM':'e.g. Sound Booth – Sunday AM'}/></label><label className="field"><span>{es?'Hora del servicio / evento':'Service / event time'}</span><input type="datetime-local" name="starts_at" required/></label><label className="field"><span>{es?'Hora de llegada':'Call time'}</span><input type="datetime-local" name="call_time"/></label><label className="field"><span>{es?'Notas':'Notes'}</span><textarea name="notes" rows={3} placeholder={es?'Ropa, lugar, instrucciones, etc.':'Dress, location, setup instructions, etc.'}/></label><button className="btn">{es?'Crear asignación':'Create assignment'}</button></form></section>:<section className="card side"><div className="pill">{es?'MI EQUIPO':'MY TEAM'}</div><h3>{es?'Una respuesta sencilla.':'One simple response.'}</h3><p className="muted">{es?'Cuando te asignen, solo confirma o indica que no puedes servir. Tu líder lo verá inmediatamente.':'When you’re assigned, simply confirm or say you can’t serve. Your leader sees it immediately.'}</p></section>}</aside></div>
  </main>
}
