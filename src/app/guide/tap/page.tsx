import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,BookOpen,CalendarDays,MessageCircleQuestion,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { classifyKingdomGuideCommand } from '@/lib/kingdom-guide-command'

type Church={name:string|null}
type Group={id:string;name:string;leader_id:string|null}
type GroupMembership={group_id:string;role:string;groups:Group|Group[]|null}
type Report={id:string;group_id:string;meeting_date:string}
type Attendance={group_report_id:string;user_id:string;attendance_status:string}
type Profile={id:string;display_name:string|null;first_name:string|null;last_name:string|null}

const first=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]??null:value??null
const nameOf=(profile:Profile|undefined)=>profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function TapAndGoPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const query=await searchParams,q=(query.q??'').trim(),intent=classifyKingdomGuideCommand(q)
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church=first(membership.churches) as Church|null
  const isPastor=['pastor','church_admin'].includes(membership.role)
  const [teamPermission,groupPermission,learningPermission,outreachPermission,calendarPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_groups'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_outreach'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_calendar'})
  ])
  const canLeadGroups=isPastor||membership.role==='group_leader'||Boolean(groupPermission.data)
  const canManageTeams=isPastor||['ministry_leader','minister'].includes(membership.role)||Boolean(teamPermission.data)
  const canManageLearning=isPastor||membership.role==='minister'||Boolean(learningPermission.data)
  const canManageOutreach=isPastor||Boolean(outreachPermission.data)
  const canManageCalendar=isPastor||['ministry_leader','minister'].includes(membership.role)||Boolean(calendarPermission.data)

  if(q){
    if(intent==='pastor_center'&&isPastor)redirect('/church/pastor')
    if(intent==='finance'&&isPastor)redirect('/church/finance')
    if(intent==='team_manage'&&canManageTeams)redirect('/teams/manage')
    if(intent==='schedule_manage'&&canManageCalendar)redirect('/calendar/manage')
    if(intent==='today_schedule')redirect(canManageCalendar?'/church/coordination':'/calendar/my')
    if(intent==='lesson_builder'||intent==='content_learning')redirect(canManageLearning?'/content':'/learning')
    if(intent==='content_event')redirect(canManageCalendar?'/content':'/calendar')
    if(intent==='outreach')redirect(canManageOutreach?'/outreach':'/guide')
  }

  let managedGroups:Group[]=[]
  if(intent==='group_roster'||intent==='group_absences'){
    const [{data:leaderGroups},{data:roleRows}]=await Promise.all([
      supabase.from('groups').select('id,name,leader_id').eq('church_id',membership.church_id).eq('active',true).eq('leader_id',userId),
      supabase.from('group_memberships').select('group_id,role,groups(id,name,leader_id)').eq('user_id',userId).in('role',['leader','assistant'])
    ])
    const byId=new Map<string,Group>()
    for(const group of (leaderGroups??[]) as Group[])byId.set(group.id,group)
    for(const row of (roleRows??[]) as GroupMembership[]){const group=first(row.groups);if(group)byId.set(group.id,group)}
    managedGroups=[...byId.values()]
    if(intent==='group_roster'&&managedGroups.length===1)redirect(`/groups/${managedGroups[0].id}/roster`)
  }

  let absenceRows:{group:Group;meetingDate:string;names:string[]}[]=[]
  if(intent==='group_absences'&&canLeadGroups&&managedGroups.length){
    const groupIds=managedGroups.map(group=>group.id)
    const {data:reportsData}=await supabase.from('group_reports').select('id,group_id,meeting_date').in('group_id',groupIds).order('meeting_date',{ascending:false}).limit(100)
    const reports=(reportsData??[]) as Report[],latestByGroup=new Map<string,Report>()
    for(const report of reports)if(!latestByGroup.has(report.group_id))latestByGroup.set(report.group_id,report)
    const latest=[...latestByGroup.values()],reportIds=latest.map(report=>report.id)
    let missing:Attendance[]=[]
    if(reportIds.length){const result=await supabase.from('group_report_attendance').select('group_report_id,user_id,attendance_status').in('group_report_id',reportIds).eq('attendance_status','missing');missing=(result.data??[]) as Attendance[]}
    const userIds=Array.from(new Set(missing.map(row=>row.user_id)))
    let profiles:Profile[]=[]
    if(userIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=(result.data??[]) as Profile[]}
    const profileById=new Map(profiles.map(profile=>[profile.id,profile])),groupById=new Map(managedGroups.map(group=>[group.id,group]))
    absenceRows=latest.map(report=>({group:groupById.get(report.group_id)!,meetingDate:report.meeting_date,names:missing.filter(row=>row.group_report_id===report.id).map(row=>nameOf(profileById.get(row.user_id)))})).filter(row=>Boolean(row.group))
  }

  const denied=q&&(
    (intent==='finance'&&!isPastor)||(intent==='pastor_center'&&!isPastor)||(intent==='team_manage'&&!canManageTeams)||(intent==='schedule_manage'&&!canManageCalendar)||((intent==='group_absences'||intent==='group_roster')&&!canLeadGroups)
  )
  const quick=[
    ["Take me to my group's roster",Users],
    ['Show me who missed group last week',Users],
    ["Who's preaching today?",CalendarDays],
    ["Help me build this week's lesson",BookOpen],
    ['Show me who needs a Bible study assigned',Sparkles]
  ] as const

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • Kingdom Guide Tap & Go</div></div><div className="row"><Link className="ghost" href="/guide">Kingdom Guide</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">TAP & GO</div><h1 style={{margin:'8px 0'}}>Tell Kingdom Guide what you need.</h1><p className="muted">Use plain language. Navigation and read-only answers happen immediately. Anything that changes church records takes you to the normal reviewed form instead of silently changing data.</p><form method="get" style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}><input name="q" defaultValue={q} aria-label="Tell Kingdom Guide what you need" placeholder="Take me to my group's roster" style={{flex:'1 1 320px'}}/><button className="btn"><MessageCircleQuestion size={15}/> Go</button></form></section>

    {!q&&<section className="card" style={{padding:18,marginBottom:18}}><div className="pill">TRY SAYING</div><div style={{display:'grid',gap:8,marginTop:12}}>{quick.map(([label,Icon])=><Link className="ghost" href={`/guide/tap?q=${encodeURIComponent(label)}`} key={label}><Icon size={14}/>{label}<ArrowRight size={13}/></Link>)}</div></section>}
    {denied&&<div className="notice error">That request needs a leadership permission your account does not currently have.</div>}
    {q&&intent==='unknown'&&<section className="card" style={{padding:18}}><h2>I did not recognize that request yet.</h2><p className="muted">Try asking for a roster, attendance, today's schedule, teams, a lesson, an event, outreach, finance, or the pastor command center.</p></section>}

    {intent==='group_roster'&&canLeadGroups&&managedGroups.length>1&&<section className="card" style={{padding:18}}><div className="pill">YOUR GROUP ROSTERS</div><h2>Which roster do you want?</h2><div style={{display:'grid',gap:8}}>{managedGroups.map(group=><Link className="ghost" href={`/groups/${group.id}/roster`} key={group.id}>{group.name}<ArrowRight size={13}/></Link>)}</div></section>}
    {intent==='group_roster'&&canLeadGroups&&!managedGroups.length&&<div className="notice">You do not currently lead a group with a roster.</div>}

    {intent==='group_absences'&&canLeadGroups&&<section className="card" style={{padding:18}}><div className="pill">LATEST GROUP ATTENDANCE</div><h2>Who was marked missing?</h2><div style={{display:'grid',gap:10}}>{absenceRows.map(row=><article key={row.group.id} style={{border:'1px solid var(--line)',borderRadius:12,padding:12}}><div className="row" style={{justifyContent:'space-between',gap:8}}><strong>{row.group.name}</strong><span className="small muted">{row.meetingDate}</span></div>{row.names.length?<div className="row" style={{gap:7,flexWrap:'wrap',marginTop:8}}>{row.names.map(name=><span className="pill" key={name}>{name}</span>)}</div>:<p className="small muted" style={{marginBottom:0}}>No one was marked missing on the latest report.</p>}</article>)}{!absenceRows.length&&<p className="muted">No recent group report is available for the groups you lead.</p>}</div></section>}
  </main>
}
