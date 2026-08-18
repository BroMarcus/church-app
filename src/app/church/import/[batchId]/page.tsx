import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,FileWarning,Play,Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { deleteChurchImport,processChurchImport } from '../actions'
import '../import.css'

const label=(v:string)=>v==='member_invites'?'Member Invitations':'Outreach Contacts'
const columns=(dataset:string)=>dataset==='member_invites'?['first_name','last_name','email','phone','role']:['first_name','last_name','email','phone','stage','notes']

export default async function ImportReviewPage({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{processed?:string;error?:string}>}){
  const [{batchId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:batch}=await supabase.from('church_import_batches').select('*').eq('id',batchId).eq('church_id',membership.church_id).maybeSingle()
  if(!batch)redirect('/church/import?error='+encodeURIComponent('Import batch not found.'))
  const {data:rows}=await supabase.from('church_import_rows').select('*').eq('batch_id',batchId).order('row_number').limit(3000)
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const cols=columns(batch.dataset_type)
  const ready=(rows??[]).filter((r:any)=>r.row_status==='ready').length
  const invalid=(rows??[]).filter((r:any)=>r.row_status==='invalid').length
  const processed=(rows??[]).filter((r:any)=>r.row_status==='processed').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Import Review</div></div><div className="row"><Link className="ghost" href="/church/import">← Import Center</Link><Link className="ghost" href="/church">Church Admin</Link></div></header>
    <section className="import-hero card"><div><div className="pill">{label(batch.dataset_type).toUpperCase()}</div><h1>{batch.filename}</h1><p className="muted">Review normalized CSV rows and validation errors before processing.</p></div><div className="hero-stat"><strong>{batch.status}</strong><span>{new Date(batch.created_at).toLocaleString()}</span></div></section>
    {query.processed&&<div className="notice success">Import processing finished. Review the final row statuses below.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="review-summary"><div className="card review-stat"><strong>{batch.total_rows}</strong><span>Total rows</span></div><div className="card review-stat"><strong>{ready}</strong><span>Ready</span></div><div className="card review-stat"><strong>{invalid}</strong><span>Invalid</span></div><div className="card review-stat"><strong>{processed}</strong><span>Processed</span></div></section>

    <div className="review-actions">{batch.status==='staged'&&ready>0&&<form action={processChurchImport}><input type="hidden" name="batch_id" value={batchId}/><button className="btn"><Play size={13}/> Process {ready} ready row{ready===1?'':'s'}</button></form>}{batch.status!=='processing'&&<form action={deleteChurchImport}><input type="hidden" name="batch_id" value={batchId}/><button className="ghost"><Trash2 size={13}/> Delete batch</button></form>}{batch.dataset_type==='member_invites'&&batch.status==='processed'&&<Link className="ghost" href="/church/invites">Open member invitations</Link>}{batch.dataset_type==='outreach'&&batch.status==='processed'&&<Link className="ghost" href="/outreach">Open Outreach</Link>}</div>
    {batch.status==='staged'&&invalid>0&&<div className="notice error"><FileWarning size={13}/> {invalid} row{invalid===1?' is':'s are'} invalid and will not process. Ready rows can still be processed safely.</div>}{batch.status==='processed'&&<div className="notice success"><CheckCircle2 size={13}/> Processing is complete. Any row marked Invalid below was rejected without creating a live record.</div>}

    <section className="card import-card"><div className="pill">STAGED ROWS</div><h2>Normalized data</h2><div className="import-table-wrap"><table className="import-table"><thead><tr><th>CSV row</th><th>Status</th>{cols.map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}<th>Validation / processing result</th></tr></thead><tbody>{(rows??[]).map((r:any)=><tr className={r.row_status==='invalid'?'invalid':''} key={r.id}><td>{r.row_number}</td><td>{r.row_status}</td>{cols.map(c=><td key={c}>{String(r.row_data?.[c]??'')}</td>)}<td>{r.validation_error?<span className="row-error">{r.validation_error}</span>:r.target_id?'Created / linked successfully':'Ready'}</td></tr>)}</tbody></table></div></section>
  </main>
}
