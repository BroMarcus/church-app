import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,ShieldCheck,XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { reviewReportedMilestone } from './actions'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Unnamed member'
const label=(v:string)=>v==='baptism'?'Baptism':'Holy Ghost'

export default async function MilestoneReviewPage({searchParams}:{searchParams:Promise<{reviewed?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  const [{data:reported},{data:members}]=await Promise.all([
    supabase.from('reported_milestones').select('id,person_name,milestone_type,occurred_on,created_at,group_id,groups(name),reported_by,profiles:reported_by(display_name,first_name,last_name)').eq('church_id',churchId).eq('status','pending').order('created_at',{ascending:false}),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active')
  ])
  const ids=(members??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const options=profiles.map((p:any)=>({id:p.id,name:personName(p)})).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Milestone Review</div></div><div className="row"><Link className="ghost" href="/church/analytics">← Church Health</Link><Link className="ghost" href="/church">Church Admin</Link></div></header>
    <section className="card" style={{padding:20,marginBottom:14}}><div className="pill">VERIFICATION QUEUE</div><h1 style={{margin:'8px 0'}}>Confirm reported spiritual milestones</h1><p className="muted">Friendship Group reports can raise ministry totals immediately. This queue lets Pastor/admin connect a named report to the correct member before changing that person’s verified Journey record.</p></section>
    {query.reviewed&&<div className="notice success">Milestone review saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    <section style={{display:'grid',gap:12}}>{(reported??[]).map((r:any)=>{const group:any=Array.isArray(r.groups)?r.groups[0]:r.groups;const reporter:any=Array.isArray(r.profiles)?r.profiles[0]:r.profiles;return <article className="card" style={{padding:18}} key={r.id}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap'}}><div><div className="pill">{label(r.milestone_type).toUpperCase()} • PENDING</div><h2 style={{margin:'8px 0 4px'}}>{r.person_name}</h2><p className="small muted" style={{margin:0}}>Reported {r.occurred_on?`for ${new Date(r.occurred_on+'T12:00:00').toLocaleDateString()}`:'without an exact date'}{group?.name?` • ${group.name}`:''}{reporter?` • by ${personName(reporter)}`:''}</p></div><ShieldCheck size={24}/></div><form action={reviewReportedMilestone} style={{display:'grid',gap:10,marginTop:14}}><input type="hidden" name="report_id" value={r.id}/><input type="hidden" name="church_id" value={churchId}/><label className="field"><span>Match to member</span><select name="member_user_id" defaultValue=""><option value="">Choose member before verifying</option>{options.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><div className="row" style={{gap:8,flexWrap:'wrap'}}><button className="btn" name="decision" value="verified"><CheckCircle2 size={15}/> Verify and update Journey</button><button className="ghost" name="decision" value="dismissed"><XCircle size={15}/> Dismiss report</button></div></form></article>})}{!(reported??[]).length&&<div className="card" style={{padding:22}}><h3 style={{marginTop:0}}>Nothing waiting for verification.</h3><p className="muted" style={{marginBottom:0}}>Named baptisms and Holy Ghost reports submitted through Friendship Groups will appear here.</p></div>}</section>
  </main>
}
