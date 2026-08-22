import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Languages,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Wrench,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './readiness.css'

const Icon=({status}:{status:string})=>status==='ready'?<CheckCircle2 size={16}/>:status==='error'?<ShieldAlert size={16}/>:status==='warning'||status==='action'?<AlertTriangle size={16}/>:status==='optional'?<CircleDashed size={16}/>:<Info size={16}/>

const copy={
  en:{
    church:'Your Church',title:'Pilot Readiness',admin:'← Church Admin',home:'Home',pill:'PILOT READINESS',
    hero:'What needs attention before we expand the pilot?',heroBody:'Live setup checks plus the real-phone tests that matter most before more people depend on the app.',
    score:'app checks ready',scoreUnavailable:'checks unavailable',
    loadTitle:'Readiness checks are unavailable right now',load:'We could not verify the live setup checks. Nothing was changed. Do not treat this as a 0% score or a clear checklist. Try again before expanding the pilot.',
    accessTitle:'We could not verify your church access',accessBody:'This may be a temporary connection problem. Nothing was changed. Try again before making pilot decisions.',
    retry:'Try readiness checks again →',signIn:'Sign in again →',open:'Open related area →',
    platform:'REAL-PHONE TESTS',platformTitle:'Do these on real phones before expanding access.',notIncluded:'Human tests are not included in the app-check score.',
    proofPill:'PHONE PROOF GATE',proofTitle:'Automated checks are not pilot proof.',proofBody:'A green build proves the code can compile and pass automated checks. It does not prove real email delivery, redirects, phone usability, or Spanish clarity. Do not widen the pilot until every required phone flow below has passed.',
    evidenceTitle:'Record the result, not just “it worked”',evidenceBody:'For each required test, record the phone/device, language, account type, date, PASS/FAIL, and the exact failing step in the Control Room. Use test accounts only—never change a real member just to prove a flow.',
    humanStatus:'HUMAN PROOF REQUIRED',required:'REQUIRED FOR PILOT',
    authTitle:'Test the public signup path all the way through',authBody:'Use a real non-admin test email: Create account from the public login page, confirm the email, land on Start Here, finish the first-login walkthrough, sign out, and sign back in.',authOpen:'Open public signup →',
    existingTitle:'Test an existing account joining a church',existingBody:'Use a test person who already has a Kingdom Network account. Open the church join link, choose Sign in, then confirm they return to the church join flow and become a normal member on the same account without creating a duplicate account.',existingOpen:'Open Join Center →',
    inviteTitle:'Also test one invitation',inviteBody:'Test one real invitation with a test account. Confirm the newest open invitation works and that an old or replaced link does not create a confusing dead end.',inviteOpen:'Open Invitations →',
    resetTitle:'Test password recovery',resetBody:'From Sign in, request one password-reset email, open only the newest link, set a new password, then sign in again. Also test “I never confirmed my email” with a test account.',resetOpen:'Open Sign in →',
    spanishTest:'Test a Spanish first login on a phone',spanishBody:'Switch signup to Español and make sure confirmation, sign in, Start Here, Kingdom Guide and the first Home screen stay understandable without English instructions.',spanishOpen:'Open Start Here →',
    guideTitle:'Test Kingdom Guide recovery help',guideBody:'On a phone in English and Spanish, ask how to confirm email, reset a password, and join a church with an existing account. Confirm the guidance keeps the person on one account and gives a clear next tap.',guideOpen:'Open Kingdom Guide →',
    setupTitle:'Test Fresh Church Setup / Church Builder',setupBody:'From a pastor/admin test account, open Church Builder → Setup Inbox, upload safe test material, review the recommendation, approve it, and confirm the resulting course opens as an unpublished draft. Do not use irreplaceable source files for this test.',setupOpen:'Open Setup Inbox →',
    security:'SECURITY',passwordTitle:'Leaked-password protection',passwordBody:'Enable leaked-password protection before a broader pilot if the current plan supports it. This is security hardening, not a blocker for a tiny controlled pilot.',
    verified:'DEPLOYMENT',deployTitle:'Production deployment health',deployBody:'Main-branch changes must reach a READY production deployment before pilot testing. Keep the last known-good production version live if a newer build fails.',
    plan:'PILOT PLAN',smallTitle:'Start small',smallBody:'A few trusted real users are enough. Test onboarding, Learning, Groups, Calendar, Prayer/Private Care, Feedback, privacy and mobile use before expanding church-wide.',
    count:'CURRENT ACTION COUNT',needs:'app check',attention:'currently need attention.',footer:'This count covers live app checks only. Required phone tests above remain separate human proof.',
    unavailableFooter:'Live app-check counts are hidden until the readiness query succeeds. Human phone proof is still required.',english:'English',spanish:'Español'
  },
  es:{
    church:'Tu Iglesia',title:'Preparación del Piloto',admin:'← Administración',home:'Inicio',pill:'PREPARACIÓN DEL PILOTO',
    hero:'¿Qué necesita atención antes de ampliar el piloto?',heroBody:'Revisiones en vivo de la configuración más las pruebas importantes con teléfonos reales antes de que más personas dependan de la aplicación.',
    score:'revisiones listas',scoreUnavailable:'revisiones no disponibles',
    loadTitle:'Las revisiones no están disponibles ahora',load:'No pudimos verificar las revisiones en vivo. No se cambió nada. No interpretes esto como 0% ni como una lista sin problemas. Inténtalo otra vez antes de ampliar el piloto.',
    accessTitle:'No pudimos verificar tu acceso a la iglesia',accessBody:'Puede ser un problema temporal de conexión. No se cambió nada. Inténtalo otra vez antes de tomar decisiones del piloto.',
    retry:'Intentar las revisiones otra vez →',signIn:'Iniciar sesión otra vez →',open:'Abrir área relacionada →',
    platform:'PRUEBAS CON TELÉFONOS REALES',platformTitle:'Haz estas pruebas desde teléfonos reales antes de ampliar el acceso.',notIncluded:'Las pruebas humanas no se incluyen en la puntuación.',
    proofPill:'PRUEBA REAL EN TELÉFONO',proofTitle:'Las revisiones automáticas no prueban que el piloto está listo.',proofBody:'Una compilación verde demuestra que el código puede compilar y pasar revisiones automáticas. No demuestra entrega real de correo, redirecciones, facilidad de uso en teléfono ni claridad en español. No amplíes el piloto hasta que pasen todos los flujos requeridos de abajo.',
    evidenceTitle:'Registra el resultado, no solamente “funcionó”',evidenceBody:'Para cada prueba requerida, registra teléfono/dispositivo, idioma, tipo de cuenta, fecha, PASÓ/FALLÓ y el paso exacto que falló en el Control Room. Usa solamente cuentas de prueba; nunca cambies a un miembro real solo para probar un flujo.',
    humanStatus:'REQUIERE PRUEBA HUMANA',required:'REQUERIDO PARA EL PILOTO',
    authTitle:'Prueba el registro público de principio a fin',authBody:'Usa un correo real de prueba que no sea de administrador: crea una cuenta desde la página pública, confirma el correo, entra a Empieza Aquí, termina el primer recorrido, cierra sesión y vuelve a entrar.',authOpen:'Abrir registro público →',
    existingTitle:'Prueba que una cuenta existente se una a una iglesia',existingBody:'Usa una persona de prueba que ya tenga cuenta de Kingdom Network. Abre el enlace para unirse, elige Iniciar sesión y confirma que regrese al proceso y quede como miembro normal en la misma cuenta sin crear una cuenta duplicada.',existingOpen:'Abrir Centro de Ingreso →',
    inviteTitle:'Prueba también una invitación',inviteBody:'Prueba una invitación real con una cuenta de prueba. Confirma que funcione la invitación abierta más reciente y que un enlace viejo o reemplazado no termine en un callejón sin salida confuso.',inviteOpen:'Abrir Invitaciones →',
    resetTitle:'Prueba la recuperación de contraseña',resetBody:'Desde Iniciar sesión, solicita un solo correo para cambiar la contraseña, abre únicamente el enlace más reciente, crea una contraseña nueva y vuelve a entrar. También prueba “Nunca confirmé mi correo” con una cuenta de prueba.',resetOpen:'Abrir Iniciar sesión →',
    spanishTest:'Prueba el primer ingreso en español desde un teléfono',spanishBody:'Cambia el registro a Español y confirma que la confirmación, inicio de sesión, Empieza Aquí, Kingdom Guide y la primera pantalla de Inicio sean claras sin instrucciones en inglés.',spanishOpen:'Abrir Empieza Aquí →',
    guideTitle:'Prueba la ayuda de recuperación de Kingdom Guide',guideBody:'En un teléfono, en inglés y español, pregunta cómo confirmar el correo, cambiar una contraseña y unirse a una iglesia con una cuenta existente. Confirma que la guía mantenga a la persona en una sola cuenta y dé un próximo toque claro.',guideOpen:'Abrir Kingdom Guide →',
    setupTitle:'Prueba Fresh Church Setup / Church Builder',setupBody:'Desde una cuenta de prueba de pastor/administrador, abre Church Builder → Setup Inbox, sube material seguro de prueba, revisa la recomendación, apruébala y confirma que el curso resultante abra como borrador sin publicar. No uses archivos originales irremplazables.',setupOpen:'Abrir Setup Inbox →',
    security:'SEGURIDAD',passwordTitle:'Protección contra contraseñas filtradas',passwordBody:'Activa la protección contra contraseñas filtradas antes de un piloto más amplio si el plan actual lo permite. Es una mejora de seguridad, no un bloqueo para un piloto pequeño.',
    verified:'DESPLIEGUE',deployTitle:'Salud del despliegue de producción',deployBody:'Los cambios de la rama principal deben llegar a un despliegue READY antes de probarlos. Mantén la última versión estable si una compilación nueva falla.',
    plan:'PLAN DEL PILOTO',smallTitle:'Empieza con pocos',smallBody:'Unos pocos usuarios reales de confianza son suficientes. Prueba incorporación, Aprendizaje, Grupos, Calendario, Oración/Cuidado Privado, Comentarios, privacidad y uso móvil antes de ampliar a toda la iglesia.',
    count:'CUENTA DE ACCIONES',needs:'revisión de la aplicación',attention:'necesitan atención ahora.',footer:'Esta cuenta cubre solamente revisiones en vivo de la aplicación. Las pruebas requeridas en teléfono siguen siendo evidencia humana separada.',
    unavailableFooter:'Las cuentas de revisiones se ocultan hasta que la consulta funcione. Las pruebas humanas en teléfono todavía son requeridas.',english:'English',spanish:'Español'
  }
} as const

