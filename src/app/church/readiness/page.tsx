import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,CheckCircle2,CircleDashed,Info,ShieldAlert,ShieldCheck,Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './readiness.css'

const Icon=({status}:{status:string})=>status==='ready'?<CheckCircle2 size={16}/>:status==='error'?<ShieldAlert size={16}/>:status==='warning'||status==='action'?<AlertTriangle size={16}/>:status==='optional'?<CircleDashed size={16}/>:<Info size={16}/>

export default async function ReadinessPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:checks,error}=await supabase.rpc('church_pilot_readiness',{p_church_id:membership.church_id})
  const rows=checks??[]
  const scored=rows.filter((r:any)=>!['optional','info'].includes(r.check_status))
  const ready=scored.filter((r:any)=>r.check_status==='ready').length
  const score=scored.length?Math.round(ready/scored.length*100):0
  const blockers=rows.filter((r:any)=>['error','warning','action'].includes(r.check_status)).length
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Pilot Readiness</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="readiness-hero card"><div><div className="pill">PILOT READINESS</div><h1>What needs attention before we invite a test group?</h1><p className="muted">Live church/database checks plus a few platform settings that still require a human dashboard check.</p></div><div className="readiness-score"><div><strong>{score}%</strong><span>app checks ready</span></div></div></section>
    {error&&<div className="notice error">Unable to load one or more readiness checks: {error.message}</div>}

    <section className="readiness-grid">{rows.map((r:any)=><article className={`card check-card ${r.check_status}`} key={r.check_key}><div className="check-icon"><Icon status={r.check_status}/></div><div className="check-copy"><div className="pill">{String(r.check_status).toUpperCase()}</div><strong>{r.check_label}</strong><span>{r.detail}</span>{r.action_href&&<Link href={r.action_href}>Open related area →</Link>}</div></article>)}</section>

    <section className="manual-section"><div className="section-heading"><div><div className="pill">PLATFORM CHECKS</div><h2>Final settings around the live application.</h2></div><span className="small muted">Not included in the {score}% app-check score.</span></div><div className="manual-grid"><article className="card manual-card"><div className="pill">REQUIRED BEFORE REAL INVITES</div><h3><Wrench size={13}/> Supabase Auth production URL</h3><p>Confirm the Auth Site URL and allowed redirect URLs point to the permanent Kingdom Network production domain instead of localhost. The application now sends confirmations to the canonical production callback; this dashboard setting should match it.</p></article><article className="card manual-card"><div className="pill">SECURITY</div><h3><ShieldCheck size={13}/> Leaked-password protection</h3><p>Enable Supabase Auth leaked-password protection before a broader pilot. This is controlled from Supabase Auth settings rather than the database workflow.</p></article><article className="card manual-card"><div className="pill">VERIFIED</div><h3><CheckCircle2 size={13}/> Production deployment</h3><p>The main branch is now deploying successfully to the stable Kingdom Network production aliases on the modern Next.js stack. Production build recovery is no longer an open pilot blocker.</p></article><article className="card manual-card"><div className="pill">PILOT PLAN</div><h3><ShieldCheck size={13}/> Start small</h3><p>Once the remaining required items are green, invite a small controlled group first—leadership plus a few members—then test real onboarding, learning, groups, calendar, serving, notifications, privacy and mobile use before inviting the whole church.</p></article></div></section>

    <section className="card readiness-footer"><div className="pill">CURRENT ACTION COUNT</div><h2 style={{margin:'7px 0 5px'}}>{blockers} app check{blockers===1?'':'s'} currently need attention.</h2><p className="small muted">This page is meant to shrink that number over time. It is not a marketing score; it is an operational checklist tied to live church data.</p></section>
  </main>
}
