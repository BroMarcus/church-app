import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive,BookOpen,FileText,Languages,Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ResourceUploader } from './resource-uploader'
import './resources.css'

const label=(v?:string|null)=>String(v??'').replaceAll('_',' ')

export default async function ResourcesPage({searchParams}:{searchParams:Promise<{status?:string;lang?:string;type?:string;q?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const canManage=['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role)

  let query=supabase.from('media_assets').select('*').eq('church_id',membership.church_id).order('source_year',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
  if(params.status&&params.status!=='all')query=query.eq('archive_status',params.status)
  if(params.lang&&params.lang!=='all')query=query.eq('language_code',params.lang)
  if(params.type&&params.type!=='all')query=query.eq('resource_type',params.type)
  if(params.q?.trim())query=query.ilike('title',`%${params.q.trim()}%`)
  const {data:assets}=await query

  const rows=await Promise.all((assets??[]).map(async(asset:any)=>{const signed=await supabase.storage.from('resource-library').createSignedUrl(asset.storage_path,60*10);return {...asset,url:signed.data?.signedUrl??null}}))
  const legacy=rows.filter((r:any)=>r.archive_status==='legacy').length

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Resource Library</div></div><div className="row"><Link className="ghost" href="/learning">Learning</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="card resources-hero"><div><div className="pill">RESOURCE LIBRARY</div><h1>Preserve what the church has learned.</h1><p className="muted">Current curriculum, old lessons, Bible studies, handouts, teacher notes, sermons and ministry resources—kept searchable without confusing legacy material with current teaching.</p></div><div className="resource-counter"><strong>{rows.length}</strong><span>resources shown • {legacy} legacy</span></div></section>

    {canManage&&<ResourceUploader churchId={membership.church_id} userId={userId}/>}    

    <form className="card" style={{padding:14,marginBottom:14}} action="/resources" method="get"><div className="resource-form-grid"><label><span>Search title</span><input name="q" defaultValue={params.q??''} placeholder="Prayer, baptism, soul winning…"/></label><label><span>Status</span><select name="status" defaultValue={params.status??'all'}><option value="all">All statuses</option><option value="current">Current</option><option value="legacy">Legacy</option><option value="draft">Draft</option><option value="reference_only">Reference only</option><option value="retired">Retired</option></select></label><label><span>Language</span><select name="lang" defaultValue={params.lang??'all'}><option value="all">All languages</option><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>Type</span><select name="type" defaultValue={params.type??'all'}><option value="all">All types</option><option value="lesson">Lesson</option><option value="bible_study">Bible study</option><option value="teacher_guide">Teacher guide</option><option value="handout">Handout</option><option value="sermon">Sermon</option><option value="slides">Slides</option><option value="training">Training</option><option value="video">Video</option><option value="audio">Audio</option><option value="other">Other</option></select></label></div><button className="ghost" style={{marginTop:9}}><Search size={13}/> Filter library</button></form>

    <section className="resource-grid-live">{rows.map((r:any)=><article className="card resource-card" key={r.id}><div className="resource-card-top"><div>{r.resource_type==='bible_study'?<BookOpen/>:r.archive_status==='legacy'?<Archive/>:<FileText/>}</div><span className={`resource-status ${r.archive_status}`}>{label(r.archive_status)}</span></div><div><h3>{r.title}</h3>{r.description&&<p>{r.description}</p>}</div><div className="resource-meta"><span>{label(r.resource_type)}</span><span><Languages size={9}/> {r.language_code==='es'?'Español':r.language_code==='bilingual'?'Bilingual':'English'}</span>{r.source_year&&<span>{r.source_year}</span>}{r.ministry_area&&<span>{r.ministry_area}</span>}</div>{r.topic_tags?.length>0&&<div className="resource-tags">{r.topic_tags.map((t:string)=><span key={t}>{t}</span>)}</div>}{r.scripture_refs?.length>0&&<p>Scriptures: {r.scripture_refs.join(' • ')}</p>}{r.source_label&&<p>Source: {r.source_label}</p>}<div className="resource-actions">{r.url&&<a className="btn" href={r.url} target="_blank" rel="noreferrer">Open resource</a>}<span className="small muted">{r.approved_for_members?'Member visible':'Leadership only'}</span></div></article>)}{!rows.length&&<div className="card resource-empty"><h3>No matching resources yet.</h3><p className="muted">Older lessons and current curriculum will appear here as they are archived.</p></div>}</section>
  </main>
}
