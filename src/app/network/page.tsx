import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2,CalendarDays,Church,ExternalLink,Globe2,MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import './network.css'

export default async function NetworkPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(id,name,city,state,district_id,organization_id,logo_path,brand_color,website_url,contact_email,contact_phone,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const home:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  if(!home)redirect('/')
  const [{data:organization},{data:district},{data:churches},{data:districtEvents}]=await Promise.all([
    home.organization_id?supabase.from('organizations').select('id,name,slug').eq('id',home.organization_id).maybeSingle():Promise.resolve({data:null}),
    home.district_id?supabase.from('districts').select('id,name,slug').eq('id',home.district_id).maybeSingle():Promise.resolve({data:null}),
    home.district_id?supabase.from('churches').select('id,name,city,state,logo_path,brand_color,website_url,contact_email,contact_phone').eq('district_id',home.district_id).order('name'):supabase.from('churches').select('id,name,city,state,logo_path,brand_color,website_url,contact_email,contact_phone').eq('id',home.id),
    home.district_id?supabase.from('events').select('id,title,description,starts_at,location,registration_url').eq('district_id',home.district_id).gte('starts_at',new Date().toISOString()).order('starts_at').limit(8):Promise.resolve({data:[] as any[]})
  ])
  const tz=home.timezone||'America/Los_Angeles'
  const rows=churches??[]

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Network • Organization & District</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="network-hero card"><div><div className="pill">KINGDOM NETWORK</div><h1>Your church in the larger family.</h1><p className="muted">See the organization and district your local church belongs to without exposing another church’s private operations or member data.</p></div><div className="hero-stat"><Globe2 size={24}/><span>Local → District → Organization</span></div></section>

    <section className="network-path"><div className="card path-card"><span>Organization</span><strong>{organization?.name??'Organization not assigned'}</strong><div className="path-arrow">Network level</div></div><div className="card path-card"><span>District</span><strong>{district?.name??'District not assigned'}</strong><div className="path-arrow">Regional connection</div></div><div className="card path-card"><span>Home church</span><strong>{home.name}</strong><div className="path-arrow">{[home.city,home.state].filter(Boolean).join(', ')||'Local church'}</div></div></section>

    <section className="network-section"><div className="network-section-head"><div><div className="pill">DISTRICT CHURCHES</div><h2>{district?.name??'Your church'}</h2></div><span className="small muted">Public church information only.</span></div><div className="church-grid">{rows.map((c:any)=>{const logo=c.logo_path?supabase.storage.from('church-branding').getPublicUrl(c.logo_path).data.publicUrl:null;const isHome=c.id===home.id;return <article className={`card network-church ${isHome?'home':''}`} key={c.id}><div className="church-logo" style={{color:c.brand_color||'#b98add'}}>{logo?<img src={logo} alt={`${c.name} logo`}/>:c.name.slice(0,1).toUpperCase()}</div><div className="church-copy"><div className="small muted">{isHome?'YOUR HOME CHURCH':'DISTRICT CHURCH'}</div><h3>{c.name}</h3><p><MapPin size={10}/> {[c.city,c.state].filter(Boolean).join(', ')||'Location not listed'}</p><div className="church-links">{c.website_url&&<a href={c.website_url} target="_blank" rel="noreferrer"><ExternalLink size={9}/> Website</a>}{c.contact_email&&<a href={`mailto:${c.contact_email}`}>{c.contact_email}</a>}{c.contact_phone&&<a href={`tel:${c.contact_phone}`}>{c.contact_phone}</a>}</div></div></article>})}</div></section>

    <section className="network-section"><div className="network-section-head"><div><div className="pill">DISTRICT EVENTS</div><h2>What’s happening across the district</h2></div><Link className="ghost" href="/calendar">Full calendar</Link></div><div className="district-events">{(districtEvents??[]).map((e:any)=><article className="card district-event" key={e.id}><div><h3>{e.title}</h3><span><CalendarDays size={11}/> {formatChurchDay(e.starts_at,tz)} • {formatChurchTime(e.starts_at,tz)}{e.location?` • ${e.location}`:''}</span></div>{e.registration_url&&<a className="ghost" href={e.registration_url} target="_blank" rel="noreferrer">Details <ExternalLink size={11}/></a>}</article>)}{!districtEvents?.length&&<div className="card" style={{padding:18}}><div className="small muted">No upcoming district-wide events are published yet.</div></div>}</div></section>

    <section className="card" style={{padding:18,marginTop:18}}><div className="pill">PRIVACY BOUNDARY</div><p className="small muted" style={{lineHeight:1.55}}><Building2 size={12}/> This Network view shows organization/district identity and public church information. Member rosters, pastoral care, documents, finances, group private addresses and local leadership records stay inside each local church.</p></section>
  </main>
}
