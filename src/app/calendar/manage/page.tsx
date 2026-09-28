import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Clock,MapPin,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'
import { archiveScheduleAssignment,createSchedule,createScheduleAssignment,createScheduleItem,reviewFiveSpotRequest,saveScheduleMonthPlan,updateSchedule,updateScheduleAssignment,updateScheduleItem } from './actions'
import '../calendar.css'

type ChurchRow={name:string|null;timezone:string|null}
type MembershipRow={church_id:string;role:string;churches:ChurchRow|ChurchRow[]|null}
type MinistryRow={id:string;name:string;active:boolean}
type GroupRow={id:string;name:string;group_type:string;leader_id:string|null;active:boolean}
type GroupMembershipRow={group_id:string;role:string;user_id:string}
type TeamMemberRow={ministry_id:string;user_id:string;role_label:string;is_leader:boolean;member_status:string}
type ChurchMemberRow={user_id:string}
type ProfileRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null}
type ScheduleRow={id:string;name:string;schedule_type:string;description:string|null;ministry_id:string|null;group_id:string|null;active:boolean}
type ScheduleItemRow={id:string;schedule_id:string;title:string;starts_at:string;ends_at:string|null;location:string|null;notes:string|null;status:string}
type AssignmentRow={id:string;schedule_item_id:string|null;assigned_user_id:string;title:string;role_label:string|null;call_time:string|null;notes:string|null;assignment_status:string;schedule_override:boolean;schedule_conflict_summary:string|null}
type ResponseRow={assignment_id:string;response:string;note:string|null}
type MonthPlanRow={id:string;schedule_id:string;month_start:string;theme:string|null;scripture:string|null;notes:string|null}
type FiveSpotRow={id:string;requester_user_id:string;scripture:string;title_idea:string;main_thought:string;short_outline:string;notes:string|null;mentor_user_id:string|null;leader_feedback:string|null;status:string;scheduled_assignment_id:string|null;created_at:string}
type YearAssignmentRow={schedule_item_id:string|null;role_label:string|null;title:string;assignment_status:string}
type Query={lang?:string;schedule?:string;ministry?:string;month?:string;date?:string;schedule_created?:string;schedule_saved?:string;item_created?:string;item_saved?:string;assignment_created?:string;assignment_saved?:string;month_plan_saved?:string;five_spot_saved?:string;error?:string}

const broadRoles=new Set(['ministry_leader','minister','pastor','church_admin'])

function localInput(iso:string|null,timeZone:string){
  if(!iso)return ''
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(iso))
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??''
  const hour=get('hour')==='24'?'00':get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

