import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldAlert,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMessageReportStatus } from './actions'
import '../../messages/messages.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function MessageReportsPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:reports}=await supabase.from('message_reports').select('id,reporter_id,reported_sender_id,reason,message_snapshot,status,reviewed_by,reviewed_at,created_at').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(200)
  const ids=Array.from(new Set((reports??[]).flatMap((r:any)=>[r.reporter_id,r.reported_sender_id,r.reviewed_by]).filter(Boolean)))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const open=(reports??[]).filter((r:any)=>r.status==='open').length

  return <main className="shell"><div className="thread-shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Message Reports</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="messages-hero card"><div><div className="pill">MODERATION</div><h1>Reported private messages.</h1><p className="muted">Review only the specific message a participant chose to report—not the rest of their private conversation.</p></div><div className="hero-stat"><ShieldAlert size={23}/><span>{open} open report{open===1?'':'s'}</span></div></section>
    {query.saved&&<div className="notice success">Message report status updated.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    <section className="moderation-list">{(reports??[]).map((r:any)=><article className="card moderation-card" key={r.id}><div className="care-head"><div><div className="pill">{String(r.status).toUpperCase()}</div><h3 style={{margin:'7px 0 4px'}}>Reported message</h3></div><span className="small muted">{new Date(r.created_at).toLocaleString()}</span></div><div className="moderation-meta"><span>Reporter: <strong>{personName(pm.get(r.reporter_id))}</strong></span><span>Reported sender: <strong>{personName(pm.get(r.reported_sender_id))}</strong></span>{r.reviewed_by&&<span>Reviewed by {personName(pm.get(r.reviewed_by))}</span>}</div><div className="pastoral-note"><strong>Reason:</strong> {r.reason}</div><blockquote>{r.message_snapshot||'Message snapshot unavailable.'}</blockquote>{r.status!=='closed'&&<form action={updateMessageReportStatus} className="join-actions"><input type="hidden" name="report_id" value={r.id}/><button className="ghost" name="status" value="reviewed"><ShieldCheck size={12}/> Mark reviewed</button><button className="btn" name="status" value="closed">Close report</button></form>}</article>)}{!reports?.length&&<div className="card message-empty"><ShieldCheck size={23}/><h3>No reported private messages.</h3><p className="muted">If a member reports a specific message, the preserved evidence will appear here for authorized review.</p></div>}</section>
    <div className="privacy-box"><ShieldCheck size={13}/> This moderation queue does not grant leadership access to private conversations. It stores only the specific reported message, reporter, reported sender and reason needed for review.</div>
  </div></main>
}
