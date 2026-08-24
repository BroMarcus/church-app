import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CheckCircle2,Church,HandHeart,Home,Languages,MessageSquareWarning,Sparkles,UserRound,UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { completeOnboarding } from './actions'
import { StartSubmitButton } from './start-submit-button'
import './start.css'

const copy={
 en:{title:'Welcome to Kingdom Network',subtitle:'Your account is connected. You do not need to learn the whole app today.',church:'Your church',member:'Your account is connected',walk:'OPTIONAL: SET UP MORE',tour:'LEARN THE APP LATER',tourBody:'These are the main member-safe places. You can come back to Start Here anytime, so there is no need to memorize them now.',profile:'Check your profile',profileBody:'Confirm your name and add anything else you want your church to have on file.',journey:'Open My Journey',journeyBody:'See your discipleship progress, milestones and next steps.',groups:'Find my Friendship Group',groupsBody:'See your group, meeting information, lesson, prayer wall and check-in.',home:'Home',homeBody:'Your simple starting point for what matters now.',learning:'Learning Center',learningBody:'Continue church classes and see your progress.',guide:'Kingdom Guide',guideBody:'Ask normal questions like “Where do I go?” or “What should I do next?”',prayer:'Prayer & Testimony',prayerBody:'Share a prayer request or testimony with the privacy level you choose.',updates:'Official Updates',updatesBody:'Read important church announcements.',alerts:'Alerts',alertsBody:'See reminders that need your attention.',feedback:'Share an idea',feedbackBody:'Tell us what is confusing, broken, useful or missing during the pilot.',care:'Private Care',careBody:'Ask for sensitive pastoral help in a restricted area.',quickTitle:'That is all you need for now.',quickBody:'Tap the button below and use Home as your starting point. If you get lost later, open Kingdom Guide or come back to Start Here.',finish:'Take me Home',saving:'Saving — keep this page open…',spanish:'Español',english:'English',ready:'Your account is ready.',error:'Something needs attention',start:'Start Here',adminPill:'SETTING UP THE CHURCH?',adminTitle:'Continue Church Builder',adminBody:'Church Builder walks authorized leaders through the pilot essentials one clear step at a time.',adminButton:'Open Church Builder',connectionTitle:'We could not safely load Start Here.',connectionBody:'Nothing was changed. This is usually temporary. Try again; if it continues, return to Sign in.',retry:'Try Start Here again',signIn:'Go to Sign in',helpTitle:'NEED HELP?',optionalHint:'Only open these if you want to do more right now.'},
 es:{title:'Bienvenido a Kingdom Network',subtitle:'Tu cuenta está conectada. No necesitas aprender toda la aplicación hoy.',church:'Tu iglesia',member:'Tu cuenta está conectada',walk:'OPCIONAL: CONFIGURAR MÁS',tour:'APRENDE LA APLICACIÓN DESPUÉS',tourBody:'Estos son los lugares principales y seguros para miembros. Puedes volver a Empieza Aquí cuando quieras, así que no necesitas memorizarlos ahora.',profile:'Revisa tu perfil',profileBody:'Confirma tu nombre y agrega cualquier otra información que quieras que tenga tu iglesia.',journey:'Abre Mi Camino',journeyBody:'Mira tu progreso de discipulado, hitos y próximos pasos.',groups:'Encuentra mi Grupo de Amistad',groupsBody:'Mira tu grupo, reunión, lección, muro de oración y registro de asistencia.',home:'Inicio',homeBody:'Tu punto de partida sencillo para lo que importa ahora.',learning:'Centro de Aprendizaje',learningBody:'Continúa tus clases de iglesia y mira tu progreso.',guide:'Kingdom Guide',guideBody:'Haz preguntas normales como “¿A dónde voy?” o “¿Qué debo hacer ahora?”',prayer:'Oración y Testimonio',prayerBody:'Comparte una petición o testimonio con el nivel de privacidad que tú elijas.',updates:'Actualizaciones Oficiales',updatesBody:'Lee anuncios importantes de la iglesia.',alerts:'Alertas',alertsBody:'Mira recordatorios que necesitan tu atención.',feedback:'Comparte una idea',feedbackBody:'Dinos qué es confuso, qué no funciona, qué ayuda o qué falta durante el piloto.',care:'Cuidado Privado',careBody:'Pide ayuda pastoral sensible en un área restringida.',quickTitle:'Eso es todo lo que necesitas por ahora.',quickBody:'Toca el botón abajo y usa Inicio como tu punto de partida. Si después te pierdes, abre Kingdom Guide o vuelve a Empieza Aquí.',finish:'Ir a Inicio',saving:'Guardando — mantén esta página abierta…',spanish:'Español',english:'English',ready:'Tu cuenta está lista.',error:'Algo necesita atención',start:'Empieza Aquí',adminPill:'¿ESTÁS CONFIGURANDO LA IGLESIA?',adminTitle:'Continuar Church Builder',adminBody:'Church Builder guía a los líderes autorizados por los elementos esenciales del piloto, un paso claro a la vez.',adminButton:'Abrir Church Builder',connectionTitle:'No pudimos cargar Empieza Aquí de forma segura.',connectionBody:'No se cambió nada. Normalmente esto es temporal. Inténtalo otra vez; si continúa, vuelve a Iniciar sesión.',retry:'Intentar Empieza Aquí otra vez',signIn:'Ir a Iniciar sesión',helpTitle:'¿NECESITAS AYUDA?',optionalHint:'Abre estas opciones solamente si quieres hacer más ahora.'}
} as const

