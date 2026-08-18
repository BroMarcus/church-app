import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Globe2,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import { createOrganizationEvent,createOrganizationUpdate,updateOrganizationSettings } from './actions'
import './organization.css'

export default async function OrganizationPage({searchParams}:{searchParams:Promise<{settings?:string;update?:string;event?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role,churches(organization_id)').eq('user_id',userId).eq('status','active').limit(1).single()
  const home:any=Array.isArray(membership?.churches)?membership?.churches[0]:membership?.churches
  if(membership?.role!=='organization_admin'||!home?.organization_id)redirect('/')
  const organizationId=home.organization_id
  const [{data:organization},{data:districts},{data:metrics},{data:updates},{data:events}]=await Promise.all([
    supabase.from('organizations').select('id,name,slug,timezone,website_url,contact_email,contact_phone').eq('id',organizationId).single(),
    supabase.from('districts').select('id,name,slug').eq('organization_id',organizationId).order('name'),
    supabase.rpc('organization_district_metrics',{p_organization_id:organizationId}),
    supabase.from('organization_updates').select('id,title,body,priority,pinned,published_at,expires_at').eq('organization_id',organizationId).order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(20),
    supabase.from('events').select('id,title,starts_at,location,audience_label,featured').eq('organization_id',organizationId).is('church_id',null).is('district_id',null).gte('starts_at',new Date().toISOString()).order('starts_at').limit(20)
  ])
  if(!organization)redirect('/')
  const metricMap=new Map((metrics??[]).map((m:any)=>[m.district_id,m]))
  const totalChurches=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.churches||0),0)
  const totalMembers=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.active_members||0),0)
  const totalGroups=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.active_groups||0),0)
  const tz=organization.timezone||'America/Los_Angeles'
  const now=Date.now()
  const activeUpdates=(updates??[]).filter((u:any)=>!u.expires_at||new Date(u.expires_at).getTime()>now)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Organization Administration</div></div><div className="row"><Link className="ghost" href="/network">Network view</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="org-hero card"><div><div className="pill">ORGANIZATION ADMIN</div><h1>{organization.name}</h1><p className="muted">Organization-wide publishing and aggregate health without opening local church private records.</p></div><div className="hero-stat"><Globe2 size={24}/><span>{organization.slug}</span></div></section>
    {query.settings&&<div className="notice success">Organization settings saved.</div>}{query.update&&<div className="notice success">Organization update published.</div>}{query.event&&<div className="notice success">Organization event published.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="org-stats"><div className="card org-stat"><strong>{districts?.length??0}</strong><span>Districts</span></div><div className="card org-stat"><strong>{totalChurches}</strong><span>Churches</span></div><div className="card org-stat"><strong>{totalMembers}</strong><span>Active members</span></div><div className="card org-stat"><strong>{totalGroups}</strong><span>Active groups</span></div></section>

    <div className="org-layout"><section className="org-main">
      <article className="card org-card"><div className="pill">DISTRICT HEALTH • AGGREGATE</div><h2>Districts</h2><p className="small muted">Counts only. No cross-church rosters, care requests, private messages, documents or Outreach notes are exposed here.</p><div className="district-grid">{(districts??[]).map((d:any)=>{const m:any=metricMap.get(d.id)||{};return <div className="district-card-mini" key={d.id}><h3>{d.name}</h3><p>{d.slug}</p><div className="org-metrics"><div><strong>{m.churches??0}</strong><span>churches</span></div><div><strong>{m.active_members??0}</strong><span>members</span></div><div><strong>{m.active_groups??0}</strong><span>groups</span></div><div><strong>{m.upcoming_events??0}</strong><span>district events</span></div></div></div>})}</div></article>

      <article className="card org-card"><div className="pill">ORGANIZATION EVENT</div><h2>Publish across the organization</h2><form action={createOrganizationEvent} className="org-form two"><label><span>Event title</span><input name="title" required/></label><label><span>Audience</span><input name="audience_label" placeholder="Everyone / Youth / Ministers"/></label><label><span>Starts</span><input name="starts_at" type="datetime-local" required/></label><label><span>Ends</span><input name="ends_at" type="datetime-local"/></label><label><span>Location</span><input name="location"/></label><label><span>Registration / details link</span><input name="registration_url" type="url" placeholder="https://..."/></label><label className="wide"><span>Description</span><textarea name="description" rows={4}/></label><label className="wide check"><input name="featured" type="checkbox"/> <span>Feature this event for organization members</span></label><button className="btn wide"><CalendarDays size={13}/> Publish organization event</button></form><p className="small muted">Times use {tz.replaceAll('_',' ')}. Organization events are visible only to active members whose church belongs to this organization.</p></article>

      <article className="card org-card"><div className="pill">ORGANIZATION SETTINGS</div><h2>Public organization identity</h2><form action={updateOrganizationSettings} className="org-form two"><label className="wide"><span>Organization name</span><input name="name" required defaultValue={organization.name}/></label><label><span>Timezone</span><input name="timezone" defaultValue={tz}/></label><label><span>Website</span><input name="website_url" type="url" defaultValue={organization.website_url??''}/></label><label><span>Contact email</span><input name="contact_email" type="email" defaultValue={organization.contact_email??''}/></label><label><span>Contact phone</span><input name="contact_phone" defaultValue={organization.contact_phone??''}/></label><button className="ghost wide">Save organization settings</button></form></article>
    </section>

    <aside className="org-aside"><article className="card org-card"><div className="pill">ORGANIZATION UPDATE</div><h2>Publish announcement</h2><form action={createOrganizationUpdate} className="org-form"><label><span>Title</span><input name="title" required/></label><label><span>Priority</span><select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label><span>Expires</span><input name="expires_at" type="datetime-local"/></label><label><span>Message</span><textarea name="body" rows={6} required/></label><label className="check"><input name="pinned" type="checkbox"/> <span>Pin this update</span></label><label className="check"><input name="notify_members" type="checkbox"/> <span>Notify active members across organization</span></label><button className="btn">Publish organization update</button></form></article>

      <article className="card org-card"><div className="pill">ACTIVE ORGANIZATION UPDATES</div><div className="org-events">{activeUpdates.slice(0,8).map((u:any)=><div className={`org-update ${u.priority}`} key={u.id}><span>{u.pinned?'PINNED • ':''}{u.priority.toUpperCase()}</span><h3>{u.title}</h3><p>{u.body}</p></div>)}{!activeUpdates.length&&<div className="small muted">No active organization announcements.</div>}</div></article>

      <article className="card org-card"><div className="pill">UPCOMING ORGANIZATION EVENTS</div><div className="org-events">{(events??[]).slice(0,8).map((e:any)=><div className="org-event" key={e.id}><strong>{e.title}</strong><span>{formatChurchDay(e.starts_at,tz)} • {formatChurchTime(e.starts_at,tz)}{e.location?` • ${e.location}`:''}</span></div>)}{!events?.length&&<div className="small muted">No upcoming organization events.</div>}</div></article>

      <article className="card org-card"><div className="pill">PRIVACY BOUNDARY</div><p className="small muted"><ShieldCheck size={12}/> Organization metrics are aggregate. Local pastoral care, private messages, member documents, group home addresses, Outreach notes and member-management tools remain scoped to the local church.</p></article>
    </aside></div>
  </main>
}
