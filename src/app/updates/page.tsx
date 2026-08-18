import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,BellRing,Megaphone,Pin,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate } from '@/lib/church-time'
import { createOfficialUpdate,deleteOfficialUpdate,expireOfficialUpdate,toggleOfficialUpdatePin } from './actions'
import './updates.css'

const typeLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church leadership'

export default async function UpdatesPage({searchParams}:{searchParams:Promise<{created?:string;saved?:string;expired?:string;deleted?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const canManage=['minister','pastor','church_admin'].includes(membership.role)
  const canDelete=['pastor','church_admin'].includes(membership.role)
  const {data:updates}=await supabase.from('official_updates').select('id,title,body,update_type,priority,pinned,published_at,expires_at,created_by').eq('church_id',membership.church_id).order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(150)
  const authorIds=Array.from(new Set((updates??[]).map((u:any)=>u.created_by).filter(Boolean)))
  let profiles:any[]=[]
  if(authorIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',authorIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const now=Date.now()
  const active=(updates??[]).filter((u:any)=>!u.expires_at||new Date(u.expires_at).getTime()>now)
  const history=canManage?(updates??[]).filter((u:any)=>u.expires_at&&new Date(u.expires_at).getTime()<=now):[]
  const stamp=(v:string)=>formatChurchDate(v,timeZone,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})

  const card=(u:any,expired=false)=><article className={`card update-card ${u.priority} ${expired?'update-expired':''}`} key={u.id}><div className="update-head"><div className="update-title"><div className="update-tags"><span className="update-tag">{typeLabel(u.update_type)}</span><span className={`update-tag ${u.priority}`}>{u.priority}</span>{u.pinned&&<span className="update-tag pinned"><Pin size={9}/> Pinned</span>}{expired&&<span className="update-tag">Expired</span>}</div><h2>{u.title}</h2><p>{u.body}</p></div>{u.priority==='urgent'?<AlertTriangle size={21}/>:u.pinned?<Pin size={19}/>:<Megaphone size={19}/>}</div><div className="update-meta"><span>Published {stamp(u.published_at)}</span><span>By {personName(pm.get(u.created_by))}</span>{u.expires_at&&<span>{expired?'Expired':'Expires'} {stamp(u.expires_at)}</span>}</div>{canManage&&!expired&&<div className="update-actions"><form action={toggleOfficialUpdatePin}><input type="hidden" name="update_id" value={u.id}/><input type="hidden" name="pinned" value={u.pinned?'0':'1'}/><button className="ghost">{u.pinned?'Unpin':'Pin'}</button></form><form action={expireOfficialUpdate}><input type="hidden" name="update_id" value={u.id}/><button className="ghost">Expire now</button></form>{canDelete&&<form action={deleteOfficialUpdate}><input type="hidden" name="update_id" value={u.id}/><button className="ghost">Delete permanently</button></form>}</div>}{canDelete&&expired&&<div className="update-actions"><form action={deleteOfficialUpdate}><input type="hidden" name="update_id" value={u.id}/><button className="ghost">Delete permanently</button></form></div>}</article>

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Official Updates</div></div><div className="row">{canManage&&<span className="ghost"><ShieldCheck size={13}/> Leadership</span>}<Link className="ghost" href="/">← Home</Link></div></header>
    <section className="updates-hero card"><div><div className="pill">OFFICIAL CHURCH UPDATES</div><h1>Clear communication from leadership.</h1><p className="muted">Pastoral notes, service changes, training announcements and important church information—kept separate from the Community feed.</p></div><div className="admin-badge"><BellRing size={22}/><div><strong>{active.length}</strong><span>active update{active.length===1?'':'s'}</span></div></div></section>
    {query.created&&<div className="notice success">Official update published.</div>}{query.saved&&<div className="notice success">Official update changed.</div>}{query.expired&&<div className="notice success">Official update expired.</div>}{query.deleted&&<div className="notice success">Official update permanently deleted.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="updates-layout"><section><div className="section-heading"><div><div className="pill">ACTIVE</div><h2>Latest church updates</h2></div><span className="small muted">Pinned and urgent updates stay easy to find.</span></div><div className="updates-list">{active.map(u=>card(u))}{!active.length&&<div className="card update-empty"><Megaphone/><h3>No active official updates.</h3><p className="muted">Leadership announcements will appear here.</p></div>}</div></section>

      {canManage?<aside className="card update-create"><div className="pill">LEADERSHIP</div><h2>Publish official update</h2><p className="small muted">Times are interpreted in {timeZone.replaceAll('_',' ')}. Leave expiration blank for an update that stays active until leadership expires it.</p><form action={createOfficialUpdate} className="update-form"><label><span>Title</span><input name="title" required maxLength={180} placeholder="First Steps begins October 1"/></label><label><span>Update type</span><select name="update_type" defaultValue="announcement"><option value="announcement">Announcement</option><option value="pastoral">Pastoral</option><option value="service_change">Service change</option><option value="event">Event</option><option value="training">Training</option><option value="district">District</option><option value="urgent">Urgent</option></select></label><label><span>Priority</span><select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label><span>Expires</span><input name="expires_at" type="datetime-local"/></label><label><span>Message</span><textarea name="body" rows={7} required maxLength={5000} placeholder="Write the church announcement…"/></label><label className="update-check"><input name="pinned" type="checkbox"/><span>Pin this update near the top</span></label><label className="update-check"><input name="notify_members" type="checkbox"/><span>Notify every active member in-app</span></label><p className="small muted">Use member alerts for service changes, urgent notices and information people should not miss. Normal announcements can stay quiet.</p><button className="btn">Publish update</button></form></aside>:<aside className="card side"><div className="pill">TRUSTED SOURCE</div><h3>Official updates come from church leadership.</h3><p className="muted">Community posts remain member conversation. This area is reserved for announcements people should recognize as official church communication.</p></aside>}
    </div>

    {canManage&&history.length>0&&<section className="update-history"><div className="pill">HISTORY</div><h2>Expired updates</h2><div className="updates-list">{history.map(u=>card(u,true))}</div></section>}
  </main>
}
