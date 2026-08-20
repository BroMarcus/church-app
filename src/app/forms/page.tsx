import Link from 'next/link'
import {redirect} from 'next/navigation'
import {ClipboardList,CheckCircle2} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'

export default async function MemberForms(){
 const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const {data:m}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single();if(!m?.church_id)redirect('/')
 const [{data:forms},{data:mine}]=await Promise.all([supabase.from('church_forms').select('id,title,description,form_schema').eq('church_id',m.church_id).eq('published',true).is('archived_at',null).order('title'),supabase.from('church_form_submissions').select('id,form_id,status,created_at,next_action,due_at,church_forms(title)').eq('submitted_by',userId).order('created_at',{ascending:false}).limit(12)])
 const church:any=Array.isArray(m.churches)?m.churches[0]:m.churches
 return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name||'Church'} • Forms</div></div><Link className="ghost" href="/">← Home</Link></header>
 <section className="hero card"><div><div className="pill"><ClipboardList size={12}/> FORMS</div><h1>Church forms in one place.</h1><p>Requests, applications and simple church forms can live here instead of getting lost in paper or messages.</p></div><div className="hero-stat"><strong>{forms?.length||0}</strong><span>available now</span></div></section>
 <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:12,marginBottom:18}}>{(forms??[]).map((form:any)=><Link href={`/forms/${form.id}`} className="card" style={{padding:18,textDecoration:'none'}} key={form.id}><ClipboardList size={20}/><h3>{form.title}</h3><p className="small muted">{form.description||'Open the form to get started.'}</p><span className="record-link">Open form →</span></Link>)}{!forms?.length&&<div className="card empty"><CheckCircle2 size={28}/><h3>No forms need your attention.</h3><p className="muted">Your church has not published any member forms yet.</p></div>}</section>
 {(mine??[]).length>0&&<section className="card" style={{padding:18}}><div className="pill">MY RECENT SUBMISSIONS</div><div style={{display:'grid',gap:9,marginTop:12}}>{(mine??[]).map((row:any)=>{const form:any=Array.isArray(row.church_forms)?row.church_forms[0]:row.church_forms;return <div key={row.id} style={{padding:11,border:'1px solid var(--line)',borderRadius:11}}><div className="row" style={{justifyContent:'space-between'}}><strong>{form?.title||'Church form'}</strong><span className="pill">{String(row.status).replaceAll('_',' ').toUpperCase()}</span></div>{row.next_action&&<div className="small muted">Next: {row.next_action}</div>}</div>})}</div></section>}
 </main>
}
