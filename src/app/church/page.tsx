import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Church,ShieldCheck,UserCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMembership } from './actions'
import './church.css'

const roleOptions=[['member','Member'],['group_leader','Group leader'],['ministry_leader','Ministry leader'],['minister','Minister'],['pastor','Pastor'],['church_admin','Church admin']] as const
const statusOptions=[['active','Active'],['visitor','Visitor'],['pending','Pending'],['inactive','Inactive']] as const
const niceDate=(value?:string|null)=>value?new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'

export default async function ChurchAdminPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,status,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const {data:memberships}=await supabase.from('church_memberships').select('id,user_id,role,status,joined_at,created_at').eq('church_id',actor.church_id).order('created_at',{ascending:true})
  const ids=(memberships??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[];let details:any[]=[]
  if(ids.length){const [p,d]=await Promise.all([supabase.from('profiles').select('id,first_name,last_name,display_name').in('id',ids),supabase.from('member_private_details').select('user_id,email,phone').in('user_id',ids)]);profiles=p.data??[];details=d.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]));const dm=new Map(details.map((d:any)=>[d.user_id,d]))
  const rows=(memberships??[]).map((m:any)=>({membership:m,profile:pm.get(m.user_id),details:dm.get(m.user_id)}))
  const church=Array.isArray(actor.churches)?actor.churches[0]:actor.churches as {name?:string}|null
  const total=rows.length
  const active=rows.filter((r:any)=>r.membership.status==='active').length
  const leaders=rows.filter((r:any)=>r.membership.role!=='member').length
  const pending=rows.filter((r:any)=>['visitor','pending'].includes(r.membership.status)).length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Church Admin</div></div><div className="row"><Link className="ghost" href="/">← Home</Link><Link className="ghost" href="/profile">My profile</Link></div></header>
    <section className="admin-hero card"><div><div className="pill">CHURCH ADMIN</div><h1>{church?.name??'Church Directory'}</h1><p className="muted">Manage membership, leadership access and verified discipleship records.</p></div><div className="admin-badge"><ShieldCheck size={22}/><div><strong>{actor.role.replaceAll('_',' ')}</strong><span>Your access</span></div></div></section>
    {params.saved&&<div className="notice success">Member access updated.</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <section className="stat-grid"><div className="card stat-card"><Users/><div><strong>{total}</strong><span>Total people</span></div></div><div className="card stat-card"><UserCheck/><div><strong>{active}</strong><span>Active</span></div></div><div className="card stat-card"><ShieldCheck/><div><strong>{leaders}</strong><span>Leaders</span></div></div><div className="card stat-card"><Church/><div><strong>{pending}</strong><span>Guests / pending</span></div></div></section>
    <div className="section-heading"><div><div className="pill">DIRECTORY</div><h2>Members & access</h2></div><span className="small muted">Pastors and church admins only.</span></div>
    <section className="member-list">{rows.map(({membership,profile,details}:any)=>{const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Unnamed member';const isYou=membership.user_id===userId;return <article className="card member-admin-card" key={membership.id}><div className="member-main"><div className="avatar large">{name.slice(0,1).toUpperCase()}</div><div className="member-copy"><div className="member-name"><strong>{name}</strong>{isYou&&<span className="mini-pill">YOU</span>}</div><span>{details?.email??'Email not available'}</span><small>{details?.phone||'No phone added'} • Joined {niceDate(membership.joined_at)}</small><Link className="record-link" href={`/church/members/${membership.user_id}`}>Open verified record →</Link></div></div><form action={updateMembership} className="member-controls"><input type="hidden" name="membership_id" value={membership.id}/><label><span>Role</span><select name="role" defaultValue={membership.role}>{roleOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label><span>Status</span><select name="status" defaultValue={membership.status}>{statusOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><button className="btn" type="submit">Save</button></form></article>})}{!rows.length&&<div className="card empty"><h3>No members yet.</h3><p className="muted">New Alpha signups will appear here automatically.</p></div>}</section>
    <section className="card admin-note"><div className="pill">VERIFIED RECORDS</div><h3>Discipleship milestones are now separated from member-editable data.</h3><p className="muted">Open a member record to verify Holy Ghost, baptism, First Steps, ministry training, Bible-study qualification, safety training and covenant status.</p></section>
  </main>
}
