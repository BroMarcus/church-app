import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,Download,FileText,LockKeyhole,Megaphone,ShieldCheck,Users,BriefcaseBusiness,UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './export.css'

const exports=[
  {key:'members',title:'Members',body:'Membership roles/status, profile details and church-admin contact records.',Icon:Users,tags:['Church admin data','Confidential']},
  {key:'groups',title:'Groups & Rosters',body:'Group discovery details and member rosters. Private home addresses/access instructions are excluded.',Icon:Users,tags:['Operational','Private addresses excluded']},
  {key:'outreach',title:'Outreach Pipeline',body:'People, stages, follow-up ownership, Bible-study progress, prayer requests and private follow-up notes.',Icon:Megaphone,tags:['Confidential','Handle carefully']},
  {key:'events',title:'Events',body:'Local church event schedule, audience, featured status, registration links and descriptions.',Icon:CalendarDays,tags:['Operational']},
  {key:'ministries',title:'Ministry Applications',body:'Applications, qualification scores, review status and leadership notes.',Icon:BriefcaseBusiness,tags:['Leadership data']},
  {key:'teams',title:'Team Assignments',body:'Serving schedules, call times, confirmations, response notes and assignment instructions.',Icon:UserCheck,tags:['Operational']},
  {key:'documents',title:'Document Metadata',body:'Certificate/document titles, types, expiration dates and verification status. Uploaded file contents are excluded.',Icon:FileText,tags:['Metadata only','Files excluded']},
  {key:'learning',title:'Learning Progress',body:'Course enrollment, progress, scores, curriculum versions and earned credentials.',Icon:BookOpen,tags:['Discipleship data']}
] as const

export default async function ChurchExportPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Data Export</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="export-hero card"><div><div className="pill">DATA PORTABILITY</div><h1>Your church can take its data with it.</h1><p className="muted">Download practical operational records as CSV files for backup, review or migration.</p></div><div className="hero-stat"><ShieldCheck size={23}/><span>Pastor / church-admin only</span></div></section>

    <section className="export-grid">{exports.map(({key,title,body,Icon,tags})=><article className="card export-card" key={key}><div className="export-icon"><Icon size={18}/></div><div className="export-copy"><h3>{title}</h3><p>{body}</p><div className="export-tags">{tags.map(tag=><span className={`export-tag ${tag==='Confidential'||tag==='Handle carefully'?'confidential':'safe'}`} key={tag}>{tag}</span>)}</div><a className="ghost" href={`/church/export/${key}`}><Download size={12}/> Download CSV</a></div></article>)}</section>

    <section className="card export-policy"><div className="pill">PRIVACY & RETENTION</div><h2>Some information is intentionally not in bulk export.</h2><p className="small muted">Data portability matters, but highly sensitive communication should not quietly become a spreadsheet just because an administrator has access to the application.</p><div className="export-policy-grid"><div className="policy-box"><strong><LockKeyhole size={12}/> Private Messages</strong><span>Private one-to-one message bodies are excluded. Leadership does not have blanket access to those conversations in the app, so the export center does not create a back door.</span></div><div className="policy-box"><strong><LockKeyhole size={12}/> Pastoral Care</strong><span>Private pastoral-care requests/notes are excluded from bulk exports. A future retention/export policy for care records should be an explicit church decision.</span></div><div className="policy-box"><strong>Group Home Addresses</strong><span>Group discovery and rosters export, but protected home addresses/access instructions do not.</span></div><div className="policy-box"><strong>Uploaded Files</strong><span>Document verification metadata exports, but private certificate/document files are not bundled into CSV. File backup can be built as a separate controlled workflow.</span></div></div></section>
  </main>
}
