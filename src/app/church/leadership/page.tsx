import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveLeadershipReview } from './actions'
import '../church.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Unnamed member'
const passed=(v:any)=>v==='completed'||v==='waived'||v===true

export default async function LeadershipDevelopmentPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id
  const [{data:members},{data:milestones},{data:reviews},{count:timothyCourses}]=await Promise.all([
    supabase.from('church_memberships').select('user_id,role,status').eq('church_id',churchId).eq('status','active'),
    supabase.from('member_milestones').select('*').eq('church_id',churchId),
    supabase.from('leadership_development_reviews').select('*').eq('church_id',churchId).eq('leadership_track','friendship_group'),
    supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).or('title.ilike.%timothy%,slug.ilike.%timothy%')
  ])
  const ids=(members??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const mm=new Map((milestones??[]).map((m:any)=>[m.user_id,m]))
  const rm=new Map((reviews??[]).map((r:any)=>[r.user_id,r]))

  const rows=(members??[]).map((member:any)=>{
    const m:any=mm.get(member.user_id)??{}
    const review:any=rm.get(member.user_id)??{}
    const objectiveGates=[
      ['Active member',member.status==='active'],
      ['Baptized',m.baptized===true],
      ['Holy Ghost',m.holy_ghost_received===true],
      ['First Steps',passed(m.first_steps_status)],
      ['Effective Soul Winning',passed(m.soul_winning_status)],
      ['Timothys',passed(m.timothys_status)],
      ['Covenant current',m.covenant_current===true]
    ] as const
    const pastoralGates=[
      ['Faithfulness reviewed',review.faithfulness_status==='faithful'],
      ['Pastoral approval',review.pastoral_approval_status==='approved']
    ] as const
    const gates=[...objectiveGates,...pastoralGates] as const
    const objective=objectiveGates.filter(([,ok])=>ok).length
    const objectiveComplete=objective===objectiveGates.length
    const ready=objectiveComplete&&pastoralGates.every(([,ok])=>ok)
    const missingObjective=objectiveGates.filter(([,ok])=>!ok).map(([label])=>label)
    const recommendation=missingObjective.length
      ? `Next measurable requirement: ${missingObjective[0]}.`
      : review.faithfulness_status!=='faithful'
        ? 'Objective requirements are complete. Next step: pastoral faithfulness review.'
        : review.pastoral_approval_status!=='approved'
          ? 'Objective requirements and faithfulness review are complete. Ready for pastoral approval decision.'
          : 'All configured requirements are complete. Leadership assignment remains a pastoral decision.'
    return {member,m,review,gates,objective,objectiveComplete,ready,missingObjective,recommendation,name:personName(pm.get(member.user_id))}
  }).sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(b.objectiveComplete)-Number(a.objectiveComplete)||b.objective-a.objective||a.name.localeCompare(b.name))

  const readyCount=rows.filter(r=>r.ready).length
  const inTimothys=rows.filter(r=>r.m.timothys_status==='in_progress').length
  const needsReview=rows.filter(r=>r.objectiveComplete&&!r.ready).length
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Leadership Development</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>

    <section className="admin-hero card"><div><div className="pill">LEADERSHIP PIPELINE</div><h1>Develop the next leaders.</h1><p className="muted">Kingdom Network can explain measurable readiness and recommend the next step. It never appoints a leader. Faithfulness, character, calling, timing and leadership assignment remain pastoral decisions.</p></div><div className="admin-badge"><Users size={22}/><div><strong>{rows.length}</strong><span>people in view</span></div></div></section>
    {query.saved&&<div className="notice success">Leadership review saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="stat-grid"><div className="card stat-card"><CheckCircle2/><div><strong>{readyCount}</strong><span>Configured gates complete</span></div></div><div className="card stat-card"><Users/><div><strong>{inTimothys}</strong><span>Timothys in progress</span></div></div><div className="card stat-card"><ShieldCheck/><div><strong>{needsReview}</strong><span>Ready for pastoral review</span></div></div><div className="card stat-card"><Circle/><div><strong>{rows.filter(r=>!r.objectiveComplete).length}</strong><span>Objective steps remaining</span></div></div></section>

    <section className="card admin-note"><div className="pill">FRIENDSHIP GROUP LEADER PATH</div><h3>Current readiness standard</h3><p className="muted">Active membership, baptism, Holy Ghost, First Steps, Effective Soul Winning, Timothys, current covenant, faithfulness review, and pastoral approval. The software only reports whether these configured gates are satisfied; it does not determine calling or appoint leadership.</p>{(timothyCourses??0)===0&&<div className="notice" style={{marginBottom:0}}><strong>Timothys curriculum source still needs to be connected.</strong> The member milestone exists, but there is currently no Timothy course in the Learning Center. Do not treat this status field as proof of course completion until leadership identifies and approves the official source curriculum.</div>}</section>

    <div className="section-heading"><div><div className="pill">PEOPLE</div><h2>Leadership development</h2></div><span className="small muted">Explainable objective progress + pastoral review</span></div>
    <section className="member-list">{rows.map(r=><article className="card" key={r.member.user_id} style={{padding:18}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:18,flexWrap:'wrap'}}><div style={{minWidth:230,flex:'1 1 260px'}}><div className="row"><div className="avatar large">{r.name.slice(0,1).toUpperCase()}</div><div><h3 style={{margin:'0 0 4px'}}>{r.name}</h3><span className="small muted">{r.member.role.replaceAll('_',' ')}</span></div></div><div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:7}}>{r.gates.map(([label,ok])=><span key={label} style={{fontSize:11,padding:'6px 8px',borderRadius:999,border:'1px solid var(--line)',background:ok?'#173324':'#211730',color:ok?'#c9f5d7':'#d8cce2'}}>{ok?'✓':'○'} {label}</span>)}</div><div className={r.ready?'notice success':'notice'} style={{margin:'12px 0 0'}}><strong>{r.ready?'Configured readiness gates complete.':'Recommended next step'}</strong><div className="small" style={{marginTop:4}}>{r.recommendation}</div>{r.missingObjective.length>1&&<div className="small muted" style={{marginTop:4}}>Other measurable requirements still open: {r.missingObjective.slice(1).join(' • ')}</div>}</div></div>
      <form action={saveLeadershipReview} style={{flex:'1 1 360px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="user_id" value={r.member.user_id}/><input type="hidden" name="leadership_track" value="friendship_group"/><label className="field" style={{margin:0}}><span>Faithfulness review</span><select name="faithfulness_status" defaultValue={r.review.faithfulness_status??'not_reviewed'} style={{background:'#0e0b13',border:'1px solid var(--line)',color:'white',borderRadius:11,padding:12}}><option value="not_reviewed">Not reviewed</option><option value="developing">Developing</option><option value="faithful">Faithful</option><option value="concern">Concern / needs conversation</option></select></label><label className="field" style={{margin:0}}><span>Pastoral approval</span><select name="pastoral_approval_status" defaultValue={r.review.pastoral_approval_status??'not_reviewed'} style={{background:'#0e0b13',border:'1px solid var(--line)',color:'white',borderRadius:11,padding:12}}><option value="not_reviewed">Not reviewed</option><option value="approved">Approved</option><option value="hold">Hold / not ready</option></select></label><label className="field" style={{gridColumn:'1 / -1',margin:0}}><span>Leadership development notes</span><textarea name="notes" rows={2} defaultValue={r.review.notes??''} placeholder="Mentoring needs, strengths, next steps…"/></label><div className="row" style={{gridColumn:'1 / -1',justifyContent:'space-between'}}><Link className="ghost" href={`/church/members/${r.member.user_id}`}>Open member record</Link><button className="btn">Save review</button></div></form></div>
    </article>)}{!rows.length&&<div className="card empty"><h3>No active members yet.</h3></div>}</section>
  </main>
}