import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,ArrowUpRight,CalendarDays,Church,DollarSign,HandHeart,HeartHandshake,ReceiptText,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,formatChurchTime } from '@/lib/church-time'

type ChurchInfo={name:string|null;timezone:string|null;district_id:string|null;organization_id:string|null}
type HealthMetric={category:string;metric_key:string;label:string;value:number|string|null;denominator:number|string|null;detail:string|null}
type FinanceSnapshot={total_income:number|string|null;total_expense:number|string|null;net_change:number|string|null;open_bills_amount:number|string|null;due_next_30_amount:number|string|null;overdue_bills_amount:number|string|null;current_account_balance:number|string|null;tithes:number|string|null;offerings:number|string|null}
type GroupGrowth={group_id:string;group_name:string;joined_accounts:number|string|null;active_outreach:number|string|null;regular_attendees:number|string|null;connected_people:number|string|null;overdue_followups:number|string|null}
type Schedule={id:string;name:string;schedule_type:string}
type ScheduleItem={id:string;schedule_id:string;title:string;starts_at:string;location:string|null}
type Assignment={id:string;schedule_item_id:string|null;assigned_user_id:string;role_label:string|null;title:string}
type Profile={id:string;display_name:string|null;first_name:string|null;last_name:string|null}
type NetworkEvent={id:string;title:string;starts_at:string;location:string|null;event_type:string}

const first=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]??null:value??null
const number=(value:number|string|null|undefined)=>Number(value??0)||0
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})
const personName=(profile:Profile|undefined)=>profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Church member'
const localToday=(timeZone:string)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';return `${get('year')}-${get('month')}-${get('day')}`}

