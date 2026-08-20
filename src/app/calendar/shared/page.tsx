import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Clock,MapPin,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'
import '../calendar.css'

type ChurchRow={name:string|null;timezone:string|null}
type MembershipRow={church_id:string;churches:ChurchRow|ChurchRow[]|null}
type ScheduleRow={id:string;name:string;schedule_type:string;description:string|null;ministry_id:string|null;group_id:string|null;active:boolean}
type ScheduleItemRow={id:string;schedule_id:string;title:string;starts_at:string;ends_at:string|null;location:string|null;notes:string|null;status:string}
type AssignmentRow={id:string;schedule_item_id:string|null;assigned_user_id:string;role_label:string|null;title:string;call_time:string|null;assignment_status:string}
type ResponseRow={assignment_id:string;response:string}
type ProfileRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null}
type MinistryRow={id:string;name:string}
type GroupRow={id:string;name:string}
type Query={lang?:string}

export default async function SharedSchedulesPage({searchParams}:{searchParams:Promise<Query>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membershipData}=await supabase.from('church_memberships').select('church_id,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  const membership=membershipData as MembershipRow|null
  if(!membership?.church_id)redirect('/')
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC',churchId=membership.church_id,now=new Date(Date.now()-6*60*60*1000).toISOString()

  const [{data:schedulesData},{data:ministriesData},{data:groupsData}]=await Promise.all([
    supabase.from('church_schedules').select('id,name,schedule_type,description,ministry_id,group_id,active').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('ministries').select('id,name').eq('church_id',churchId),
    supabase.from('groups').select('id,name').eq('church_id',churchId)
  ])
  const schedules=(schedulesData??[]) as ScheduleRow[]
  const ministries=(ministriesData??[]) as MinistryRow[]
  const groups=(groupsData??[]) as GroupRow[]
  const scheduleIds=schedules.map(schedule=>schedule.id)
  let items:ScheduleItemRow[]=[]
  if(scheduleIds.length){
    const {data}=await supabase.from('schedule_items').select('id,schedule_id,title,starts_at,ends_at,location,notes,status').in('schedule_id',scheduleIds).eq('church_id',churchId).gte('starts_at',now).order('starts_at').limit(200)
    items=(data??[]) as ScheduleItemRow[]
  }
  const itemIds=items.map(item=>item.id)
  let assignments:AssignmentRow[]=[],responses:ResponseRow[]=[]
  if(itemIds.length){
    const {data}=await supabase.from('team_assignments').select('id,schedule_item_id,assigned_user_id,role_label,title,call_time,assignment_status').in('schedule_item_id',itemIds).eq('church_id',churchId).eq('assignment_status','scheduled').order('role_label')
    assignments=(data??[]) as AssignmentRow[]
    const assignmentIds=assignments.map(assignment=>assignment.id)
    if(assignmentIds.length){const {data:responseData}=await supabase.from('team_assignment_responses').select('assignment_id,response').in('assignment_id',assignmentIds);responses=(responseData??[]) as ResponseRow[]}
  }
  const profileIds=Array.from(new Set(assignments.map(assignment=>assignment.assigned_user_id)))
  let profiles:ProfileRow[]=[]
  if(profileIds.length){const {data}=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=(data??[]) as ProfileRow[]}
  const profileById=new Map(profiles.map(profile=>[profile.id,profile]))
  const nameOf=(id:string)=>{const profile=profileById.get(id);return profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia')}
  const responseByAssignment=new Map(responses.map(response=>[response.assignment_id,response.response]))
  const ministryById=new Map(ministries.map(ministry=>[ministry.id,ministry.name])),groupById=new Map(groups.map(group=>[group.id,group.name]))
  const upcomingSchedules=schedules.filter(schedule=>items.some(item=>item.schedule_id===schedule.id&&item.status==='scheduled'))

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Shared Schedules','Horarios Compartidos')}</div></div><div className="row"><Link className="ghost" href="/calendar/shared?lang=en">English</Link><Link className="ghost" href="/calendar/shared?lang=es">Español</Link><Link className="ghost" href={l('/calendar/my')}>{t('My Schedule','Mi Horario')}</Link><Link className="ghost" href={l('/calendar')}>← {t('Church Calendar','Calendario')}</Link></div></header>

    <section className="calendar-hero card"><div><div className="pill">{t('SHARED WITH YOUR TEAMS','COMPARTIDO CON TUS EQUIPOS')}</div><h1>{t('See the whole lineup together.','Mira todo el equipo junto.')}</h1><p className="muted">{t('These are the church, ministry and group schedules you belong to. Everyone on the schedule sees the same roles and times.','Estos son los horarios de iglesia, ministerio y grupo a los que perteneces. Todos ven las mismas funciones y horas.')}</p></div><div className="hero-stat"><strong>{upcomingSchedules.length}</strong><span>{t('schedules with upcoming dates','horarios con fechas próximas')}</span></div></section>

    <section style={{display:'grid',gap:18}}>{upcomingSchedules.map(schedule=>{const scheduleItems=items.filter(item=>item.schedule_id===schedule.id&&item.status==='scheduled');const scope=schedule.ministry_id?ministryById.get(schedule.ministry_id):schedule.group_id?groupById.get(schedule.group_id):t('Whole church','Toda la iglesia');return <article className="card" key={schedule.id} style={{padding:18}}><div><div className="pill">{schedule.schedule_type.replaceAll('_',' ').toUpperCase()}</div><h2 style={{margin:'8px 0 4px'}}>{schedule.name}</h2><p className="small muted" style={{margin:0}}>{scope}{schedule.description?` • ${schedule.description}`:''}</p></div><div style={{display:'grid',gap:12,marginTop:16}}>{scheduleItems.map(item=>{const itemAssignments=assignments.filter(assignment=>assignment.schedule_item_id===item.id);return <section key={item.id} style={{padding:14,border:'1px solid var(--line)',borderRadius:14}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}><div><strong>{item.title}</strong><div className="small muted" style={{marginTop:4}}><CalendarDays size={12}/> {formatChurchDate(item.starts_at,timeZone,{weekday:'long',month:'short',day:'numeric'})} • <Clock size={12}/> {formatChurchTime(item.starts_at,timeZone)}{item.ends_at?` – ${formatChurchTime(item.ends_at,timeZone)}`:''}{item.location&&<> • <MapPin size={12}/> {item.location}</>}</div>{item.notes&&<div className="small muted" style={{marginTop:4}}>{item.notes}</div>}</div><span className="response-chip"><Users size={12}/> {itemAssignments.length} {t('assigned','asignados')}</span></div><div style={{display:'grid',gap:7,marginTop:12}}>{itemAssignments.map(assignment=>{const response=responseByAssignment.get(assignment.id);return <div className="row" key={assignment.id} style={{justifyContent:'space-between',gap:12,padding:'7px 0',borderTop:'1px solid var(--line)'}}><div><strong>{assignment.role_label||assignment.title}</strong><span className="small muted"> • {nameOf(assignment.assigned_user_id)}</span>{assignment.call_time&&<div className="small muted">{t('Call','Llegada')}: {formatChurchTime(assignment.call_time,timeZone)}</div>}</div><span className={`response-chip ${response??''}`}>{response==='confirmed'?t('confirmed','confirmado'):response==='declined'?t('declined','no disponible'):t('pending','pendiente')}</span></div>})}{!itemAssignments.length&&<p className="small muted">{t('No individual roles have been assigned yet.','Todavía no se han asignado funciones individuales.')}</p>}</div></section>})}</div></article>})}{!upcomingSchedules.length&&<div className="card" style={{padding:18}}><h3>{t('No shared schedule dates yet.','Todavía no hay fechas compartidas.')}</h3><p className="muted">{t('When your church, team or group publishes a schedule, it will appear here automatically.','Cuando tu iglesia, equipo o grupo publique un horario, aparecerá aquí automáticamente.')}</p></div>}</section>
  </main>
}