function localDateKey(value:Date|string,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(typeof value==='string'?new Date(value):value)
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function shiftMonth(monthKey:string,delta:number){
  const [year,month]=monthKey.split('-').map(Number)
  const date=new Date(Date.UTC(year,month-1+delta,1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`
}

function monthGrid(monthKey:string){
  const [year,month]=monthKey.split('-').map(Number)
  const first=new Date(Date.UTC(year,month-1,1))
  const count=new Date(Date.UTC(year,month,0)).getUTCDate()
  const cells:(string|null)[]=Array(first.getUTCDay()).fill(null)
  for(let day=1;day<=count;day++)cells.push(`${monthKey}-${String(day).padStart(2,'0')}`)
  while(cells.length%7)cells.push(null)
  return cells
}

function monthLabel(monthKey:string,lang:string){
  const [year,month]=monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat(lang==='es'?'es-US':'en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))
}

export default async function ScheduleManagementPage({searchParams}:{searchParams:Promise<Query>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))

  const {data:membershipData}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  const membership=membershipData as MembershipRow|null
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'

  const [teamPermission,calendarPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_calendar'})
  ])
  const broadAccess=broadRoles.has(membership.role)||Boolean(teamPermission.data)||Boolean(calendarPermission.data)

  const [{data:ministriesData},{data:groupsData},{data:myGroupMembershipsData},{data:myTeamMembershipsData},{data:schedulesData},{data:churchMembersData}]=await Promise.all([
    supabase.from('ministries').select('id,name,active').eq('church_id',churchId).order('name'),
    supabase.from('groups').select('id,name,group_type,leader_id,active').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('group_memberships').select('group_id,role,user_id').eq('user_id',userId),
    supabase.from('ministry_team_members').select('ministry_id,user_id,role_label,is_leader,member_status').eq('church_id',churchId).eq('user_id',userId),
    supabase.from('church_schedules').select('id,name,schedule_type,description,ministry_id,group_id,active').eq('church_id',churchId).order('active',{ascending:false}).order('name'),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active')
  ])

  const ministries=(ministriesData??[]) as MinistryRow[]
  const groups=(groupsData??[]) as GroupRow[]
  const myGroupMemberships=(myGroupMembershipsData??[]) as GroupMembershipRow[]
  const myTeamMemberships=(myTeamMembershipsData??[]) as TeamMemberRow[]
  const schedules=(schedulesData??[]) as ScheduleRow[]
  const churchMembers=(churchMembersData??[]) as ChurchMemberRow[]
  const leaderGroupIds=new Set(groups.filter(group=>group.leader_id===userId).map(group=>group.id))
  for(const member of myGroupMemberships)if(['leader','assistant'].includes(member.role))leaderGroupIds.add(member.group_id)
  const leaderMinistryIds=new Set(myTeamMemberships.filter(member=>member.is_leader&&member.member_status==='active').map(member=>member.ministry_id))
  const canCreateAnything=broadAccess||leaderGroupIds.size>0||leaderMinistryIds.size>0
  if(!canCreateAnything)redirect(l('/calendar/my'))

  const manageableSchedules=schedules.filter(schedule=>broadAccess||(schedule.ministry_id?leaderMinistryIds.has(schedule.ministry_id):false)||(schedule.group_id?leaderGroupIds.has(schedule.group_id):false))
  const requested=query.schedule&&manageableSchedules.some(schedule=>schedule.id===query.schedule)?query.schedule:null
  const ministryDefault=query.ministry&&ministries.some(ministry=>ministry.id===query.ministry)?query.ministry:''
  const selectedId=requested??manageableSchedules[0]?.id??null
  const selected=selectedId?manageableSchedules.find(schedule=>schedule.id===selectedId)??null:null
  const todayKey=localDateKey(new Date(),timeZone)
  const requestedMonth=/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month??'')?String(query.month):todayKey.slice(0,7)
  const selectedDate=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(query.date??'')?String(query.date):(todayKey.startsWith(requestedMonth)?todayKey:null)
  const previousMonth=shiftMonth(requestedMonth,-1),nextMonth=shiftMonth(requestedMonth,1)
  const gridDays=monthGrid(requestedMonth)
  const monthStartLocal=`${requestedMonth}-01T00:00`,monthEndLocal=`${nextMonth}-01T00:00`
  const [monthStartResult,monthEndResult]=await Promise.all([
    supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:monthStartLocal}),
    supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:monthEndLocal})
  ])
  const monthStartUtc=monthStartResult.data as string|null
  const monthEndUtc=monthEndResult.data as string|null

  let items:ScheduleItemRow[]=[],assignments:AssignmentRow[]=[],responses:ResponseRow[]=[]
  if(selected&&monthStartUtc&&monthEndUtc){
    const {data:itemData}=await supabase.from('schedule_items').select('id,schedule_id,title,starts_at,ends_at,location,notes,status').eq('schedule_id',selected.id).eq('church_id',churchId).gte('starts_at',monthStartUtc).lt('starts_at',monthEndUtc).order('starts_at').limit(180)
    items=(itemData??[]) as ScheduleItemRow[]
    const itemIds=items.map(item=>item.id)
    if(itemIds.length){
      const {data:assignmentData}=await supabase.from('team_assignments').select('id,schedule_item_id,assigned_user_id,title,role_label,call_time,notes,assignment_status,schedule_override,schedule_conflict_summary').in('schedule_item_id',itemIds).eq('church_id',churchId).eq('assignment_status','scheduled').order('role_label')
      assignments=(assignmentData??[]) as AssignmentRow[]
      const assignmentIds=assignments.map(assignment=>assignment.id)
      if(assignmentIds.length){
        const {data:responseData}=await supabase.from('team_assignment_responses').select('assignment_id,response,note').in('assignment_id',assignmentIds)
        responses=(responseData??[]) as ResponseRow[]
      }
    }
  }

  let monthPlans:MonthPlanRow[]=[],fiveSpotRequests:FiveSpotRow[]=[],yearItems:ScheduleItemRow[]=[],yearAssignments:YearAssignmentRow[]=[]
  const planYear=Number(requestedMonth.slice(0,4))
  if(selected?.schedule_type==='preaching'){
    const yearStartLocal=`${planYear}-01-01T00:00`,yearEndLocal=`${planYear+1}-01-01T00:00`
    const [yearStartResult,yearEndResult,planResult,fiveSpotResult]=await Promise.all([
      supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:yearStartLocal}),
      supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:yearEndLocal}),
      supabase.from('schedule_month_plans').select('id,schedule_id,month_start,theme,scripture,notes').eq('schedule_id',selected.id).gte('month_start',`${planYear}-01-01`).lte('month_start',`${planYear}-12-01`).order('month_start'),
      supabase.from('five_spot_requests').select('id,requester_user_id,scripture,title_idea,main_thought,short_outline,notes,mentor_user_id,leader_feedback,status,scheduled_assignment_id,created_at').eq('church_id',churchId).order('created_at',{ascending:false}).limit(80)
    ])
    monthPlans=(planResult.data??[]) as MonthPlanRow[]
    fiveSpotRequests=(fiveSpotResult.data??[]) as FiveSpotRow[]
    if(yearStartResult.data&&yearEndResult.data){
      const {data:yearItemData}=await supabase.from('schedule_items').select('id,schedule_id,title,starts_at,ends_at,location,notes,status').eq('schedule_id',selected.id).eq('church_id',churchId).gte('starts_at',yearStartResult.data as string).lt('starts_at',yearEndResult.data as string).order('starts_at').limit(500)
      yearItems=(yearItemData??[]) as ScheduleItemRow[]
      const yearItemIds=yearItems.map(item=>item.id)
      if(yearItemIds.length){
        const {data:yearAssignmentData}=await supabase.from('team_assignments').select('schedule_item_id,role_label,title,assignment_status').in('schedule_item_id',yearItemIds).eq('church_id',churchId).eq('assignment_status','scheduled')
        yearAssignments=(yearAssignmentData??[]) as YearAssignmentRow[]
      }
    }
  }

  const rosterQuery=selected?.ministry_id?supabase.from('ministry_team_members').select('ministry_id,user_id,role_label,is_leader,member_status').eq('church_id',churchId).eq('ministry_id',selected.ministry_id).eq('member_status','active'):null
  let selectedRoster:TeamMemberRow[]=[]
  if(rosterQuery){const {data}=await rosterQuery;selectedRoster=(data??[]) as TeamMemberRow[]}
  const profileIds=Array.from(new Set([...churchMembers.map(member=>member.user_id),...assignments.map(assignment=>assignment.assigned_user_id),...selectedRoster.map(member=>member.user_id)]))
  let profiles:ProfileRow[]=[]
  if(profileIds.length){const {data}=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=(data??[]) as ProfileRow[]}
  const profileById=new Map(profiles.map(profile=>[profile.id,profile]))
  const nameOf=(id:string)=>{const profile=profileById.get(id);return profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia')}
  const responseByAssignment=new Map(responses.map(response=>[response.assignment_id,response]))
  const ministryById=new Map(ministries.map(ministry=>[ministry.id,ministry.name]))
  const groupById=new Map(groups.map(group=>[group.id,group.name]))
  const rosterOrder=new Map(selectedRoster.map((member,index)=>[member.user_id,index]))
  const memberOptions=churchMembers.map(member=>({id:member.user_id,name:nameOf(member.user_id),rosterOrder:rosterOrder.get(member.user_id)??99999})).sort((a,b)=>a.rosterOrder-b.rosterOrder||a.name.localeCompare(b.name))
  const itemsByDate=new Map<string,ScheduleItemRow[]>()
  for(const item of items){const key=localDateKey(item.starts_at,timeZone);const rows=itemsByDate.get(key)??[];rows.push(item);itemsByDate.set(key,rows)}
  const assignmentsByItem=new Map<string,AssignmentRow[]>()
  for(const assignment of assignments){if(!assignment.schedule_item_id)continue;const rows=assignmentsByItem.get(assignment.schedule_item_id)??[];rows.push(assignment);assignmentsByItem.set(assignment.schedule_item_id,rows)}
  const selectedDateItems=selectedDate?(itemsByDate.get(selectedDate)??[]):[]
  const roleSuggestions=selected?.schedule_type==='preaching'?['Main Message','5 Spot','Testimony','Other']:selected?.schedule_type==='worship'?['Worship Leader','Vocals','Keys','Guitar','Bass','Drums','Media']:selected?.schedule_type==='friendship_group'?['Leader','Assistant','Host','Lesson','Other']:['Lead','Serve','Support','Other']
  const monthPlanByKey=new Map(monthPlans.map(plan=>[plan.month_start.slice(0,7),plan]))
  const activeMonthPlan=monthPlanByKey.get(requestedMonth)
  const yearAssignmentsByItem=new Map<string,YearAssignmentRow[]>()
  for(const assignment of yearAssignments){if(!assignment.schedule_item_id)continue;const rows=yearAssignmentsByItem.get(assignment.schedule_item_id)??[];rows.push(assignment);yearAssignmentsByItem.set(assignment.schedule_item_id,rows)}
  const yearMonths=Array.from({length:12},(_,index)=>`${planYear}-${String(index+1).padStart(2,'0')}`)
  const fiveSpotChoices=(status:string)=>status==='submitted'?['submitted','coaching']:status==='coaching'?['coaching','ready_for_review']:status==='ready_for_review'?['coaching','ready_for_review','approved']:status==='approved'?['coaching','ready_for_review','approved']:status==='scheduled'?['completed']:['completed']
  const fiveSpotLabel=(status:string)=>({submitted:t('Submitted','Enviado'),coaching:t('Coaching','Coaching'),ready_for_review:t('Ready for Review','Listo para Revisión'),approved:t('Approved','Aprobado'),scheduled:t('Scheduled','Programado'),completed:t('Completed','Completado')} as Record<string,string>)[status]??status

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Shared Scheduling','Horarios Compartidos')}</div></div><div className="row"><Link className="ghost" href="/calendar/manage?lang=en">English</Link><Link className="ghost" href="/calendar/manage?lang=es">Español</Link><Link className="ghost" href={l('/teams/manage')}><Users size={14}/>{t('Teams & rosters','Equipos y listas')}</Link><Link className="ghost" href={l('/calendar/my')}>{t('My Schedule','Mi Horario')}</Link><Link className="ghost" href={l('/calendar')}>← {t('Calendar','Calendario')}</Link></div></header>

    <section className="calendar-hero card"><div><div className="pill">{t('CALENDAR-FIRST SCHEDULING','PROGRAMACIÓN DESDE EL CALENDARIO')}</div><h1>{t('Click the date. Choose the person. Save.','Toca la fecha. Escoge la persona. Guarda.')}</h1><p className="muted">{t('One shared scheduling engine for preaching, worship, cleaning, groups and ministry assignments.','Un solo motor de horarios para predicación, alabanza, limpieza, grupos y asignaciones ministeriales.')}</p></div><div className="hero-stat"><strong>{manageableSchedules.length}</strong><span>{t('shared schedules','horarios compartidos')}</span></div></section>

    {query.schedule_created&&<div className="notice success">{t('Schedule created.','Horario creado.')}</div>}{query.schedule_saved&&<div className="notice success">{t('Schedule settings saved.','Configuración guardada.')}</div>}{query.item_created&&<div className="notice success">{t('Schedule date added.','Fecha agregada al horario.')}</div>}{query.item_saved&&<div className="notice success">{t('Schedule date updated.','Fecha actualizada.')}</div>}{query.assignment_created&&<div className="notice success">{t('Person assigned.','Persona asignada.')}</div>}{query.assignment_saved&&<div className="notice success">{t('Assignment updated.','Asignación actualizada.')}</div>}{query.month_plan_saved&&<div className="notice success">{t('Monthly preaching plan saved.','Plan mensual de predicación guardado.')}</div>}{query.five_spot_saved&&<div className="notice success">{t('5 Spot workflow updated.','Flujo de 5 Spot actualizado.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{t('1 • PICK A SCHEDULE','1 • ESCOGE UN HORARIO')}</div><div className="row" style={{marginTop:12,flexWrap:'wrap'}}>{manageableSchedules.map(schedule=><Link key={schedule.id} className={selected?.id===schedule.id?'btn':'ghost'} href={l(`/calendar/manage?schedule=${schedule.id}`)}>{schedule.name}</Link>)}</div>{!manageableSchedules.length&&<p className="muted">{t('No schedules yet. Create the first one below.','Todavía no hay horarios. Crea el primero abajo.')}</p>}</section>

    <details className="card" style={{padding:18,marginBottom:18}} open={!manageableSchedules.length||Boolean(ministryDefault)}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('+ Create a shared schedule','+ Crear horario compartido')}</summary><form action={createSchedule} style={{marginTop:14}}><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t('Schedule name','Nombre del horario')}</span><input name="name" required maxLength={120} placeholder={t('Sunday Preaching Schedule','Horario de Predicación del Domingo')}/></label><label className="field"><span>{t('Schedule type','Tipo de horario')}</span><select name="schedule_type" defaultValue="ministry"><option value="preaching">{t('Preaching','Predicación')}</option><option value="worship">{t('Praise & Worship','Alabanza y Adoración')}</option><option value="friendship_group">{t('Friendship Group','Grupo de Amistad')}</option><option value="juniors">{t('Juniors','Juniors')}</option><option value="youth">{t('Youth','Jóvenes')}</option><option value="college_career">{t('College & Career','Universitarios y Profesionales')}</option><option value="ministry">{t('Other ministry','Otro ministerio')}</option><option value="church">{t('Whole church','Toda la iglesia')}</option><option value="other">{t('Other','Otro')}</option></select></label><label className="field"><span>{t('Team / ministry (optional)','Equipo / ministerio (opcional)')}</span><select name="ministry_id" defaultValue={ministryDefault}><option value="">{t('No ministry — church-wide or group schedule','Sin ministerio — iglesia o grupo')}</option>{ministries.filter(ministry=>ministry.active&&(broadAccess||leaderMinistryIds.has(ministry.id))).map(ministry=><option value={ministry.id} key={ministry.id}>{ministry.name}</option>)}</select></label><label className="field"><span>{t('Group (optional — do not choose both)','Grupo (opcional — no escojas ambos')}</span><select name="group_id" defaultValue=""><option value="">{t('No group','Sin grupo')}</option>{groups.filter(group=>broadAccess||leaderGroupIds.has(group.id)).map(group=><option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label className="field"><span>{t('Short description','Descripción breve')}</span><textarea name="description" rows={3} maxLength={1000}/></label><button className="btn">{t('Create schedule','Crear horario')}</button></form></details>

    {selected&&<><section className="card" style={{padding:18,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:14}}><div><div className="pill">{t('CURRENT SCHEDULE','HORARIO ACTUAL')}</div><h2 style={{margin:'8px 0 4px'}}>{selected.name}</h2><p className="small muted" style={{margin:0}}>{selected.ministry_id?ministryById.get(selected.ministry_id):selected.group_id?groupById.get(selected.group_id):t('Whole church','Toda la iglesia')} • {selected.schedule_type.replaceAll('_',' ')}</p></div><ShieldCheck size={22}/></div><details style={{marginTop:12}}><summary className="ghost" style={{cursor:'pointer',display:'inline-flex'}}>{t('Edit schedule settings','Editar configuración')}</summary><form action={updateSchedule} style={{marginTop:10}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><label className="field"><span>{t('Name','Nombre')}</span><input name="name" required maxLength={120} defaultValue={selected.name}/></label><label className="field"><span>{t('Type','Tipo')}</span><input name="schedule_type" required maxLength={60} defaultValue={selected.schedule_type}/></label><label className="field"><span>{t('Description','Descripción')}</span><textarea name="description" rows={3} defaultValue={selected.description??''}/></label><label className="row small"><input type="checkbox" name="active" defaultChecked={selected.active}/> {t('Schedule is active','Horario activo')}</label><button className="ghost">{t('Save settings','Guardar configuración')}</button></form></details></section>

    {selected.schedule_type==='preaching'&&<><section className="card" style={{padding:18,marginBottom:18}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}><div><div className="pill">{t('12-MONTH PREACHING PLAN','PLAN ANUAL DE PREDICACIÓN')}</div><h2 style={{margin:'8px 0 4px'}}>{planYear} {t('Year Plan','Plan Anual')}</h2><p className="small muted" style={{margin:0}}>{t('Theme, Scripture and notes flow into the calendar month automatically.','Tema, Escritura y notas aparecen automáticamente en el mes del calendario.')}</p></div><Link className="ghost" href={l('/calendar/five-spot')}>{t('Request a 5 Spot','Solicitar un 5 Spot')}</Link></div>
      <div className="year-plan-grid">{yearMonths.map(monthKey=>{const plan=monthPlanByKey.get(monthKey);const monthItems=yearItems.filter(item=>localDateKey(item.starts_at,timeZone).startsWith(monthKey)&&item.status==='scheduled');const assigned=monthItems.filter(item=>(yearAssignmentsByItem.get(item.id)??[]).some(a=>(a.role_label||a.title).toLowerCase()==='main message')).length;const open=monthItems.length-assigned;return <details className="year-plan-month" key={monthKey} open={monthKey===requestedMonth}><summary><div><strong style={{textTransform:'capitalize'}}>{monthLabel(monthKey,lang)}</strong><span>{assigned} {t('assigned','asignados')} • {open} {t('open','abiertos')}</span></div></summary><form action={saveScheduleMonthPlan}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="month_start" value={`${monthKey}-01`}/><label className="field"><span>{t('Monthly Theme','Tema Mensual')}</span><input name="theme" maxLength={500} defaultValue={plan?.theme??''}/></label><label className="field"><span>{t('Monthly Scripture','Escritura Mensual')}</span><input name="scripture" maxLength={500} defaultValue={plan?.scripture??''}/></label><label className="field"><span>{t('Notes','Notas')}</span><textarea name="plan_notes" rows={3} maxLength={4000} defaultValue={plan?.notes??''}/></label><button className="ghost">{t('Save month','Guardar mes')}</button></form></details>})}</div>
    </section>

    <section className="card" style={{padding:18,marginBottom:18}}>
      <div className="pill">{t('5 SPOT COACHING QUEUE','COLA DE COACHING 5 SPOT')}</div><h2 style={{margin:'8px 0 4px'}}>{t('Develop → approve → schedule','Desarrollar → aprobar → programar')}</h2><p className="small muted">{t('Approved requests move to Scheduled automatically when that member is assigned a real 5 Spot on the calendar.','Las solicitudes aprobadas pasan a Programado automáticamente cuando ese miembro recibe un 5 Spot real en el calendario.')}</p>
      <div style={{display:'grid',gap:10,marginTop:14}}>{fiveSpotRequests.map(request=><article className="quick-assignment" key={request.id}><div className="quick-assignment-context"><div><strong>{request.title_idea}</strong><div className="small muted">{nameOf(request.requester_user_id)} • {request.scripture}</div></div><span className="pill">{fiveSpotLabel(request.status)}</span></div><p className="small"><strong>{t('Main thought','Pensamiento principal')}:</strong> {request.main_thought}</p><details><summary className="small" style={{cursor:'pointer',fontWeight:800}}>{t('Outline & coaching','Bosquejo y coaching')}</summary><p className="small" style={{whiteSpace:'pre-wrap'}}>{request.short_outline}</p>{request.notes&&<p className="small muted">{request.notes}</p>}<form action={reviewFiveSpotRequest}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="request_id" value={request.id}/><label className="field"><span>{t('Mentor','Mentor')}</span><select name="mentor_user_id" defaultValue={request.mentor_user_id??''}><option value="">{t('Not assigned','Sin asignar')}</option>{memberOptions.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="field"><span>{t('Leader feedback','Comentarios de liderazgo')}</span><textarea name="leader_feedback" rows={3} defaultValue={request.leader_feedback??''}/></label>{request.status==='scheduled'?<><input type="hidden" name="status" value="completed"/><button className="btn">{t('Mark Completed','Marcar Completado')}</button></>:request.status==='completed'?<p className="small muted">{t('This 5 Spot is complete.','Este 5 Spot está completado.')}</p>:<><label className="field"><span>{t('Workflow status','Estado del flujo')}</span><select name="status" defaultValue={request.status}>{fiveSpotChoices(request.status).map(status=><option value={status} key={status}>{fiveSpotLabel(status)}</option>)}</select></label><button className="btn">{t('Save coaching update','Guardar actualización')}</button></>}</form></details></article>)}{!fiveSpotRequests.length&&<p className="muted">{t('No 5 Spot requests yet.','Todavía no hay solicitudes de 5 Spot.')}</p>}</div>
    </section></>}

    <section className="card schedule-month" style={{padding:18,marginBottom:18}}>
      <div className="schedule-month-head"><div><div className="pill">{t('2 • PICK A DATE','2 • ESCOGE UNA FECHA')}</div><h2 style={{margin:'8px 0 0',textTransform:'capitalize'}}>{monthLabel(requestedMonth,lang)}</h2></div><div className="row schedule-month-nav"><Link className="ghost" href={l(`/calendar/manage?schedule=${selected.id}&month=${previousMonth}`)}>‹ {t('Previous','Anterior')}</Link><Link className="ghost" href={l(`/calendar/manage?schedule=${selected.id}&month=${todayKey.slice(0,7)}&date=${todayKey}`)}>{t('Today','Hoy')}</Link><Link className="ghost" href={l(`/calendar/manage?schedule=${selected.id}&month=${nextMonth}`)}>{t('Next','Siguiente')} ›</Link></div></div>
      <div className="schedule-weekdays" aria-hidden="true">{(es?['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']).map(day=><span key={day}>{day}</span>)}</div>
      <div className="schedule-grid">{gridDays.map((date,index)=>{if(!date)return <span className="schedule-day empty" key={`empty-${index}`}/>;const dayItems=itemsByDate.get(date)??[];const assignmentCount=dayItems.reduce((total,item)=>total+(assignmentsByItem.get(item.id)?.length??0),0);const active=selectedDate===date;return <Link href={l(`/calendar/manage?schedule=${selected.id}&month=${requestedMonth}&date=${date}#selected-date`)} className={`schedule-day${active?' active':''}${date===todayKey?' today':''}`} key={date}><strong>{Number(date.slice(-2))}</strong>{dayItems.slice(0,2).map(item=><small key={item.id}>{item.title}</small>)}{dayItems.length>2&&<small>+{dayItems.length-2} {t('more','más')}</small>}{assignmentCount>0&&<span className="schedule-count">{assignmentCount}</span>}</Link>})}</div>
      {!monthStartUtc||!monthEndUtc?<div className="notice error" style={{marginTop:12}}>{t('We could not load this month in the church timezone.','No pudimos cargar este mes en la zona horaria de la iglesia.')}</div>:null}
    </section>

    <section className="card" id="selected-date" style={{padding:18,marginBottom:18}}>
      <div className="pill">{t('3 • QUICK ASSIGN','3 • ASIGNACIÓN RÁPIDA')}</div>
      {!selectedDate&&<p className="muted">{t('Choose a date on the calendar to schedule someone.','Escoge una fecha en el calendario para programar a alguien.')}</p>}
      {selectedDate&&<><h2 style={{margin:'8px 0 4px'}}>{formatChurchDate(`${selectedDate}T12:00:00Z`, 'UTC',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</h2>
        {selected.schedule_type==='preaching'&&(activeMonthPlan?.theme||activeMonthPlan?.scripture)&&<div className="notice" style={{margin:'10px 0'}}><strong>{activeMonthPlan?.theme??t('Monthly preaching focus','Enfoque mensual')}</strong>{activeMonthPlan?.scripture&&<span> • {activeMonthPlan.scripture}</span>}</div>}
        {selectedDateItems.map(item=>{const itemAssignments=assignmentsByItem.get(item.id)??[];return <article className="quick-assignment" key={item.id}><div className="quick-assignment-context"><div><strong>{item.title}</strong><div className="small muted"><Clock size={12}/> {formatChurchTime(item.starts_at,timeZone)}{item.ends_at?` – ${formatChurchTime(item.ends_at,timeZone)}`:''}{item.location&&<> • <MapPin size={12}/> {item.location}</>}</div></div><span className="pill">{itemAssignments.length} {t('assigned','asignados')}</span></div>{item.status==='scheduled'&&<form action={createScheduleAssignment} className="quick-assignment-form"><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="schedule_item_id" value={item.id}/><label className="field"><span>{t('Who','Quién')}</span><select name="assigned_user_id" required defaultValue=""><option value="" disabled>{t('Choose person','Escoger persona')}</option>{memberOptions.map(member=><option key={member.id} value={member.id}>{member.name}{member.rosterOrder<99999?t(' • team',' • equipo'):''}</option>)}</select></label><label className="field"><span>{t('Assignment','Asignación')}</span><input name="role_label" list="schedule-role-suggestions" required maxLength={80} placeholder={selected.schedule_type==='preaching'?t('Main Message, 5 Spot…','Mensaje Principal, 5 Spot…'):t('Choose or type assignment','Escoge o escribe asignación')}/></label><details><summary className="small" style={{cursor:'pointer',fontWeight:800}}>{t('Optional details','Detalles opcionales')}</summary><label className="field"><span>{t('Call time','Hora de llegada')}</span><input name="call_time" type="datetime-local"/></label><label className="field"><span>{t('Notes','Notas')}</span><input name="notes"/></label><label className="row small"><input type="checkbox" name="schedule_override"/> {t('Leadership intentionally approves a conflict','Liderazgo aprueba intencionalmente un conflicto')}</label><label className="field"><span>{t('Conflict override reason','Razón de anulación')}</span><input name="schedule_override_reason" maxLength={500}/></label></details><button className="btn">{t('Save assignment','Guardar asignación')}</button></form>}</article>})}
        {!selectedDateItems.length&&<div className="quick-assignment"><h3>{t('No service or meeting on this date yet.','Todavía no hay servicio o reunión en esta fecha.')}</h3><p className="small muted">{t('Add the date once, then future assignments use the fast person → assignment → save flow.','Agrega la fecha una vez; después las asignaciones usan el flujo rápido persona → asignación → guardar.')}</p><form action={createScheduleItem}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><label className="field"><span>{t('Service / meeting','Servicio / reunión')}</span><input name="title" required maxLength={160} placeholder={t('Sunday Morning Service','Servicio del Domingo por la Mañana')}/></label><div className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 220px',margin:0}}><span>{t('Starts','Empieza')}</span><input name="starts_at" type="datetime-local" required defaultValue={`${selectedDate}T09:00`}/></label><label className="field" style={{flex:'1 1 220px',margin:0}}><span>{t('Ends','Termina')}</span><input name="ends_at" type="datetime-local"/></label><label className="field" style={{flex:'1 1 200px',margin:0}}><span>{t('Location','Lugar')}</span><input name="location"/></label></div><details><summary className="small" style={{cursor:'pointer'}}>{t('Optional notes','Notas opcionales')}</summary><label className="field"><span>{t('Notes','Notas')}</span><textarea name="notes" rows={2}/></label></details><button className="btn">{t('Add this date','Agregar esta fecha')}</button></form></div>}
      </>}
      <datalist id="schedule-role-suggestions">{roleSuggestions.map(role=><option value={role} key={role}/>)}</datalist>
    </section>

    <details className="card" style={{padding:18,marginBottom:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Advanced: add a date manually','Avanzado: agregar fecha manualmente')}</summary><form action={createScheduleItem} style={{marginTop:12}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><label className="field"><span>{t('Service / meeting name','Nombre del servicio / reunión')}</span><input name="title" required maxLength={160}/></label><div className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 220px',margin:0}}><span>{t('Starts','Empieza')}</span><input name="starts_at" type="datetime-local" required/></label><label className="field" style={{flex:'1 1 220px',margin:0}}><span>{t('Ends','Termina')}</span><input name="ends_at" type="datetime-local"/></label><label className="field" style={{flex:'1 1 200px',margin:0}}><span>{t('Location','Lugar')}</span><input name="location"/></label></div><label className="field"><span>{t('Notes','Notas')}</span><textarea name="notes" rows={2}/></label><button className="ghost">{t('Add to schedule','Agregar al horario')}</button></form></details>

    <section style={{display:'grid',gap:16}}>{items.map(item=>{const itemAssignments=assignments.filter(assignment=>assignment.schedule_item_id===item.id);return <article className="card" key={item.id} style={{padding:18,opacity:item.status==='cancelled'?.65:1}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:14}}><div><div className="pill">{item.status==='cancelled'?t('CANCELLED','CANCELADO'):t('SCHEDULED','PROGRAMADO')}</div><h2 style={{margin:'8px 0 5px'}}>{item.title}</h2><div className="small muted"><CalendarDays size={12}/> {formatChurchDate(item.starts_at,timeZone,{weekday:'long',month:'short',day:'numeric',year:'numeric'})} • <Clock size={12}/> {formatChurchTime(item.starts_at,timeZone)}{item.ends_at?` – ${formatChurchTime(item.ends_at,timeZone)}`:''}{item.location&&<> • <MapPin size={12}/> {item.location}</>}</div>{item.notes&&<p className="muted">{item.notes}</p>}</div><div className="hero-stat"><strong>{itemAssignments.length}</strong><span>{t('people assigned','personas asignadas')}</span></div></div>

      <details style={{marginTop:12}}><summary className="ghost" style={{cursor:'pointer',display:'inline-flex'}}>{t('Edit date / cancel','Editar fecha / cancelar')}</summary><form action={updateScheduleItem} style={{marginTop:10}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="schedule_item_id" value={item.id}/><label className="field"><span>{t('Title','Título')}</span><input name="title" required defaultValue={item.title}/></label><div className="row" style={{flexWrap:'wrap'}}><label className="field" style={{flex:1}}><span>{t('Starts','Empieza')}</span><input type="datetime-local" name="starts_at" required defaultValue={localInput(item.starts_at,timeZone)}/></label><label className="field" style={{flex:1}}><span>{t('Ends','Termina')}</span><input type="datetime-local" name="ends_at" defaultValue={localInput(item.ends_at,timeZone)}/></label></div><label className="field"><span>{t('Location','Lugar')}</span><input name="location" defaultValue={item.location??''}/></label><label className="field"><span>{t('Notes','Notas')}</span><textarea name="notes" rows={2} defaultValue={item.notes??''}/></label><label className="field"><span>{t('Status','Estado')}</span><select name="status" defaultValue={item.status}><option value="scheduled">{t('Scheduled','Programado')}</option><option value="cancelled">{t('Cancelled — keep history','Cancelado — conservar historial')}</option></select></label><button className="ghost">{t('Save date','Guardar fecha')}</button></form></details>

      <div style={{marginTop:18}}><div className="pill">{t('3 • WHO IS DOING WHAT','3 • QUIÉN HACE QUÉ')}</div><div style={{display:'grid',gap:9,marginTop:10}}>{itemAssignments.map(assignment=>{const response=responseByAssignment.get(assignment.id);return <div key={assignment.id} style={{border:'1px solid var(--line)',borderRadius:12,padding:12}}><div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><div><strong>{assignment.role_label||assignment.title}</strong><div className="small muted">{nameOf(assignment.assigned_user_id)}{assignment.call_time?` • ${t('Call','Llegada')}: ${formatChurchTime(assignment.call_time,timeZone)}`:''}</div></div><span className={`response-chip ${response?.response??''}`}>{response?.response==='confirmed'?t('confirmed','confirmado'):response?.response==='declined'?t('declined','no disponible'):t('awaiting response','esperando respuesta')}</span></div>{assignment.schedule_override&&<div className="notice" style={{margin:'8px 0 0'}}>{t('Leadership override: ','Anulación de liderazgo: ')}{assignment.schedule_conflict_summary}</div>}<details style={{marginTop:8}}><summary className="small" style={{cursor:'pointer',fontWeight:700}}>{t('Edit assignment','Editar asignación')}</summary><form action={updateScheduleAssignment} style={{marginTop:8}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="assignment_id" value={assignment.id}/><label className="field"><span>{t('Person','Persona')}</span><select name="assigned_user_id" defaultValue={assignment.assigned_user_id}>{memberOptions.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="field"><span>{t('Role','Función')}</span><input name="role_label" required maxLength={80} defaultValue={assignment.role_label||assignment.title}/></label><label className="field"><span>{t('Call time','Hora de llegada')}</span><input name="call_time" type="datetime-local" defaultValue={localInput(assignment.call_time,timeZone)}/></label><label className="field"><span>{t('Notes','Notas')}</span><input name="notes" defaultValue={assignment.notes??''}/></label><label className="row small"><input type="checkbox" name="schedule_override"/> {t('Allow an intentional conflict','Permitir conflicto intencional')}</label><label className="field"><span>{t('Override reason (required only for a conflict)','Razón de anulación (solo si hay conflicto)')}</span><input name="schedule_override_reason" maxLength={500}/></label><div className="row"><button className="ghost">{t('Save assignment','Guardar asignación')}</button></div></form><form action={archiveScheduleAssignment} style={{marginTop:6}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="assignment_id" value={assignment.id}/><button className="ghost">{t('Unassign — keep history','Quitar asignación — conservar historial')}</button></form></details></div>})}{!itemAssignments.length&&<p className="muted">{t('No roles assigned yet.','Todavía no hay funciones asignadas.')}</p>}</div>

      {item.status==='scheduled'&&<details style={{marginTop:12}}><summary className="btn" style={{cursor:'pointer',display:'inline-flex'}}>{t('+ Assign a person / role','+ Asignar persona / función')}</summary><form action={createScheduleAssignment} className="card" style={{padding:14,marginTop:8}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="schedule_id" value={selected.id}/><input type="hidden" name="schedule_item_id" value={item.id}/><div className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><label className="field" style={{flex:'2 1 220px',margin:0}}><span>{t('Person','Persona')}</span><select name="assigned_user_id" required defaultValue=""><option value="" disabled>{t('Choose church member','Escoger miembro')}</option>{memberOptions.map(member=><option key={member.id} value={member.id}>{member.name}{member.rosterOrder<99999?t(' • team',' • equipo'):''}</option>)}</select></label><label className="field" style={{flex:'1 1 180px',margin:0}}><span>{t('Role','Función')}</span><input name="role_label" required maxLength={80} placeholder={t('Preacher, vocals, drums…','Predicador, voz, batería…')}/></label><label className="field" style={{flex:'1 1 190px',margin:0}}><span>{t('Call time','Hora de llegada')}</span><input name="call_time" type="datetime-local"/></label></div><label className="field"><span>{t('Notes (optional)','Notas (opcional)')}</span><input name="notes"/></label><details><summary className="small" style={{cursor:'pointer'}}>{t('Conflict override — only when needed','Anulación de conflicto — solo cuando sea necesario')}</summary><label className="row small"><input type="checkbox" name="schedule_override"/> {t('Leadership intentionally approves a conflict','Liderazgo aprueba intencionalmente un conflicto')}</label><label className="field"><span>{t('Reason','Razón')}</span><input name="schedule_override_reason" maxLength={500}/></label></details><button className="btn">{t('Assign person','Asignar persona')}</button></form></details>}</div></article>})}{!items.length&&<div className="card" style={{padding:18}}><h3>{t('No dates on this schedule yet.','Todavía no hay fechas en este horario.')}</h3><p className="muted">{t('Use step 2 above to add the first service or meeting.','Usa el paso 2 arriba para agregar el primer servicio o reunión.')}</p></div>}</section></>}
  </main>
}
