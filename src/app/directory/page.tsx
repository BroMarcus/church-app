import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mail,Search,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './directory.css'

const roleLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function DirectoryPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const params=await searchParams
  const q=String(params.q??'').trim().toLowerCase()
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:members}=await supabase.from('church_memberships').select('user_id,role').eq('church_id',membership.church_id).eq('status','active').order('created_at')
  const ids=(members??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,first_name,last_name,display_name,bio,contact_email,show_contact_email').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const rows=(members??[]).map((m:any)=>{const p=pm.get(m.user_id);const name=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member';return {id:m.user_id,role:m.role,name,bio:p?.bio??'',contactEmail:p?.show_contact_email?p?.contact_email:null}}).filter((r:any)=>!q||`${r.name} ${r.role} ${r.bio}`.toLowerCase().includes(q)).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const isAdmin=['pastor','church_admin'].includes(membership.role)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Directory</div></div><div className="row">{isAdmin&&<Link className="ghost" href="/church">Church Admin</Link>}<Link className="ghost" href="/profile">My profile</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="directory-hero card"><div><div className="pill">CHURCH DIRECTORY</div><h1>Know your church family.</h1><p className="muted">Member-approved profile information and contact email in one simple directory.</p></div><div className="admin-badge"><Users size={22}/><div><strong>{rows.length}</strong><span>member{rows.length===1?'':'s'} shown</span></div></div></section>
    <section className="card directory-search"><form method="get"><input name="q" defaultValue={params.q??''} placeholder="Search by name, role or bio" aria-label="Search church directory"/><button className="ghost"><Search size={13}/> Search</button>{q&&<Link className="ghost" href="/directory">Clear</Link>}</form></section>
    <section className="directory-grid">{rows.map((r:any)=><article className="card person-card" key={r.id}><div className="person-top"><div className="person-avatar">{r.name.slice(0,1).toUpperCase()}</div><div><h3>{r.name}</h3><div className="person-role">{roleLabel(r.role)}</div></div></div><p className="person-bio">{r.bio||'No bio added yet.'}</p><div className="person-contact">{r.contactEmail?<a href={`mailto:${r.contactEmail}`}><Mail size={12}/> {r.contactEmail}</a>:<span className="small muted">Contact email not shared</span>}</div></article>)}{!rows.length&&<div className="card empty"><h3>No matching members.</h3><p className="muted">Try a different search.</p></div>}</section>
    <section className="card privacy-note"><div className="pill">PRIVACY</div><p className="muted"><ShieldCheck size={13}/> Login email, phone, home address, birthday and other private details are not shown here. Each member controls whether their separate contact email appears.</p></section>
  </main>
}