export default async function PastorCommandCenter(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone,district_id,organization_id)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church=first(membership.churches) as ChurchInfo|null,timeZone=church?.timezone||'America/Los_Angeles',today=localToday(timeZone),yearStart=`${today.slice(0,4)}-01-01`
  const now=new Date(),nowIso=now.toISOString(),horizon=new Date(now.getTime()+14*24*60*60*1000).toISOString()
  const networkFilter=[church?.district_id?`district_id.eq.${church.district_id}`:null,church?.organization_id?`organization_id.eq.${church.organization_id}`:null].filter(Boolean).join(',')

  const [healthResult,financeResult,groupGrowthResult,careResult,schedulesResult,itemsResult,networkEventsResult]=await Promise.all([
    supabase.rpc('church_health_snapshot',{p_church_id:membership.church_id,p_days:30}),
    supabase.rpc('pastor_finance_snapshot',{p_church_id:membership.church_id,p_start_on:yearStart,p_end_on:today}),
    supabase.rpc('friendship_group_growth_metrics',{p_church_id:membership.church_id,p_days:30}),
    supabase.from('care_requests').select('id',{count:'exact',head:true}).eq('church_id',membership.church_id).in('status',['new','in_review','contacted']),
    supabase.from('church_schedules').select('id,name,schedule_type').eq('church_id',membership.church_id).eq('active',true).order('name'),
    supabase.from('schedule_items').select('id,schedule_id,title,starts_at,location').eq('church_id',membership.church_id).eq('status','scheduled').gte('starts_at',nowIso).lte('starts_at',horizon).order('starts_at').limit(30),
    networkFilter?supabase.from('events').select('id,title,starts_at,location,event_type').or(networkFilter).gte('starts_at',nowIso).order('starts_at').limit(5):Promise.resolve({data:[]})
  ])
  if(healthResult.error)console.error('pastor health snapshot failed',{message:healthResult.error.message})
  if(financeResult.error)console.error('pastor finance snapshot failed',{message:financeResult.error.message})
  const health=(healthResult.data??[]) as HealthMetric[],finance=first(financeResult.data as FinanceSnapshot[]|null),groupGrowth=(groupGrowthResult.data??[]) as GroupGrowth[],schedules=(schedulesResult.data??[]) as Schedule[],items=(itemsResult.data??[]) as ScheduleItem[],networkEvents=(networkEventsResult.data??[]) as NetworkEvent[]
  const itemIds=items.map(item=>item.id)
  let assignments:Assignment[]=[]
  if(itemIds.length){const result=await supabase.from('team_assignments').select('id,schedule_item_id,assigned_user_id,role_label,title').eq('church_id',membership.church_id).eq('assignment_status','scheduled').in('schedule_item_id',itemIds);assignments=(result.data??[]) as Assignment[]}
  const userIds=Array.from(new Set(assignments.map(row=>row.assigned_user_id)))
  let profiles:Profile[]=[]
  if(userIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=(result.data??[]) as Profile[]}

  const healthByKey=new Map(health.map(row=>[row.metric_key,row])),scheduleById=new Map(schedules.map(row=>[row.id,row])),profileById=new Map(profiles.map(row=>[row.id,row]))
  const assignmentByItem=new Map<string,Assignment[]>();for(const row of assignments){if(!row.schedule_item_id)continue;const list=assignmentByItem.get(row.schedule_item_id)??[];list.push(row);assignmentByItem.set(row.schedule_item_id,list)}
  const formalMembers=number(healthByKey.get('formal_members')?.value),newBirth=number(healthByKey.get('new_birth_complete')?.value),firstSteps=number(healthByKey.get('first_steps_complete')?.value),overdueFollowup=number(healthByKey.get('overdue_followup')?.value),openCare=careResult.count??0
  const groupOverdue=groupGrowth.reduce((sum,row)=>sum+number(row.overdue_followups),0),groupsNeedingHelp=groupGrowth.filter(row=>number(row.overdue_followups)>0).sort((a,b)=>number(b.overdue_followups)-number(a.overdue_followups))
  const unstaffedItems=items.filter(item=>(assignmentByItem.get(item.id)?.length??0)===0)
  const financeReady=finance??{total_income:0,total_expense:0,net_change:0,open_bills_amount:0,due_next_30_amount:0,overdue_bills_amount:0,current_account_balance:0,tithes:0,offerings:0}

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • Pastor Command Center</div></div><div className="row"><Link className="ghost" href="/church/finance">Finance</Link><Link className="ghost" href="/calendar/manage">Scheduling</Link><Link className="ghost" href="/rosters">Rosters</Link><Link className="ghost" href="/content">Content Studio</Link><Link className="ghost" href="/">← Home</Link></div></header>

    <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">PASTOR COMMAND CENTER</div><h1 style={{margin:'8px 0'}}>What needs attention across the church?</h1><p className="muted">People, new birth, groups, pastoral care, finances and the next two weeks of ministry scheduling in one decision view.</p></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:18}}>
      <Link href="/church/health" className="card" style={{padding:16,textDecoration:'none'}}><Users size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{formalMembers}</strong><span className="small muted">formal members</span></Link>
      <Link href="/church/health" className="card" style={{padding:16,textDecoration:'none'}}><HeartHandshake size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{newBirth}</strong><span className="small muted">baptism + Holy Ghost verified</span></Link>
      <Link href="/learning" className="card" style={{padding:16,textDecoration:'none'}}><ArrowUpRight size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{firstSteps}</strong><span className="small muted">First Steps complete</span></Link>
      <Link href="/outreach" className="card" style={{padding:16,textDecoration:'none',border:overdueFollowup?'1px solid rgba(248,113,113,.45)':undefined}}><AlertTriangle size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{overdueFollowup}</strong><span className="small muted">overdue follow-ups</span></Link>
      <Link href="/help/admin" className="card" style={{padding:16,textDecoration:'none',border:openCare?'1px solid rgba(251,191,36,.4)':undefined}}><HandHeart size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{openCare}</strong><span className="small muted">open pastoral care requests</span></Link>
      <Link href="/calendar/manage" className="card" style={{padding:16,textDecoration:'none',border:unstaffedItems.length?'1px solid rgba(251,191,36,.4)':undefined}}><CalendarDays size={18}/><strong style={{fontSize:28,display:'block',marginTop:6}}>{unstaffedItems.length}</strong><span className="small muted">schedule dates with no assigned roles</span></Link>
    </section>

    <section className="card" style={{padding:20,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><div className="pill"><DollarSign size={11}/> FINANCE • YEAR TO DATE</div><h2 style={{margin:'8px 0 3px'}}>Church money at a glance</h2><p className="small muted" style={{margin:0}}>Aggregate totals only. Individual donor histories are not shown or stored in this oversight layer.</p></div><Link className="btn" href="/church/finance">Open Finance Center</Link></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:14}}>{[['Tracked balance',financeReady.current_account_balance],['Income',financeReady.total_income],['Expenses',financeReady.total_expense],['Net change',financeReady.net_change],['Open bills',financeReady.open_bills_amount],['Overdue bills',financeReady.overdue_bills_amount]].map(([label,value])=><div key={String(label)} style={{padding:12,border:'1px solid var(--line)',borderRadius:12,borderColor:label==='Overdue bills'&&number(value as number|string|null)>0?'rgba(248,113,113,.45)':undefined}}><div className="small muted">{label}</div><strong style={{fontSize:22}}>{money.format(number(value as number|string|null))}</strong></div>)}</div></section>

    <section className="card" style={{padding:20,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><div className="pill"><CalendarDays size={11}/> NEXT 14 DAYS</div><h2 style={{margin:'8px 0'}}>Who is doing what?</h2></div><Link className="ghost" href="/calendar/manage">Manage schedules →</Link></div><div style={{display:'grid',gap:10}}>{items.slice(0,12).map(item=>{const schedule=scheduleById.get(item.schedule_id),lineup=assignmentByItem.get(item.id)??[];return <article key={item.id} style={{padding:13,border:'1px solid var(--line)',borderRadius:13}}><div className="row" style={{justifyContent:'space-between',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="small muted">{schedule?.name??'Church schedule'} • {schedule?.schedule_type?.replaceAll('_',' ')}</div><strong>{item.title}</strong><div className="small muted">{formatChurchDate(item.starts_at,timeZone,{weekday:'short',month:'short',day:'numeric'})} • {formatChurchTime(item.starts_at,timeZone)}{item.location?` • ${item.location}`:''}</div></div><span className={`pill ${lineup.length?'':'urgent'}`}>{lineup.length} ASSIGNED</span></div>{lineup.length>0?<div className="row" style={{gap:7,flexWrap:'wrap',marginTop:9}}>{lineup.map(row=><span className="pill" key={row.id}>{row.role_label||row.title}: {personName(profileById.get(row.assigned_user_id))}</span>)}</div>:<div className="notice" style={{margin:'9px 0 0'}}>No roles assigned yet.</div>}</article>})}{!items.length&&<p className="muted">No shared schedule items in the next 14 days yet.</p>}</div></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:18,marginBottom:18}}>
      <section className="card" style={{padding:18}}><div className="row" style={{justifyContent:'space-between'}}><div><div className="pill"><Users size={11}/> GROUP HEALTH</div><h2 style={{margin:'8px 0'}}>Groups that may need support</h2></div><Link className="ghost" href="/church/group-growth">All groups</Link></div><div className="small muted" style={{marginBottom:10}}>{groupOverdue} overdue follow-ups across Friendship Groups in the last 30 days.</div><div style={{display:'grid',gap:8}}>{groupsNeedingHelp.slice(0,6).map(group=><Link href={`/groups/${group.group_id}`} key={group.group_id} style={{padding:11,border:'1px solid var(--line)',borderRadius:11,textDecoration:'none'}}><div className="row" style={{justifyContent:'space-between'}}><strong>{group.group_name}</strong><span className="pill urgent">{number(group.overdue_followups)} OVERDUE</span></div><div className="small muted">{number(group.regular_attendees)} regular attendees • {number(group.active_outreach)} active outreach</div></Link>)}{!groupsNeedingHelp.length&&<p className="muted">No group follow-up alerts right now.</p>}</div></section>

      <section className="card" style={{padding:18}}><div className="pill"><Church size={11}/> DISTRICT / ASSEMBLY</div><h2 style={{margin:'8px 0'}}>One level up</h2><p className="small muted">Upcoming district or organization events relevant to this church.</p><div style={{display:'grid',gap:8}}>{networkEvents.map(event=><article key={event.id} style={{padding:10,border:'1px solid var(--line)',borderRadius:11}}><strong>{event.title}</strong><div className="small muted">{formatChurchDate(event.starts_at,timeZone,{weekday:'short',month:'short',day:'numeric'})} • {formatChurchTime(event.starts_at,timeZone)}{event.location?` • ${event.location}`:''}</div></article>)}{!networkEvents.length&&<p className="muted">No upcoming district or assembly events are currently visible.</p>}</div><Link className="ghost" href="/network" style={{marginTop:10}}>Open Kingdom Network connections →</Link></section>
    </section>

    <section className="card" style={{padding:18}}><div className="pill"><ReceiptText size={11}/> CONTROL TOOLS</div><h2 style={{margin:'8px 0'}}>Go straight to the work</h2><div className="row" style={{gap:9,flexWrap:'wrap'}}><Link className="btn" href="/teams/manage">Teams & roles</Link><Link className="btn" href="/calendar/manage">Church scheduling</Link><Link className="btn" href="/rosters">Rosters</Link><Link className="btn" href="/content">Content Studio</Link><Link className="btn" href="/church/finance">Finance Center</Link><Link className="ghost" href="/church/health">Full church health</Link><Link className="ghost" href="/outreach">Outreach & follow-up</Link></div></section>
  </main>
}
