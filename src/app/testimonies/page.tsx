import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Quote,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const fmt=(v?:string|null,es=false)=>v?new Date(`${v}T12:00:00`).toLocaleDateString(es?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}):''

export default async function TestimoniesPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:entries}=await supabase.from('journey_entries').select('id,user_id,title,body,scripture_ref,occurred_on,created_at').eq('church_id',membership.church_id).eq('entry_type','testimony').eq('visibility','church_share').eq('share_status','approved').order('occurred_on',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
  const ids=Array.from(new Set((entries??[]).map((e:any)=>e.user_id)));let profiles:any[]=[];if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p])),name=(id:string)=>{const p:any=pm.get(id);return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||(es?'Miembro de la iglesia':'Church member')}
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Testimonios':'Testimonies'}</div></div><div className="row"><Link className="ghost" href="/testimonies?lang=en">English</Link><Link className="ghost" href="/testimonies?lang=es">Español</Link><Link className="ghost" href={l('/journey/memories')}>{es?'Mi Jornada':'My Journey'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
  <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">{es?'MIRA LO QUE DIOS HA HECHO':'LOOK WHAT GOD HAS DONE'}</div><h1>{es?'Testimonios de nuestra familia de iglesia.':'Testimonies from our church family.'}</h1><p className="muted">{es?'Estos testimonios fueron compartidos voluntariamente por miembros y revisados antes de aparecer aquí.':'These testimonies were voluntarily submitted by members and reviewed before appearing here.'}</p></section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>{(entries??[]).map((e:any)=><article className="card" style={{padding:20}} key={e.id}><Quote size={22}/><div className="small muted" style={{marginTop:10}}>{name(e.user_id)} • {fmt(e.occurred_on||e.created_at?.slice(0,10),es)}</div><h2>{e.title||(es?'Testimonio':'Testimony')}</h2><p style={{whiteSpace:'pre-wrap',lineHeight:1.7}}>{e.body}</p>{e.scripture_ref&&<div className="pill"><Sparkles size={10}/> {e.scripture_ref}</div>}</article>)}{!entries?.length&&<div className="card" style={{padding:26,textAlign:'center'}}><Sparkles size={30}/><h2>{es?'Los testimonios compartidos aparecerán aquí.':'Shared testimonies will appear here.'}</h2><p className="muted">{es?'Guarda tu historia en Mi Jornada y, si quieres, envíala para compartir.':'Save your story in My Journey and, if you want, submit it to share.'}</p></div>}</section>
  </main>
}