function safeErrorCode(error:unknown){
  if(!error||typeof error!=='object')return 'unknown'
  const value=error as {code?:unknown;name?:unknown}
  return String(value.code??value.name??'unknown').slice(0,80)
}

function localizedCheck(r:any,lang:'en'|'es'){
  const actionHref=r.check_key==='admin_redundancy'?'/church/admin-backup':r.action_href
  if(lang==='en')return {...r,action_href:actionHref}
  const n=String(r.detail??'').match(/^\d+/)?.[0]??'0'
  const map:Record<string,{label:string;detail:string}>={
    admin_redundancy:{label:'Administrador de respaldo',detail:r.check_status==='ready'?`${n} cuentas activas de pastor/administrador pueden manejar la iglesia.`:'Solo hay una cuenta activa de pastor/administrador. Agrega a un líder de confianza como administrador de respaldo.'},
    church_identity:{label:'Datos de la iglesia y zona horaria',detail:r.check_status==='ready'?'El nombre, ubicación y zona horaria están configurados.':'Completa el nombre, ubicación y zona horaria de la iglesia.'},
    branding:{label:'Imagen de la iglesia',detail:r.check_status==='ready'?'El logo y color principal están configurados.':'El logo y color pueden agregarse para un piloto más pulido, pero no bloquean el uso.'},
    members:{label:'Miembros activos',detail:`${n} cuenta(s) activa(s) de miembros están conectadas.`},
    learning:{label:'Aprendizaje publicado',detail:`${n} curso(s) publicado(s) están disponibles para los miembros.`},
    groups:{label:'Grupos activos',detail:`${n} grupo(s) activo(s) están configurados.`},
    calendar:{label:'Próximos eventos',detail:`${n} evento(s) próximo(s) están publicados.`},
    serving:{label:'Servicio y ministerios',detail:r.check_status==='ready'?`${n} oportunidad(es) de ministerio están activas.`:'Todavía no hay ministerios activos publicados. Esto no bloquea un piloto pequeño; agrégalo cuando quieras probar el flujo de Servicio.'},
    outreach_followup:{label:'Seguimiento de alcance',detail:r.check_status==='ready'?'No hay seguimientos de alcance vencidos.':`${n} seguimiento(s) de alcance están vencidos.`},
    document_review:{label:'Revisión de documentos',detail:r.check_status==='ready'?'No hay documentos esperando verificación.':`${n} documento(s) esperan verificación.`},
    milestone_integrity:{label:'Consistencia de registros verificados',detail:r.check_status==='ready'?'Las fechas y estados de los registros verificados son consistentes.':`${n} registro(s) verificado(s) tienen fechas o estados inconsistentes.`},
    open_invites:{label:'Invitaciones abiertas',detail:`${n} invitación(es) activa(s) esperan ser aceptadas.`}
  }
  const translated=map[r.check_key]
  return {...r,action_href:actionHref,check_label:translated?.label??r.check_label,detail:translated?.detail??r.detail}
}

