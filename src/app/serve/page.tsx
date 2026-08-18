import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,ShieldCheck,UserRoundCheck,XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addRequirement,applyToMinistry,createMinistry,reviewApplication } from './actions'
import { qualification } from './qualification'
import './serve.css'

const statusLabel=(v:string)=>v.replaceAll('_',' ')
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Member'
const reqTypes=[['membership','Active member'],['holy_ghost','Holy Ghost'],['baptism','Baptism'],['course','Course completion'],['covenant','Covenant'],['training','Safety training'],['custom','Custom/manual']] as const
const reqKeys=[['','None'],['first_steps','First Steps'],['salt_series','Salt Series'],['soul_winning','Effective Soul Winning'],['timothys','Timothys'],['school_pastors','School of Pastors'],['child_abuse','Child Abuse Training'],['sexual_harassment','Sexual Harassment Training']] as const

export default async function ServePage({searchParams}:{searchParams:Promise<{created?:string;requirement?:string;applied?:string;reviewed?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,status,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const canManage=['ministry_leader','pastor','church_admin'].includes(membership.role)
  const [{data:ministries},{data:requirements},{data:myApps},{data:milestones}]=await Promise.all([
    supabase.from('ministries').select('*').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('ministry_requirements').select('*'),
    supabase.from('ministry_applications').select('*').eq('user_id',userId),
    supabase.from('member_milestones').select('*').eq('church_id',churchId).eq('user_id',userId).maybeSingle()
  ])
  const reqBy=new Map<string,any[]>();for(const r of requirements??[]){const list=reqBy.get((r as any).ministry_id)??[];list.push(r);reqBy.set((r as any).ministry_id,list)}
  const appBy=new Map((myApps??[]).map((a:any)=>[a.ministry_id,a]))
  let leaderApps:any[]=[]
  let appProfiles:any[]=[]
  if(canManage){const ids=(ministries??[]).map((m:any)=>m.id);if(ids.length){const r=await supabase.from('ministry_applications').select('*').in('ministry_id',ids).order('submitted_at',{ascending:false});leaderApps=r.data??[];const userIds=Array.from(new Set(leaderApps.map((a:any)=>a.user_id)));if(userIds.length){const p=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);appProfiles=p.data??[]}}}
  const pm=new Map(appProfiles.map((p:any)=>[p.id,p]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Serve</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="serve-hero card"><div><div className="pill">MINISTRY</div><h1>Find where you can serve.</h1><p className="muted">See ministry openings, verified prerequisites and your next qualification step.</p></div><div className="hero-stat"><strong>{ministries?.length??0}</strong><span>active ministries</span></div></section>
    {query.created&&<div className="notice success">Ministry created.</div>}{query.requirement&&<div className="notice success">Requirement added.</div>}{query.applied&&<div className="notice success">Application submitted.</div>}{query.reviewed&&<div className="notice success">Application reviewed.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="serve-grid">{(ministries??[]).map((m:any)=>{const reqs=reqBy.get(m.id)??[];const q=qualification(reqs,milestones,true);const app:any=appBy.get(m.id);return <article className="card ministry-card" key={m.id}><div className="row" style={{justifyContent:'space-between'}}><div className="pill">{m.openings==null?'MINISTRY':`${m.openings} OPENING${m.openings===1?'':'S'}`}</div>{app&&<span className="app-status">{statusLabel(app.status)}</span>}</div><h2>{m.name}</h2><p>{m.description||'Serve your church and community through this ministry.'}</p><div className="qualification"><span className="small muted">Qualification match</span><strong>{q.score}%</strong></div><div className="req-list">{q.checks.map((r:any)=><div className={`req-row ${r.met?'met':'missing'}`} key={r.id}><span>{r.label}</span><span className="req-state">{r.met?<><CheckCircle2 size={12}/> Met</>:<><XCircle size={12}/> Missing</>}</span></div>)}{!q.checks.length&&<div className="req-row met"><span>No verified prerequisites configured.</span><span className="req-state">Open</span></div>}</div>{app?<p className="small muted">Application submitted {new Date(app.submitted_at).toLocaleDateString()} • Score {app.qualification_score??0}%</p>:<form action={applyToMinistry}><input type="hidden" name="ministry_id" value={m.id}/><label className="field"><span>Why are you interested? (optional)</span><textarea name="message" rows={2}/></label><button className="btn"><UserRoundCheck size={15}/> Apply to serve</button></form>}
      {canManage&&<form action={addRequirement} className="create-req"><input type="hidden" name="ministry_id" value={m.id}/><div className="create-req-grid"><label className="field"><span>Requirement type</span><select name="requirement_type" defaultValue="membership">{reqTypes.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>Requirement key</span><select name="requirement_key" defaultValue="">{reqKeys.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>Label shown to member</span><input name="label" required placeholder="e.g. First Steps completed"/></label><button className="ghost">Add requirement</button></div></form>}
    </article>})}{!ministries?.length&&<div className="card empty"><h3>No ministries have been published yet.</h3><p className="muted">Church leadership can create the first opportunity below.</p></div>}</section>

    {canManage&&<section className="card admin-serve"><div className="pill">LEADERSHIP</div><h2>Create ministry opportunity</h2><form action={createMinistry}><input type="hidden" name="church_id" value={churchId}/><div className="serve-form-grid"><label className="field"><span>Ministry name</span><input name="name" required placeholder="e.g. Bible Study Team"/></label><label className="field"><span>Openings</span><input name="openings" type="number" min="0"/></label><label className="field"><span>Description</span><input name="description" placeholder="What this team does"/></label></div><button className="btn">Create ministry</button></form></section>}

    {canManage&&<section className="admin-apps"><div className="section-heading"><div><div className="pill">APPLICATIONS</div><h2>Ministry applications</h2></div><span className="small muted">Leadership review</span></div>{leaderApps.map((a:any)=>{const ministry=(ministries??[]).find((m:any)=>m.id===a.ministry_id);return <article className="card application-card" key={a.id}><div><h3>{personName(pm.get(a.user_id))} → {ministry?.name||'Ministry'}</h3><div className="small muted">Submitted {new Date(a.submitted_at).toLocaleDateString()} • Qualification {a.qualification_score??0}% • {statusLabel(a.status)}</div>{a.message&&<p>{a.message}</p>}{a.status==='accepted'&&<Link className="ghost" style={{display:'inline-flex',marginTop:8}} href={`/teams?member=${encodeURIComponent(a.user_id)}&ministry=${encodeURIComponent(a.ministry_id)}`}>Schedule in Teams →</Link>}</div><form action={reviewApplication} className="review-form"><input type="hidden" name="application_id" value={a.id}/><label className="field"><span>Status</span><select name="status" defaultValue={a.status==='submitted'?'interview':a.status}><option value="qualified">Qualified</option><option value="interview">Interview</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></label><label className="field"><span>Review note</span><input name="review_note" defaultValue={a.review_note??''}/></label><button className="btn"><ShieldCheck size={14}/> Save</button></form></article>})}{!leaderApps.length&&<div className="card empty"><h3>No applications yet.</h3><p className="muted">Applications will appear here for ministry leadership.</p></div>}</section>}
  </main>
}
