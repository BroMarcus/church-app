import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Bell,BookOpen,BriefcaseBusiness,CalendarDays,CheckCircle2,Church,FileText,Globe2,HandHeart,HeartHandshake,Home,Languages,LockKeyhole,MessageCircle,MessageSquareText,MessageSquareWarning,Megaphone,ShieldCheck,Sparkles,UserRound,UsersRound} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {completeOnboarding} from './actions'
import './start.css'

const copy={
 en:{
  title:'Welcome to Kingdom Network',subtitle:'You do not need to learn everything today. Start with these three simple steps.',church:'Your church',member:'Your account is connected',walk:'START WITH THESE 3 THINGS',profile:'1. Check your profile',profileBody:'Make sure your name is right and add a photo if you want.',journey:'2. Open My Journey',journeyBody:'See your discipleship progress, milestones and next steps.',today:'3. Open My Today',todayBody:'See what needs your attention today without searching through the app.',guide:'Ask Kingdom Guide',guideBody:'Not sure where to go? Ask in normal words and Kingdom Guide will point you in the right direction.',more:'Want a little more help?',moreBody:'Open this only when you are ready. You can come back to Start Here anytime.',week:'A simple first week',week1:'Day 1: Profile + My Journey',week2:'Next: Find your Friendship Group',week3:'Then: Start Learning Center',week4:'Anytime: Ask Kingdom Guide',privacy:'Privacy & trust',privacyBody:'Private prayer, pastoral care, contact details and leadership records stay restricted according to your church permissions and the visibility choices you make.',memberView:'For members',memberViewBody:'Learn, connect, pray, serve and follow your own Journey.',leaderView:'For leaders',leaderViewBody:'Authorized leaders receive extra tools. Sensitive actions are checked again on the server and in the database.',tour:'Show me all sections',tourBody:'You do not need these now. This list is here only when you want the full map.',finish:'I’m ready — take me Home',spanish:'Español',english:'English',ready:'Your account is ready.',error:'Something needs attention',start:'Start Here',adminPill:'SETTING UP THE CHURCH?',adminTitle:'Continue Church Builder',adminBody:'Church Builder gives authorized leaders one clear setup step at a time.',adminButton:'Open Church Builder',feedback:'Share an idea',feedbackBody:'Tell us what is confusing, broken, useful or missing during the pilot.'
 },
 es:{
  title:'Bienvenido a Kingdom Network',subtitle:'No necesitas aprender todo hoy. Comienza con estos tres pasos sencillos.',church:'Tu iglesia',member:'Tu cuenta está conectada',walk:'COMIENZA CON ESTAS 3 COSAS',profile:'1. Revisa tu perfil',profileBody:'Asegúrate de que tu nombre esté correcto y agrega una foto si quieres.',journey:'2. Abre Mi Camino',journeyBody:'Mira tu progreso de discipulado, tus hitos y tus próximos pasos.',today:'3. Abre Mi Día',todayBody:'Mira lo que necesita tu atención hoy sin buscar por toda la aplicación.',guide:'Pregunta a Kingdom Guide',guideBody:'¿No sabes a dónde ir? Pregunta con palabras normales y Kingdom Guide te llevará al lugar correcto.',more:'¿Quieres un poco más de ayuda?',moreBody:'Abre esto solo cuando estés listo. Puedes volver a Empieza Aquí en cualquier momento.',week:'Una primera semana sencilla',week1:'Día 1: Perfil + Mi Camino',week2:'Después: Encuentra tu Grupo de Amistad',week3:'Luego: Comienza el Centro de Aprendizaje',week4:'En cualquier momento: Pregunta a Kingdom Guide',privacy:'Privacidad y confianza',privacyBody:'La oración privada, el cuidado pastoral, los datos de contacto y los registros de liderazgo permanecen restringidos según los permisos de tu iglesia y las opciones de visibilidad que tú elijas.',memberView:'Para miembros',memberViewBody:'Aprende, conéctate, ora, sirve y sigue tu propio Camino.',leaderView:'Para líderes',leaderViewBody:'Los líderes autorizados reciben herramientas adicionales. Las acciones sensibles se verifican otra vez en el servidor y la base de datos.',tour:'Ver todas las secciones',tourBody:'No necesitas estas secciones ahora. Esta lista está aquí solamente cuando quieras ver el mapa completo.',finish:'Estoy listo — ir a Inicio',spanish:'Español',english:'English',ready:'Tu cuenta está lista.',error:'Algo necesita atención',start:'Empieza Aquí',adminPill:'¿ESTÁS CONFIGURANDO LA IGLESIA?',adminTitle:'Continuar Church Builder',adminBody:'Church Builder da a los líderes autorizados un solo paso claro de configuración a la vez.',adminButton:'Abrir Church Builder',feedback:'Comparte una idea',feedbackBody:'Dinos qué es confuso, qué no funciona, qué ayuda o qué falta durante el piloto.'
 }
} as const

