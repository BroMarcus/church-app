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
    {title:'1. Church basics',body:'Confirm your church name, city, state and timezone.',href:'/church/settings',done:identity,Icon:Church},
    {title:'2. Add a backup admin',body:'Give one trusted leader admin access so the church is never dependent on one account.',href:'/church',done:adminReady,Icon:ShieldCheck},
    {title:'3. Make it yours',body:'Add your logo, church color and a short welcome message.',href:'/church/settings',done:branding,Icon:Palette},
    {title:'4. Add your first people',body:'Invite a few real pilot members. You can also import a list when you are ready.',href:'/church/invites',done:people,Icon:MailPlus},
    {title:'5. Give members a next step',body:'Publish at least one class or discipleship course.',href:'/learning',done:learning,Icon:GraduationCap},
    {title:'6. Add a group',body:'Create at least one Friendship Group, ministry or community.',href:'/groups',done:groupReady,Icon:Users},
    {title:'7. Add an event',body:'Put one upcoming church event on the calendar so members can see what is next.',href:'/calendar',done:calendar,Icon:CalendarDays},
    {title:'8. Check pilot readiness',body:'Run the final check before inviting your pilot group.',href:'/church/readiness',done:false,Icon:Check}
  ]
  const completed=steps.slice(0,7).filter(s=>s.done).length
  const pct=Math.round(completed/7*100)
  const nextStep=steps.slice(0,7).find(s=>!s.done)??steps[7]
  const NextIcon=nextStep.Icon

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Church Builder</div></div><Link className="ghost" href="/church">← Church Admin</Link></header>
    <section className="launch-hero card"><div><div className="pill">CHURCH BUILDER</div><h1>Set up your church one simple step at a time.</h1><p className="muted">You do not need to understand the technology. Complete the steps below and Kingdom Network will tell you what still needs attention.</p></div><div className="launch-progress"><strong>{pct}%</strong><span>{completed} of 7 setup steps ready</span><div className="launch-bar"><i style={{width:`${pct}%`}}/></div></div></section>

    <section className="card" style={{marginBottom:16}}><div className="pill">DO THIS NEXT</div><h2 style={{marginBottom:6}}><NextIcon size={18}/> {nextStep.title}</h2><p className="muted">{nextStep.body}</p><Link className="btn" href={nextStep.href}>Open this step →</Link></section>

    <section className="launch-grid">{steps.map((s,index)=>{const Icon=s.Icon;return <Link href={s.href} className={`card launch-step ${s.done?'done':''}`} key={s.title}><div className="launch-num">{s.done?<Check size={14}/>:index+1}</div><div className="launch-copy"><strong><Icon size={12}/> {s.title}</strong><span>{s.body}</span><div className="launch-status">{index===7?'Final check':s.done?'Done':'Still needed'}</div></div></Link>})}</section>

    <section className="launch-manual"><div className="section-heading"><div><div className="pill">PILOT NOTE</div><h2>Kingdom Network handles the technical side.</h2></div></div><div className="manual-grid"><article className="card manual-launch-card"><h3>No domain purchase needed yet</h3><p>Keep using the current pilot address while the product is being proven. A permanent domain and custom email can wait.</p></article><article className="card manual-launch-card"><h3>Start small</h3><p>Invite leadership and a few trusted members first. Fix anything confusing before opening access church-wide.</p></article><article className="card manual-launch-card"><h3>Need help?</h3><p>Use Kingdom Guide for plain-language help finding features and deciding what to configure next.</p><Link href="/guide">Open Kingdom Guide →</Link></article></div></section>

    <section className="card launch-footer"><div className="pill">WHEN THE BAR IS FULL</div><h2>Run the pilot with real people.</h2><p className="small muted">Test invitations, sign in, password recovery, profiles, Messages, Learning, Groups, Calendar, Prayer/Pastoral Care and phone navigation before inviting the whole church.</p></section>
  </main>
}
