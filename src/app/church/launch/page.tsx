import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarDays,Check,Church,FileUp,GraduationCap,KeyRound,Languages,MailPlus,Palette,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './launch.css'

const copy={
  en:{admin:'← Church Admin',title:'Get your church ready without learning the technology.',subtitle:'For the pilot, only a few things are essential. Finish these first. Branding, uploads and deeper setup can come later.',next:'DO THIS NEXT',open:'Open this step →',ready:'pilot essentials ready',of:'of',done:'Done',needed:'Still needed',final:'Final pilot check',optional:'OPTIONAL FOR NOW',optionalTitle:'Make it yours when you are ready.',optionalBody:'These improve the experience, but they should not stop you from testing with real people.',branding:'Logo, color & welcome message',brandingBody:'Add your church look and welcome message.',uploads:'Upload church materials',uploadsBody:'Bring in manuals, forms, curriculum, policies, logos and calendars through one setup inbox.',pilot:'PILOT FIRST',handles:'Test the real member experience before building everything.',small:'Start with real people',smallBody:'A small pilot is enough. Make sure they can create an account, confirm email, sign in, use Start Here and recover a forgotten password.',help:'Need help?',helpBody:'Kingdom Guide gives plain-language directions and points you to the right screen.',guide:'Open Kingdom Guide →',when:'WHEN THE ESSENTIALS ARE DONE',run:'Run the pilot from a phone.',runBody:'Test signup, email confirmation, sign in, password recovery, Start Here, Home, Profile, Learning, Groups, Calendar, Prayer/Private Care and Feedback before expanding.',english:'English',spanish:'Español',church:'Your Church',accounts:'Protect existing accounts',accountsBody:'If someone already has a Kingdom Network account, have them sign in first and then use the church join link. Do not create a second account for the same person.',join:'Open Join Center →',password:'Practice password recovery once',passwordBody:'Before the pilot grows, have one trusted pilot user confirm they can use Forgot password from the sign-in screen.',signin:'Open sign-in →',pendingInvites:'pending invitation(s)',joinedRule:'This turns ready only after a real non-admin pilot member has joined.'},
  es:{admin:'← Administración',title:'Prepara tu iglesia sin tener que aprender la tecnología.',subtitle:'Para el piloto, solo unas pocas cosas son esenciales. Completa estas primero. El diseño, archivos y configuración más profunda pueden esperar.',next:'HAZ ESTO AHORA',open:'Abrir este paso →',ready:'puntos esenciales listos',of:'de',done:'Listo',needed:'Falta',final:'Revisión final del piloto',optional:'OPCIONAL POR AHORA',optionalTitle:'Hazlo tuyo cuando estés listo.',optionalBody:'Estas cosas mejoran la experiencia, pero no deben impedir que pruebes la plataforma con personas reales.',branding:'Logo, color y mensaje de bienvenida',brandingBody:'Agrega la apariencia de tu iglesia y un mensaje de bienvenida.',uploads:'Sube materiales de la iglesia',uploadsBody:'Agrega manuales, formularios, currículo, políticas, logos y calendarios desde una sola bandeja.',pilot:'PRIMERO EL PILOTO',handles:'Prueba la experiencia real del miembro antes de construir todo.',small:'Empieza con personas reales',smallBody:'Un piloto pequeño es suficiente. Confirma que puedan crear una cuenta, confirmar el correo, iniciar sesión, usar Empieza Aquí y recuperar una contraseña olvidada.',help:'¿Necesitas ayuda?',helpBody:'Kingdom Guide da instrucciones sencillas y te lleva a la pantalla correcta.',guide:'Abrir Kingdom Guide →',when:'CUANDO LOS PUNTOS ESENCIALES ESTÉN LISTOS',run:'Prueba el piloto desde un teléfono.',runBody:'Prueba registro, confirmación por correo, inicio de sesión, recuperación de contraseña, Empieza Aquí, Inicio, Perfil, Aprendizaje, Grupos, Calendario, Oración/Cuidado Privado y Comentarios antes de expandir.',english:'English',spanish:'Español',church:'Tu Iglesia',accounts:'Protege las cuentas existentes',accountsBody:'Si alguien ya tiene una cuenta de Kingdom Network, pídele que primero inicie sesión y después use el enlace para unirse a la iglesia. No crees una segunda cuenta para la misma persona.',join:'Abrir Centro para Unirse →',password:'Prueba la recuperación de contraseña una vez',passwordBody:'Antes de ampliar el piloto, pide a una persona de confianza que confirme que puede usar Olvidé mi contraseña desde la pantalla de inicio de sesión.',signin:'Abrir inicio de sesión →',pendingInvites:'invitación(es) pendiente(s)',joinedRule:'Esto solo queda listo cuando un miembro real del piloto, que no sea administrador, haya entrado.'}
} as const

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
const prefersSpanish=(acceptLanguage:string|null)=>/^\s*es(?:-|_|,|;|$)/i.test(acceptLanguage||'')
const failLoad=(area:string,error:unknown)=>{
  console.error('Church Builder load failed',{area:boundedCode(area),code:diagnosticCode(error,'unavailable')})
  throw new Error('church-launch-load-failed')
}

