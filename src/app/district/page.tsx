import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2,CalendarDays,Globe2,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import { createDistrictEvent,createDistrictUpdate,updateDistrictSettings } from './actions'
import './district.css'

export default async function DistrictPage({searchParams}:{searchParams:Promise<{settings?:string;update?:string;event?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role,churches(district_id,organization_id)').eq('user_id',userId).eq('status','active').limit(1).single()
  const home:any=Array.isArray(membership?.churches)?membership?.churches[0]:membership?.churches
  if(membership?.role!=='district_admin'||!home?.district_id)redirect('/')
  const districtId=home.district_id
  const [{data:district},{data:churches},{data:metrics},{data:updates},{data:events}]=await Promise.all([
    supabase.from('districts').select('id,name,slug,organization_id,timezone,website_url,contact_email,contact_phone').eq('id',districtId).single(),
    supabase.from('churches').select('id,name,city,state,website_url').eq('district_id',districtId).order('name'),
    supabase.rpc('district_church_metrics',{p_district_id:districtId}),
    supabase.from('district_updates').select('id,title,body,priority,pinned,published_at,expires_at').eq('district_id',districtId).order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(20),
    supabase.from('events').select('id,title,starts_at,location,audience_label,featured').eq('district_id',districtId).is('church_id',null).gte('starts_at',new Date().toISOString()).order('starts_at').limit(20)
  ])
  if(!district)redirect('/')
  const {data:organization}=district.organization_id?await supabase.from('organizations').select('name').eq('id',district.organization_id).maybeSingle():{data:null}
  const metricMap=new Map((metrics??[]).map((m:any)=>[m.church_id,m]))
  const totalMembers=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.active_members||0),0)
  const totalGroups=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.active_groups||0),0)
  const upcomingLocalEvents=(metrics??[]).reduce((sum:number,m:any)=>sum+Number(m.upcoming_events||0),0)
  const tz=district.timezone||'America/Los_Angeles'
  const now=Date.now()
  const activeUpdates=(updates??[]).filter((u:any)=>!u.expires_at||new Date(u.expires_at).getTime()>now)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">District Administration</div></div><div className="row"><Link className="ghost" href="/network">Network view</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="district-hero card"><div><div className="pill">DISTRICT ADMIN</div><h1>{district.name}</h1><p className="muted">Aggregate district operations and district-wide publishing without opening local-church private records.</p></div><div className="hero-stat"><Globe2 size={24}/><span>{organization?.name??'Organization'} • {district.slug}</span></div></section>
    {query.settings&&<div className="notice success">District settings saved.</div>}{query.update&&<div className="notice success">District update published.</div>}{query.event&&<div className="notice success">District event published.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="district-stats"><div className="card district-stat"><strong>{churches?.length??0}</strong><span>Churches</span></div><div className="card district-stat"><strong>{totalMembers}</strong><span>Active members</span></div><div className="card district-stat"><strong>{totalGroups}</strong><span>Active groups</span></div><div className="card district-stat"><strong>{upcomingLocalEvents}</strong><span>Upcoming local events</span></div></section>

    <div className="district-layout"><section className="district-main">
      <article className="card district-card"><div className="pill">CHURCH HEALTH • AGGREGATE</div><h2>District churches</h2><p className="small muted">Counts only. This page does not provide cross-church member rosters, private care, messages, documents or Outreach notes.</p><div className="district-church-grid">{(churches??[]).map((c:any)=>{const m:any=metricMap.get(c.id)||{};return <div className="district-church" key={c.id}><h3>{c.name}</h3><p>{[c.city,c.state].filter(Boolean).join(', ')||'Location not listed'}</p><div className="metric-row"><div><strong>{m.active_members??0}</strong><span>members</span></div><div><strong>{m.active_groups??0}</strong><span>groups</span></div><div><strong>{m.upcoming_events??0}</strong><span>events</span></div></div></div>})}</div></article>

      <article className="card district-card"><div className="pill">DISTRICT EVENT</div><h2>Publish across the district</h2><form action={createDistrictEvent} className="district-form two"><label><span>Event title</span><input name="title" required/></label><label><span>Audience</span><input name="audience_label" placeholder="Everyone / Youth / Ministers"/></label><label><span>Starts</span><input name="starts_at" type="datetime-local" required/></label><label><span>Ends</span><input name="ends_at" type="datetime-local"/></label><label><span>Location</span><input name="location"/></label><label><span>Registration / details link</span><input name="registration_url" type="url" placeholder="https://..."/></label><label className="wide"><span>Description</span><textarea name="description" rows={4}/></label><label className="wide check"><input name="featured" type="checkbox"/> <span>Feature this event for district members</span></label><button className="btn wide"><CalendarDays size={13}/> Publish district event</button></form><p className="small muted">Times use {tz.replaceAll('_',' ')}. District events are visible only to members whose active church belongs to this district.</p></article>

      <article className="card district-card"><div className="pill">DISTRICT SETTINGS</div><h2>Public district identity</h2><form action={updateDistrictSettings} className="district-form two"><label className="wide"><span>District name</span><input name="name" required defaultValue={district.name}/></label><label><span>Timezone</span><input name="timezone" defaultValue={tz}/></label><label><span>Website</span><input name="website_url" type="url" defaultValue={district.website_url??''}/></label><label><span>Contact email</span><input name="contact_email" type="email" defaultValue={district.contact_email??''}/></label><label><span>Contact phone</span><input name="contact_phone" defaultValue={district.contact_phone??''}/></label><button className="ghost wide">Save district settings</button></form></article>
    </section>

    <aside className="district-aside"><article className="card district-card"><div className="pill">DISTRICT UPDATE</div><h2>Publish announcement</h2><form action={createDistrictUpdate} className="district-form"><label><span>Title</span><input name="title" required/></label><label><span>Priority</span><select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label><span>Expires</span><input name="expires_at" type="datetime-local"/></label><label><span>Message</span><textarea name="body" rows={6} required/></label><label className="check"><input name="pinned" type="checkbox"/> <span>Pin this update</span></label><label className="check"><input name="notify_members" type="checkbox"/> <span>Notify active members across district</span></label><button className="btn">Publish district update</button></form></article>

      <article className="card district-card"><div className="pill">ACTIVE DISTRICT UPDATES</div><div className="district-events">{activeUpdates.slice(0,8).map((u:any)=><div className={`district-update ${u.priority}`} key={u.id}><span>{u.pinned?'PINNED • ':''}{u.priority.toUpperCase()}</span><h3>{u.title}</h3><p>{u.body}</p></div>)}{!activeUpdates.length&&<div className="small muted">No active district announcements.</div>}</div></article>

      <article className="card district-card"><div className="pill">UPCOMING DISTRICT EVENTS</div><div className="district-events">{(events??[]).slice(0,8).map((e:any)=><div className="district-event" key={e.id}><strong>{e.title}</strong><span>{formatChurchDay(e.starts_at,tz)} • {formatChurchTime(e.starts_at,tz)}{e.location?` • ${e.location}`:''}</span></div>)}{!events?.length&&<div className="small muted">No upcoming district events.</div>}</div></article>

      <article className="card district-card"><div className="pill">PRIVACY BOUNDARY</div><p className="small muted"><ShieldCheck size={12}/> District metrics are aggregate. Local pastoral care, private messages, member documents, group home addresses, Outreach notes and member-management tools remain scoped to the local church.</p></article>
    </aside></div>
  </main>
}
