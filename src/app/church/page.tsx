import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle,BarChart3,BriefcaseBusiness,Church,Clock3,FileWarning,HandHeart,MailPlus,Settings,ShieldAlert,ShieldCheck,UserCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMembership } from './actions'
import './church.css'

const roleOptions=[['member','Member'],['group_leader','Group leader'],['ministry_leader','Ministry leader'],['minister','Minister'],['pastor','Pastor'],['church_admin','Church admin']] as const
const statusOptions=[['active','Active'],['visitor','Visitor'],['pending','Pending'],['inactive','Inactive']] as const
const niceDate=(value?:string|null)=>value?new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'

export default async function ChurchAdminPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,status,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id
  const nowIso=new Date().toISOString()
  const soonDate=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10)
  const today=new Date().toISOString().slice(0,10)
  const [{data:memberships},{count:openInvites},{count:openCare},{count:openMessageReports},{count:overdueOutreach},{count:pendingDocs},{count:expiringDocs},{count:pendingApplications},{data:teamAssignments}]=await Promise.all([
    supabase.from('church_memberships').select('id,user_id,role,status,joined_at,created_at').eq('church_id',churchId).order('created_at',{ascending:true}),
    supabase.from('church_invites').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',nowIso),
    supabase.from('care_requests').select('*',{count:'exact',head:true}).eq('church_id',churchId).in('status',['new','in_review']),
    supabase.from('message_reports').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','open'),
    supabase.from('outreach_contacts').select('*',{count:'exact',head:true}).eq('church_id',churchId).lt('follow_up_due_at',nowIso).not('stage','in','("inactive","serving")'),
    supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('verification_status','pending'),
    supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).gte('expires_at',today).lte('expires_at',soonDate),
    supabase.from('ministry_applications').select('id,ministries!inner(church_id)',{count:'exact',head:true}).eq('ministries.church_id',churchId).in('status',['submitted','under_review']),
    supabase.from('team_assignments').select('id').eq('church_id',churchId).eq('confirmation_required',true).gte('starts_at',nowIso)
  ])
  const teamIds=(teamAssignments??[]).map((a:any)=>a.id)
  let respondedTeamIds=new Set<string>()
  if(teamIds.length){const {data:teamResponses}=await supabase.from('team_assignment_responses').select('assignment_id').in('assignment_id',teamIds);respondedTeamIds=new Set((teamResponses??[]).map((r:any)=>r.assignment_id))}
  const awaitingTeam=Math.max(0,teamIds.length-respondedTeamIds.size)

  const ids=(memberships??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[];let details:any[]=[]
  if(ids.length){const [p,d]=await Promise.all([supabase.from('profiles').select('id,first_name,last_name,display_name').in('id',ids),supabase.from('member_private_details').select('user_id,email,phone').in('user_id',ids)]);profiles=p.data??[];details=d.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]));const dm=new Map(details.map((d:any)=>[d.user_id,d]))
  const rows=(memberships??[]).map((m:any)=>({membership:m,profile:pm.get(m.user_id),details:dm.get(m.user_id)}))
  const church=Array.isArray(actor.churches)?actor.churches[0]:actor.churches as {name?:string}|null
  const total=rows.length
  const active=rows.filter((r:any)=>r.membership.status==='active').length
  const leaders=rows.filter((r:any)=>r.membership.role!=='member').length
  const pending=rows.filter((r:any)=>['visitor','pending'].includes(r.membership.status)).length
  const attention=[
    {title:'Pastoral care requests',count:openCare??0,href:'/help',Icon:HandHeart,urgent:(openCare??0)>0},
    {title:'Reported private messages',count:openMessageReports??0,href:'/church/message-reports',Icon:ShieldAlert,urgent:(openMessageReports??0)>0},
    {title:'Overdue outreach',count:overdueOutreach??0,href:'/outreach',Icon:AlertCircle,urgent:(overdueOutreach??0)>0},
    {title:'Documents to review',count:pendingDocs??0,href:'/documents',Icon:FileWarning,urgent:(pendingDocs??0)>0},
    {title:'Documents expiring',count:expiringDocs??0,href:'/documents',Icon:Clock3,urgent:false},
    {title:'Ministry applications',count:pendingApplications??0,href:'/serve',Icon:BriefcaseBusiness,urgent:(pendingApplications??0)>0},
    {title:'Team responses due',count:awaitingTeam,href:'/teams',Icon:UserCheck,urgent:awaitingTeam>0},
    {title:'Open invitations',count:openInvites??0,href:'/church/invites',Icon:MailPlus,urgent:false}
  ]

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Church Admin</div></div><div className="row">{Boolean(openMessageReports)&&<Link className="ghost" href="/church/message-reports"><ShieldAlert size={14}/> Reports ({openMessageReports})</Link>}<Link className="ghost" href="/church/settings"><Settings size={14}/> Settings</Link><Link className="ghost" href="/church/analytics"><BarChart3 size={14}/> Church health</Link><Link className="ghost" href="/church/invites"><MailPlus size={14}/> Invite members{openInvites?` (${openInvites})`:''}</Link><Link className="ghost" href="/">← Home</Link><Link className="ghost" href="/profile">My profile</Link></div></header>
    <section className="admin-hero card"><div><div className="pill">CHURCH ADMIN</div><h1>{church?.name??'Church Directory'}</h1><p className="muted">Manage membership, invitations, leadership access and verified discipleship records.</p></div><div className="admin-badge"><ShieldCheck size={22}/><div><strong>{actor.role.replaceAll('_',' ')}</strong><span>Your access</span></div></div></section>
    {params.saved&&<div className="notice success">Member access updated.</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <section className="stat-grid"><div className="card stat-card"><Users/><div><strong>{total}</strong><span>Total people</span></div></div><div className="card stat-card"><UserCheck/><div><strong>{active}</strong><span>Active</span></div></div><div className="card stat-card"><ShieldCheck/><div><strong>{leaders}</strong><span>Leaders</span></div></div><div className="card stat-card"><Church/><div><strong>{pending}</strong><span>Guests / pending</span></div></div></section>

    <div className="section-heading"><div><div className="pill">NEEDS ATTENTION</div><h2>Leadership action queue</h2></div><span className="small muted">Live counts across church operations.</span></div>
    <section className="attention-grid">{attention.map(({title,count,href,Icon,urgent})=><Link className={`card attention-card ${urgent?'urgent':''}`} href={href} key={title}><div className="attention-icon"><Icon size={17}/></div><div><strong>{count}</strong><span>{title}</span></div></Link>)}</section>

    <div className="section-heading"><div><div className="pill">DIRECTORY</div><h2>Members & access</h2></div><span className="small muted">Pastors and church admins only.</span></div>
    <section className="member-list">{rows.map(({membership,profile,details}:any)=>{const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Unnamed member';const isYou=membership.user_id===userId;return <article className="card member-admin-card" key={membership.id}><div className="member-main"><div className="avatar large">{name.slice(0,1).toUpperCase()}</div><div className="member-copy"><div className="member-name"><strong>{name}</strong>{isYou&&<span className="mini-pill">YOU</span>}</div><span>{details?.email??'Email not available'}</span><small>{details?.phone||'No phone added'} • Joined {niceDate(membership.joined_at)}</small><Link className="record-link" href={`/church/members/${membership.user_id}`}>Open verified record →</Link></div></div><form action={updateMembership} className="member-controls"><input type="hidden" name="membership_id" value={membership.id}/><label><span>Role</span><select name="role" defaultValue={membership.role}>{roleOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label><span>Status</span><select name="status" defaultValue={membership.status}>{statusOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><button className="btn" type="submit">Save</button></form></article>})}{!rows.length&&<div className="card empty"><h3>No members yet.</h3><p className="muted">Create a secure member invitation to begin onboarding your church.</p><Link className="btn" href="/church/invites">Invite first member</Link></div>}</section>
    <section className="card admin-note"><div className="pill">VERIFIED RECORDS</div><h3>Discipleship milestones are separated from member-editable data.</h3><p className="muted">Open a member record to verify Holy Ghost, baptism, First Steps, ministry training, Bible-study qualification, safety training and covenant status.</p></section>
  </main>
}
