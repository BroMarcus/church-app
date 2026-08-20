import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Settings2} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {saveChurchFeatures} from './actions'

const features=[
 ['community','Community feed','Member conversation and relational updates.'],
 ['prayer','Prayer & Testimony','Public prayer and testimony sharing.'],
 ['messages','Messages','Private member-to-member messaging.'],
 ['serve','Serve & Teams','Ministry discovery, applications and team assignments.'],
 ['outreach','Outreach','Guest follow-up and evangelism tools.'],
 ['documents','Documents','Member document vault navigation.'],
 ['directory','Directory','Privacy-aware church directory.'],
 ['updates','Official Updates','Leadership announcements.'],
 ['private_care','Private Care','Private pastoral-care request entry.'],
 ['library','Library','Resources, media and document library umbrella.'],
 ['business','Business Partners','Member-owned business directory.'],
 ['fundraising','Fundraising','Church campaign and goal tools.'],
 ['network','Church Network','Cross-church events and resource connections.']
] as const

export default async function ChurchFeaturesPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const q=await searchParams,supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const {data:m}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single();if(!m?.church_id||!['pastor','church_admin'].includes(m.role))redirect('/')
 const {data:settings,error}=await supabase.from('church_feature_settings').select('feature_key,enabled').eq('church_id',m.church_id);if(error)console.info('church feature settings unavailable',{message:error.message})
 const set=new Map((settings??[]).map((r:any)=>[String(r.feature_key),Boolean(r.enabled)])),church:any=Array.isArray(m.churches)?m.churches[0]:m.churches
 return <main className="shell"><header className="topbar"><div><Link href="/church" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name||'Church'} • Features</div></div><Link className="ghost" href="/church">← Admin</Link></header>
 <section className="hero card"><div><div className="pill"><Settings2 size={12}/> CHURCH FEATURES</div><h1>Show only what your church uses.</h1><p>Turn optional areas off when they are not configured. The underlying data is preserved; this setting removes unnecessary navigation and keeps the member experience simple.</p></div></section>{q.saved&&<div className="notice success">Feature settings saved.</div>}{q.error&&<div className="notice error">{q.error}</div>}
 <form action={saveChurchFeatures} className="card" style={{padding:20,maxWidth:860}}><div style={{display:'grid',gap:10}}>{features.map(([key,label,body])=><label key={key} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'13px',border:'1px solid var(--line)',borderRadius:12}}><input type="checkbox" name={key} defaultChecked={set.has(key)?set.get(key):true} style={{marginTop:4}}/><span><strong>{label}</strong><span className="small muted" style={{display:'block',marginTop:3}}>{body}</span></span></label>)}</div><div className="notice" style={{marginTop:16}}>Core areas such as Home, Learning, Groups, Calendar, My Journey and account safety remain available. Feature switches control optional church modules, not a member’s authorization.</div><button className="btn" style={{marginTop:12}}>Save feature settings</button></form></main>
}
