import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,CheckCircle2,Compass,HandHeart,Languages,Sparkles,UserRound,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { completeOnboarding } from './actions'
import './start.css'

const copy={
  en:{title:'Welcome to Kingdom Network',subtitle:'Start here. You do not need to learn the whole app today.',church:'Your church',member:'Your account is connected',choose:'Choose one simple next step',profile:'Check my profile',profileBody:'Make sure your name and basic information look right.',journey:'See my journey',journeyBody:'See what your church has recorded and what your next growth area is.',groups:'Find a group',groupsBody:'Find a Friendship Group or church community to connect with.',calendar:'See what is happening',calendarBody:'Open upcoming church events, classes and services.',guide:'Ask Kingdom Guide',guideBody:'Use the Guide to find where to go or search trusted church resources.',care:'I need prayer or help',careBody:'Send a private prayer or pastoral-care request.',note:'You only need to choose what helps you today. When you are ready, finish Start Here below. We will remember it, and you can always come back later.',finish:'I’m ready — go to Home',skip:'Go to Home for now',spanish:'Español',english:'English',ready:'Your account is ready.',error:'Something needs attention',start:'Start Here'},
  es:{title:'Bienvenido a Kingdom Network',subtitle:'Empieza aquí. No necesitas aprender toda la aplicación hoy.',church:'Tu iglesia',member:'Tu cuenta está conectada',choose:'Elige un siguiente paso sencillo',profile:'Revisar mi perfil',profileBody:'Confirma que tu nombre y tu información básica estén correctos.',journey:'Ver mi camino',journeyBody:'Mira lo que tu iglesia ha registrado y cuál puede ser tu próximo paso de crecimiento.',groups:'Encontrar un grupo',groupsBody:'Encuentra un Grupo de Amistad o una comunidad de la iglesia.',calendar:'Ver lo que está pasando',calendarBody:'Abre los próximos eventos, clases y servicios de la iglesia.',guide:'Preguntar a Kingdom Guide',guideBody:'Usa la Guía para encontrar dónde ir o buscar recursos confiables de la iglesia.',care:'Necesito oración o ayuda',careBody:'Envía una solicitud privada de oración o cuidado pastoral.',note:'Solo necesitas elegir lo que te ayude hoy. Cuando estés listo, termina Empieza Aquí abajo. Lo recordaremos y siempre podrás volver después.',finish:'Estoy listo — ir a Inicio',skip:'Ir a Inicio por ahora',spanish:'Español',english:'English',ready:'Tu cuenta está lista.',error:'Algo necesita atención',start:'Empieza Aquí'}
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
  const steps=[
    {title:t.profile,body:t.profileBody,href:withLang('/profile'),Icon:UserRound},
    {title:t.journey,body:t.journeyBody,href:withLang('/journey'),Icon:Sparkles},
    {title:t.groups,body:t.groupsBody,href:withLang('/groups'),Icon:Users},
    {title:t.calendar,body:t.calendarBody,href:withLang('/calendar'),Icon:CalendarDays},
    {title:t.guide,body:t.guideBody,href:withLang('/guide'),Icon:BookOpen},
    {title:t.care,body:t.careBody,href:withLang('/help'),Icon:HandHeart}
  ]

  return <main className="shell start-shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.start}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/start?lang=en">{t.english}</Link><Link className="ghost" href="/start?lang=es">{t.spanish}</Link></div></header>
    <section className="card start-hero"><div><div className="pill">START HERE • EMPIEZA AQUÍ</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="start-ready"><CheckCircle2 size={28}/><strong>{t.ready}</strong></div></section>
    {params.error&&<div className="notice error"><strong>{t.error}:</strong> {params.error}</div>}
    <section className="card start-account"><div><div className="pill">{t.member.toUpperCase()}</div><h2>{name}</h2><p className="muted">{church?.name??t.church} • {String(membership.role||'member').replaceAll('_',' ')}</p></div><Compass size={34}/></section>
    <section><div className="section-heading"><div><div className="pill">NEXT STEP • SIGUIENTE PASO</div><h2>{t.choose}</h2></div></div><div className="start-grid">{steps.map(({title,body,href,Icon})=><Link className="card start-step" href={href} key={title}><div className="start-icon"><Icon size={19}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></section>
    <section className="card start-note"><p>{t.note}</p><div className="row"><form action={completeOnboarding}><input type="hidden" name="lang" value={lang}/><button className="btn" type="submit">{t.finish}</button></form><Link className="ghost" href="/">{t.skip}</Link></div></section>
  </main>
}
