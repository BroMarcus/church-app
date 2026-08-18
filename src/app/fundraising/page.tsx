import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Flag,HeartHandshake,Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate } from '@/lib/church-time'
import { createCampaign,updateCampaign } from './actions'
import './fundraising.css'

const types=[['camp','Camp'],['convention','Convention'],['missions','Missions'],['building','Building Project'],['emergency','Emergency'],['youth','Youth'],['general','General']] as const
const statuses=[['draft','Draft'],['active','Active'],['completed','Completed'],['cancelled','Cancelled']] as const
const label=(rows:readonly (readonly [string,string])[],v:string)=>rows.find(([k])=>k===v)?.[1]??v.replaceAll('_',' ')
const cash=(v:any)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v)||0)

export default async function FundraisingPage({searchParams}:{searchParams:Promise<{created?:string;saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'America/Los_Angeles'
  const canCreate=['ministry_leader','pastor','church_admin','finance_admin'].includes(membership.role)
  const canOversee=['pastor','church_admin','finance_admin'].includes(membership.role)
  const {data:campaigns}=await supabase.from('fundraising_campaigns').select('*').eq('church_id',churchId).order('featured',{ascending:false}).order('created_at',{ascending:false})
  const rows=campaigns??[]
  const active=rows.filter((c:any)=>c.status==='active')
  const totalGoals=active.reduce((sum:number,c:any)=>sum+Number(c.goal_amount||0),0)
  const totalRaised=active.reduce((sum:number,c:any)=>sum+Number(c.raised_amount||0),0)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Fundraising</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="fund-hero card"><div><div className="pill">CAMPAIGNS & GOALS</div><h1>Give every mission a visible goal.</h1><p className="muted">Track confirmed progress for camps, conventions, missions, projects and urgent needs.</p></div><div className="hero-stat"><strong>{active.length}</strong><span>active campaign{active.length===1?'':'s'} • {cash(totalRaised)} of {cash(totalGoals)}</span></div></section>
    {query.created&&<div className="notice success">Fundraising campaign created.</div>}{query.saved&&<div className="notice success">Campaign progress updated.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="fund-layout"><section className="campaign-list">{rows.map((c:any)=>{const goal=Number(c.goal_amount)||0;const raised=Number(c.raised_amount)||0;const pct=goal>0?Math.min(100,Math.round((raised/goal)*100)):0;const canManage=canOversee||c.created_by===userId;return <article className={`card campaign-card ${c.featured?'featured':''}`} key={c.id}><div className="campaign-head"><div><div className="campaign-tags"><span className="campaign-tag">{label(types,c.campaign_type)}</span>{c.featured&&<span className="campaign-tag featured"><Star size={10}/> Featured</span>}{c.status!=='active'&&<span className="campaign-tag">{label(statuses,c.status)}</span>}</div><h2>{c.title}</h2></div><strong>{pct}%</strong></div>{c.description&&<p className="campaign-copy">{c.description}</p>}<div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`}}/></div><div className="money-row"><strong>{cash(raised)} raised</strong><span>Goal {cash(goal)} • {cash(Math.max(0,goal-raised))} remaining</span></div><div className="campaign-meta">{c.ends_at&&<span><CalendarDays size={12}/>Ends {formatChurchDate(c.ends_at,timeZone,{month:'short',day:'numeric',year:'numeric'})}</span>}<span><Flag size={12}/>{label(statuses,c.status)}</span></div>{canManage&&<form action={updateCampaign} className="manage-campaign"><input type="hidden" name="campaign_id" value={c.id}/><label><span>Confirmed total raised</span><input name="raised_amount" type="number" min="0" step="0.01" defaultValue={raised}/></label><label><span>Status</span><select name="status" defaultValue={c.status}>{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Featured</span><input name="featured" type="checkbox" defaultChecked={c.featured}/></label><button className="btn">Update</button></form>}</article>})}{!rows.length&&<div className="card fund-empty"><h3>No fundraising campaigns yet.</h3><p className="muted">When leadership creates a campaign, members will see its goal and confirmed progress here.</p></div>}</section>

    {canCreate&&<aside className="card fund-create"><div className="pill">LEADERSHIP</div><h2>Create campaign</h2><p className="small muted">Kingdom Network tracks the goal and confirmed total. It does not process payments in this Alpha.</p><form action={createCampaign} className="create-campaign"><input type="hidden" name="church_id" value={churchId}/><label className="wide"><span>Campaign title</span><input name="title" required placeholder="Youth Camp 2027"/></label><label><span>Type</span><select name="campaign_type" defaultValue="general">{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Goal amount</span><input name="goal_amount" type="number" min="0.01" step="0.01" required/></label><label><span>Starts</span><input name="starts_at" type="datetime-local"/></label><label><span>Ends</span><input name="ends_at" type="datetime-local"/></label><label><span>Status</span><select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option></select></label><label><span>Featured</span><input name="featured" type="checkbox"/></label><label className="wide"><span>Description</span><textarea name="description" rows={5} placeholder="What are we raising for, who does it help, and what will the funds make possible?"/></label><button className="btn wide"><HeartHandshake size={14}/> Create campaign</button></form></aside>}
    </div>
  </main>
}
