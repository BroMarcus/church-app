import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3,BookOpen,HandHeart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './analytics.css'

const pct=(n:number,d:number)=>d?Math.round((n/d)*100):0
const nice=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

function Metric({label,value,total}:{label:string;value:number;total:number}){const p=pct(value,total);return <div className="metric-row"><span className="metric-label">{label}</span><div className="metric-track"><div className="metric-fill" style={{width:`${Math.min(100,p)}%`}}/></div><span className="metric-value">{value}/{total} • {p}%</span></div>}

export default async function ChurchAnalyticsPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const now=new Date(),nowMs=now.getTime(),nowIso=now.toISOString(),thirtyDaysAgo=new Date(nowMs-30*24*60*60*1000).toISOString().slice(0,10)

  const [{data:members},{data:milestones},{data:groups},{data:outreach},{data:courses},{data:applications},{data:teamAssignments},{count:openCare},{count:pendingDocs},{count:pendingMilestones},{data:campaigns}]=await Promise.all([
    supabase.from('church_memberships').select('user_id,relationship_status').eq('church_id',churchId).eq('status','active'),
    supabase.from('member_milestones').select('user_id,holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',churchId),
    supabase.from('groups').select('id').eq('church_id',churchId).eq('active',true),
    supabase.from('outreach_contacts').select('stage,follow_up_due_at').eq('church_id',churchId),
    supabase.from('courses').select('id,published').eq('church_id',churchId),
    supabase.from('ministry_applications').select('user_id,status,ministries!inner(church_id)').eq('ministries.church_id',churchId),
    supabase.from('team_assignments').select('id,assigned_user_id,confirmation_required,starts_at').eq('church_id',churchId).gte('starts_at',nowIso),
    supabase.from('care_requests').select('*',{count:'exact',head:true}).eq('church_id',churchId).in('status',['new','in_review']),
    supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('verification_status','pending'),
    supabase.from('reported_milestones').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','pending'),
    supabase.from('fundraising_campaigns').select('goal_amount,raised_amount,status').eq('church_id',churchId).eq('status','active')
  ])

  const activeAccounts=(members??[]).length,guestAccess=(members??[]).filter((m:any)=>m.relationship_status==='guest').length,memberIds=(members??[]).filter((m:any)=>m.relationship_status==='member').map((m:any)=>m.user_id),activeSet=new Set(memberIds),groupIds=(groups??[]).map((g:any)=>g.id),courseIds=(courses??[]).map((c:any)=>c.id),teamIds=(teamAssignments??[]).filter((a:any)=>a.confirmation_required).map((a:any)=>a.id)
  const [{data:groupMemberships},{data:groupReports},{data:enrollments},{data:teamResponses}]=await Promise.all([
    groupIds.length?supabase.from('group_memberships').select('user_id').in('group_id',groupIds):Promise.resolve({data:[] as any[]}),
    groupIds.length?supabase.from('group_reports').select('id,group_id,meeting_date,attendance_count,first_time_guests,active_bible_studies,baptisms,holy_ghost_received').in('group_id',groupIds).gte('meeting_date',thirtyDaysAgo).order('meeting_date',{ascending:false}):Promise.resolve({data:[] as any[]}),
    courseIds.length?supabase.from('course_enrollments').select('user_id,credential_earned').in('course_id',courseIds):Promise.resolve({data:[] as any[]}),
    teamIds.length?supabase.from('team_assignment_responses').select('assignment_id').in('assignment_id',teamIds):Promise.resolve({data:[] as any[]})
  ])
  const reportRows=groupReports??[],reportIds=reportRows.map((r:any)=>r.id)
  let memberAttendance:any[]=[]
  if(reportIds.length){const result=await supabase.from('group_report_attendance').select('user_id,group_report_id').in('group_report_id',reportIds).eq('present',true);memberAttendance=result.data??[]}

  const milestoneRows=(milestones??[]).filter((m:any)=>activeSet.has(m.user_id)),total=memberIds.length,recordedRows=milestoneRows.length
  const baptized=milestoneRows.filter((m:any)=>m.baptized===true).length,holyGhost=milestoneRows.filter((m:any)=>m.holy_ghost_received===true).length,firstSteps=milestoneRows.filter((m:any)=>m.first_steps_status==='completed').length,soulWinning=milestoneRows.filter((m:any)=>m.soul_winning_status==='completed').length,teachers=milestoneRows.filter((m:any)=>m.bible_study_teacher_status==='approved').length
  const grouped=new Set((groupMemberships??[]).map((m:any)=>m.user_id).filter((id:string)=>activeSet.has(id))).size
  const learnersCompleted=new Set((enrollments??[]).filter((e:any)=>e.credential_earned&&activeSet.has(e.user_id)).map((e:any)=>e.user_id)).size
  const serving=new Set([...(applications??[]).filter((a:any)=>a.status==='accepted').map((a:any)=>a.user_id),...(teamAssignments??[]).map((a:any)=>a.assigned_user_id)].filter((id:string)=>activeSet.has(id))).size
  const membersAttended30d=new Set(memberAttendance.map((a:any)=>a.user_id).filter((id:string)=>activeSet.has(id))).size

  const reportMeetings=reportRows.length,groupsReporting=new Set(reportRows.map((r:any)=>r.group_id)).size
  const reportAttendance=reportRows.reduce((s:number,r:any)=>s+Number(r.attendance_count||0),0),reportGuests=reportRows.reduce((s:number,r:any)=>s+Number(r.first_time_guests||0),0),reportStudies=reportRows.reduce((s:number,r:any)=>s+Number(r.active_bible_studies||0),0),reportBaptisms=reportRows.reduce((s:number,r:any)=>s+Number(r.baptisms||0),0),reportHolyGhost=reportRows.reduce((s:number,r:any)=>s+Number(r.holy_ghost_received||0),0)

  const stages=['new_contact','invited','guest','bible_study','regular_attendee','baptized','holy_ghost','first_steps','connected','serving']
  const stageCounts=new Map<string,number>();for(const s of stages)stageCounts.set(s,0);for(const o of outreach??[])if(stageCounts.has((o as any).stage))stageCounts.set((o as any).stage,(stageCounts.get((o as any).stage)??0)+1)
  const overdue=(outreach??[]).filter((o:any)=>o.follow_up_due_at&&new Date(o.follow_up_due_at).getTime()<nowMs&&!['inactive','serving'].includes(o.stage)).length,pendingApps=(applications??[]).filter((a:any)=>['submitted','under_review'].includes(a.status)).length
  const responded=new Set((teamResponses??[]).map((r:any)=>r.assignment_id)),teamDue=Math.max(0,teamIds.length-responded.size)
  const campaignGoal=(campaigns??[]).reduce((s:number,c:any)=>s+Number(c.goal_amount||0),0),campaignRaised=(campaigns??[]).reduce((s:number,c:any)=>s+Number(c.raised_amount||0),0)
  const attention=[['Pastoral care',openCare??0,'/help'],['Overdue outreach',overdue,'/outreach'],['Milestones to verify',pendingMilestones??0,'/church/milestone-review'],['Documents awaiting review',pendingDocs??0,'/documents'],['Ministry applications',pendingApps,'/serve'],['Team confirmations',teamDue,'/teams']] as const

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Church Health</div></div><div className="row"><Link className="ghost" href="/church/leadership">Leadership Pipeline</Link><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="analytics-hero card"><div><div className="pill">CHURCH HEALTH</div><h1>See where people are connecting and growing.</h1><p className="muted">Operational and discipleship signals designed to help leadership know where follow-up is needed.</p></div><div className="hero-stat"><BarChart3 size={22}/><span>Live from current church records</span></div></section>
    <section className="health-grid"><div className="card health-card"><strong>{total}</strong><span>Formal members</span></div><div className="card health-card"><strong>{guestAccess}</strong><span>Guests with app access</span></div><div className="card health-card"><strong>{activeAccounts}</strong><span>Total active app accounts</span></div><div className="card health-card"><strong>{grouped}</strong><span>Members group connected</span></div><div className="card health-card"><strong>{membersAttended30d}</strong><span>Members attended group • 30d</span></div><div className="card health-card"><strong>{learnersCompleted}</strong><span>Members with course completion</span></div><div className="card health-card"><strong>{serving}</strong><span>Members serving / accepted</span></div></section>
    <div className="analytics-layout">
      <section className="card analytics-panel"><div className="pill">30-DAY MINISTRY PULSE</div><h2>What Friendship Groups are reporting</h2><p className="small muted">These numbers update from submitted Friendship Group reports. They are ministry-report totals, separate from individual member milestone records.</p><div className="stage-list"><div className="stage-row"><span>Active groups reporting</span><strong>{groupsReporting}/{groupIds.length}</strong></div><div className="stage-row"><span>Meetings reported</span><strong>{reportMeetings}</strong></div><div className="stage-row"><span>Distinct formal members recorded present</span><strong>{membersAttended30d}</strong></div><div className="stage-row"><span>Total attendance entries</span><strong>{reportAttendance}</strong></div><div className="stage-row"><span>First-time guests</span><strong>{reportGuests}</strong></div><div className="stage-row"><span>Active Bible studies reported</span><strong>{reportStudies}</strong></div><div className="stage-row"><span>Baptisms reported</span><strong>{reportBaptisms}</strong></div><div className="stage-row"><span>Holy Ghost received reported</span><strong>{reportHolyGhost}</strong></div></div><div className="analytics-note">Individual attendance appears only when a leader checks members present on the digital group report. Older aggregate reports remain valid.</div></section>
      <section className="card analytics-panel"><div className="pill">RECORDED JOURNEY</div><h2>Current member and discipleship records</h2><p className="small muted">These counts reflect records currently stored in Kingdom Network. Spiritual milestones may be member-reported until leadership reviews them.</p><div className="metric-list"><Metric label="Milestone record present" value={recordedRows} total={total}/><Metric label="Baptism recorded" value={baptized} total={total}/><Metric label="Holy Ghost recorded" value={holyGhost} total={total}/><Metric label="First Steps completed" value={firstSteps} total={total}/><Metric label="Soul Winning completed" value={soulWinning} total={total}/><Metric label="Bible Study Teacher approved" value={teachers} total={total}/><Metric label="Friendship Group connected" value={grouped} total={total}/><Metric label="Attended a group in last 30 days" value={membersAttended30d} total={total}/><Metric label="Serving / ministry connected" value={serving} total={total}/></div><div className="analytics-note">Missing data means the record has not been entered here; it does not mean the milestone did not happen.</div></section>
      <section className="card analytics-panel"><div className="pill">OUTREACH FUNNEL</div><h2>People we are reaching</h2><p className="small muted">A snapshot of the current follow-up pipeline.</p><div className="stage-list">{stages.map(s=><div className="stage-row" key={s}><span>{nice(s)}</span><strong>{stageCounts.get(s)??0}</strong></div>)}</div></section>
      <section className="card analytics-panel"><div className="pill">NEEDS ATTENTION</div><h2>Operational follow-up</h2><p className="small muted">Items that can turn into missed people or missed responsibilities if they sit too long.</p><div className="attention-list">{attention.map(([title,count,href])=><Link className={`attention-line ${count>0?'urgent':''}`} href={href} key={title}><span>{title}</span><strong>{count}</strong></Link>)}</div></section>
      <section className="card analytics-panel"><div className="pill">MISSION & RESOURCES</div><h2>Learning and leadership signals</h2><div className="metric-list"><Metric label="Members with course completion" value={learnersCompleted} total={total}/><Metric label="Members connected to groups" value={grouped} total={total}/><Metric label="Members connected to service" value={serving} total={total}/></div><Link className="attention-line" href="/church/leadership"><span>Open leadership development pipeline</span><strong>→</strong></Link><div className="analytics-note"><BookOpen size={12}/> Published and draft course data remains controlled through Learning Studio.</div><div className="analytics-note"><HandHeart size={12}/> Active fundraising campaigns: {campaigns?.length??0} • confirmed ${campaignRaised.toLocaleString()} of ${campaignGoal.toLocaleString()} total goals.</div></section>
    </div>
  </main>
}
