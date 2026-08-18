import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2,Globe2,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './network-updates.css'

const active=(rows:any[])=>{const now=Date.now();return rows.filter(r=>!r.expires_at||new Date(r.expires_at).getTime()>now)}
const stamp=(v:string)=>new Date(v).toLocaleString()

export default async function NetworkUpdatesPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name,district_id,organization_id)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const [{data:district},{data:organization},{data:districtUpdates},{data:organizationUpdates}]=await Promise.all([
    church?.district_id?supabase.from('districts').select('id,name').eq('id',church.district_id).maybeSingle():Promise.resolve({data:null}),
    church?.organization_id?supabase.from('organizations').select('id,name').eq('id',church.organization_id).maybeSingle():Promise.resolve({data:null}),
    church?.district_id?supabase.from('district_updates').select('id,title,body,priority,pinned,published_at,expires_at').eq('district_id',church.district_id).order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(100):Promise.resolve({data:[] as any[]}),
    church?.organization_id?supabase.from('organization_updates').select('id,title,body,priority,pinned,published_at,expires_at').eq('organization_id',church.organization_id).order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(100):Promise.resolve({data:[] as any[]})
  ])
  const dRows=active(districtUpdates??[]),oRows=active(organizationUpdates??[])
  const cards=(rows:any[],scope:string)=>rows.map((u:any)=><article className={`level-update ${u.priority}`} key={u.id}><div className="level-head"><div className="level-tags"><span className="level-tag">{scope}</span><span className={`level-tag ${u.priority}`}>{u.priority}</span>{u.pinned&&<span className="level-tag">Pinned</span>}</div></div><h3>{u.title}</h3><p>{u.body}</p><time>{stamp(u.published_at)}</time></article>)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Network Updates</div></div><div className="row"><Link className="ghost" href="/network">← Network</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="network-updates-hero card"><div><div className="pill">NETWORK UPDATES</div><h1>Communication above the local-church level.</h1><p className="muted">Organization and district announcements for the hierarchy your church belongs to.</p></div><div className="hero-stat"><Globe2 size={24}/><span>{oRows.length+dRows.length} active update{oRows.length+dRows.length===1?'':'s'}</span></div></section>

    <section className="network-updates-layout"><article className="card network-level"><div className="pill">ORGANIZATION</div><h2>{organization?.name??'Organization'}</h2><p className="small muted">Organization-wide announcements visible to active members in churches belonging to this organization.</p><div className="level-list">{cards(oRows,'Organization')}{!oRows.length&&<div className="network-empty">No active organization updates.</div>}</div></article><article className="card network-level"><div className="pill">DISTRICT</div><h2>{district?.name??'District'}</h2><p className="small muted">District announcements visible to active members whose local church belongs to this district.</p><div className="level-list">{cards(dRows,'District')}{!dRows.length&&<div className="network-empty">No active district updates.</div>}</div></article></section>

    <section className="card network-scope"><div className="pill">LOCAL CHURCH STAYS SEPARATE</div><p><ShieldCheck size={12}/> Your local church’s Official Updates remain a separate trusted channel. This page does not expose another church’s internal announcements or private operations; it only shows updates published at your own district/organization scope.</p><div className="row"><Link className="ghost" href="/updates"><Building2 size={12}/> Local Official Updates</Link><Link className="ghost" href="/calendar">Unified Calendar</Link></div></section>
  </main>
}
