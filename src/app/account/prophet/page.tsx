import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BellRing,BookOpen,Clock3,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveProphetPreferences } from './actions'

export default async function ProphetPreferencesPage({searchParams}:{searchParams:Promise<{lang?:string;saved?:string;error?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:pref}=await supabase.from('prophet_nudge_preferences').select('*').eq('user_id',userId).maybeSingle()
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const frequency=pref?.frequency??'once_daily'
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'El Profeta':'The Prophet'} • {es?'Preferencias':'Preferences'}</div></div><div className="row"><Link className="ghost" href="/account/prophet?lang=en">English</Link><Link className="ghost" href="/account/prophet?lang=es">Español</Link><Link className="ghost" href={l('/prophet')}>{es?'← El Profeta':'← The Prophet'}</Link></div></header>
  <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">{es?'MENTORÍA PROACTIVA':'PROACTIVE MENTORING'}</div><h1>{es?'Elige cuánto quieres que El Profeta te recuerde y anime.':'Choose how often you want The Prophet to remind and encourage you.'}</h1><p className="muted">{es?'Las responsabilidades reales vienen primero. Si no hay nada urgente, El Profeta puede darte una breve Escritura o palabra de ánimo.':'Real responsibilities come first. If nothing urgent is waiting, The Prophet can give you a short Scripture or encouragement.'}</p></section>
  {params.saved&&<div className="notice success">{es?'Preferencias guardadas.':'Preferences saved.'}</div>}{params.error&&<div className="notice error">{params.error}</div>}
  <form action={saveProphetPreferences} className="card" style={{padding:20,display:'grid',gap:18}}><input type="hidden" name="lang" value={lang}/><div><div className="pill"><BellRing size={11}/> {es?'FRECUENCIA':'FREQUENCY'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:12}}>{[
    ['off',es?'Apagado':'Off',es?'Sin recordatorios proactivos.':'No proactive nudges.'],
    ['once_daily',es?'Una vez al día':'Once daily',es?'Un chequeo por la mañana.':'One morning check-in.'],
    ['twice_daily',es?'Dos veces al día':'Twice daily',es?'Mañana y tarde.':'Morning and evening.']
  ].map(([value,title,body])=><label className="card" style={{padding:14,cursor:'pointer'}} key={value}><div className="row" style={{gap:8,alignItems:'flex-start'}}><input type="radio" name="frequency" value={value} defaultChecked={frequency===value}/><div><strong>{title}</strong><div className="small muted">{body}</div></div></div></label>)}</div></div>
  <div className="card" style={{padding:16,background:'rgba(255,255,255,.025)'}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><Clock3 size={18}/><div><strong>{es?'Horario del piloto':'Pilot timing'}</strong><div className="small muted">{es?`Mañana aproximadamente a las 8:00 y, si eliges dos veces al día, tarde aproximadamente a las 7:00 (${String(church?.timezone||'UTC').replaceAll('_',' ')}).`:`Morning around 8:00 AM and, for twice-daily, evening around 7:00 PM (${String(church?.timezone||'UTC').replaceAll('_',' ')}).`}</div></div></div></div>
  <label className="row" style={{gap:10,alignItems:'flex-start'}}><input type="checkbox" name="responsibility_reminders" defaultChecked={pref?.responsibility_reminders!==false}/><div><strong>{es?'Recordarme responsabilidades reales':'Remind me about real responsibilities'}</strong><div className="small muted">{es?'Seguimiento, asignaciones, reportes de grupo y aprendizaje pendiente.':'Follow-up, assignments, group reports and unfinished learning.'}</div></div></label>
  <label className="row" style={{gap:10,alignItems:'flex-start'}}><input type="checkbox" name="scripture_encouragement" defaultChecked={pref?.scripture_encouragement!==false}/><div><strong>{es?'Escritura y ánimo':'Scripture & encouragement'}</strong><div className="small muted">{es?'Cuando no haya algo urgente, recibir una breve referencia bíblica o recordatorio espiritual.':'When nothing urgent is waiting, receive a brief Scripture reference or spiritual encouragement.'}</div></div></label>
  <div className="notice"><BookOpen size={15}/><span>{es?'El Profeta no afirma recibir revelación de Dios. Sus recordatorios espirituales deben permanecer sujetos a la Escritura y a los recursos aprobados por la iglesia.':'The Prophet does not claim revelation from God. Spiritual reminders remain subject to Scripture and approved church resources.'}</span></div>
  <button className="btn" type="submit"><Sparkles size={14}/> {es?'Guardar preferencias':'Save preferences'}</button></form></main>
}