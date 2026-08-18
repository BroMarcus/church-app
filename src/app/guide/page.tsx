import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,Church,Compass,GraduationCap,HandHeart,MessageCircle,Megaphone,Search,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './guide.css'

const quick=[
  {title:'Find my next learning step',body:'Open courses, pathways, badges and current progress.',href:'/learning',Icon:GraduationCap},
  {title:'Find a Friendship Group',body:'Browse groups by area, schedule, language and availability.',href:'/groups',Icon:Users},
  {title:'See what’s happening',body:'Church, ministry, special and district events.',href:'/calendar',Icon:CalendarDays},
  {title:'Reach or follow up with someone',body:'Open the Outreach pipeline and follow-up history.',href:'/outreach',Icon:Megaphone},
  {title:'Ask for pastoral care',body:'Send a private prayer or pastoral-care request.',href:'/help',Icon:HandHeart},
  {title:'Message a church member',body:'Open private one-to-one member conversations.',href:'/messages',Icon:MessageCircle},
  {title:'Browse trusted resources',body:'Search the full current and legacy Resource Library.',href:'/resources',Icon:BookOpen},
  {title:'See my church family',body:'Open the member directory and church-visible profiles.',href:'/directory',Icon:Church}
] as const

const lower=(v:any)=>String(v??'').toLowerCase()
const authority=(r:any)=>lower(r.authority_level||r.source_authority||r.authority||r.source_scope||'local church')
const status=(r:any)=>lower(r.resource_status||r.status||'current')
const authorityScore=(v:string)=>v.includes('organization')||v.includes('assembly')||v.includes('official')?35:v.includes('district')?28:v.includes('local')||v.includes('church')?20:v.includes('ministry')?12:v.includes('group')?8:5
const statusScore=(v:string)=>v==='current'?25:v.includes('reference')?16:v==='legacy'?4:v==='draft'?-15:v==='retired'?-30:8
const displayAuthority=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const displayStatus=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function GuidePage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const query=await searchParams
  const q=String(query.q??'').trim()
  const needle=q.toLowerCase()
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  let results:any[]=[]
  if(q){
    const {data}=await supabase.from('media_assets').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(400)
    results=(data??[]).filter((r:any)=>r.member_visible!==false).map((r:any)=>{
      const searchable=[r.title,r.description,r.ministry,r.topic,r.topic_tags,r.tags,r.scripture_refs,r.scripture_references,r.language_code,r.resource_year,r.year].flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean).join(' ').toLowerCase()
      let score=0
      if(lower(r.title).includes(needle))score+=55
      if(lower(r.description).includes(needle))score+=22
      if(searchable.includes(needle))score+=12
      score+=authorityScore(authority(r))+statusScore(status(r))
      return {...r,__score:score,__searchable:searchable,__authority:authority(r),__status:status(r)}
    }).filter((r:any)=>r.__searchable.includes(needle)||lower(r.title).includes(needle)||lower(r.description).includes(needle)).sort((a:any,b:any)=>b.__score-a.__score||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,24)
  }

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Kingdom Guide Beta</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="guide-hero card"><div><div className="pill">KINGDOM GUIDE • BETA</div><h1>Find the right next place to go.</h1><p className="muted">Navigate Kingdom Network and search trusted church resources with source authority kept visible.</p></div><div className="hero-stat"><Sparkles size={24}/><span>Trusted-source groundwork</span></div></section>

    <section className="card guide-search"><form method="get"><input name="q" defaultValue={q} placeholder="Search a topic, Scripture, lesson, policy or resource…" aria-label="Search trusted church resources"/><button className="btn"><Search size={14}/> Search trusted resources</button></form><div className="hint">Guide Beta searches resources already stored in your church library. It does not generate doctrinal answers or search the open internet.</div></section>

    <div className="guide-layout"><section className="card guide-panel"><div className="pill">{q?'TRUSTED RESULTS':'QUICK GUIDE'}</div><h2>{q?`Results for “${q}”`:'What are you trying to do?'}</h2>{q?<div className="result-list">{results.map((r:any)=>{const title=r.title||'Church resource';const auth=r.__authority||'local church';const st=r.__status||'current';return <article className="guide-result" key={r.id}><div className="result-head"><div><h3>{title}</h3><div className="result-tags"><span className={`result-tag ${auth.includes('official')||auth.includes('organization')||auth.includes('assembly')?'official':''}`}>{displayAuthority(auth)}</span><span className={`result-tag ${st==='current'?'current':''}`}>{displayStatus(st)}</span>{r.language_code&&<span className="result-tag">{String(r.language_code).toUpperCase()}</span>}</div></div><Compass size={16}/></div>{r.description&&<p>{r.description}</p>}<Link className="record-link resource-link" href={`/resources?q=${encodeURIComponent(title)}`}>Open in Resource Library →</Link></article>})}{!results.length&&<div className="guide-beta">No member-visible church resource matched that search yet. Try a broader word, or open the Resource Library to browse what has been uploaded.</div>}</div>:<div className="quick-grid">{quick.map(({title,body,href,Icon})=><Link className="quick-card" href={href} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div>}</section>

      <aside className="card guide-panel"><div className="pill">SOURCE TRUST</div><h2>Guide knows sources are not equal.</h2><p className="small muted">The resource layer preserves where material came from and whether it is current, legacy or reference-only.</p><div className="guide-trust"><div className="trust-row"><strong>Official / Organization</strong><span>Highest-authority Assembly or organization material.</span></div><div className="trust-row"><strong>District</strong><span>Regional documents, training or direction.</span></div><div className="trust-row"><strong>Local Church Approved</strong><span>Current curriculum and resources approved for the local church.</span></div><div className="trust-row"><strong>Ministry / Leader Resource</strong><span>Useful ministry material with its source still identified.</span></div><div className="trust-row"><strong>Legacy / Reference</strong><span>Preserved for research and lesson ideas, not silently presented as current teaching.</span></div></div><div className="guide-beta"><strong>What comes next:</strong> once an AI provider/security boundary is chosen, Kingdom Guide can use this same approved-source layer for cited answers, course recommendations and personalized discipleship help. Until then, Beta stays navigation/search only.</div></aside>
    </div>
  </main>
}
