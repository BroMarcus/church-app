import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,HandHeart,LockKeyhole,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createPrayerOrTestimony,setPrayerAnswered } from './actions'
import { togglePraying } from './reaction-actions'
import './prayer.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function PrayerPage({searchParams}:{searchParams:Promise<{view?:string;created?:string;answered?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const view=['prayer','testimony'].includes(String(query.view))?String(query.view):'all'
  let postsQuery=supabase.from('community_posts').select('id,author_id,body,post_type,created_at,answered_at').eq('church_id',membership.church_id).in('post_type',['prayer_request','testimony']).order('created_at',{ascending:false}).limit(120)
  if(view==='prayer')postsQuery=postsQuery.eq('post_type','prayer_request')
  if(view==='testimony')postsQuery=postsQuery.eq('post_type','testimony')
  const {data:posts}=await postsQuery
  const rows=posts??[]
  const postIds=rows.map((p:any)=>p.id)
  const authorIds=Array.from(new Set(rows.map((p:any)=>p.author_id)))
  let profiles:any[]=[];let reactions:any[]=[]
  if(authorIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',authorIds);profiles=r.data??[]}
  if(postIds.length){const r=await supabase.from('post_reactions').select('post_id,user_id,reaction_type').in('post_id',postIds).eq('reaction_type','praying');reactions=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const prayingCounts=new Map<string,number>();const mine=new Set<string>()
  for(const r of reactions){prayingCounts.set(r.post_id,(prayingCounts.get(r.post_id)??0)+1);if(r.user_id===userId)mine.add(r.post_id)}
  const prayerCount=rows.filter((p:any)=>p.post_type==='prayer_request').length
  const testimonyCount=rows.filter((p:any)=>p.post_type==='testimony').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Prayer & Testimony</div></div><div className="row"><Link className="ghost" href="/help"><LockKeyhole size={13}/> Private Care</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="prayer-hero card"><div><div className="pill">PRAYER & TESTIMONY</div><h1>Pray together. Remember what God has done.</h1><p className="muted">Church-visible prayer requests and testimonies, kept separate from private Pastoral Care.</p></div><div className="hero-stat"><HandHeart size={23}/><span>{prayerCount} prayer{prayerCount===1?'':'s'} • {testimonyCount} testimon{testimonyCount===1?'y':'ies'}</span></div></section>
    {query.created&&<div className="notice success">{query.created==='testimony'?'Testimony shared with your church family.':'Prayer request shared with your church family.'}</div>}{query.answered&&<div className="notice success">Prayer answered status updated.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="row" style={{marginBottom:12,flexWrap:'wrap'}}><Link className={view==='all'?'btn':'ghost'} href="/prayer">All</Link><Link className={view==='prayer'?'btn':'ghost'} href="/prayer?view=prayer">Prayer Requests</Link><Link className={view==='testimony'?'btn':'ghost'} href="/prayer?view=testimony">Testimonies</Link></div>

    <div className="prayer-layout"><section className="prayer-list">{rows.map((p:any)=>{const author=personName(pm.get(p.author_id));const isPrayer=p.post_type==='prayer_request';const answered=Boolean(p.answered_at);const own=p.author_id===userId;const count=prayingCounts.get(p.id)??0;return <article className="card prayer-card" key={p.id}><div className="prayer-head"><div className="prayer-person"><div className="avatar">{author.slice(0,1).toUpperCase()}</div><div><strong>{author}</strong><span>{new Date(p.created_at).toLocaleDateString()}</span></div></div><div className="prayer-tags"><span className="prayer-tag">{isPrayer?'Prayer Request':'Testimony'}</span>{answered&&<span className="prayer-tag answered"><CheckCircle2 size={9}/> Answered</span>}</div></div><p>{p.body}</p><div className="prayer-actions">{isPrayer&&<form action={togglePraying}><input type="hidden" name="post_id" value={p.id}/><button className={mine.has(p.id)?'btn':'ghost'}><HandHeart size={13}/> {mine.has(p.id)?'Praying':'I’m Praying'}{count?` • ${count}`:''}</button></form>}{isPrayer&&own&&<form action={setPrayerAnswered}><input type="hidden" name="post_id" value={p.id}/><button className="ghost" name="answered" value={answered?'0':'1'}>{answered?'Mark still praying':'Mark answered'}</button></form>}{!isPrayer&&<span className="small muted"><Sparkles size={11}/> Shared testimony</span>}</div></article>})}{!rows.length&&<div className="card prayer-empty"><HandHeart size={24}/><h3>Nothing shared here yet.</h3><p className="muted">Be the first to share a prayer request or testimony with your church family.</p></div>}</section>

    <aside className="card share-card"><div className="pill">SHARE WITH THE CHURCH</div><h2>Prayer request or testimony</h2><p className="small muted">This is visible to signed-in members of your local church. For something private, use Pastoral Care below.</p><form action={createPrayerOrTestimony} className="share-form"><label><span>Share as</span><select name="post_type" defaultValue="prayer_request"><option value="prayer_request">Prayer Request</option><option value="testimony">Testimony</option></select></label><label><span>What would you like to share?</span><textarea name="body" rows={7} required maxLength={5000} placeholder="Share with your church family…"/></label><button className="btn">Share</button></form><Link className="private-care-link" href="/help"><strong><LockKeyhole size={12}/> Need this to stay private?</strong><span>Send a private request to pastoral/church administration instead of posting it to the church.</span></Link></aside></div>
  </main>
}
