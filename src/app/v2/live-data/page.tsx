import Link from 'next/link'
import { BookOpen,CalendarDays,LockKeyhole,Network,ShieldCheck,UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { V2BrandLockup } from '../v2-brand-lockup'
import styles from './live-data.module.css'

const text={
  en:{
    back:'Back to V2',signIn:'Sign in',eyebrow:'LIVE KNV1 DATA · READ ONLY',title:'This is V2 using the real Kingdom Network data.',body:'Nothing on this page is copied or hardcoded. V2 is reading the same existing church records through your signed-in account and the current database permissions.',signedOut:'Sign in with your existing Kingdom Network account, then reopen this page to see the real church data your account is allowed to view.',noChurch:'Your account is signed in, but no active church membership is available to this preview.',source:'Same KNV1 Supabase source of truth · no edits · no deletes · no duplicate database',visible:'Real data visible to this account',visibleSub:'A restricted result means the existing KNV1 permissions did not allow this account to read that category.',members:'Active members',groups:'Groups',events:'Events',courses:'Courses',ministries:'Ministries',community:'Community posts',outreach:'Outreach contacts',milestones:'Milestone records',notifications:'My unread',enrollments:'My courses',groupsTitle:'Groups',eventsTitle:'Upcoming events',coursesTitle:'Learning',ministriesTitle:'Serve & ministries',myGroup:'My group connection',none:'No visible records yet.',protected:'Protected by design',protectedSub:'Real data exists in KNV1, but V2 will not bulk-display sensitive categories just because they exist.',privateMember:'Private member details',privateMemberBody:'Phone, private contact data and other protected member fields stay behind their existing authorization rules.',pastoral:'Pastoral/care records',pastoralBody:'Care requests and confidential pastoral information are not included in this broad preview.',finance:'Finance records',financeBody:'Giving, budgets, bills and financial records remain outside this preview and keep their separate finance permissions.',groupPrivate:'Private group details',groupPrivateBody:'Private home addresses, leader reports and attendance are not exposed church-wide.',restricted:'Restricted',role:'Role',signedInAs:'Signed in as',footer:'Kingdom Network V2 · Real KNV1 data bridge · Read only · Production records unchanged'
  },
  es:{
    back:'Volver a V2',signIn:'Iniciar sesión',eyebrow:'DATOS REALES DE KNV1 · SOLO LECTURA',title:'Esto es V2 usando los datos reales de Kingdom Network.',body:'Nada en esta página está copiado ni escrito directamente. V2 lee los mismos registros existentes de la iglesia por medio de tu cuenta y los permisos actuales de la base de datos.',signedOut:'Inicia sesión con tu cuenta existente de Kingdom Network y luego vuelve a abrir esta página para ver los datos reales que tu cuenta tiene permiso de ver.',noChurch:'Tu cuenta inició sesión, pero no hay una membresía activa de iglesia disponible para esta vista previa.',source:'La misma fuente de verdad de Supabase de KNV1 · sin editar · sin borrar · sin base de datos duplicada',visible:'Datos reales visibles para esta cuenta',visibleSub:'“Restringido” significa que los permisos actuales de KNV1 no permiten a esta cuenta leer esa categoría.',members:'Miembros activos',groups:'Grupos',events:'Eventos',courses:'Cursos',ministries:'Ministerios',community:'Publicaciones',outreach:'Contactos de alcance',milestones:'Registros de progreso',notifications:'Mis no leídas',enrollments:'Mis cursos',groupsTitle:'Grupos',eventsTitle:'Próximos eventos',coursesTitle:'Aprendizaje',ministriesTitle:'Servir y ministerios',myGroup:'Mi conexión de grupo',none:'Todavía no hay registros visibles.',protected:'Protegido por diseño',protectedSub:'Los datos reales existen en KNV1, pero V2 no mostrará información sensible en masa solo porque exista.',privateMember:'Datos privados de miembros',privateMemberBody:'Teléfono, contacto privado y otros campos protegidos permanecen detrás de sus reglas actuales de autorización.',pastoral:'Registros pastorales/de cuidado',pastoralBody:'Solicitudes de cuidado e información pastoral confidencial no forman parte de esta vista previa general.',finance:'Registros financieros',financeBody:'Diezmos/ofrendas, presupuestos, cuentas y registros financieros quedan fuera de esta vista previa y conservan permisos separados.',groupPrivate:'Datos privados del grupo',groupPrivateBody:'Direcciones privadas de hogares, reportes de líderes y asistencia no se muestran a toda la iglesia.',restricted:'Restringido',role:'Rol',signedInAs:'Sesión de',footer:'Kingdom Network V2 · Puente de datos reales KNV1 · Solo lectura · Registros de producción sin cambios'
  }
} as const

type Lang='en'|'es'
const relation=(value:any)=>Array.isArray(value)?value[0]:value
const countLabel=(result:any,t:(typeof text)[Lang])=>result?.error?t.restricted:String(result?.count??0)
const formatTime=(value?:string|null)=>value?String(value).slice(0,5):''

export default async function V2LiveDataPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:Lang=params.lang==='es'?'es':'en',t=text[lang]
  const withLang=(path:string)=>`${path}${path.includes('?')?'&':'?'}lang=${lang}`
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub

  if(!userId){
    return <main className={styles.page}>
      <header className={styles.topbar}><V2BrandLockup churchName="Kingdom Network V2"/><div className={styles.topActions}><Link className={styles.ghostButton} href={withLang('/v2')}>{t.back}</Link></div></header>
      <section className={styles.hero}><span className={styles.eyebrow}>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.signedOut}</p><div className={styles.identity}><Link className={styles.primaryButton} href={`/login?mode=signin&lang=${lang}`}>{t.signIn}</Link></div></section>
      <footer className={styles.footer}>{t.footer}</footer>
    </main>
  }

  const [{data:profile},{data:membership,error:membershipError}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle(),
    supabase.from('church_memberships').select('church_id,role,member_title,churches(name,city,state,timezone)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  ])

  if(membershipError||!membership?.church_id){
    return <main className={styles.page}>
      <header className={styles.topbar}><V2BrandLockup churchName="Kingdom Network V2"/><div className={styles.topActions}><Link className={styles.ghostButton} href={withLang('/v2')}>{t.back}</Link></div></header>
      <section className={styles.hero}><span className={styles.eyebrow}>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.noChurch}</p></section>
      <footer className={styles.footer}>{t.footer}</footer>
    </main>
  }

  const church:any=relation(membership.churches)
  const churchId=membership.church_id
  const nowIso=new Date().toISOString()

  const [memberCount,groupCount,eventCount,courseCount,ministryCount,communityCount,outreachCount,milestoneCount,unreadCount,enrollmentCount,groups,events,courses,ministries,myGroups]=await Promise.all([
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active'),
    supabase.from('groups').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true),
    supabase.from('events').select('*',{count:'exact',head:true}).eq('church_id',churchId),
    supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('archived_at',null),
    supabase.from('ministries').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true),
    supabase.from('community_posts').select('*',{count:'exact',head:true}).eq('church_id',churchId),
    supabase.from('outreach_contacts').select('*',{count:'exact',head:true}).eq('church_id',churchId),
    supabase.from('member_milestones').select('*',{count:'exact',head:true}).eq('church_id',churchId),
    supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null),
    supabase.from('course_enrollments').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('groups').select('id,name,group_type,meeting_day,meeting_time,location_label,accepting_members').eq('church_id',churchId).eq('active',true).order('name').limit(20),
    supabase.from('events').select('id,title,starts_at,location,event_type,featured').eq('church_id',churchId).gte('starts_at',nowIso).order('starts_at').limit(8),
    supabase.from('courses').select('id,title,category,language_code,published,pathway_stage').eq('church_id',churchId).is('archived_at',null).order('pathway_order',{ascending:true,nullsFirst:false}).limit(24),
    supabase.from('ministries').select('id,name,openings,active').eq('church_id',churchId).eq('active',true).order('name').limit(20),
    supabase.from('group_memberships').select('group_id,role,groups(name,group_type,meeting_day,meeting_time)').eq('user_id',userId)
  ])

  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||(lang==='es'?'Miembro':'Member')
  const role=membership.member_title||membership.role
  const stats=[
    [t.members,countLabel(memberCount,t)],[t.groups,countLabel(groupCount,t)],[t.events,countLabel(eventCount,t)],[t.courses,countLabel(courseCount,t)],[t.ministries,countLabel(ministryCount,t)],
    [t.community,countLabel(communityCount,t)],[t.outreach,countLabel(outreachCount,t)],[t.milestones,countLabel(milestoneCount,t)],[t.notifications,countLabel(unreadCount,t)],[t.enrollments,countLabel(enrollmentCount,t)]
  ]
  const groupRows=groups.error?[]:groups.data??[]
  const eventRows=events.error?[]:events.data??[]
  const courseRows=courses.error?[]:courses.data??[]
  const ministryRows=ministries.error?[]:ministries.data??[]
  const myGroupRows=myGroups.error?[]:myGroups.data??[]

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <V2BrandLockup churchName={church?.name??'Kingdom Network V2'}/>
      <div className={styles.topActions}><Link className={styles.linkButton} href="/v2/live-data?lang=en">EN</Link><Link className={styles.linkButton} href="/v2/live-data?lang=es">ES</Link><Link className={styles.ghostButton} href={withLang('/v2')}>{t.back}</Link></div>
    </header>

    <section className={styles.hero}>
      <span className={styles.eyebrow}>{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <div className={styles.identity}><span className={styles.badge}>{t.signedInAs}: {name}</span><span className={styles.badge}>{t.role}: {role}</span>{church?.city&&<span className={styles.badge}>{church.city}{church.state?`, ${church.state}`:''}</span>}</div>
      <div className={styles.notice}><ShieldCheck size={16} className={styles.icon} aria-hidden={true}/> {t.source}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><h2>{t.visible}</h2><p>{t.visibleSub}</p></div></div>
      <div className={styles.stats}>{stats.map(([label,value])=><article className={styles.stat} key={label}><span className={styles.statLabel}>{label}</span><span className={value===t.restricted?styles.restricted:styles.statValue}>{value}</span></article>)}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.grid}>
        <article className={styles.card}><h3><UsersRound size={18} className={styles.icon} aria-hidden={true}/> {t.groupsTitle}</h3>{groups.error?<p className={styles.empty}>{t.restricted}</p>:groupRows.length?<div className={styles.rows}>{groupRows.map((g:any)=><div className={styles.row} key={g.id}><div className={styles.rowMain}><strong>{g.name}</strong><span>{[g.group_type,g.meeting_day,formatTime(g.meeting_time)].filter(Boolean).join(' · ')}</span></div><div className={styles.rowMeta}>{g.location_label||''}</div></div>)}</div>:<p className={styles.empty}>{t.none}</p>}</article>
        <article className={styles.card}><h3><CalendarDays size={18} className={styles.icon} aria-hidden={true}/> {t.eventsTitle}</h3>{events.error?<p className={styles.empty}>{t.restricted}</p>:eventRows.length?<div className={styles.rows}>{eventRows.map((e:any)=><div className={styles.row} key={e.id}><div className={styles.rowMain}><strong>{e.title}</strong><span>{[e.event_type,e.location].filter(Boolean).join(' · ')}</span></div><div className={styles.rowMeta}>{new Date(e.starts_at).toLocaleDateString(lang==='es'?'es-US':'en-US',{month:'short',day:'numeric'})}</div></div>)}</div>:<p className={styles.empty}>{t.none}</p>}</article>
        <article className={styles.card}><h3><BookOpen size={18} className={styles.icon} aria-hidden={true}/> {t.coursesTitle}</h3>{courses.error?<p className={styles.empty}>{t.restricted}</p>:courseRows.length?<div className={styles.rows}>{courseRows.map((c:any)=><div className={styles.row} key={c.id}><div className={styles.rowMain}><strong>{c.title}</strong><span>{[c.category,c.pathway_stage,c.language_code?.toUpperCase()].filter(Boolean).join(' · ')}</span></div><div className={styles.rowMeta}>{c.published?(lang==='es'?'Publicado':'Published'):(lang==='es'?'Borrador':'Draft')}</div></div>)}</div>:<p className={styles.empty}>{t.none}</p>}</article>
        <article className={styles.card}><h3><Network size={18} className={styles.icon} aria-hidden={true}/> {t.ministriesTitle}</h3>{ministries.error?<p className={styles.empty}>{t.restricted}</p>:ministryRows.length?<div className={styles.rows}>{ministryRows.map((m:any)=><div className={styles.row} key={m.id}><div className={styles.rowMain}><strong>{m.name}</strong><span>{m.openings!=null?(lang==='es'?`${m.openings} espacios`:`${m.openings} openings`):''}</span></div></div>)}</div>:<p className={styles.empty}>{t.none}</p>}</article>
        <article className={styles.card}><h3><UsersRound size={18} className={styles.icon} aria-hidden={true}/> {t.myGroup}</h3>{myGroups.error?<p className={styles.empty}>{t.restricted}</p>:myGroupRows.length?<div className={styles.rows}>{myGroupRows.map((row:any)=>{const g:any=relation(row.groups);return <div className={styles.row} key={`${row.group_id}-${row.role}`}><div className={styles.rowMain}><strong>{g?.name??row.group_id}</strong><span>{[g?.group_type,g?.meeting_day,formatTime(g?.meeting_time)].filter(Boolean).join(' · ')}</span></div><div className={styles.rowMeta}>{row.role}</div></div>})}</div>:<p className={styles.empty}>{t.none}</p>}</article>
        <article className={styles.card}><h3><LockKeyhole size={18} className={styles.icon} aria-hidden={true}/> {t.protected}</h3><p className={styles.empty}>{t.protectedSub}</p><div className={styles.protected}>
          {[[t.privateMember,t.privateMemberBody],[t.pastoral,t.pastoralBody],[t.finance,t.financeBody],[t.groupPrivate,t.groupPrivateBody]].map(([title,body])=><div className={styles.protectedItem} key={title}><LockKeyhole size={16} className={styles.icon} aria-hidden={true}/><div><strong>{title}</strong><span>{body}</span></div></div>)}
        </div></article>
      </div>
    </section>

    <footer className={styles.footer}>{t.footer}</footer>
  </main>
}