const statusCopy={
 en:{onboarding_save_failed:'We could not save that step. Nothing was removed or changed. Please try again.',connection_unavailable:'We could not safely verify your account right now. Nothing was changed. Please try again.'},
 es:{onboarding_save_failed:'No pudimos guardar ese paso. No se borró ni cambió nada. Inténtalo otra vez.',connection_unavailable:'No pudimos verificar tu cuenta de forma segura en este momento. No se cambió nada. Inténtalo otra vez.'}
} as const
const messageCopy={
 en:{joined_existing:'You are connected to this church with your existing Kingdom Network account. Keep using this same account—do not create another one.',already_joined:'You are already connected to this church. Keep using this same Kingdom Network account—no second account is needed.',joined_invite:'Your email is confirmed and this church invitation is connected to your Kingdom Network account. Keep using this same account—no second account is needed.'},
 es:{joined_existing:'Ya estás conectado a esta iglesia con tu cuenta existente de Kingdom Network. Sigue usando esta misma cuenta—no crees otra.',already_joined:'Ya estabas conectado a esta iglesia. Sigue usando esta misma cuenta de Kingdom Network—no necesitas una segunda cuenta.',joined_invite:'Tu correo está confirmado y esta invitación de la iglesia está conectada a tu cuenta de Kingdom Network. Sigue usando esta misma cuenta—no necesitas una segunda cuenta.'}
} as const
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
 if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
 if(error instanceof Error)return boundedCode(error.name)
 return boundedCode(fallback)
}
const roleLabel=(role:unknown,lang:'en'|'es')=>{
 const value=String(role||'member')
 const labels:Record<'en'|'es',Record<string,string>>={
  en:{member:'Member',pastor:'Pastor',church_admin:'Church Admin',leader:'Leader',group_leader:'Friendship Group Leader',assistant_leader:'Assistant Leader',ministry_leader:'Ministry Leader',minister:'Minister',finance_admin:'Finance Admin',platform_admin:'Platform Admin'},
  es:{member:'Miembro',pastor:'Pastor',church_admin:'Administrador de iglesia',leader:'Líder',group_leader:'Líder de Grupo de Amistad',assistant_leader:'Líder asistente',ministry_leader:'Líder de ministerio',minister:'Ministro',finance_admin:'Administrador de finanzas',platform_admin:'Administrador de plataforma'}
 }
 return labels[lang][value]||value.replaceAll('_',' ')
}
function startRecovery(lang:'en'|'es',code:string){
 const t=copy[lang]
 console.error('Start Here unavailable',{code:boundedCode(code)})
 return <main className="shell start-shell"><section className="card start-how" style={{marginTop:24}}><div className="pill">{t.start.toUpperCase()}</div><h1>{t.connectionTitle}</h1><p className="muted">{t.connectionBody}</p><div className="row"><Link className="btn" href={`/start?lang=${lang}`}>{t.retry}</Link><Link className="ghost" href={`/login?lang=${lang}&mode=signin`}>{t.signIn}</Link></div></section></main>
}

