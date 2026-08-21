import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bug,Languages,Lightbulb,MessageSquareWarning,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { submitPilotFeedback } from './actions'

const copy={
  en:{title:'Help us improve Kingdom Network',body:'If anything felt confusing, broken, slow or hard to find, tell us here. Short feedback is okay.',sent:'Thank you. Your feedback was saved.',type:'What kind of feedback is this?',general:'General feedback',confusing:'Something was confusing',bug:'Something did not work',idea:'I have an idea',message:'What happened?',placeholder:'Tell us what you were trying to do and what happened…',page:'Where were you?',pageHelp:'Optional. Example: Login, Start Here, Learning, Groups.',send:'Send feedback',home:'← Home',english:'English',spanish:'Español',note:'You do not need to write it perfectly. Plain language is best.',messageShort:'Tell us a little more so we can act on it.',saveFailed:'We could not save your feedback. Nothing was changed. Please try again.'},
  es:{title:'Ayúdanos a mejorar Kingdom Network',body:'Si algo fue confuso, no funcionó, estuvo lento o fue difícil de encontrar, cuéntanos aquí. Un comentario corto está bien.',sent:'Gracias. Guardamos tus comentarios.',type:'¿Qué tipo de comentario es?',general:'Comentario general',confusing:'Algo fue confuso',bug:'Algo no funcionó',idea:'Tengo una idea',message:'¿Qué pasó?',placeholder:'Cuéntanos qué intentabas hacer y qué pasó…',page:'¿Dónde estabas?',pageHelp:'Opcional. Ejemplo: Inicio de sesión, Empieza Aquí, Aprendizaje, Grupos.',send:'Enviar comentario',home:'← Inicio',english:'English',spanish:'Español',note:'No necesitas escribirlo perfectamente. Es mejor usar palabras sencillas.',messageShort:'Cuéntanos un poco más para poder ayudarte.',saveFailed:'No pudimos guardar tus comentarios. No se cambió nada. Inténtalo otra vez.'}
} as const

export default async function FeedbackPage({searchParams}:{searchParams:Promise<{lang?:string;sent?:string;error_code?:string}>}){
  const q=await searchParams
  const lang=q.lang==='es'?'es':'en';const t=copy[lang]
  const errorMessage=q.error_code==='message_short'?t.messageShort:q.error_code==='save_failed'?t.saveFailed:null
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  return <main className="shell"><header className="topbar"><div><Link href={lang==='es'?'/?lang=es':'/'} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name||'Church'} • Pilot Feedback</div></div><div className="row"><Languages size={14}/><Link className="ghost" href="/feedback?lang=en">{t.english}</Link><Link className="ghost" href="/feedback?lang=es">{t.spanish}</Link><Link className="ghost" href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link></div></header>
  <section className="hero card"><div><div className="pill"><Sparkles size={12}/> PILOT FEEDBACK</div><h1>{t.title}</h1><p>{t.body}</p></div></section>
  {q.sent&&<div className="notice success" role="status" aria-live="polite">{t.sent}</div>}{errorMessage&&<div className="notice error" role="alert">{errorMessage}</div>}
  <section className="card" style={{padding:20,maxWidth:760,margin:'0 auto'}}><form action={submitPilotFeedback} style={{display:'grid',gap:14}}><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t.type}</span><select name="feedback_type" defaultValue="general"><option value="general">{t.general}</option><option value="confusing">{t.confusing}</option><option value="bug">{t.bug}</option><option value="idea">{t.idea}</option></select></label><label className="field"><span>{t.message}</span><textarea name="message" rows={7} maxLength={4000} required placeholder={t.placeholder}/><small className="muted">{t.note}</small></label><label className="field"><span>{t.page}</span><input name="page_path" maxLength={300} placeholder={t.pageHelp}/></label><button className="btn" type="submit"><MessageSquareWarning size={14}/> {t.send}</button></form><div className="row" style={{marginTop:18,gap:14,flexWrap:'wrap'}}><span className="pill"><Bug size={12}/> {t.bug}</span><span className="pill"><Lightbulb size={12}/> {t.idea}</span></div></section></main>
}
