import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Check,Church,FileUp,GraduationCap,Languages,MailPlus,Palette,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './launch.css'

const copy={
  en:{admin:'← Church Admin',title:'Set up your church one simple step at a time.',subtitle:'You do not need to understand the technology. Complete the steps below and Kingdom Network will tell you what still needs attention.',next:'DO THIS NEXT',open:'Open this step →',ready:'setup steps ready',of:'of',done:'Done',needed:'Still needed',final:'Final check',pilot:'PILOT NOTE',handles:'Kingdom Network handles the technical side.',domain:'No domain purchase needed yet',domainBody:'Keep using the current pilot address while the product is being proven. A permanent domain and custom email can wait.',small:'Start small',smallBody:'Invite leadership and a few trusted members first. Fix anything confusing before opening access church-wide.',help:'Need help?',helpBody:'Use Kingdom Guide for plain-language help finding features and deciding what to configure next.',guide:'Open Kingdom Guide →',when:'WHEN THE BAR IS FULL',run:'Run the pilot with real people.',runBody:'Test invitations, sign in, password recovery, profiles, Messages, Learning, Groups, Calendar, Prayer/Pastoral Care and phone navigation before inviting the whole church.',english:'English',spanish:'Español',church:'Your Church'},
  es:{admin:'← Administración',title:'Configura tu iglesia paso a paso, de forma sencilla.',subtitle:'No necesitas entender la tecnología. Completa los pasos de abajo y Kingdom Network te dirá qué falta.',next:'HAZ ESTO AHORA',open:'Abrir este paso →',ready:'pasos de configuración listos',of:'de',done:'Listo',needed:'Falta',final:'Revisión final',pilot:'NOTA DEL PILOTO',handles:'Kingdom Network se encarga de la parte técnica.',domain:'Todavía no necesitas comprar un dominio',domainBody:'Sigue usando la dirección actual del piloto mientras se demuestra el producto. El dominio permanente y el correo personalizado pueden esperar.',small:'Empieza con pocos',smallBody:'Invita primero al liderazgo y a unos pocos miembros de confianza. Corrige cualquier confusión antes de abrirlo a toda la iglesia.',help:'¿Necesitas ayuda?',helpBody:'Usa Kingdom Guide para encontrar funciones y decidir qué configurar después con instrucciones sencillas.',guide:'Abrir Kingdom Guide →',when:'CUANDO LA BARRA ESTÉ LLENA',run:'Prueba el piloto con personas reales.',runBody:'Prueba invitaciones, inicio de sesión, recuperación de contraseña, perfiles, Mensajes, Aprendizaje, Grupos, Calendario, Oración/Cuidado Pastoral y navegación en teléfono antes de invitar a toda la iglesia.',english:'English',spanish:'Español',church:'Tu Iglesia'}
} as const

