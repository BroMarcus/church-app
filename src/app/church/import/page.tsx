import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileUp,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { stageChurchImport } from './actions'
import './import.css'

const label=(v:string)=>v==='member_invites'?'Member Invitations':'Outreach Contacts'

export default async function ChurchImportPage({searchParams}:{searchParams:Promise<{deleted?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:batches}=await supabase.from('church_import_batches').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(50)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Data Import</div></div><div className="row"><Link className="ghost" href="/church/export">Exports</Link><Link className="ghost" href="/church">← Church Admin</Link></div></header>
    <section className="import-hero card"><div><div className="pill">STAGED DATA IMPORT</div><h1>Bring church data in carefully.</h1><p className="muted">Upload a CSV, validate every row, review problems, then process only the clean rows.</p></div><div className="hero-stat"><FileUp size={24}/><span>Admin-reviewed import</span></div></section>
    {query.deleted&&<div className="notice success">Import batch deleted.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="import-layout"><section className="card import-card"><div className="pill">NEW IMPORT</div><h2>Stage a CSV file</h2><form action={stageChurchImport} className="import-form"><label><span>Import type</span><select name="dataset_type" required defaultValue="outreach"><option value="outreach">Outreach Contacts</option><option value="member_invites">Member Invitations</option></select></label><label><span>CSV file</span><input name="file" type="file" accept=".csv,text/csv" required/></label><button className="btn">Upload & validate</button></form><div className="template-row"><a className="ghost" href="/church/import/template/outreach">Download Outreach template</a><a className="ghost" href="/church/import/template/member_invites">Download Member Invite template</a></div><p className="small muted" style={{marginTop:10}}>Maximum 5 MB / 2,500 rows per batch. Member invitation imports create secure invitations only—they do not manufacture login accounts from a spreadsheet.</p>

      <div className="section-heading"><div><div className="pill">RECENT BATCHES</div><h2>Import history</h2></div></div><div className="batch-list">{(batches??[]).map((b:any)=><Link href={`/church/import/${b.id}`} className="card batch-card" key={b.id}><div className="batch-copy"><strong>{b.filename}</strong><span>{label(b.dataset_type)} • {new Date(b.created_at).toLocaleString()} • {b.status}</span></div><div className="batch-counts"><span className="batch-pill">{b.total_rows} rows</span><span className="batch-pill ready">{b.ready_rows} ready</span><span className="batch-pill invalid">{b.invalid_rows} invalid</span>{b.processed_rows>0&&<span className="batch-pill processed">{b.processed_rows} processed</span>}</div></Link>)}{!batches?.length&&<div className="card" style={{padding:16}}><span className="small muted">No import batches yet.</span></div>}</div>
    </section>

    <aside className="import-aside"><article className="card import-note"><div className="pill">SAFETY</div><h3><ShieldCheck size={12}/> Nothing processes on upload.</h3><p>Uploading creates a staged review batch only. Valid rows stay marked Ready until a pastor/church admin explicitly processes the batch.</p></article><article className="card import-note"><div className="pill">OUTREACH</div><h3>Duplicate protection still applies.</h3><p>Processing uses the same live Outreach constraints. A row that collides with an existing person is marked invalid instead of silently creating a duplicate.</p></article><article className="card import-note"><div className="pill">MEMBER INVITES</div><h3>Accounts remain invitation-based.</h3><p>The import creates email-bound, seven-day invitations. Members still create/confirm their own authentication account through the normal Kingdom Network onboarding flow.</p></article></aside></div>
  </main>
}
