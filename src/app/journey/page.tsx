import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,Check,Church,Compass,HandHeart,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './journey.css'

const date=(v?:string|null)=>v?new Date(`${v}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):''
const nice=(v?:string|null)=>String(v||'not recorded').replaceAll('_',' ')

export default async function JourneyPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const [{data:milestones},{data:enrollments},{data:groupMemberships},{data:applications},{data:assignments}]=await Promise.all([
    supabase.from('member_milestones').select('*').eq('church_id',churchId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_enrollments').select('*').eq('user_id',userId),
    supabase.from('group_memberships').select('group_id,role,joined_at').eq('user_id',userId),
    supabase.from('ministry_applications').select('*').eq('user_id',userId),
    supabase.from('team_assignments').select('id,ministry_id,title,starts_at').eq('assigned_user_id',userId).order('starts_at',{ascending:false}).limit(20)
  ])
  const courseIds=(enrollments??[]).map((e:any)=>e.course_id),groupIds=(groupMemberships??[]).map((g:any)=>g.group_id),ministryIds=Array.from(new Set([...(applications??[]).map((a:any)=>a.ministry_id),...(assignments??[]).map((a:any)=>a.ministry_id)].filter(Boolean)))
  let courses:any[]=[];let groups:any[]=[];let ministries:any[]=[]
  if(courseIds.length){const r=await supabase.from('courses').select('id,title,pathway_stage,language_code,curriculum_version').in('id',courseIds);courses=r.data??[]}
  if(groupIds.length){const r=await supabase.from('groups').select('id,name,group_type').in('id',groupIds);groups=r.data??[]}
  if(ministryIds.length){const r=await supabase.from('ministries').select('id,name').in('id',ministryIds);ministries=r.data??[]}
  const cm=new Map(courses.map((c:any)=>[c.id,c])),gm=new Map(groups.map((g:any)=>[g.id,g])),mm=new Map(ministries.map((m:any)=>[m.id,m]))
  const m:any=milestones??{}
  const newBirth=Boolean(m.baptized&&m.holy_ghost_received)
  const foundation=m.first_steps_status==='completed'
  const connection=(groupMemberships??[]).length>0
  const outreach=m.soul_winning_status==='completed'||m.bible_study_teacher_status==='approved'
  const serving=(applications??[]).some((a:any)=>a.status==='accepted')||(assignments??[]).length>0
  const stages=[['New Birth',newBirth],['Foundation',foundation],['Connection',connection],['Outreach / Teaching',outreach],['Serving',serving]] as const
  const firstIncomplete=stages.findIndex(([,done])=>!done)
  const stageClass=(index:number,done:boolean)=>done?'complete':index===firstIncomplete?'active':''
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const courseRows=(enrollments??[]).map((e:any)=>({e,c:cm.get(e.course_id)})).filter((x:any)=>x.c)
  const accepted=(applications??[]).filter((a:any)=>a.status==='accepted')

  const milestone=(title:string,done:boolean,detail:string)=><div className={`milestone ${done?'done':''}`}><div className="milestone-main"><div className="milestone-icon">{done?<Check size={13}/>:<Compass size={13}/>}</div><div><strong>{title}</strong><span>{detail}</span></div></div><div className="milestone-status">{done?'Verified / complete':'Not complete or not recorded'}</div></div>

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • My Journey</div></div><div className="row"><Link className="ghost" href="/learning">Learning</Link><Link className="ghost" href="/profile">My profile</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="journey-hero card"><div><div className="pill">MY JOURNEY</div><h1>See where you are and what has been recorded.</h1><p className="muted">Verified spiritual milestones, discipleship progress, connection, preparation and serving—without turning spiritual life into a score.</p></div><div className="hero-stat"><Sparkles size={23}/><span>{stages.filter(([,done])=>done).length} of {stages.length} journey areas active/complete</span></div></section>

    <section className="journey-rail">{stages.map(([title,done],index)=><div className={`card journey-step ${stageClass(index,done)}`} key={title}><div className="step-icon">{done?<Check size={14}/>:index===firstIncomplete?<Compass size={14}/>:<span>{index+1}</span>}</div><strong>{title}</strong><span>{done?'Recorded / connected':index===firstIncomplete?'Current growth area':'Ahead'}</span></div>)}</section>

    <section className="journey-grid"><article className="card journey-card"><div className="pill">NEW BIRTH</div><h2>Leadership-verified milestones</h2><div className="milestone-list">{milestone('Baptism',m.baptized===true,m.baptized?`Recorded${m.baptism_date?` • ${date(m.baptism_date)}`:''}`:'No verified baptism record yet.')}{milestone('Holy Ghost',m.holy_ghost_received===true,m.holy_ghost_received?`Recorded${m.holy_ghost_date?` • ${date(m.holy_ghost_date)}`:''}`:'No verified Holy Ghost record yet.')}</div><p className="small muted">These are verified church records. Members do not self-award them, and they do not produce Learning XP.</p></article>

      <article className="card journey-card"><div className="pill">FOUNDATION</div><h2>Discipleship foundation</h2><div className="milestone-list">{milestone('First Steps',m.first_steps_status==='completed',`Status: ${nice(m.first_steps_status)}${m.first_steps_completed_at?` • ${date(m.first_steps_completed_at)}`:''}`)}{milestone('Effective Soul Winning',m.soul_winning_status==='completed',`Status: ${nice(m.soul_winning_status)}${m.soul_winning_completed_at?` • ${date(m.soul_winning_completed_at)}`:''}`)}</div></article>

      <article className="card journey-card"><div className="pill">CONNECTION</div><h2>Groups & relationships</h2><div className="milestone-list">{(groupMemberships??[]).map((g:any)=>{const group:any=gm.get(g.group_id);return <div className="milestone done" key={g.group_id}><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>{group?.name||'Church group'}</strong><span>{String(group?.group_type||'group').replaceAll('_',' ')} • {String(g.role).replaceAll('_',' ')}</span></div></div><Link className="record-link" href={`/groups/${g.group_id}`}>Open</Link></div>})}{!groupMemberships?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>No active group connection recorded</strong><span>Explore Friendship Groups and other church communities.</span></div></div><Link className="record-link" href="/groups">Explore</Link></div>}</div></article>

      <article className="card journey-card"><div className="pill">TEACHING & PREPARATION</div><h2>Equipping others</h2><div className="milestone-list">{milestone('Bible Study Teacher',m.bible_study_teacher_status==='approved',`Status: ${nice(m.bible_study_teacher_status)}`)}{milestone('Timothys',m.timothys_status==='completed',`Status: ${nice(m.timothys_status)}${m.timothys_completed_at?` • ${date(m.timothys_completed_at)}`:''}`)}{milestone('School of Pastors',m.school_pastors_status==='completed',`Status: ${nice(m.school_pastors_status)}${m.school_pastors_completed_at?` • ${date(m.school_pastors_completed_at)}`:''}`)}</div></article>

      <article className="card journey-card journey-wide"><div className="pill">LEARNING</div><h2>Courses in your account</h2><div className="journey-courses">{courseRows.map(({e,c}:any)=>{const pct=Math.max(0,Math.min(100,Number(e.progress_percent??0)));return <div className="journey-course" key={`${e.course_id}-${e.user_id}`}><strong>{c.title}</strong><span>{String(c.pathway_stage||'learning').replaceAll('_',' ')} • {String(c.language_code||'').toUpperCase()} • {pct}%{e.credential_earned?' • Credential earned':''}</span><div className="course-progress"><i style={{width:`${pct}%`}}/></div></div>})}{!courseRows.length&&<div className="journey-course"><strong>No course enrollment yet</strong><span>Your Learning Center courses will appear here as you begin them.</span></div>}</div><Link className="ghost" href="/learning" style={{display:'inline-block',marginTop:10}}><BookOpen size={12}/> Open Learning Center</Link></article>

      <article className="card journey-card journey-wide"><div className="pill">SERVING</div><h2>Where you are serving or approved to serve</h2><div className="milestone-list">{accepted.map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{mm.get(a.ministry_id)||'Ministry'}</strong><span>Application accepted</span></div></div><div className="milestone-status">Accepted</div></div>)}{(assignments??[]).slice(0,8).map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><Church size={13}/></div><div><strong>{a.title}</strong><span>{mm.get(a.ministry_id)||'Church team'} • {new Date(a.starts_at).toLocaleDateString()}</span></div></div><div className="milestone-status">Assignment</div></div>)}{!accepted.length&&!assignments?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>No serving connection recorded yet</strong><span>Explore ministries when you are ready.</span></div></div><Link className="record-link" href="/serve">Explore</Link></div>}</div></article>
    </section>

    <section className="card journey-note"><div className="pill">IMPORTANT</div><p>My Journey reflects records currently stored in Kingdom Network. A missing item does not make a spiritual judgment about you; it means the system does not yet have that verified/completed record. Leadership can update verified milestones, while Learning/Groups/Serve update from your actual activity.</p></section>
  </main>
}