const sectionCopy={
 en:[
  [Home,'Home','What matters now, upcoming events and church updates','/'],[BookOpen,'Learning Center','Classes, lessons, quizzes and progress','/learning'],[UsersRound,'Friendship Groups','Meeting information, lessons, check-in and prayer wall','/groups'],[CalendarDays,'Calendar','Church, ministry, group and district events','/calendar'],[Sparkles,'Kingdom Guide','Help using the app and trusted church resources','/guide'],[HandHeart,'Prayer & Testimony','Public or private prayer requests and answered prayer history','/prayer'],[MessageCircle,'Messages','Private conversations you are permitted to have','/messages'],[BriefcaseBusiness,'Serve','Ministries, qualifications and ways to serve','/serve'],[Megaphone,'Outreach','Guest, Bible-study and follow-up tools','/outreach'],[FileText,'Documents','Certificates and important church records','/documents'],[Church,'Directory','Church family and shared profile information','/directory'],[MessageSquareText,'Official Updates','Leadership announcements','/updates'],[HandHeart,'Private Care','Restricted pastoral care and support','/help'],[BookOpen,'Resources','Approved church files and teaching materials','/resources'],[Globe2,'Network','Optional connections beyond your local church','/network'],[HeartHandshake,'Fundraising','Church campaigns and goal tracking','/fundraising'],[Bell,'Alerts','Notifications and reminders','/notifications']
 ],
 es:[
  [Home,'Inicio','Lo importante ahora, eventos y noticias de la iglesia','/'],[BookOpen,'Centro de Aprendizaje','Clases, lecciones, pruebas y progreso','/learning'],[UsersRound,'Grupos de Amistad','Reunión, lecciones, asistencia y muro de oración','/groups'],[CalendarDays,'Calendario','Eventos de iglesia, ministerio, grupo y distrito','/calendar'],[Sparkles,'Kingdom Guide','Ayuda para usar la aplicación y recursos confiables','/guide'],[HandHeart,'Oración y Testimonio','Peticiones públicas o privadas e historial de oraciones contestadas','/prayer'],[MessageCircle,'Mensajes','Conversaciones privadas permitidas','/messages'],[BriefcaseBusiness,'Servir','Ministerios, requisitos y maneras de servir','/serve'],[Megaphone,'Evangelismo','Herramientas para invitados, estudios bíblicos y seguimiento','/outreach'],[FileText,'Documentos','Certificados y registros importantes','/documents'],[Church,'Directorio','Familia de la iglesia e información compartida','/directory'],[MessageSquareText,'Actualizaciones Oficiales','Anuncios de liderazgo','/updates'],[HandHeart,'Cuidado Privado','Cuidado pastoral y apoyo restringido','/help'],[BookOpen,'Recursos','Archivos aprobados y materiales de enseñanza','/resources'],[Globe2,'Red','Conexiones opcionales más allá de tu iglesia local','/network'],[HeartHandshake,'Recaudación','Campañas de iglesia y seguimiento de metas','/fundraising'],[Bell,'Alertas','Notificaciones y recordatorios','/notifications']
 ]
} as const