export default async function StartPage({searchParams}:{searchParams:Promise<{lang?:string;error_code?:string;message_code?:string}>}){
 const params=await searchParams
 const requestedLang:'en'|'es'=params.lang==='es'?'es':'en'
 let supabase
 try{supabase=await createClient()}
 catch(error){return startRecovery(requestedLang,`client_${diagnosticCode(error,'client_unavailable')}`)}

 let authResult
 try{authResult=await supabase.auth.getUser()}
 catch(error){return startRecovery(requestedLang,`auth_${diagnosticCode(error,'auth_unavailable')}`)}
 const {data:{user},error:authError}=authResult
 const preferred=user?.user_metadata?.preferred_language==='es'?'es':'en'
 const lang:'en'|'es'=params.lang==='es'?'es':params.lang==='en'?'en':preferred,t=copy[lang]
 const withLang=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
 if(authError)return startRecovery(lang,`auth_${boundedCode(authError.code)}`)
 const userId=user?.id
 if(!userId)redirect(`/login?lang=${lang}&mode=signin`)

 let profileResult,membershipResult
 try{
  ;[profileResult,membershipResult]=await Promise.all([
   supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle(),
   supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  ])
 }catch(error){return startRecovery(lang,`reads_${diagnosticCode(error,'reads_unavailable')}`)}
 if(profileResult.error||membershipResult.error)return startRecovery(lang,`reads_${profileResult.error?boundedCode(profileResult.error.code):'ok'}_${membershipResult.error?boundedCode(membershipResult.error.code):'ok'}`)
 const profile=profileResult.data,membership=membershipResult.data
 if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
 const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
 const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||(lang==='es'?'Miembro':'Member'),isAdmin=['pastor','church_admin'].includes(String(membership.role))
 const statusError=(statusCopy[lang] as Record<string,string>)[params.error_code??'']||''
 const statusMessage=(messageCopy[lang] as Record<string,string>)[params.message_code??'']||''
 const optional=[[UserRound,t.profile,t.profileBody,'/profile'],[Sparkles,t.journey,t.journeyBody,'/journey'],[UsersRound,t.groups,t.groupsBody,'/groups']] as const
 const tour=[[Home,t.home,t.homeBody,'/'],[BookOpen,t.learning,t.learningBody,'/learning'],[UsersRound,t.groups,t.groupsBody,'/groups'],[Sparkles,t.guide,t.guideBody,'/guide'],[HandHeart,t.prayer,t.prayerBody,'/prayer']] as const
 return <main className="shell start-shell"><header className="topbar"><div><Link href={lang==='es'?'/?lang=es':'/'} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.start}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/start?lang=en">{t.english}</Link><Link className="ghost" href="/start?lang=es">{t.spanish}</Link></div></header>
 <section className="card start-hero"><div><div className="pill">{t.start.toUpperCase()}</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="start-ready"><CheckCircle2 size={28}/><strong>{t.ready}</strong></div></section>{statusError&&<div className="notice error" role="alert"><strong>{t.error}:</strong> {statusError}</div>}{statusMessage&&<div className="notice success" role="status" aria-live="polite">{statusMessage}</div>}
 <section className="card start-account"><div><div className="pill">{t.member.toUpperCase()}</div><h2>{name}</h2><p className="muted">{church?.name??t.church} • {roleLabel(membership.role,lang)}</p></div><CheckCircle2 size={34}/></section>
 <section className="card start-note"><h2>{t.quickTitle}</h2><p>{t.quickBody}</p><form action={completeOnboarding}><input type="hidden" name="lang" value={lang}/><StartSubmitButton label={t.finish} pendingLabel={t.saving}/></form></section>
 {isAdmin&&<section className="card start-admin"><div className="start-admin-copy"><div className="start-icon"><Church size={20}/></div><div><div className="pill">{t.adminPill}</div><h2>{t.adminTitle}</h2><p className="muted">{t.adminBody}</p></div></div><Link className="btn" href={withLang('/church/launch')}>{t.adminButton}</Link></section>}
 <details className="card start-how"><summary style={{cursor:'pointer',fontWeight:800}}>{t.walk}</summary><p className="muted start-tour-intro">{t.optionalHint}</p><div className="start-first">{optional.map(([Icon,title,body,path])=><Link key={path} className="card start-step start-primary-step" href={withLang(path)}><div className="start-icon"><Icon size={20}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></details>
 <details className="card start-how"><summary style={{cursor:'pointer',fontWeight:800}}>{t.tour}</summary><p className="muted start-tour-intro">{t.tourBody}</p><div className="start-tour-grid">{tour.map(([Icon,title,body,path])=><Link key={path} className="card start-step start-tour-card" href={withLang(path)}><div className="start-icon"><Icon size={18}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></details>
 <section style={{marginTop:24}}><div className="pill start-section-label">{t.helpTitle}</div><div className="start-grid"><Link className="card start-step" href={withLang('/guide')}><div className="start-icon"><Sparkles size={19}/></div><div><strong>{t.guide}</strong><span>{t.guideBody}</span></div></Link><Link className="card start-step" href={withLang('/help')}><div className="start-icon"><HandHeart size={19}/></div><div><strong>{t.care}</strong><span>{t.careBody}</span></div></Link><Link className="card start-step" href={withLang('/feedback')}><div className="start-icon"><MessageSquareWarning size={19}/></div><div><strong>{t.feedback}</strong><span>{t.feedbackBody}</span></div></Link></div></section>
 </main>
}