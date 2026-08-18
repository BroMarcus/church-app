import Link from 'next/link'
import { redirect } from 'next/navigation'
import { History,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './audit.css'

const label=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const scalar=(v:any)=>v==null||v===''?'—':typeof v==='boolean'?(v?'Yes':'No'):String(v)
const short=(v:any)=>{const s=scalar(v);return /^[0-9a-f-]{36}$/i.test(s)?`${s.slice(0,8)}…`:s}

export default async function AuditPage({searchParams}:{searchParams:Promise<{entity?:string;action?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  let q=supabase.from('leadership_audit_log').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(200)
  if(params.entity&&params.entity!=='all')q=q.eq('entity_type',params.entity)
  if(params.action&&params.action!=='all')q=q.eq('action',params.action)
  const {data:logs}=await q
  const actorIds=Array.from(new Set((logs??[]).map((l:any)=>l.actor_user_id).filter(Boolean)))
  let profiles:any[]=[]
  if(actorIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',actorIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const person=(id?:string|null)=>{if(!id)return 'System';const p=pm.get(id);return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church leader'}
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const entities=Array.from(new Set((logs??[]).map((l:any)=>l.entity_type))).sort()

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Audit History</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="audit-hero card"><div><div className="pill">LEADERSHIP AUDIT</div><h1>Accountability without extra sensitive copies.</h1><p className="muted">Review sanitized history for membership access, verified milestones, document reviews, ministry applications, outreach changes and invitations.</p></div><div className="admin-badge"><ShieldCheck size={22}/><div><strong>{logs?.length??0}</strong><span>recent records</span></div></div></section>
    <section className="card audit-filter"><form method="get"><select name="entity" defaultValue={params.entity??'all'}><option value="all">All record types</option>{entities.map(e=><option value={e} key={e}>{label(e)}</option>)}</select><select name="action" defaultValue={params.action??'all'}><option value="all">All actions</option><option value="insert">Created</option><option value="update">Changed</option><option value="delete">Removed</option></select><button className="ghost">Filter</button><Link className="ghost" href="/church/audit">Clear</Link></form></section>
    <section className="audit-list">{(logs??[]).map((log:any)=>{const before=log.changes?.before??{};const after=log.changes?.after??{};const keys=Array.from(new Set([...Object.keys(before),...Object.keys(after)])).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));return <article className="card audit-row" key={log.id}><div className="audit-time"><strong>{new Date(log.created_at).toLocaleDateString()}</strong><span>{new Date(log.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span></div><div className="audit-who"><span className={`action-chip ${log.action}`}>{log.action}</span><strong>{person(log.actor_user_id)}</strong><span>{label(log.entity_type)}</span></div><div className="audit-summary"><strong>{log.summary}</strong><div className="audit-changes">{keys.length?keys.map((k:string)=><span className="audit-change" key={k}><b>{label(k)}:</b> {short(before[k])} → {short(after[k])}</span>):<span className="small muted">No sanitized field difference recorded.</span>}</div></div></article>})}{!logs?.length&&<div className="card empty"><History/><h3>No audit records in this view yet.</h3><p className="muted">Sensitive leadership changes will appear here automatically.</p></div>}</section>
  </main>
}
