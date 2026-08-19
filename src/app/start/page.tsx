import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,CheckCircle2,Church,HandHeart,Languages,Sparkles,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { completeOnboarding } from './actions'
import './start.css'

const copy={
  en:{title:'Welcome to Kingdom Network',subtitle:'You do not need to learn the whole app today. Do these two things first, then explore only if you want to.',church:'Your church',member:'Your account is connected',first:'DO THIS FIRST',second:'THEN DO THIS',optional:'OPTIONAL — ONLY IF YOU NEED IT',profile:'Check my profile',profileBody:'Make sure your name and basic information look right.',journey:'See my next step',journeyBody:'See what your church has recorded and the next step Kingdom Network recommends for you.',calendar:'See what is happening',calendarBody:'Open upcoming church events, classes and services.',guide:'Ask Kingdom Guide',guideBody:'Use the Guide if you are not sure where something is.',care:'I need prayer or help',careBody:'Send a private prayer or pastoral-care request.',note:'That is enough for today. You can always come back to Start Here later.',finish:'I’m ready — go to Home',spanish:'Español',english:'English',ready:'Your account is ready.',error:'Something needs attention',start:'Start Here',adminPill:'SETTING UP THE CHURCH?',adminTitle:'Continue Church Builder',adminBody:'If you are preparing this church for the pilot, Church Builder will tell you the next setup item instead of making you search through admin screens.',adminButton:'Open Church Builder'},
  es:{title:'Bienvenido a Kingdom Network',subtitle:'No necesitas aprender toda la aplicación hoy. Haz estas dos cosas primero y explora solamente si quieres.',church:'Tu iglesia',member:'Tu cuenta está conectada',first:'HAZ ESTO PRIMERO',second:'DESPUÉS HAZ ESTO',optional:'OPCIONAL — SOLO SI LO NECESITAS',profile:'Revisar mi perfil',profileBody:'Confirma que tu nombre y tu información básica estén correctos.',journey:'Ver mi próximo paso',journeyBody:'Mira lo que tu iglesia ha registrado y el siguiente paso que Kingdom Network recomienda para ti.',calendar:'Ver lo que está pasando',calendarBody:'Abre los próximos eventos, clases y servicios.',guide:'Preguntar a Kingdom Guide',guideBody:'Usa la Guía si no sabes dónde encontrar algo.',care:'Necesito oración o ayuda',careBody:'Envía una solicitud privada de oración o cuidado pastoral.',note:'Eso es suficiente por hoy. Siempre puedes volver a Empieza Aquí después.',finish:'Estoy listo — ir a Inicio',spanish:'Español',english:'English',ready:'Tu cuenta está lista.',error:'Algo necesita atención',start:'Empieza Aquí',adminPill:'¿ESTÁS CONFIGURANDO LA IGLESIA?',adminTitle:'Continuar Church Builder',adminBody:'Si estás preparando esta iglesia para el piloto, Church Builder te dirá qué configurar después sin tener que buscar entre todas las pantallas administrativas.',adminButton:'Abrir Church Builder'}
} as const

export default async function StartPage({searchParams}:{searchParams:Promise<{lang?:string;error?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const suffix=lang==='es'?'?lang=es':''
  const withLang=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login${suffix}`)
  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle(),
    supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  ])
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||(lang==='es'?'Miembro':'Member')
  const isAdmin=['pastor','church_admin'].includes(String(membership.role))

  return <main className="shell start-shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.start}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/start?lang=en">{t.english}</Link><Link className="ghost" href="/start?lang=es">{t.spanish}</Link></div></header>
    <section className="card start-hero"><div><div className="pill">START HERE • EMPIEZA AQUÍ</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="start-ready"><CheckCircle2 size={28}/><strong>{t.ready}</strong></div></section>
    {params.error&&<div className="notice error"><strong>{t.error}:</strong> {params.error}</div>}
    <section className="card start-account"><div><div className="pill">{t.member.toUpperCase()}</div><h2>{name}</h2><p className="muted">{church?.name??t.church} • {String(membership.role||'member').replaceAll('_',' ')}</p></div><CheckCircle2 size={34}/></section>

    {isAdmin&&<section className="card" style={{padding:20,marginBottom:18,display:'flex',justifyContent:'space-between',gap:18,alignItems:'center',flexWrap:'wrap'}}><div style={{display:'flex',gap:12,alignItems:'flex-start',maxWidth:760}}><div className="start-icon"><Church size={20}/></div><div><div className="pill">{t.adminPill}</div><h2 style={{margin:'7px 0 5px'}}>{t.adminTitle}</h2><p className="muted" style={{margin:0}}>{t.adminBody}</p></div></div><Link className="btn" href={withLang('/church/launch')}>{t.adminButton}</Link></section>}

    <section style={{display:'grid',gap:14}}>
      <Link className="card start-step" href={withLang('/profile')} style={{padding:20}}><div className="start-icon"><UserRound size={20}/></div><div><div className="pill">{t.first}</div><strong style={{fontSize:'1.08rem'}}>{t.profile}</strong><span>{t.profileBody}</span></div></Link>
      <Link className="card start-step" href={withLang('/journey')} style={{padding:20}}><div className="start-icon"><Sparkles size={20}/></div><div><div className="pill">{t.second}</div><strong style={{fontSize:'1.08rem'}}>{t.journey}</strong><span>{t.journeyBody}</span></div></Link>
    </section>

    <section style={{marginTop:22}}><div className="section-heading"><div><div className="pill">{t.optional}</div></div></div><div className="start-grid">
      <Link className="card start-step" href={withLang('/calendar')}><div className="start-icon"><CalendarDays size={19}/></div><div><strong>{t.calendar}</strong><span>{t.calendarBody}</span></div></Link>
      <Link className="card start-step" href={withLang('/guide')}><div className="start-icon"><BookOpen size={19}/></div><div><strong>{t.guide}</strong><span>{t.guideBody}</span></div></Link>
      <Link className="card start-step" href={withLang('/help')}><div className="start-icon"><HandHeart size={19}/></div><div><strong>{t.care}</strong><span>{t.careBody}</span></div></Link>
    </div></section>

    <section className="card start-note"><p>{t.note}</p><form action={completeOnboarding}><input type="hidden" name="lang" value={lang}/><button className="btn" type="submit">{t.finish}</button></form></section>
  </main>
}