export default async function ChurchLaunchPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const l=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,city,state,timezone,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const [{count:admins},{count:members},{count:publishedCourses},{count:groups},{count:events},{count:openInvites},{count:imports},{count:setupFiles}]=await Promise.all([
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin']),
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active'),
    supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('published',true),
    supabase.from('groups').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true),
    supabase.from('events').select('*',{count:'exact',head:true}).eq('church_id',churchId).gte('starts_at',new Date().toISOString()),
    supabase.from('church_invites').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()),
    supabase.from('church_import_batches').select('*',{count:'exact',head:true}).eq('church_id',churchId),
    supabase.from('church_setup_uploads').select('*',{count:'exact',head:true}).eq('church_id',churchId)
  ])
  const identity=Boolean(church?.name&&church?.city&&church?.state&&church?.timezone),adminReady=(admins??0)>=2,branding=Boolean(church?.logo_path&&church?.brand_color),people=(members??0)>1||(openInvites??0)>0||(imports??0)>0,materials=(setupFiles??0)>0,learning=(publishedCourses??0)>0,groupReady=(groups??0)>0,calendar=(events??0)>0
  const steps=lang==='es'?[
    {title:'1. Datos básicos de la iglesia',body:'Confirma el nombre, ciudad, estado y zona horaria.',href:l('/church/settings'),done:identity,Icon:Church},
    {title:'2. Agrega un administrador de respaldo',body:'Dale acceso administrativo a un líder de confianza.',href:l('/church/admin-backup'),done:adminReady,Icon:ShieldCheck},
    {title:'3. Hazlo tuyo',body:'Agrega el logo, color y mensaje de bienvenida.',href:l('/church/settings'),done:branding,Icon:Palette},
    {title:'4. Sube lo que ya usa tu iglesia',body:'Manuales, formularios, logos, políticas, clases y calendarios pueden entrar por una sola bandeja.',href:l('/church/setup-inbox'),done:materials,Icon:FileUp},
    {title:'5. Agrega a las primeras personas',body:'Invita a unos pocos miembros reales del piloto.',href:l('/church/invites'),done:people,Icon:MailPlus},
    {title:'6. Dale a los miembros un próximo paso',body:'Publica al menos una clase o curso de discipulado.',href:l('/learning'),done:learning,Icon:GraduationCap},
    {title:'7. Agrega un grupo',body:'Crea al menos un Grupo de Amistad, ministerio o comunidad.',href:l('/groups'),done:groupReady,Icon:Users},
    {title:'8. Agrega un evento',body:'Pon un próximo evento de la iglesia en el calendario.',href:l('/calendar'),done:calendar,Icon:CalendarDays},
    {title:'9. Revisa si el piloto está listo',body:'Haz la revisión final antes de invitar al grupo piloto.',href:l('/church/readiness'),done:false,Icon:Check}
  ]:[
    {title:'1. Church basics',body:'Confirm your church name, city, state and timezone.',href:'/church/settings',done:identity,Icon:Church},
    {title:'2. Add a backup admin',body:'Give one trusted leader admin access.',href:'/church/admin-backup',done:adminReady,Icon:ShieldCheck},
    {title:'3. Make it yours',body:'Add your logo, church color and welcome message.',href:'/church/settings',done:branding,Icon:Palette},
    {title:'4. Upload what your church already uses',body:'Manuals, forms, logos, policies, classes and calendars can all enter through one inbox.',href:'/church/setup-inbox',done:materials,Icon:FileUp},
    {title:'5. Add your first people',body:'Invite a few real pilot members.',href:'/church/invites',done:people,Icon:MailPlus},
    {title:'6. Give members a next step',body:'Publish at least one class or discipleship course.',href:'/learning',done:learning,Icon:GraduationCap},
    {title:'7. Add a group',body:'Create at least one Friendship Group, ministry or community.',href:'/groups',done:groupReady,Icon:Users},
    {title:'8. Add an event',body:'Put one upcoming church event on the calendar.',href:'/calendar',done:calendar,Icon:CalendarDays},
    {title:'9. Check pilot readiness',body:'Run the final check before inviting your pilot group.',href:'/church/readiness',done:false,Icon:Check}
  ]
  const completed=steps.slice(0,8).filter(s=>s.done).length,pct=Math.round(completed/8*100),nextStep=steps.slice(0,8).find(s=>!s.done)??steps[8],NextIcon=nextStep.Icon
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • Church Builder</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/church/launch?lang=en">{t.english}</Link><Link className="ghost" href="/church/launch?lang=es">{t.spanish}</Link><Link className="ghost" href={l('/church')}>{t.admin}</Link></div></header><section className="launch-hero card"><div><div className="pill">CHURCH BUILDER</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="launch-progress"><strong>{pct}%</strong><span>{completed} {t.of} 8 {t.ready}</span><div className="launch-bar"><i style={{width:`${pct}%`}}/></div></div></section><section className="card" style={{marginBottom:16}}><div className="pill">{t.next}</div><h2 style={{marginBottom:6}}><NextIcon size={18}/> {nextStep.title}</h2><p className="muted">{nextStep.body}</p><Link className="btn" href={nextStep.href}>{t.open}</Link></section><section className="launch-grid">{steps.map((s,index)=>{const Icon=s.Icon;return <Link href={s.href} className={`card launch-step ${s.done?'done':''}`} key={s.title}><div className="launch-num">{s.done?<Check size={14}/>:index+1}</div><div className="launch-copy"><strong><Icon size={12}/> {s.title}</strong><span>{s.body}</span><div className="launch-status">{index===8?t.final:s.done?t.done:t.needed}</div></div></Link>})}</section><section className="launch-manual"><div className="section-heading"><div><div className="pill">{t.pilot}</div><h2>{t.handles}</h2></div></div><div className="manual-grid"><article className="card manual-launch-card"><h3>{t.domain}</h3><p>{t.domainBody}</p></article><article className="card manual-launch-card"><h3>{t.small}</h3><p>{t.smallBody}</p></article><article className="card manual-launch-card"><h3>{t.help}</h3><p>{t.helpBody}</p><Link href={l('/guide')}>{t.guide}</Link></article></div></section><section className="card launch-footer"><div className="pill">{t.when}</div><h2>{t.run}</h2><p className="small muted">{t.runBody}</p></section></main>
}
