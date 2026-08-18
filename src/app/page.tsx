import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,BriefcaseBusiness,CalendarDays,Church,FileText,GraduationCap,HandHeart,Megaphone,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CommunityFeed } from '@/components/community-feed'
import { NotificationBell } from '@/components/notification-bell'
import { getNextStep } from '@/lib/journey'

const modules=[
  {title:'Learning',desc:'Courses, badges & growth',Icon:GraduationCap,href:'/learning'},
  {title:'Groups',desc:'Friendship groups & reports',Icon:Users,href:'/groups'},
  {title:'Serve',desc:'Ministries & applications',Icon:HandHeart,href:'/serve'},
  {title:'Outreach',desc:'Guests & Bible studies',Icon:Megaphone,href:'/outreach'},
  {title:'Calendar',desc:'Church & district events',Icon:CalendarDays,href:'/calendar'},
  {title:'Documents',desc:'Certificates & records',Icon:FileText,href:'/documents'},
  {title:'Teams',desc:'Schedules & assignments',Icon:BriefcaseBusiness,href:'/teams'},
  {title:'Church',desc:'Directory & leadership',Icon:Church,href:'/church'}
] as const

export default async function Home(){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name,city,state)').eq('user_id',userId).eq('status','active').limit(1).single()
  ])

  if(!membership?.church_id)return <main className="shell"><div className="card" style={{padding:24}}><h1>Account created.</h1><p>Your church membership is being connected.</p><form action="/auth/signout" method="post"><button className="btn">Sign out</button></form></div></main>

  const [{data:milestones},{count:groupCount},{count:teamCount},{count:acceptedCount}]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('*',{count:'exact',head:true}).eq('assigned_user_id',userId),
    supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted')
  ])
  const m:any=milestones??{}
  const nextStep=getNextStep({holyGhost:m.holy_ghost_received,baptized:m.baptized,firstSteps:m.first_steps_status,soulWinning:m.soul_winning_status,bibleStudyTeacher:m.bible_study_teacher_status,groupCount:groupCount??0,serveCount:(teamCount??0)+(acceptedCount??0)})
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as {name?:string;city?:string;state?:string}|null
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Member'
  const isAdmin=['pastor','church_admin'].includes(membership.role)

  return <main className="shell">
    <header className="topbar"><div><div className="brand">Kingdom <span>Network</span></div><div className="small muted">{church?.name??'Your Church'} • {membership.role.replaceAll('_',' ')}</div></div><div className="row"><NotificationBell userId={userId}/>{isAdmin&&<Link className="ghost" href="/church">Church admin</Link>}<Link className="ghost" href="/profile">My profile</Link><form action="/auth/signout" method="post"><button className="ghost">Sign out</button></form></div></header>

    <section className="hero card"><div><div className="pill">WELCOME BACK</div><h1>{name}</h1><p>Connect. Grow. Serve. Reach.</p></div><div className="hero-stat"><strong>Alpha</strong><span>Real accounts + real database</span></div></section>

    <section className="card" style={{padding:20,marginBottom:18,borderColor:'#5a3a7d',display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div style={{display:'flex',gap:13,alignItems:'flex-start',maxWidth:760}}><div className="avatar" style={{width:46,height:46,flex:'none'}}><Sparkles size={20}/></div><div><div className="pill">MY NEXT STEP • {nextStep.reason.toUpperCase()}</div><h2 style={{margin:'9px 0 5px'}}>{nextStep.title}</h2><p className="muted" style={{margin:0,lineHeight:1.5}}>{nextStep.body}</p></div></div><Link className="btn" href={nextStep.href} style={{display:'inline-flex',alignItems:'center',gap:7}}>{nextStep.action}<ArrowRight size={15}/></Link></section>

    <section className="module-grid">{modules.map(({title,desc,Icon,...module})=>{const body=<><Icon size={22}/><strong>{title}</strong><span>{desc}</span><small>{'href' in module?'Open module':'Foundation ready'}</small></>;return 'href' in module?<Link className="module card module-link" href={module.href} key={title}>{body}</Link>:<div className="module card" key={title}>{body}</div>})}</section>

    <div className="content-grid"><CommunityFeed churchId={membership.church_id} userId={userId}/><aside><div className="card side"><div className="pill">ACTIVE NOW</div><h3>Kingdom Network Alpha</h3><ul><li>Personalized My Next Step</li><li>In-app notifications</li><li>Member profiles & private contact info</li><li>Church admin & verified records</li><li>Friendship Groups & leader reports</li><li>First Steps Learning Center</li><li>Learning Studio, levels, trophies & games</li><li>Weekly learning challenges & streaks</li><li>Outreach follow-up pipeline</li><li>Ministry opportunities & qualification</li><li>Unified church calendar & RSVPs</li><li>Team schedules & confirmations</li><li>Private document vault & verification</li><li>Community feed with comments & reactions</li></ul></div><div className="card side"><div className="pill">COMING NEXT</div><h3>Kingdom Guide</h3><p className="muted">AI navigation, biblical resource search and personalized discipleship recommendations will connect to approved church resources.</p></div></aside></div>
  </main>
}