export default async function StartPage({searchParams}:{searchParams:Promise<{lang?:string;error?:string}>}){
 const params=await searchParams
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 const preferred=user?.user_metadata?.preferred_language==='es'?'es':'en'
 const lang=params.lang==='es'?'es':params.lang==='en'?'en':preferred
 const t=copy[lang]
 const suffix=lang==='es'?'?lang=es':''
 const withLang=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
 const userId=user?.id
 if(!userId)redirect(`/login${suffix}`)

 const [{data:profile},{data:membership}]=await Promise.all([
  supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle(),
  supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
 ])
 if(!membership?.church_id)redirect('/')
 const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
 const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||(lang==='es'?'Miembro':'Member')
 const isAdmin=['pastor','church_admin'].includes(String(membership.role))
 const first=[
  [UserRound,t.profile,t.profileBody,'/profile'],
  [Sparkles,t.journey,t.journeyBody,'/journey'],
  [CheckCircle2,t.today,t.todayBody,'/today']
 ] as const
 const week=[t.week1,t.week2,t.week3,t.week4]
 const tour=sectionCopy[lang]

 return <main className="shell start-shell">
  <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.start}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/start?lang=en">{t.english}</Link><Link className="ghost" href="/start?lang=es">{t.spanish}</Link></div></header>

  <section className="card start-hero"><div><div className="pill">START HERE • EMPIEZA AQUÍ</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="start-ready"><CheckCircle2 size={28}/><strong>{t.ready}</strong></div></section>
  {params.error&&<div className="notice error" role="alert"><strong>{t.error}:</strong> {params.error}</div>}

  <section className="card start-account"><div><div className="pill">{t.member.toUpperCase()}</div><h2>{name}</h2><p className="muted">{church?.name??t.church} • {String(membership.role||'member').replaceAll('_',' ')}</p></div><CheckCircle2 size={34}/></section>

  {isAdmin&&<section className="card start-admin"><div className="start-admin-copy"><div className="start-icon"><Church size={20}/></div><div><div className="pill">{t.adminPill}</div><h2>{t.adminTitle}</h2><p className="muted">{t.adminBody}</p></div></div><Link className="btn" href={withLang('/church/launch')}>{t.adminButton}</Link></section>}

  <section><div className="pill start-section-label">{t.walk}</div><div className="start-first">{first.map(([Icon,title,body,path])=><Link key={path} className="card start-step start-primary-step" href={withLang(path)}><div className="start-icon"><Icon size={20}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></section>

  <section className="card start-how" style={{marginTop:18}}><div className="start-role"><div className="start-icon"><Sparkles size={20}/></div><div><strong>{t.guide}</strong><span>{t.guideBody}</span><div style={{marginTop:10}}><Link className="btn secondary" href={withLang('/guide')}>{t.guide}</Link></div></div></div></section>

  <details className="card start-how" style={{marginTop:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.more}</summary><p className="muted">{t.moreBody}</p><div className="pill start-section-label">{t.week}</div><ol>{week.map(item=><li key={item} style={{marginBottom:8}}>{item}</li>)}</ol><div className="start-role-grid"><div className="start-role"><div className="start-icon"><UserRound size={19}/></div><div><strong>{t.memberView}</strong><span>{t.memberViewBody}</span></div></div><div className="start-role"><div className="start-icon"><ShieldCheck size={19}/></div><div><strong>{t.leaderView}</strong><span>{t.leaderViewBody}</span></div></div></div><div className="start-role" style={{marginTop:12}}><div className="start-icon"><LockKeyhole size={19}/></div><div><strong>{t.privacy}</strong><span>{t.privacyBody}</span></div></div></details>

  <details className="card start-how" style={{marginTop:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.tour}</summary><p className="muted">{t.tourBody}</p><div className="start-tour-grid">{tour.map(([Icon,title,body,path])=><Link key={path} className="card start-step start-tour-card" href={withLang(path)}><div className="start-icon"><Icon size={18}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></details>

  <section style={{marginTop:18}}><div className="start-grid"><Link className="card start-step" href={withLang('/feedback')}><div className="start-icon"><MessageSquareWarning size={19}/></div><div><strong>{t.feedback}</strong><span>{t.feedbackBody}</span></div></Link></div></section>

  <section className="card start-note"><form action={completeOnboarding}><input type="hidden" name="lang" value={lang}/><button className="btn" type="submit">{t.finish}</button></form></section>
 </main>
}
