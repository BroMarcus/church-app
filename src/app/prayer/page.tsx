import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,HandHeart,Languages,LockKeyhole,MessageSquareWarning,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createPrayerOrTestimony,setPrayerAnswered } from './actions'
import { togglePraying } from './reaction-actions'
import './prayer.css'

const personName=(p:any,fallback:string)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||fallback

export default async function PrayerPage({searchParams}:{searchParams:Promise<{view?:string;share?:string;created?:string;answered?:string;error?:string;lang?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const view=['prayer','testimony'].includes(String(query.view))?String(query.view):'all'
  const share=query.share==='testimony'?'testimony':'prayer_request'
  let postsQuery=supabase.from('community_posts').select('id,author_id,body,post_type,created_at,answered_at').eq('church_id',membership.church_id).in('post_type',['prayer_request','testimony']).order('created_at',{ascending:false}).limit(120)
  if(view==='prayer')postsQuery=postsQuery.eq('post_type','prayer_request')
  if(view==='testimony')postsQuery=postsQuery.eq('post_type','testimony')
  const {data:posts}=await postsQuery
  const rows=posts??[],postIds=rows.map((p:any)=>p.id),authorIds=Array.from(new Set(rows.map((p:any)=>p.author_id)))
  let profiles:any[]=[];let reactions:any[]=[]
  if(authorIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',authorIds);profiles=r.data??[]}
  if(postIds.length){const r=await supabase.from('post_reactions').select('post_id,user_id,reaction_type').in('post_id',postIds).eq('reaction_type','praying');reactions=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p])),prayingCounts=new Map<string,number>(),mine=new Set<string>()
  for(const r of reactions){prayingCounts.set(r.post_id,(prayingCounts.get(r.post_id)??0)+1);if(r.user_id===userId)mine.add(r.post_id)}
  const prayerCount=rows.filter((p:any)=>p.post_type==='prayer_request').length,testimonyCount=rows.filter((p:any)=>p.post_type==='testimony').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Prayer & Testimony','Oración y Testimonio')}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/prayer?lang=en">English</Link><Link className="ghost" href="/prayer?lang=es">Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href="/">← {t('Home','Inicio')}</Link></div></header>

    <section className="prayer-hero card"><div><div className="pill">{t('PRAYER & TESTIMONY','ORACIÓN Y TESTIMONIO')}</div><h1>{t('Pray together. Remember what God has done.','Oremos juntos. Recordemos lo que Dios ha hecho.')}</h1><p className="muted">{t('Share with your church family, or choose Private Care when something should stay between you and leadership.','Comparte con tu familia de iglesia, o usa Cuidado Privado cuando algo debe quedar entre tú y el liderazgo.')}</p></div><div className="hero-stat"><HandHeart size={23}/><span>{prayerCount} {t('prayers','oraciones')} • {testimonyCount} {t('testimonies','testimonios')}</span></div></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:18}}>
      <Link className="card" href={l('/prayer?share=prayer')} style={{padding:18}}><HandHeart size={24}/><h3>{t('Share a Prayer Request','Compartir una Petición de Oración')}</h3><p className="small muted">{t('Visible to signed-in members of your church.','Visible para miembros de tu iglesia que hayan iniciado sesión.')}</p></Link>
      <Link className="card" href={l('/prayer?share=testimony')} style={{padding:18}}><Sparkles size={24}/><h3>{t('Share a Testimony','Compartir un Testimonio')}</h3><p className="small muted">{t('Tell your church family what God has done.','Cuéntale a tu familia de iglesia lo que Dios ha hecho.')}</p></Link>
      <Link className="card" href={l('/help')} style={{padding:18,border:'1px solid rgba(125,211,252,.28)'}}><LockKeyhole size={24}/><h3>{t('Private Pastoral Help','Ayuda Pastoral Privada')}</h3><p className="small muted">{t('For prayer or care that should not be posted publicly to the church.','Para oración o cuidado que no debe publicarse para toda la iglesia.')}</p></Link>
    </section>

    {query.created&&<div className="notice success">{query.created==='testimony'?t('Testimony shared with your church family.','Testimonio compartido con tu familia de iglesia.'):t('Prayer request shared with your church family.','Petición de oración compartida con tu familia de iglesia.')}</div>}{query.answered&&<div className="notice success">{t('Prayer answered status updated.','Estado de oración contestada actualizado.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <details className="card" style={{padding:18,marginBottom:20}} open={Boolean(query.share)}><summary style={{fontWeight:800,cursor:'pointer'}}>{share==='testimony'?t('Write a testimony','Escribir un testimonio'):t('Write a prayer request','Escribir una petición de oración')}</summary><div style={{marginTop:14}}><p className="small muted">{t('This will be visible to signed-in members of your local church.','Esto será visible para miembros de tu iglesia local que hayan iniciado sesión.')}</p><form action={createPrayerOrTestimony} className="share-form"><input type="hidden" name="lang" value={es?'es':'en'}/><input type="hidden" name="post_type" value={share}/><label><span>{share==='testimony'?t('What would you like to share?','¿Qué te gustaría compartir?'):t('How can your church family pray?','¿Cómo puede orar tu familia de iglesia?')}</span><textarea name="body" rows={6} required maxLength={5000} placeholder={share==='testimony'?t('Share what God has done…','Comparte lo que Dios ha hecho…'):t('Share your prayer need…','Comparte tu necesidad de oración…')}/></label><button className="btn">{share==='testimony'?t('Share testimony','Compartir testimonio'):t('Share prayer request','Compartir petición')}</button></form></div></details>

    <div className="row" style={{marginBottom:12,flexWrap:'wrap'}}><Link className={view==='all'?'btn':'ghost'} href={l('/prayer')}>{t('All','Todo')}</Link><Link className={view==='prayer'?'btn':'ghost'} href={l('/prayer?view=prayer')}>{t('Prayer Requests','Peticiones')}</Link><Link className={view==='testimony'?'btn':'ghost'} href={l('/prayer?view=testimony')}>{t('Testimonies','Testimonios')}</Link></div>

    <section className="prayer-list">{rows.map((p:any)=>{const author=personName(pm.get(p.author_id),t('Church member','Miembro de la iglesia'));const isPrayer=p.post_type==='prayer_request';const answered=Boolean(p.answered_at);const own=p.author_id===userId;const count=prayingCounts.get(p.id)??0;return <article className="card prayer-card" key={p.id}><div className="prayer-head"><div className="prayer-person"><div className="avatar">{author.slice(0,1).toUpperCase()}</div><div><strong>{author}</strong><span>{new Date(p.created_at).toLocaleDateString(es?'es-US':'en-US')}</span></div></div><div className="prayer-tags"><span className="prayer-tag">{isPrayer?t('Prayer Request','Petición de Oración'):t('Testimony','Testimonio')}</span>{answered&&<span className="prayer-tag answered"><CheckCircle2 size={9}/> {t('Answered','Contestada')}</span>}</div></div><p>{p.body}</p><div className="prayer-actions">{isPrayer&&<form action={togglePraying}><input type="hidden" name="post_id" value={p.id}/><input type="hidden" name="lang" value={es?'es':'en'}/><button className={mine.has(p.id)?'btn':'ghost'}><HandHeart size={13}/> {mine.has(p.id)?t('Praying','Orando'):t('I’m Praying','Estoy Orando')}{count?` • ${count}`:''}</button></form>}{isPrayer&&own&&<form action={setPrayerAnswered}><input type="hidden" name="post_id" value={p.id}/><input type="hidden" name="lang" value={es?'es':'en'}/><button className="ghost" name="answered" value={answered?'0':'1'}>{answered?t('Still needs prayer','Todavía necesita oración'):t('Mark answered','Marcar contestada')}</button></form>}{!isPrayer&&<span className="small muted"><Sparkles size={11}/> {t('Shared testimony','Testimonio compartido')}</span>}</div></article>})}{!rows.length&&<div className="card prayer-empty"><HandHeart size={24}/><h3>{t('Nothing shared here yet.','Todavía no hay nada compartido aquí.')}</h3><p className="muted">{t('Be the first to share a prayer request or testimony.','Sé el primero en compartir una petición de oración o un testimonio.')}</p></div>}</section>
  </main>
}