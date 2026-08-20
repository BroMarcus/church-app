import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,BookOpen,CalendarDays,Clock,UserRoundCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchTime } from '@/lib/church-time'

type ChurchInfo={name:string|null;timezone:string|null}
type OutreachContact={id:string;first_name:string;last_name:string|null;assigned_to:string|null;stage:string;bible_study_interest:boolean;follow_up_due_at:string|null}
type Group={id:string;name:string;group_type:string;leader_id:string|null;meeting_day:string|null;meeting_time:string|null}
type Schedule={id:string;name:string;schedule_type:string}
type ScheduleItem={id:string;schedule_id:string;title:string;starts_at:string;location:string|null}
type Assignment={id:string;schedule_item_id:string|null;assigned_user_id:string;role_label:string|null;title:string}
type Profile={id:string;display_name:string|null;first_name:string|null;last_name:string|null}
type Task={id:string;assigned_to:string;title:string;due_at:string|null;status:string;priority:string}

const first=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]??null:value??null
const personName=(profile:Profile|undefined)=>profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Church member'
const contactName=(contact:OutreachContact)=>[contact.first_name,contact.last_name].filter(Boolean).join(' ')
const localDateParts=(timeZone:string)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'}).formatToParts(new Date());const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';return {date:`${get('year')}-${get('month')}-${get('day')}`,weekday:get('weekday')}}
const addDay=(iso:string)=>{const [year,month,day]=iso.split('-').map(Number);return new Date(Date.UTC(year,month-1,day+1)).toISOString().slice(0,10)}

