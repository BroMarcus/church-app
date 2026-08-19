import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download,FileImage,FileText,Images,Languages,Music,Presentation,Search,ShieldCheck,Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MediaUploader } from './media-uploader'
import './media.css'

const label=(v?:string|null)=>String(v??'').replaceAll('_',' ')
const imageTypes=new Set(['flyer','invitation','sermon_cover','fundraiser','photo'])
const icon=(type:string)=>type==='video'?<Video/>:type==='audio'?<Music/>:type==='slides'?<Presentation/>:imageTypes.has(type)?<FileImage/>:<FileText/>

export default async function MediaPage({searchParams}:{searchParams:Promise<{q?:string;type?:string;lang?:string;status?:string;ministry?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const canManage=['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role)
  const canApproveOfficial=['pastor','church_admin'].includes(membership.role)

  let query=supabase.from('media_assets').select('*').eq('church_id',membership.church_id).eq('library_kind','media').order('created_at',{ascending:false})
  if(!canManage)query=query.eq('archive_status','current')
  else if(params.status&&params.status!=='all')query=query.eq('archive_status',params.status)
  if(params.type&&params.type!=='all')query=query.eq('asset_type',params.type)
  if(params.lang&&params.lang!=='all')query=query.eq('language_code',params.lang)
  if(params.q?.trim())query=query.ilike('title',`%${params.q.trim()}%`)
  if(params.ministry?.trim())query=query.ilike('ministry_area',`%${params.ministry.trim()}%`)
  const {data:assets}=await query

  const rows=await Promise.all((assets??[]).map(async(asset:any)=>{const signed=await supabase.storage.from('resource-library').createSignedUrl(asset.storage_path,60*30);return {...asset,url:signed.data?.signedUrl??null}}))
  const memberReady=rows.filter((r:any)=>r.approved_for_members&&r.archive_status==='current').length

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Media Library</div></div><div className="row"><Link className="ghost" href="/resources">Knowledge Library</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="card media-hero"><div><div className="pill">MEDIA LIBRARY</div><h1>Ready-to-use church media.</h1><p className="muted">Flyers, invitations, sermon covers, fundraiser graphics, ministry photos, slides and other reusable assets for your church community.</p></div><div className="media-counter"><strong>{rows.length}</strong><span>assets shown • {memberReady} ready for members</span></div></section>

    {canManage&&<MediaUploader churchId={membership.church_id} userId={userId} canApproveOfficial={canApproveOfficial}/>}    

    <form className="card media-filter" action="/media" method="get"><div className="media-form-grid"><label><span>Search</span><input name="q" defaultValue={params.q??''} placeholder="Easter, youth, fundraiser…"/></label><label><span>Category</span><select name="type" defaultValue={params.type??'all'}><option value="all">All categories</option><option value="flyer">Flyers</option><option value="invitation">Invitations</option><option value="sermon_cover">Sermon covers</option><option value="fundraiser">Fundraiser graphics</option><option value="photo">Photos</option><option value="slides">Slides</option><option value="video">Video</option><option value="audio">Audio</option><option value="other">Other</option></select></label><label><span>Language</span><select name="lang" defaultValue={params.lang??'all'}><option value="all">All languages</option><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>Ministry</span><input name="ministry" defaultValue={params.ministry??''} placeholder="Youth, Worship…"/></label>{canManage&&<label><span>Status</span><select name="status" defaultValue={params.status??'all'}><option value="all">All statuses</option><option value="current">Current</option><option value="draft">Draft</option><option value="reference_only">Reference only</option><option value="legacy">Legacy</option><option value="retired">Retired</option></select></label>}</div><button className="ghost"><Search size={13}/> Filter media</button></form>

    <section className="media-grid">{rows.map((asset:any)=><article className="card media-card" key={asset.id}>{asset.url&&imageTypes.has(asset.asset_type)?<a className="media-preview" href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={asset.title}/></a>:<div className="media-file-icon">{icon(asset.asset_type)}</div>}<div className="media-card-head"><div><h3>{asset.title}</h3>{asset.description&&<p>{asset.description}</p>}</div><div className="media-badges">{asset.official_source&&<span className="media-status official"><ShieldCheck size={10}/> official</span>}{canManage&&<span className={`media-status ${asset.archive_status}`}>{label(asset.archive_status)}</span>}</div></div><div className="media-meta"><span>{label(asset.asset_type)}</span><span><Languages size={9}/> {asset.language_code==='es'?'Español':asset.language_code==='bilingual'?'Bilingual':'English'}</span>{asset.ministry_area&&<span>{asset.ministry_area}</span>}{asset.source_label&&<span>{asset.source_label}</span>}</div>{asset.topic_tags?.length>0&&<div className="media-tags">{asset.topic_tags.map((tag:string)=><span key={tag}>{tag}</span>)}</div>}<div className="media-actions">{asset.url&&<a className="btn" href={asset.url} target="_blank" rel="noreferrer"><Download size={13}/> Download / open</a>}<span className="small muted">{asset.can_edit_copy?'Reusable / adaptable':'Use as provided'}{canManage&&!asset.approved_for_members?' • leadership only':''}</span></div></article>)}{!rows.length&&<div className="card media-empty"><Images size={28}/><h3>No matching media yet.</h3><p className="muted">Authorized leaders can upload the first flyer, invitation, photo or reusable ministry asset above.</p></div>}</section>
  </main>
}
