import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,CheckCircle2,CircleDashed,Info,Languages,ShieldAlert,ShieldCheck,Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './readiness.css'

const Icon=({status}:{status:string})=>status==='ready'?<CheckCircle2 size={16}/>:status==='error'?<ShieldAlert size={16}/>:status==='warning'||status==='action'?<AlertTriangle size={16}/>:status==='optional'?<CircleDashed size={16}/>:<Info size={16}/>

const copy={
  en:{church:'Your Church',title:'Pilot Readiness',admin:'← Church Admin',home:'Home',pill:'PILOT READINESS',hero:'What needs attention before we invite a test group?',heroBody:'Live church/database checks plus a few platform settings that still need a human review.',score:'app checks ready',load:'Unable to load one or more readiness checks:',open:'Open related area →',platform:'PLATFORM CHECKS',platformTitle:'Final settings around the live application.',notIncluded:'Not included in the app-check score.',required:'REQUIRED FOR PILOT',authTitle:'Supabase Auth production URL',authBody:'Keep the Auth Site URL and allowed redirect URLs pointed at the current Kingdom Network production address. A purchased custom domain is not required during the pilot.',security:'SECURITY',passwordTitle:'Leaked-password protection',passwordBody:'Enable Supabase Auth leaked-password protection before a broader pilot if the current plan supports it. This is a security hardening step, not a blocker for a tiny controlled test group.',verified:'VERIFIED',deployTitle:'Production deployment',deployBody:'The main branch is deploying successfully to the stable Kingdom Network production aliases on the current Next.js stack.',plan:'PILOT PLAN',smallTitle:'Start small',smallBody:'Invite leadership plus a few trusted members first. Test onboarding, learning, groups, calendar, serving, notifications, privacy and mobile use before inviting the whole church.',count:'CURRENT ACTION COUNT',needs:'app check',attention:'currently need attention.',footer:'This page is an operational checklist tied to live church data—not a marketing score.',english:'English',spanish:'Español'},
  es:{church:'Tu Iglesia',title:'Preparación del Piloto',admin:'← Administración',home:'Inicio',pill:'PREPARACIÓN DEL PILOTO',hero:'¿Qué necesita atención antes de invitar al grupo de prueba?',heroBody:'Revisiones en vivo de la iglesia/base de datos más algunos ajustes de plataforma que todavía necesitan revisión humana.',score:'revisiones listas',load:'No se pudieron cargar una o más revisiones:',open:'Abrir área relacionada →',platform:'REVISIONES DE PLATAFORMA',platformTitle:'Ajustes finales alrededor de la aplicación en vivo.',notIncluded:'No se incluyen en la puntuación de la aplicación.',required:'REQUERIDO PARA EL PILOTO',authTitle:'URL de producción de Supabase Auth',authBody:'Mantén la URL principal de Auth y las URLs de redirección permitidas apuntando a la dirección actual de producción de Kingdom Network. No necesitas comprar un dominio personalizado durante el piloto.',security:'SEGURIDAD',passwordTitle:'Protección contra contraseñas filtradas',passwordBody:'Activa la protección de contraseñas filtradas de Supabase Auth antes de un piloto más amplio si el plan actual lo permite. Es una mejora de seguridad, no un bloqueo para un grupo pequeño y controlado.',verified:'VERIFICADO',deployTitle:'Despliegue de producción',deployBody:'La rama principal se está desplegando correctamente a las direcciones estables de producción de Kingdom Network en la versión actual de Next.js.',plan:'PLAN DEL PILOTO',smallTitle:'Empieza con pocos',smallBody:'Invita primero al liderazgo y a unos pocos miembros de confianza. Prueba incorporación, aprendizaje, grupos, calendario, servicio, notificaciones, privacidad y uso móvil antes de invitar a toda la iglesia.',count:'CUENTA DE ACCIONES',needs:'revisión de la aplicación',attention:'necesitan atención ahora.',footer:'Esta página es una lista operativa ligada a datos reales de la iglesia, no una puntuación de mercadeo.',english:'English',spanish:'Español'}
} as const

export default async function ReadinessPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login${lang==='es'?'?lang=es':''}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:checks,error}=await supabase.rpc('church_pilot_readiness',{p_church_id:membership.church_id})
  const rows=checks??[]
  const scored=rows.filter((r:any)=>!['optional','info'].includes(r.check_status))
  const ready=scored.filter((r:any)=>r.check_status==='ready').length
  const score=scored.length?Math.round(ready/scored.length*100):0
  const blockers=rows.filter((r:any)=>['error','warning','action'].includes(r.check_status)).length
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.title}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/church/readiness?lang=en">{t.english}</Link><Link className="ghost" href="/church/readiness?lang=es">{t.spanish}</Link><Link className="ghost" href="/church">{t.admin}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="readiness-hero card"><div><div className="pill">{t.pill}</div><h1>{t.hero}</h1><p className="muted">{t.heroBody}</p></div><div className="readiness-score"><div><strong>{score}%</strong><span>{t.score}</span></div></div></section>
    {error&&<div className="notice error">{t.load} {error.message}</div>}

    <section className="readiness-grid">{rows.map((r:any)=><article className={`card check-card ${r.check_status}`} key={r.check_key}><div className="check-icon"><Icon status={r.check_status}/></div><div className="check-copy"><div className="pill">{String(r.check_status).toUpperCase()}</div><strong>{r.check_label}</strong><span>{r.detail}</span>{r.action_href&&<Link href={`${r.action_href}${lang==='es'?(r.action_href.includes('?')?'&':'?')+'lang=es':''}`}>{t.open}</Link>}</div></article>)}</section>

    <section className="manual-section"><div className="section-heading"><div><div className="pill">{t.platform}</div><h2>{t.platformTitle}</h2></div><span className="small muted">{t.notIncluded}</span></div><div className="manual-grid"><article className="card manual-card"><div className="pill">{t.required}</div><h3><Wrench size={13}/> {t.authTitle}</h3><p>{t.authBody}</p></article><article className="card manual-card"><div className="pill">{t.security}</div><h3><ShieldCheck size={13}/> {t.passwordTitle}</h3><p>{t.passwordBody}</p></article><article className="card manual-card"><div className="pill">{t.verified}</div><h3><CheckCircle2 size={13}/> {t.deployTitle}</h3><p>{t.deployBody}</p></article><article className="card manual-card"><div className="pill">{t.plan}</div><h3><ShieldCheck size={13}/> {t.smallTitle}</h3><p>{t.smallBody}</p></article></div></section>

    <section className="card readiness-footer"><div className="pill">{t.count}</div><h2 style={{margin:'7px 0 5px'}}>{blockers} {t.needs}{blockers===1?'':'s'} {t.attention}</h2><p className="small muted">{t.footer}</p></section>
  </main>
}
