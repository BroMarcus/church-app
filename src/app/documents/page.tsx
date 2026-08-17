import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileCheck2,FileText,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DocumentUploader } from './document-uploader'
import { verifyDocument } from './actions'
import './documents.css'

const fmt=(v?:string|null)=>v?new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'

export default async function DocumentsPage({searchParams}:{searchParams:Promise<{error?:string;reviewed?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const isAdmin=['pastor','church_admin'].includes(membership.role)
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as any
  const base=supabase.from('member_documents').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false})
  const {data:docs}=isAdmin?await base:await base.eq('owner_user_id',userId)
  const ownerIds=Array.from(new Set((docs??[]).map((d:any)=>d.owner_user_id)))
  let profiles:any[]=[]
  if(ownerIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ownerIds);profiles=result.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const rows=await Promise.all((docs??[]).map(async(d:any)=>{const signed=await supabase.storage.from('member-documents').createSignedUrl(d.storage_path,60*10);return {...d,url:signed.data?.signedUrl??null}}))
  const verified=rows.filter((d:any)=>d.verification_status==='verified').length
  const pending=rows.filter((d:any)=>d.verification_status==='pending_review'||d.verification_status==='member_uploaded').length
  const now=new Date();const in30=new Date(now.getTime()+30*86400000)

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Documents</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="documents-hero card"><div><div className="pill">DOCUMENT VAULT</div><h1>Credentials & records.</h1><p className="muted">Private certificates, training records, ministry forms and verified credentials.</p></div><div className="documents-stat"><strong>{verified}</strong><span>verified • {pending} awaiting review</span></div></section>
    {query.reviewed&&<div className="notice success">Document review saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    <DocumentUploader churchId={membership.church_id} userId={userId}/>
    <div className="section-heading"><div><div className="pill">{isAdmin?'CHURCH RECORDS':'MY RECORDS'}</div><h2>{isAdmin?'Document review queue':'My documents'}</h2></div><span className="small muted">Private storage with church verification.</span></div>
    <section className="document-list">{rows.map((d:any)=>{const p=pm.get(d.owner_user_id);const owner=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Member';const exp=d.expires_at?new Date(d.expires_at+'T12:00:00'):null;const expiryClass=exp&&exp<now?'expired':exp&&exp<in30?'expiring':'';return <article className="card document-card" key={d.id}><div><div className="document-main"><div className="document-icon">{d.verification_status==='verified'?<FileCheck2/>:<FileText/>}</div><div className="document-copy"><h3>{d.title}</h3>{isAdmin&&<div className="doc-owner">Owner: <strong>{owner}</strong></div>}<p>{String(d.document_type).replaceAll('_',' ')}{d.issuer?` • ${d.issuer}`:''}</p><div className="document-meta"><span>Issued {fmt(d.issued_at)}</span>{d.expires_at&&<span className={expiryClass}>Expires {fmt(d.expires_at)}</span>}<span>Uploaded {new Date(d.created_at).toLocaleDateString()}</span></div>{d.notes&&<p style={{marginTop:9}}>{d.notes}</p>}{d.verification_notes&&<p style={{marginTop:9}}>Review: {d.verification_notes}</p>}</div></div>
      {isAdmin&&<form action={verifyDocument} className="review-form"><input type="hidden" name="document_id" value={d.id}/><label><span>Review status</span><select name="verification_status" defaultValue={d.verification_status==='member_uploaded'?'pending_review':d.verification_status}><option value="pending_review">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label><label><span>Review notes</span><input name="verification_notes" defaultValue={d.verification_notes??''} placeholder="Optional note"/></label><button className="btn">Save review</button></form>}</div><div className="document-actions"><span className={`status-chip ${d.verification_status}`}>{String(d.verification_status).replaceAll('_',' ')}</span>{d.url&&<a className="ghost" href={d.url} target="_blank" rel="noreferrer">Open</a>}{d.verification_status==='verified'&&<ShieldCheck size={18}/>}</div></article>})}{!rows.length&&<div className="card empty"><h3>No documents yet.</h3><p className="muted">Upload your first certificate, credential or ministry record above.</p></div>}</section>
  </main>
}
