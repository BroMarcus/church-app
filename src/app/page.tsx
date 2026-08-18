import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,BriefcaseBusiness,CalendarDays,Church,FileText,Globe2,GraduationCap,HandHeart,HeartHandshake,MessageCircle,Megaphone,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CommunityFeed } from '@/components/community-feed'
import { NotificationBell } from '@/components/notification-bell'
import { OfficialUpdates } from '@/components/official-updates'
import { UpcomingSnapshot } from '@/components/upcoming-snapshot'
import { FeaturedEvents } from '@/components/featured-events'
import { getNextStep } from '@/lib/journey'

const modules=[
  {title:'Learning',desc:'Courses, badges & growth',Icon:GraduationCap,href:'/learning'},
  {title:'Groups',desc:'Friendship groups & reports',Icon:Users,href:'/groups'},
  {title:'Messages',desc:'Private member conversations',Icon:MessageCircle,href:'/messages'},
  {title:'Serve',desc:'Ministries & applications',Icon:HandHeart,href:'/serve'},
  {title:'Outreach',desc:'Guests & Bible studies',Icon:Megaphone,href:'/outreach'},
  {title:'Calendar',desc:'Church & district events',Icon:CalendarDays,href:'/calendar'},
  {title:'Documents',desc:'Certificates & records',Icon:FileText,href:'/documents'},
  {title:'Teams',desc:'Schedules & assignments',Icon:BriefcaseBusiness,href:'/teams'},
  {title:'Fundraising',desc:'Campaigns & goal tracking',Icon:HeartHandshake,href:'/fundraising'},
  {title:'Network',desc:'Organization & district',Icon:Globe2,href:'/network'},
  {title:'Church',desc:'Member directory',Icon:Church,href:'/directory'},
  {title:'Care',desc:'Prayer & pastoral support',Icon:HandHeart,href:'/help'}
] as const

export default async function Home(){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name,city,state,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).single()
  ])

  if(!membership?.church_id)return <main className="shell"><div className="card" style={{padding:24}}><h1>Account created.</h1><p>Your church membership has not been connected yet. If you were invited, make sure you used the invited email address.</p><form action="/auth/signout" method="post"><button className="btn">Sign out</button></form></div></main>

  const [{data:milestones},{count:groupCount},{count:teamCount},{count:acceptedCount},{data:newConvertCourses}]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('*',{count:'exact',head:true}).eq('assigned_user_id',userId),
    supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted'),
    supabase.from('courses').select('id').eq('church_id',membership.church_id).eq('published',true).eq('pathway_stage','new_convert')
  ])
  const newConvertIds=(newConvertCourses??[]).map((c:any)=>c.id)
  let newConvertCompleted=false
  if(newConvertIds.length){const {data:completedRows}=await supabase.from('course_enrollments').select('course_id').eq('user_id',userId).eq('credential_earned',true).in('course_id',newConvertIds).limit(1);newConvertCompleted=Boolean(completedRows?.length)}
  const m:any=milestones??{}
  const nextStep=getNextStep({holyGhost:m.holy_ghost_received,baptized:m.baptized,newConvertAvailable:newConvertIds.length>0,newConvertCompleted,firstSteps:m.first_steps_status,soulWinning:m.soul_winning_status,bibleStudyTeacher:m.bible_study_teacher_status,groupCount:groupCount??0,serveCount:(teamCount??0)+(acceptedCount??0)})
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as {name?:string;city?:string;state?:string;logo_path?:string|null;brand_color?:string|null;welcome_message?:string|null}|null
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Member'
  const isAdmin=['pastor','church_admin'].includes(membership.role)
  const churchLogo=church?.logo_path?supabase.storage.from('church-branding').getPublicUrl(church.logo_path).data.publicUrl:null
  const accent=church?.brand_color||'#5a3a7d'

  return <main className="shell">
    <header className="topbar"><div><div className="brand">Kingdom <span>Network</span></div><div className="small muted">{church?.name??'Your Church'} • {membership.role.replaceAll('_',' ')}</div></div><div className="row"><NotificationBell userId={userId}/>{isAdmin&&<Link className="ghost" href="/church">Church admin</Link>}<Link className="ghost" href="/profile">My profile</Link><form action="/auth/signout" method="post"><button className="ghost">Sign out</button></form></div></header>

    <section className="hero card" style={{borderColor:accent}}><div style={{display:'flex',alignItems:'center',gap:14}}>{churchLogo&&<img src={churchLogo} alt={`${church?.name??'Church'} logo`} style={{width:64,height:64,borderRadius:16,objectFit:'contain',background:'#100c14',padding:6,border:'1px solid #3b3043'}}/>}<div><div className="pill">WELCOME BACK</div><h1>{name}</h1><p>{church?.welcome_message||'Connect. Grow. Serve. Reach.'}</p></div></div><div className="hero-stat"><strong>{church?.name??'Kingdom Network'}</strong><span>{[church?.city,church?.state].filter(Boolean).join(', ')||'Local church community'}</span></div></section>

    <section className="card" style={{padding:20,marginBottom:18,borderColor:accent,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div style={{display:'flex',gap:13,alignItems:'flex-start',maxWidth:760}}><div className="avatar" style={{width:46,height:46,flex:'none'}}><Sparkles size={20}/></div><div><div className="pill">MY NEXT STEP • {nextStep.reason.toUpperCase()}</div><h2 style={{margin:'9px 0 5px'}}>{nextStep.title}</h2><p className="muted" style={{margin:0,lineHeight:1.5}}>{nextStep.body}</p></div></div><Link className="btn" href={nextStep.href} style={{display:'inline-flex',alignItems:'center',gap:7}}>{nextStep.action}<ArrowRight size={15}/></Link></section>

    <UpcomingSnapshot churchId={membership.church_id} userId={userId}/>
    <FeaturedEvents churchId={membership.church_id}/>

    <section className="module-grid">{modules.map(({title,desc,Icon,href})=><Link className="module card module-link" href={href} key={title}><Icon size={22}/><strong>{title}</strong><span>{desc}</span><small>Open module</small></Link>)}</section>

    <OfficialUpdates churchId={membership.church_id}/>

    <div className="content-grid"><CommunityFeed churchId={membership.church_id} userId={userId}/><aside><div className="card side"><div className="pill">ACTIVE NOW</div><h3>Kingdom Network Alpha</h3><ul><li>Personalized My Next Step</li><li>Personalized upcoming responsibilities</li><li>Featured event discovery & flyers</li><li>Organization & district Network view</li><li>Private member messaging with block/report controls</li><li>Church-specific logo, branding & welcome</li><li>Official church updates & announcements</li><li>Private pastoral care requests</li><li>In-app notifications</li><li>Member profiles & private contact info</li><li>Member directory & secure invitations</li><li>Church admin & verified records</li><li>Friendship Groups, join requests & leader reports</li><li>First Steps Learning Center</li><li>Learning Studio, levels, trophies & games</li><li>Weekly learning challenges & streaks</li><li>Outreach follow-up pipeline & history</li><li>Ministry opportunities & qualification</li><li>Unified church calendar & RSVPs</li><li>Team schedules & confirmations</li><li>Fundraising campaigns & goal tracking</li><li>Private document vault & verification</li><li>Community feed with comments & reactions</li></ul></div><div className="card side"><div className="pill">COMING NEXT</div><h3>Kingdom Guide</h3><p className="muted">AI navigation, biblical resource search and personalized discipleship recommendations will connect to approved church resources.</p></div></aside></div>
  </main>
}
