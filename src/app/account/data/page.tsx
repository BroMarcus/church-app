import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download,FileJson,LockKeyhole,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './data.css'

const items=[
  ['Profile & private details','Your member profile, contact/private account details and privacy settings.'],
  ['Church memberships','Your church membership records, role/status and dates.'],
  ['Verified milestones','Leadership-verified discipleship/training milestone records attached to you.'],
  ['Learning','Course enrollments, lesson progress and earned badge records.'],
  ['Groups & Teams','Your group memberships and serving/team assignments.'],
  ['Document metadata','Titles, types, dates and verification status—without the private uploaded file bytes.'],
  ['Notifications','Your Kingdom Network notification history.'],
  ['Community activity','Posts, comments and reactions you created.'],
  ['Pastoral Care','Your own private care requests and pastoral notes that your account is permitted to read.']
] as const

export default async function MyDataPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  const church:any=Array.isArray(membership?.churches)?membership?.churches[0]:membership?.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">My Account • My Data</div></div><div className="row"><Link className="ghost" href="/account/privacy">Privacy</Link><Link className="ghost" href="/profile">My profile</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="data-hero card"><div><div className="pill">MY DATA</div><h1>Download a copy of your Kingdom Network data.</h1><p className="muted">A personal export of the records tied to your signed-in account.</p></div><div className="hero-stat"><FileJson size={24}/><span>{church?.name??'Your account'}</span></div></section>

    <div className="data-layout"><section className="card data-card"><div className="pill">INCLUDED</div><h2>What the personal export contains</h2><div className="data-list">{items.map(([title,body])=><div className="data-item" key={title}><strong>{title}</strong><span>{body}</span></div>)}</div><div className="download-box"><strong>JSON personal-data export</strong><p>JSON preserves structured records better than a spreadsheet. The file is generated from your signed-in session and is sent with no-store cache headers.</p><a className="btn" href="/account/data/download"><Download size={14}/> Download my data</a></div></section>

    <aside className="data-aside"><article className="card data-note"><div className="pill">PRIVATE MESSAGES</div><h3><LockKeyhole size={12}/> Not bulk-exported here.</h3><p>Private one-to-one message bodies are excluded from this automated bundle. The messaging system keeps those conversations participant-only rather than creating an alternate export path that could weaken the privacy boundary.</p></article><article className="card data-note"><div className="pill">DOCUMENT FILES</div><h3>Metadata, not file bytes.</h3><p>Your document titles, verification status and dates are included. The private uploaded certificate/document files themselves are not bundled into this JSON download.</p></article><article className="card data-note"><div className="pill">CHURCH RECORDS</div><h3><ShieldCheck size={12}/> Other people are excluded.</h3><p>This is a personal-data export, not a church database export. Leadership-only records belonging to other members and church operational records are not included.</p></article></aside></div>
  </main>
}
