import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,Quote,XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { reviewTestimony } from './actions'

export default async function TestimonyReviewPage({searchParams}:{searchParams:Promise<{lang?:string;reviewed?:string;error?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:entries}=await supabase.from('journey_entries').select('id,user_id,title,body,scripture_ref,occurred_on,created_at').eq('church_id',membership.church_id).eq('entry_type','testimony').eq('visibility','church_share').eq('share_status','pending').order('created_at')
  const ids=Array.from(new Set((entries??[]).map((e:any)=>e.user_id)));let profiles:any[]=[];if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p])),name=(id:string)=>{const p:any=pm.get(id);return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||(es?'Miembro':'Member')}
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Revisión de Testimonios':'Testimony Review'}</div></div><div className="row"><Link className="ghost" href="/church/testimony-review?lang=en">English</Link><Link className="ghost" href="/church/testimony-review?lang=es">Español</Link><Link className="ghost" href={l('/church')}>{es?'← Administración':'← Church Admin'}</Link></div></header>
  <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">{es?'TESTIMONIOS PARA COMPARTIR':'TESTIMONIES TO SHARE'}</div><h1>{es?'Revisa antes de publicar a la iglesia.':'Review before sharing with the church.'}</h1><p className="muted">{es?'Solo aparecen testimonios que el miembro eligió enviar para compartir. Sus oraciones y diarios privados nunca aparecen aquí.':'Only testimonies the member intentionally submitted for church sharing appear here. Private prayers and journals never appear here.'}</p></section>
  {params.reviewed&&<div className="notice success">{es?'Revisión guardada.':'Review saved.'}</div>}{params.error&&<div className="notice error">{params.error}</div>}
  <section style={{display:'grid',gap:12}}>{(entries??[]).map((e:any)=><article className="card" style={{padding:20}} key={e.id}><div className="pill"><Quote size={11}/> {name(e.user_id)}</div><h2>{e.title||(es?'Testimonio':'Testimony')}</h2><div className="small muted">{e.occurred_on||e.created_at?.slice(0,10)}{e.scripture_ref?` • ${e.scripture_ref}`:''}</div><p style={{whiteSpace:'pre-wrap',lineHeight:1.65}}>{e.body}</p><div className="row" style={{gap:10,flexWrap:'wrap'}}><form action={reviewTestimony}><input type="hidden" name="entry_id" value={e.id}/><input type="hidden" name="decision" value="approved"/><input type="hidden" name="lang" value={lang}/><button className="btn"><CheckCircle2 size={14}/> {es?'Aprobar para compartir':'Approve to share'}</button></form><form action={reviewTestimony}><input type="hidden" name="entry_id" value={e.id}/><input type="hidden" name="decision" value="declined"/><input type="hidden" name="lang" value={lang}/><button className="ghost"><XCircle size={14}/> {es?'No compartir':'Do not share'}</button></form></div></article>)}{!entries?.length&&<div className="card" style={{padding:24,textAlign:'center'}}><CheckCircle2 size={28}/><h3>{es?'No hay testimonios esperando revisión.':'No testimonies are waiting for review.'}</h3></div>}</section>
  </main>
}
