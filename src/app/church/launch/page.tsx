import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Check,Church,FileUp,GraduationCap,MailPlus,Palette,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './launch.css'

export default async function ChurchLaunchPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,city,state,timezone,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const [{count:admins},{count:members},{count:publishedCourses},{count:groups},{count:events},{count:openInvites},{count:imports}]=await Promise.all([
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin']),
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active'),
    supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('published',true),
    supabase.from('groups').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true),
    supabase.from('events').select('*',{count:'exact',head:true}).eq('church_id',churchId).gte('starts_at',new Date().toISOString()),
    supabase.from('church_invites').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()),
    supabase.from('church_import_batches').select('*',{count:'exact',head:true}).eq('church_id',churchId)
  ])
  const identity=Boolean(church?.name&&church?.city&&church?.state&&church?.timezone)
  const adminReady=(admins??0)>=2
  const branding=Boolean(church?.logo_path&&church?.brand_color)
  const people=(members??0)>1||(openInvites??0)>0||(imports??0)>0
  const learning=(publishedCourses??0)>0
  const groupReady=(groups??0)>0
  const calendar=(events??0)>0
  const steps=[
    {title:'Church identity',body:'Name, location and timezone define the tenant and keep schedules correct.',href:'/church/settings',done:identity,Icon:Church},
    {title:'Admin redundancy',body:'Have at least two trusted pastor/church-admin accounts so one account cannot lock the church out.',href:'/church',done:adminReady,Icon:ShieldCheck},
    {title:'Branding & welcome',body:'Add a church logo, accent color and welcome message so the tenant feels like the local church.',href:'/church/settings',done:branding,Icon:Palette},
    {title:'Bring people in',body:'Use secure invites or staged CSV imports. Account creation remains email-bound and member-controlled.',href:'/church/import',done:people,Icon:FileUp},
    {title:'Publish learning',body:'Give members at least one approved course/pathway to begin using the Learning Center.',href:'/learning',done:learning,Icon:GraduationCap},
    {title:'Configure groups',body:'Set up Friendship Groups/communities, leaders, discovery details and private meeting information.',href:'/groups',done:groupReady,Icon:Users},
    {title:'Publish the calendar',body:'Add at least one upcoming local event so calendar/RSVP/member reminders can be exercised.',href:'/calendar',done:calendar,Icon:CalendarDays},
    {title:'Run Pilot Readiness',body:'Use the live readiness dashboard and clear required action items before the first controlled pilot.',href:'/church/readiness',done:false,Icon:Check}
  ]
  const completed=steps.slice(0,7).filter(s=>s.done).length
  const pct=Math.round(completed/7*100)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Launch Hub</div></div><div className="row"><Link className="ghost" href="/church/invites"><MailPlus size={13}/> Invitations</Link><Link className="ghost" href="/church">← Church Admin</Link></div></header>
    <section className="launch-hero card"><div><div className="pill">CHURCH LAUNCH</div><h1>A repeatable path from empty tenant to pilot-ready church.</h1><p className="muted">The same process we can use for New Life Madera can eventually onboard Church #2, #20 or #2,000.</p></div><div className="launch-progress"><strong>{pct}%</strong><span>setup foundation</span><div className="launch-bar"><i style={{width:`${pct}%`}}/></div></div></section>

    <section className="launch-grid">{steps.map((s,index)=>{const Icon=s.Icon;return <Link href={s.href} className={`card launch-step ${s.done?'done':''}`} key={s.title}><div className="launch-num">{s.done?<Check size={14}/>:index+1}</div><div className="launch-copy"><strong><Icon size={12}/> {s.title}</strong><span>{s.body}</span><div className="launch-status">{index===7?'Final review':s.done?'Ready / configured':'Needs setup or content'}</div></div></Link>})}</section>

    <section className="launch-manual"><div className="section-heading"><div><div className="pill">PLATFORM-LEVEL CHECKS</div><h2>Do these once before a real member pilot.</h2></div></div><div className="manual-grid"><article className="card manual-launch-card"><div className="pill">AUTH</div><h3>Production Site URL / redirect</h3><p>Supabase Auth must confirm users back to the permanent production Kingdom Network domain rather than localhost.</p></article><article className="card manual-launch-card"><div className="pill">SECURITY</div><h3>Leaked-password protection</h3><p>Enable the Supabase Auth leaked-password protection setting. This remains the one standing Security Advisor warning.</p></article><article className="card manual-launch-card"><div className="pill">DEPLOY</div><h3>Stable production build</h3><p>Confirm the latest GitHub main branch deploys cleanly to one permanent public production URL after Vercel build throttling clears.</p></article></div></section>

    <section className="card launch-footer"><div className="pill">NEXT PHASE</div><h2>After setup comes controlled real-world use.</h2><p className="small muted">Start with leadership and a small member group. Test account invitations, profile/privacy, Messages, Learning, Groups, Calendar, Prayer/Pastoral Care and mobile navigation with real behavior before inviting the whole church.</p></section>
  </main>
}