export default async function ReadinessPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const languageQuery=lang==='es'?'?lang=es':''
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub

  if(claimsError){
    console.error('Pilot readiness auth check failed',{code:safeErrorCode(claimsError)})
    return <main className="shell"><header className="topbar"><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="row"><Link className="ghost" href="/church/readiness?lang=en">{t.english}</Link><Link className="ghost" href="/church/readiness?lang=es">{t.spanish}</Link></div></header><section className="card readiness-recovery" role="alert"><div className="pill">{t.pill}</div><h1>{t.accessTitle}</h1><p>{t.accessBody}</p><div className="row"><Link href={`/church/readiness${languageQuery}`}>{t.retry}</Link><Link href={`/login?lang=${lang}&mode=signin`}>{t.signIn}</Link></div></section></main>
  }
  if(!userId)redirect(`/login?lang=${lang}&mode=signin`)

  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(membershipError){
    console.error('Pilot readiness membership check failed',{code:safeErrorCode(membershipError)})
    return <main className="shell"><header className="topbar"><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="row"><Link className="ghost" href="/church/readiness?lang=en">{t.english}</Link><Link className="ghost" href="/church/readiness?lang=es">{t.spanish}</Link></div></header><section className="card readiness-recovery" role="alert"><div className="pill">{t.pill}</div><h1>{t.accessTitle}</h1><p>{t.accessBody}</p><div className="row"><Link href={`/church/readiness${languageQuery}`}>{t.retry}</Link><Link href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link></div></section></main>
  }
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect(lang==='es'?'/?lang=es':'/')

  const {data:checks,error:readinessError}=await supabase.rpc('church_pilot_readiness',{p_church_id:membership.church_id})
  if(readinessError)console.error('Pilot readiness check failed',{churchId:membership.church_id,code:safeErrorCode(readinessError)})

  const rows=readinessError?[]:(checks??[]).map((r:any)=>localizedCheck(r,lang))
  const scored=rows.filter((r:any)=>!['optional','info'].includes(r.check_status))
  const ready=scored.filter((r:any)=>r.check_status==='ready').length
  const score=readinessError?null:(scored.length?Math.round(ready/scored.length*100):0)
  const blockers=readinessError?null:rows.filter((r:any)=>['error','warning','action'].includes(r.check_status)).length
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.title}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/church/readiness?lang=en">{t.english}</Link><Link className="ghost" href="/church/readiness?lang=es">{t.spanish}</Link><Link className="ghost" href={`/church${languageQuery}`}>{t.admin}</Link><Link className="ghost" href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link></div></header>

    <section className="readiness-hero card"><div><div className="pill">{t.pill}</div><h1>{t.hero}</h1><p className="muted">{t.heroBody}</p></div><div className={`readiness-score ${score===null?'unavailable':''}`}><div><strong>{score===null?'—':`${score}%`}</strong><span>{score===null?t.scoreUnavailable:t.score}</span></div></div></section>

    {readinessError&&<div className="notice error readiness-load-error" role="alert"><strong>{t.loadTitle}</strong><span>{t.load}</span><Link href={`/church/readiness${languageQuery}`}>{t.retry}</Link></div>}

    {!readinessError&&<section className="readiness-grid">{rows.map((r:any)=><article className={`card check-card ${r.check_status}`} key={r.check_key}><div className="check-icon"><Icon status={r.check_status}/></div><div className="check-copy"><div className="pill">{String(r.check_status).toUpperCase()}</div><strong>{r.check_label}</strong><span>{r.detail}</span>{r.action_href&&<Link href={`${r.action_href}${lang==='es'?(r.action_href.includes('?')?'&':'?')+'lang=es':''}`}>{t.open}</Link>}</div></article>)}</section>}

    <section className="card proof-gate"><div className="proof-icon"><Smartphone size={22}/></div><div><div className="pill">{t.proofPill}</div><h2>{t.proofTitle}</h2><p>{t.proofBody}</p><strong>{t.evidenceTitle}</strong><p className="muted">{t.evidenceBody}</p></div></section>

    <section className="manual-section"><div className="section-heading"><div><div className="pill">{t.platform}</div><h2>{t.platformTitle}</h2></div><span className="small muted">{t.notIncluded}</span></div><div className="manual-grid">
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><ShieldCheck size={13}/> {t.authTitle}</h3><p>{t.authBody}</p><Link href={`/login?lang=${lang}`}>{t.authOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><ShieldCheck size={13}/> {t.existingTitle}</h3><p>{t.existingBody}</p><Link href={`/church/join-center${languageQuery}`}>{t.existingOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><ShieldCheck size={13}/> {t.inviteTitle}</h3><p>{t.inviteBody}</p><Link href={`/church/invites${languageQuery}`}>{t.inviteOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><ShieldCheck size={13}/> {t.resetTitle}</h3><p>{t.resetBody}</p><Link href={`/login?lang=${lang}&mode=signin`}>{t.resetOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><Languages size={13}/> {t.spanishTest}</h3><p>{t.spanishBody}</p><Link href="/start?lang=es">{t.spanishOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><ShieldCheck size={13}/> {t.guideTitle}</h3><p>{t.guideBody}</p><Link href={`/guide${languageQuery}`}>{t.guideOpen}</Link></article>
      <article className="card manual-card"><div className="pill human-proof">{t.humanStatus}</div><h3><Wrench size={13}/> {t.setupTitle}</h3><p>{t.setupBody}</p><Link href={`/church/setup-inbox${languageQuery}`}>{t.setupOpen}</Link></article>
      <article className="card manual-card"><div className="pill">{t.security}</div><h3><ShieldCheck size={13}/> {t.passwordTitle}</h3><p>{t.passwordBody}</p></article>
      <article className="card manual-card"><div className="pill">{t.verified}</div><h3><Wrench size={13}/> {t.deployTitle}</h3><p>{t.deployBody}</p></article>
      <article className="card manual-card"><div className="pill">{t.plan}</div><h3><ShieldCheck size={13}/> {t.smallTitle}</h3><p>{t.smallBody}</p></article>
    </div></section>

    {blockers===null?<section className="card readiness-footer unavailable-footer"><div className="pill">{t.count}</div><p>{t.unavailableFooter}</p></section>:<section className="card readiness-footer"><div className="pill">{t.count}</div><h2 style={{margin:'7px 0 5px'}}>{blockers} {t.needs}{lang==='en'&&blockers!==1?'s':''} {t.attention}</h2><p className="small muted">{t.footer}</p></section>}
  </main>
}