export default async function CoordinationPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [teamsPermission,groupsPermission,outreachPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_groups'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_outreach'})
  ])
  const leaderRole=['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role)
  if(!leaderRole&&!teamsPermission.data&&!groupsPermission.data&&!outreachPermission.data)redirect('/')
  const church=first(membership.churches) as ChurchInfo|null,timeZone=church?.timezone||'America/Los_Angeles',local=localDateParts(timeZone),tomorrow=addDay(local.date)
  const [startResult,endResult]=await Promise.all([
    supabase.rpc('church_local_datetime_to_utc',{p_church_id:membership.church_id,p_local_datetime:`${local.date}T00:00`}),
    supabase.rpc('church_local_datetime_to_utc',{p_church_id:membership.church_id,p_local_datetime:`${tomorrow}T00:00`})
  ])
  const todayStart=typeof startResult.data==='string'?startResult.data:new Date().toISOString(),todayEnd=typeof endResult.data==='string'?endResult.data:new Date(Date.now()+24*60*60*1000).toISOString(),nowIso=new Date().toISOString()

  const [outreachResult,groupsResult,schedulesResult,itemsResult,tasksResult]=await Promise.all([
    supabase.from('outreach_contacts').select('id,first_name,last_name,assigned_to,stage,bible_study_interest,follow_up_due_at').eq('church_id',membership.church_id).not('stage','in','("inactive","serving")').order('follow_up_due_at',{ascending:true,nullsFirst:false}).limit(100),
    supabase.from('groups').select('id,name,group_type,leader_id,meeting_day,meeting_time').eq('church_id',membership.church_id).eq('active',true).order('name'),
    supabase.from('church_schedules').select('id,name,schedule_type').eq('church_id',membership.church_id).eq('active',true),
    supabase.from('schedule_items').select('id,schedule_id,title,starts_at,location').eq('church_id',membership.church_id).eq('status','scheduled').gte('starts_at',todayStart).lt('starts_at',todayEnd).order('starts_at'),
    supabase.from('member_tasks').select('id,assigned_to,title,due_at,status,priority').eq('church_id',membership.church_id).in('status',['open','in_progress']).order('due_at',{ascending:true,nullsFirst:false}).limit(40)
  ])
  const contacts=(outreachResult.data??[]) as OutreachContact[],groups=(groupsResult.data??[]) as Group[],schedules=(schedulesResult.data??[]) as Schedule[],items=(itemsResult.data??[]) as ScheduleItem[],tasks=(tasksResult.data??[]) as Task[]
  const todayGroups=groups.filter(group=>group.meeting_day?.toLowerCase()===local.weekday.toLowerCase())
  const itemIds=items.map(item=>item.id)
  let assignments:Assignment[]=[]
  if(itemIds.length){const result=await supabase.from('team_assignments').select('id,schedule_item_id,assigned_user_id,role_label,title').eq('church_id',membership.church_id).eq('assignment_status','scheduled').in('schedule_item_id',itemIds);assignments=(result.data??[]) as Assignment[]}
  const profileIds=Array.from(new Set([...groups.map(group=>group.leader_id).filter((id):id is string=>Boolean(id)),...assignments.map(row=>row.assigned_user_id),...contacts.map(row=>row.assigned_to).filter((id):id is string=>Boolean(id)),...tasks.map(task=>task.assigned_to)]))
  let profiles:Profile[]=[]
  if(profileIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=(result.data??[]) as Profile[]}
  const profileById=new Map(profiles.map(profile=>[profile.id,profile])),scheduleById=new Map(schedules.map(schedule=>[schedule.id,schedule])),assignmentByItem=new Map<string,Assignment[]>()
  for(const assignment of assignments){if(!assignment.schedule_item_id)continue;const list=assignmentByItem.get(assignment.schedule_item_id)??[];list.push(assignment);assignmentByItem.set(assignment.schedule_item_id,list)}
  const unassigned=contacts.filter(contact=>!contact.assigned_to),bibleStudyNeeds=contacts.filter(contact=>contact.bible_study_interest&&!contact.assigned_to),overdue=contacts.filter(contact=>contact.follow_up_due_at&&contact.follow_up_due_at<nowIso),unfilledSchedule=items.filter(item=>(assignmentByItem.get(item.id)?.length??0)===0)
  const highTasks=tasks.filter(task=>task.priority==='high'||Boolean(task.due_at&&task.due_at<nowIso))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • Coordination</div></div><div className="row"><Link className="ghost" href="/church/pastor">Pastor Center</Link><Link className="ghost" href="/outreach">Outreach</Link><Link className="ghost" href="/calendar/manage">Scheduling</Link><Link className="ghost" href="/rosters">Rosters</Link><Link className="ghost" href="/">← Home</Link></div></header>

    <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">COORDINATION • {local.weekday.toUpperCase()}</div><h1 style={{margin:'8px 0'}}>Who needs attention, and who is doing what today?</h1><p className="muted">This view does not create a second task system. It brings together the existing outreach, group, task and shared-schedule sources so leaders can act from one place.</p></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:18}}><Link className="card" href="/outreach" style={{padding:15,textDecoration:'none',border:bibleStudyNeeds.length?'1px solid rgba(248,113,113,.45)':undefined}}><BookOpen size={18}/><strong style={{display:'block',fontSize:28,marginTop:5}}>{bibleStudyNeeds.length}</strong><span className="small muted">Bible-study interests with no owner</span></Link><Link className="card" href="/outreach" style={{padding:15,textDecoration:'none'}}><UserRoundCheck size={18}/><strong style={{display:'block',fontSize:28,marginTop:5}}>{unassigned.length}</strong><span className="small muted">outreach people with no owner</span></Link><Link className="card" href="/outreach" style={{padding:15,textDecoration:'none',border:overdue.length?'1px solid rgba(248,113,113,.45)':undefined}}><AlertTriangle size={18}/><strong style={{display:'block',fontSize:28,marginTop:5}}>{overdue.length}</strong><span className="small muted">follow-ups overdue</span></Link><Link className="card" href="/calendar/manage" style={{padding:15,textDecoration:'none',border:unfilledSchedule.length?'1px solid rgba(251,191,36,.4)':undefined}}><CalendarDays size={18}/><strong style={{display:'block',fontSize:28,marginTop:5}}>{unfilledSchedule.length}</strong><span className="small muted">today schedule items with no roles</span></Link><div className="card" style={{padding:15}}><Clock size={18}/><strong style={{display:'block',fontSize:28,marginTop:5}}>{highTasks.length}</strong><span className="small muted">high-priority or overdue tasks visible to you</span></div></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:18,marginBottom:18}}>
      <section className="card" style={{padding:18}}><div className="row" style={{justifyContent:'space-between',gap:8}}><div><div className="pill">BIBLE STUDY / FOLLOW-UP</div><h2 style={{margin:'8px 0'}}>People without an owner</h2></div><Link className="ghost" href="/outreach">Assign in Outreach →</Link></div><div style={{display:'grid',gap:8}}>{unassigned.slice(0,10).map(contact=><Link href={`/outreach/${contact.id}`} key={contact.id} style={{padding:11,border:'1px solid var(--line)',borderRadius:11,textDecoration:'none'}}><div className="row" style={{justifyContent:'space-between',gap:8}}><strong>{contactName(contact)}</strong>{contact.bible_study_interest&&<span className="pill">BIBLE STUDY</span>}</div><div className="small muted">{contact.stage.replaceAll('_',' ')}{contact.follow_up_due_at?` • follow-up ${new Date(contact.follow_up_due_at).toLocaleDateString()}`:''}</div></Link>)}{!unassigned.length&&<p className="muted">Everyone currently visible in outreach has an owner.</p>}</div></section>

      <section className="card" style={{padding:18}}><div className="pill">GROUPS TODAY</div><h2 style={{margin:'8px 0'}}>Who is leading group?</h2><div style={{display:'grid',gap:8}}>{todayGroups.map(group=><Link href={`/groups/${group.id}`} key={group.id} style={{padding:11,border:'1px solid var(--line)',borderRadius:11,textDecoration:'none'}}><strong>{group.name}</strong><div className="small muted">Leader: {group.leader_id?personName(profileById.get(group.leader_id)):'Not assigned'}{group.meeting_time?` • ${String(group.meeting_time).slice(0,5)}`:''}</div></Link>)}{!todayGroups.length&&<p className="muted">No recurring groups are scheduled for {local.weekday}.</p>}</div></section>
    </section>

    <section className="card" style={{padding:18,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><div><div className="pill">TODAY'S SHARED SCHEDULE</div><h2 style={{margin:'8px 0'}}>Preaching, worship, teams and ministry roles</h2></div><Link className="ghost" href="/calendar/manage">Edit schedules →</Link></div><div style={{display:'grid',gap:10}}>{items.map(item=>{const schedule=scheduleById.get(item.schedule_id),lineup=assignmentByItem.get(item.id)??[];return <article key={item.id} style={{padding:13,border:'1px solid var(--line)',borderRadius:12}}><div className="row" style={{justifyContent:'space-between',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="small muted">{schedule?.name??'Shared schedule'} • {schedule?.schedule_type?.replaceAll('_',' ')}</div><strong>{item.title}</strong><div className="small muted">{formatChurchTime(item.starts_at,timeZone)}{item.location?` • ${item.location}`:''}</div></div><span className={`pill ${lineup.length?'':'urgent'}`}>{lineup.length} ROLES</span></div>{lineup.length?<div className="row" style={{gap:7,flexWrap:'wrap',marginTop:9}}>{lineup.map(row=><span className="pill" key={row.id}>{row.role_label||row.title}: {personName(profileById.get(row.assigned_user_id))}</span>)}</div>:<div className="notice" style={{margin:'9px 0 0'}}>No one is assigned yet.</div>}</article>})}{!items.length&&<p className="muted">No shared schedule items today.</p>}</div></section>

    <section className="card" style={{padding:18}}><div className="pill">VISIBLE TASKS</div><h2 style={{margin:'8px 0'}}>What is already assigned?</h2><div style={{display:'grid',gap:7}}>{tasks.slice(0,15).map(task=><div key={task.id} className="row" style={{justifyContent:'space-between',gap:10,padding:'9px 0',borderBottom:'1px solid var(--line)'}}><div><strong>{task.title}</strong><div className="small muted">Assigned to {personName(profileById.get(task.assigned_to))}{task.due_at?` • due ${new Date(task.due_at).toLocaleString()}`:''}</div></div><span className={`pill ${task.priority==='high'?'urgent':''}`}>{task.priority.toUpperCase()}</span></div>)}{!tasks.length&&<p className="muted">No open tasks are visible to this leader.</p>}</div></section>
  </main>
}
