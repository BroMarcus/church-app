import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bug,CheckCircle2,Languages,Lightbulb,MessageSquareWarning } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updatePilotFeedbackStatus } from './actions'

const labels={
  en:{title:'Pilot Feedback',body:'Review what testers found confusing, broken or worth improving.',new:'New',reviewing:'Reviewing',resolved:'Resolved',markReviewing:'Mark reviewing',resolve:'Resolve',reopen:'Reopen',home:'← Church Admin',english:'English',spanish:'Español',empty:'No feedback in this section.'},
  es:{title:'Comentarios del Piloto',body:'Revisa lo que los usuarios encontraron confuso, roto o que vale la pena mejorar.',new:'Nuevo',reviewing:'En revisión',resolved:'Resuelto',markReviewing:'Marcar en revisión',resolve:'Resolver',reopen:'Reabrir',home:'← Administración',english:'English',spanish:'Español',empty:'No hay comentarios en esta sección.'}
} as const

const typeIcon=(type:string)=>type==='bug'?Bug:type==='idea'?Lightbulb:MessageSquareWarning

export default async function ChurchFeedbackPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const q=await searchParams;const lang=q.lang==='es'?'es':'en';const t=labels[lang]
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:m}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!m?.church_id||!['pastor','church_admin'].includes(m.role))redirect('/')
  const {data:rows}=await supabase.from('pilot_feedback').select('*').eq('church_id',m.church_id).order('created_at',{ascending:false})
  const church:any=Array.isArray(m.churches)?m.churches[0]:m.churches
  const sections=['new','reviewing','resolved'] as const
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name||'Church'} • {t.title}</div></div><div className="row"><Languages size={14}/><Link className="ghost" href="/church/feedback?lang=en">{t.english}</Link><Link className="ghost" href="/church/feedback?lang=es">{t.spanish}</Link><Link className="ghost" href="/church">{t.home}</Link></div></header>
  <section className="hero card"><div><div className="pill"><MessageSquareWarning size={12}/> PILOT FEEDBACK</div><h1>{t.title}</h1><p>{t.body}</p></div><div className="hero-stat"><strong>{rows?.length||0}</strong><span>total</span></div></section>
  <section className="stat-grid"><div className="card stat-card"><MessageSquareWarning/><div><strong>{(rows??[]).filter((r:any)=>r.status==='new').length}</strong><span>{t.new}</span></div></div><div className="card stat-card"><Bug/><div><strong>{(rows??[]).filter((r:any)=>r.status==='reviewing').length}</strong><span>{t.reviewing}</span></div></div><div className="card stat-card"><CheckCircle2/><div><strong>{(rows??[]).filter((r:any)=>r.status==='resolved').length}</strong><span>{t.resolved}</span></div></div></section>
  <div style={{display:'grid',gap:18}}>{sections.map(status=>{const items=(rows??[]).filter((r:any)=>r.status===status);return <section className="card" style={{padding:20}} key={status}><div className="pill">{status==='new'?t.new:status==='reviewing'?t.reviewing:t.resolved}</div><div style={{display:'grid',gap:10,marginTop:12}}>{items.map((r:any)=>{const Icon=typeIcon(r.feedback_type);return <article className="card" style={{padding:14}} key={r.id}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><div className="pill"><Icon size={11}/> {String(r.feedback_type).replaceAll('_',' ')}</div><p style={{whiteSpace:'pre-wrap'}}>{r.message}</p>{r.page_path&&<div className="small muted">Page: {r.page_path}</div>}<div className="small muted">{new Date(r.created_at).toLocaleString(lang==='es'?'es-US':'en-US')}</div></div><form action={updatePilotFeedbackStatus}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="status" value={status==='new'?'reviewing':status==='reviewing'?'resolved':'new'}/><button className="ghost">{status==='new'?t.markReviewing:status==='reviewing'?t.resolve:t.reopen}</button></form></div></article>})}{!items.length&&<p className="muted">{t.empty}</p>}</div></section>})}</div></main>
}
