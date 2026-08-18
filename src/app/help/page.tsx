import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HandHeart,ShieldCheck,UserRoundCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createCareRequest,updateCareRequest,withdrawCareRequest } from './actions'
import './help.css'

const categories=[['prayer','Prayer'],['pastoral','Pastoral guidance'],['family','Family'],['grief','Grief'],['health','Health'],['benevolence','Benevolence'],['counseling','Counseling'],['other','Other']] as const
const urgencies=[['normal','Normal'],['soon','Soon'],['urgent','Urgent']] as const
const contacts=[['in_app','In app'],['phone','Phone'],['email','Email'],['either','Phone or email']] as const
const statuses=[['new','New'],['in_review','In review'],['contacted','Contacted'],['closed','Closed'],['withdrawn','Withdrawn']] as const
const label=(rows:readonly (readonly [string,string])[],v:string)=>rows.find(([k])=>k===v)?.[1]??v.replaceAll('_',' ')
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'
const niceDate=(v:string)=>new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})

export default async function HelpPage({searchParams}:{searchParams:Promise<{created?:string;saved?:string;withdrawn?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const isPastoral=['pastor','church_admin'].includes(membership.role)

  const {data:myRequests}=await supabase.from('care_requests').select('id,category,urgency,subject,message,preferred_contact,status,created_at,updated_at,closed_at').eq('church_id',churchId).eq('user_id',userId).order('created_at',{ascending:false})

  let queue:any[]=[];let pastorOptions:any[]=[];let profileMap=new Map<string,any>();let detailMap=new Map<string,any>()
  if(isPastoral){
    const [{data:careRows},{data:leaders}]=await Promise.all([
      supabase.from('care_requests').select('*').eq('church_id',churchId).neq('status','withdrawn').order('created_at',{ascending:false}),
      supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin'])
    ])
    queue=careRows??[]
    const ids=Array.from(new Set([...queue.map((r:any)=>r.user_id),...queue.map((r:any)=>r.assigned_to).filter(Boolean),...(leaders??[]).map((r:any)=>r.user_id)]))
    if(ids.length){
      const [p,d]=await Promise.all([
        supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids),
        supabase.from('member_private_details').select('user_id,email,phone').in('user_id',ids)
      ])
      profileMap=new Map((p.data??[]).map((r:any)=>[r.id,r]));detailMap=new Map((d.data??[]).map((r:any)=>[r.user_id,r]))
    }
    pastorOptions=(leaders??[]).map((r:any)=>({id:r.user_id,name:personName(profileMap.get(r.user_id))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  }

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Pastoral Care</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="care-hero card"><div><div className="pill">PRIVATE CARE</div><h1>Ask for prayer or pastoral support.</h1><p className="muted">A private path to the people responsible for pastoral care in your church.</p></div><div className="hero-stat"><HandHeart size={22}/><span>Private to you + pastoral leadership</span></div></section>
    {query.created&&<div className="notice success">Your private care request was submitted.</div>}{query.saved&&<div className="notice success">Care request updated.</div>}{query.withdrawn&&<div className="notice success">Your request was withdrawn.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="care-layout"><section className="care-stack"><div><div className="pill">MY REQUESTS</div><h2>Your care history</h2></div>{(myRequests??[]).map((r:any)=><article className="card care-card" key={r.id}><div className="care-head"><div><div className="small muted">{label(categories,r.category)} • {niceDate(r.created_at)}</div><h3>{r.subject}</h3></div><span className={`care-status ${r.status}`}>{label(statuses,r.status)}</span></div><div className="care-meta"><span className={`care-chip ${r.urgency}`}>{label(urgencies,r.urgency)}</span><span className="care-chip">Preferred: {label(contacts,r.preferred_contact)}</span></div><p className="care-message">{r.message}</p>{['new','in_review'].includes(r.status)&&<form action={withdrawCareRequest}><input type="hidden" name="request_id" value={r.id}/><button className="ghost">Withdraw request</button></form>}</article>)}{!myRequests?.length&&<div className="card care-empty"><h3>No care requests yet.</h3><p className="muted">Use the private form when you need prayer, guidance or pastoral follow-up.</p></div>}</section>

    <aside className="card care-form"><div className="pill">REQUEST CARE</div><h2>How can we help?</h2><p className="small muted">Share only what you want pastoral leadership to know.</p><form action={createCareRequest} className="care-grid"><label><span>Category</span><select name="category" defaultValue="prayer">{categories.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label><span>Urgency</span><select name="urgency" defaultValue="normal">{urgencies.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="wide"><span>Subject</span><input name="subject" required maxLength={160} placeholder="How can pastoral leadership help?"/></label><label className="wide"><span>Message</span><textarea name="message" required rows={6} maxLength={5000} placeholder="Share the situation, prayer need or request."/></label><label><span>Preferred contact</span><select name="preferred_contact" defaultValue="in_app">{contacts.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><div className="wide"><button className="btn"><HandHeart size={14}/> Submit privately</button></div></form><div className="privacy-note"><ShieldCheck size={13}/> This is not a Community post. The request is visible to you and authorized pastor/church-admin accounts for your church.</div></aside></div>

    {isPastoral&&<section className="pastoral-section"><div className="section-heading"><div><div className="pill">PASTORAL QUEUE</div><h2>Care requests requiring follow-up</h2></div><span className="small muted">Pastor and church-admin only.</span></div><div className="pastoral-grid">{queue.map((r:any)=>{const p=profileMap.get(r.user_id);const d=detailMap.get(r.user_id);const assignee=profileMap.get(r.assigned_to);const contact=r.preferred_contact==='phone'?d?.phone:r.preferred_contact==='email'?d?.email:r.preferred_contact==='either'?[d?.phone,d?.email].filter(Boolean).join(' • '):'In-app follow-up';return <article className={`card pastoral-card ${r.urgency}`} key={r.id}><div className="care-head"><div className="pastoral-person"><div className="avatar">{personName(p).slice(0,1).toUpperCase()}</div><div><strong>{personName(p)}</strong><div className="pastoral-contact">{label(categories,r.category)} • {label(contacts,r.preferred_contact)}{contact?` • ${contact}`:''}</div></div></div><div><span className={`care-chip ${r.urgency}`}>{label(urgencies,r.urgency)}</span> <span className={`care-status ${r.status}`}>{label(statuses,r.status)}</span></div></div><h3>{r.subject}</h3><p className="care-message">{r.message}</p>{r.assigned_to&&<div className="small muted"><UserRoundCheck size={12}/> Assigned to {personName(assignee)}</div>}{r.leadership_note&&<div className="pastoral-note"><strong>Internal note:</strong> {r.leadership_note}</div>}<form action={updateCareRequest} className="pastoral-controls"><input type="hidden" name="request_id" value={r.id}/><label><span>Status</span><select name="status" defaultValue={r.status}>{statuses.filter(([v])=>v!=='withdrawn').map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label><span>Assigned to</span><select name="assigned_to" defaultValue={r.assigned_to??''}><option value="">Unassigned</option>{pastorOptions.map((o:any)=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label className="note-field"><span>Internal leadership note</span><input name="leadership_note" defaultValue={r.leadership_note??''} placeholder="Follow-up notes for pastoral leadership only"/></label><button className="btn">Save</button></form></article>})}{!queue.length&&<div className="card care-empty"><h3>No pastoral-care requests.</h3><p className="muted">New private requests will appear here and notify pastoral leadership.</p></div>}</div></section>}
  </main>
}