export default async function ChurchLaunchPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const requestHeaders=await headers()
  const lang:'en'|'es'=params.lang==='es'?'es':params.lang==='en'?'en':prefersSpanish(requestHeaders.get('accept-language'))?'es':'en'
  const t=copy[lang]
  const l=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  let supabase
  try{supabase=await createClient()}
  catch(error){failLoad('client',error)}

  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}
  catch(error){failLoad('auth',error)}
  const {data:claims,error:claimsError}=claimsResult
  if(claimsError)failLoad('auth',claimsError)
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login?mode=signin'))

  let membershipResult
  try{membershipResult=await supabase.from('church_memberships').select('church_id,role,churches(name,city,state,timezone,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()}
  catch(error){failLoad('membership',error)}
  const {data:membership,error:membershipError}=membershipResult
  if(membershipError)failLoad('membership',membershipError)
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect(l('/'))
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  if(!church)failLoad('church_relation',{code:'missing_church'})
  const now=new Date().toISOString()

  let readinessReads
  try{
    readinessReads=await Promise.all([
      supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin']),
      supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').not('role','in','(pastor,church_admin)'),
      supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('published',true),
      supabase.from('groups').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true),
      supabase.from('events').select('*',{count:'exact',head:true}).eq('church_id',churchId).gte('starts_at',now),
      supabase.from('church_invites').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',now),
      supabase.from('church_setup_uploads').select('*',{count:'exact',head:true}).eq('church_id',churchId)
    ])
  }catch(error){failLoad('readiness',error)}
  const readinessErrors=readinessReads.map(result=>result.error).filter(Boolean)
  if(readinessErrors.length){
    console.error('Church Builder readiness reads failed',{codes:readinessErrors.map(error=>boundedCode(error?.code))})
    throw new Error('church-launch-load-failed')
  }
  const readinessCounts=readinessReads.map(result=>result.count)
  if(readinessCounts.some(count=>typeof count!=='number'||!Number.isFinite(count))){
    console.error('Church Builder readiness counts invalid',{invalidCount:readinessCounts.filter(count=>typeof count!=='number'||!Number.isFinite(count)).length})
    throw new Error('church-launch-load-failed')
  }
  const [{count:admins},{count:pilotMembers},{count:publishedCourses},{count:groups},{count:events},{count:openInvites},{count:setupFiles}]=readinessReads
  const identity=Boolean(church.name&&church.city&&church.state&&church.timezone)
  const adminReady=admins>=2
  const people=pilotMembers>0
  const learning=publishedCourses>0
  const groupReady=groups>0
  const calendar=events>0
  const branding=Boolean(church.logo_path&&church.brand_color)
  const materials=setupFiles>0
  const steps=lang==='es'?[
    {title:'1. Confirma los datos básicos',body:'Nombre de la iglesia, ciudad, estado y zona horaria.',href:l('/church/settings'),done:identity,Icon:Church},
    {title:'2. Agrega un administrador de respaldo',body:'Dale acceso administrativo a un líder de confianza. No compartas contraseñas.',href:l('/church/admin-backup'),done:adminReady,Icon:ShieldCheck},
    {title:'3. Agrega un miembro real del piloto',body:'Usa el Centro para Unirse para compartir el código QR o enlace. Una invitación pendiente por sí sola no cuenta como completado.',href:l('/church/join-center'),done:people,Icon:MailPlus},
    {title:'4. Publica un próximo paso',body:'Ten por lo menos una clase o curso disponible para miembros.',href:l('/learning'),done:learning,Icon:GraduationCap},
    {title:'5. Agrega un grupo',body:'Crea por lo menos un Grupo de Amistad o comunidad activa.',href:l('/groups'),done:groupReady,Icon:Users},
    {title:'6. Agrega un próximo evento',body:'Pon algo real en el calendario para que los miembros vean qué sigue.',href:l('/calendar'),done:calendar,Icon:CalendarDays},
    {title:'7. Haz la revisión final',body:'Comprueba los flujos esenciales antes de ampliar el piloto.',href:l('/church/readiness'),done:false,Icon:Check}
  ]:[
    {title:'1. Confirm church basics',body:'Church name, city, state and timezone.',href:'/church/settings',done:identity,Icon:Church},
    {title:'2. Add a backup admin',body:'Give one trusted leader admin access. Never share passwords.',href:'/church/admin-backup',done:adminReady,Icon:ShieldCheck},
    {title:'3. Add one real pilot member',body:'Use Join Center to share the QR code or link. A pending invitation alone does not count as complete.',href:'/church/join-center',done:people,Icon:MailPlus},
    {title:'4. Publish one next step',body:'Have at least one class or course available to members.',href:'/learning',done:learning,Icon:GraduationCap},
    {title:'5. Add one group',body:'Create at least one active Friendship Group or community.',href:'/groups',done:groupReady,Icon:Users},
    {title:'6. Add one upcoming event',body:'Put something real on the calendar so members can see what is next.',href:'/calendar',done:calendar,Icon:CalendarDays},
    {title:'7. Run the final pilot check',body:'Verify the essential member flows before expanding the pilot.',href:'/church/readiness',done:false,Icon:Check}
  ]
  const essentials=steps.slice(0,6),completed=essentials.filter(s=>s.done).length,pct=Math.round(completed/essentials.length*100),nextStep=essentials.find(s=>!s.done)??steps[6],NextIcon=nextStep.Icon
  return <main className="shell"><header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church.name} • Church Builder</div></div><nav className="row launch-nav" aria-label={lang==='es'?'Navegación de Church Builder':'Church Builder navigation'}><Languages size={15}/><Link className="ghost" href="/church/launch?lang=en" aria-current={lang==='en'?'page':undefined}>{t.english}</Link><Link className="ghost" href="/church/launch?lang=es" aria-current={lang==='es'?'page':undefined}>{t.spanish}</Link><Link className="ghost" href={l('/guide')}>Kingdom Guide</Link><Link className="ghost" href={l('/church')}>{t.admin}</Link></nav></header>
  <section className="launch-hero card"><div><div className="pill">CHURCH BUILDER</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="launch-progress" aria-label={`${completed} ${t.of} ${essentials.length} ${t.ready}`}><strong>{pct}%</strong><span>{completed} {t.of} {essentials.length} {t.ready}</span><div className="launch-bar"><i style={{width:`${pct}%`}}/></div></div></section>
  <section className="card launch-next"><div className="pill">{t.next}</div><h2><NextIcon size={18}/> {nextStep.title}</h2><p className="muted">{nextStep.body}</p>{nextStep===steps[2]&&!people?<p className="small launch-note">{openInvites} {t.pendingInvites}. {t.joinedRule}</p>:null}<Link className="btn" href={nextStep.href}>{t.open}</Link></section>
  <section className="launch-support-grid"><article className="card launch-support"><ShieldCheck size={20}/><div><h3>{t.accounts}</h3><p>{t.accountsBody}</p><Link href={l('/church/join-center')}>{t.join}</Link></div></article><article className="card launch-support"><KeyRound size={20}/><div><h3>{t.password}</h3><p>{t.passwordBody}</p><Link href={l('/login?mode=signin')}>{t.signin}</Link></div></article></section>
  <section className="launch-grid">{steps.map((s,index)=>{const Icon=s.Icon;return <Link href={s.href} className={`card launch-step ${s.done?'done':''}`} key={s.title}><div className="launch-num">{s.done?<Check size={14}/>:index+1}</div><div className="launch-copy"><strong><Icon size={12}/> {s.title}</strong><span>{s.body}</span>{index===2&&!people?<div className="launch-meta">{openInvites} {t.pendingInvites}</div>:null}<div className="launch-status">{index===6?t.final:s.done?t.done:t.needed}</div></div></Link>})}</section>
  <details className="card launch-optional"><summary>{t.optional}: {t.optionalTitle}</summary><p className="small muted">{t.optionalBody}</p><div className="manual-grid"><Link className="card manual-launch-card" href={l('/church/settings')}><Palette size={18}/><h3>{branding?<Check size={14}/>:null} {t.branding}</h3><p>{t.brandingBody}</p></Link><Link className="card manual-launch-card" href={l('/church/setup-inbox')}><FileUp size={18}/><h3>{materials?<Check size={14}/>:null} {t.uploads}</h3><p>{t.uploadsBody}</p></Link></div></details>
  <section className="launch-manual"><div className="section-heading"><div><div className="pill">{t.pilot}</div><h2>{t.handles}</h2></div></div><div className="manual-grid"><article className="card manual-launch-card"><h3>{t.small}</h3><p>{t.smallBody}</p></article><article className="card manual-launch-card"><h3>{t.help}</h3><p>{t.helpBody}</p><Link href={l('/guide')}>{t.guide}</Link></article></div></section>
  <section className="card launch-footer"><div className="pill">{t.when}</div><h2>{t.run}</h2><p className="small muted">{t.runBody}</p></section></main>
}