import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,Church,Compass,FileUp,GraduationCap,HandHeart,Languages,MessageCircle,Megaphone,Search,Sparkles,Users,Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './guide.css'

const copy={
  en:{title:'What do you need help with?',subtitle:'Choose one simple action or search trusted church resources.',search:'Search trusted resources',placeholder:'Search a topic, Scripture, lesson, policy or resource…',hint:'Guide Beta searches resources already stored in your church library. It does not generate doctrinal answers or search the open internet.',quick:'START HERE',results:'TRUSTED RESULTS',trying:'Choose what you want to do.',resultsFor:'Results for',none:'No member-visible church resource matched that search yet. Try a broader word, or open the Resource Library.',open:'Open in Resource Library →',trust:'SOURCE TRUST',trustTitle:'Guide keeps the source visible.',trustBody:'Kingdom Network preserves where material came from and whether it is current, legacy or reference-only.',next:'What comes next:',nextBody:'the approved-source layer can later support cited AI answers and recommendations. Until that security boundary is chosen, Guide stays navigation and trusted-resource search.',home:'← Home',english:'English',spanish:'Español',church:'Your Church'},
  es:{title:'¿Con qué necesitas ayuda?',subtitle:'Elige una acción sencilla o busca recursos confiables de tu iglesia.',search:'Buscar recursos confiables',placeholder:'Busca un tema, Escritura, lección, política o recurso…',hint:'Kingdom Guide Beta busca recursos guardados en la biblioteca de tu iglesia. No genera respuestas doctrinales ni busca en internet abierto.',quick:'EMPIEZA AQUÍ',results:'RESULTADOS CONFIABLES',trying:'Elige lo que quieres hacer.',resultsFor:'Resultados para',none:'No encontramos un recurso visible para miembros. Prueba una palabra más general o abre la Biblioteca de Recursos.',open:'Abrir en la Biblioteca de Recursos →',trust:'CONFIANZA DE FUENTES',trustTitle:'La Guía mantiene visible la fuente.',trustBody:'Kingdom Network conserva de dónde vino cada material y si es actual, histórico o solo de referencia.',next:'Próximamente:',nextBody:'la capa de fuentes aprobadas podrá apoyar respuestas de IA con citas y recomendaciones. Hasta definir ese límite de seguridad, la Guía se mantiene como navegación y búsqueda confiable.',home:'← Inicio',english:'English',spanish:'Español',church:'Tu Iglesia'}
} as const

const memberQuick={
  en:[
    {title:'Tell me what matters today',body:'See responsibilities, classes, notifications and your next step in one place.',href:'/today',Icon:Sparkles},
    {title:'Find my next growth step',body:'See your discipleship journey and what comes next.',href:'/journey',Icon:GraduationCap},
    {title:'See what’s happening',body:'Open church events, classes and services.',href:'/calendar',Icon:CalendarDays},
    {title:'Find a Friendship Group',body:'Browse groups by area, schedule and language.',href:'/groups',Icon:Users},
    {title:'I need prayer or pastoral care',body:'Send a private prayer or pastoral-care request.',href:'/help',Icon:HandHeart},
    {title:'Message a church member',body:'Open private member conversations.',href:'/messages',Icon:MessageCircle},
    {title:'Browse trusted resources',body:'Search the Resource Library.',href:'/resources',Icon:BookOpen},
    {title:'See my church family',body:'Open the member directory.',href:'/directory',Icon:Church}
  ],
  es:[
    {title:'Dime qué importa hoy',body:'Mira responsabilidades, clases, notificaciones y tu próximo paso en un solo lugar.',href:'/today',Icon:Sparkles},
    {title:'Ver mi próximo paso de crecimiento',body:'Mira tu camino de discipulado y qué sigue.',href:'/journey',Icon:GraduationCap},
    {title:'Ver lo que está pasando',body:'Abre eventos, clases y servicios de la iglesia.',href:'/calendar',Icon:CalendarDays},
    {title:'Encontrar un Grupo de Amistad',body:'Busca grupos por área, horario e idioma.',href:'/groups',Icon:Users},
    {title:'Necesito oración o cuidado pastoral',body:'Envía una solicitud privada de oración o cuidado pastoral.',href:'/help',Icon:HandHeart},
    {title:'Enviar mensaje a un miembro',body:'Abre conversaciones privadas con miembros.',href:'/messages',Icon:MessageCircle},
    {title:'Buscar recursos confiables',body:'Busca en la Biblioteca de Recursos.',href:'/resources',Icon:BookOpen},
    {title:'Ver mi familia de la iglesia',body:'Abre el directorio de miembros.',href:'/directory',Icon:Church}
  ]
} as const

const adminQuick={
  en:[
    {title:'Set up my church',body:'Church Builder tells you the next setup step and what is still missing.',href:'/church/launch',Icon:Wrench},
    {title:'Upload what our church already uses',body:'Put manuals, forms, curriculum and files into the Setup Inbox.',href:'/church/setup-inbox',Icon:FileUp},
    {title:'See who needs leadership attention',body:'Open the Leadership Today priority queue.',href:'/church/leadership',Icon:HandHeart},
    {title:'Follow up with guests and Bible studies',body:'Open the Outreach follow-up pipeline.',href:'/outreach',Icon:Megaphone}
  ],
  es:[
    {title:'Configurar mi iglesia',body:'Church Builder te dice el siguiente paso y qué falta.',href:'/church/launch',Icon:Wrench},
    {title:'Subir lo que nuestra iglesia ya usa',body:'Pon manuales, formularios, currículo y archivos en la Bandeja de Configuración.',href:'/church/setup-inbox',Icon:FileUp},
    {title:'Ver quién necesita atención del liderazgo',body:'Abre la lista prioritaria de Liderazgo Hoy.',href:'/church/leadership',Icon:HandHeart},
    {title:'Dar seguimiento a visitas y estudios bíblicos',body:'Abre el proceso de seguimiento de alcance.',href:'/outreach',Icon:Megaphone}
  ]
} as const

const lower=(v:any)=>String(v??'').toLowerCase()
const authority=(r:any)=>lower(r.authority_level||r.source_authority||r.authority||r.source_scope||'local church')
const status=(r:any)=>lower(r.resource_status||r.status||'current')
const authorityScore=(v:string)=>v.includes('organization')||v.includes('assembly')||v.includes('official')?35:v.includes('district')?28:v.includes('local')||v.includes('church')?20:v.includes('ministry')?12:v.includes('group')?8:5
const statusScore=(v:string)=>v==='current'?25:v.includes('reference')?16:v==='legacy'?4:v==='draft'?-15:v==='retired'?-30:8
const displayAuthority=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const displayStatus=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function GuidePage({searchParams}:{searchParams:Promise<{q?:string;lang?:string}>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en'
  const t=copy[lang]
  const q=String(query.q??'').trim(),needle=q.toLowerCase()
  const withLang=(href:string)=>lang==='es'?`${href}${href.includes('?')?'&':'?'}lang=es`:href
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const isAdmin=['pastor','church_admin'].includes(membership.role)
  const quick=isAdmin?[...adminQuick[lang],...memberQuick[lang]]:memberQuick[lang]
  let results:any[]=[]
  if(q){
    const {data}=await supabase.from('media_assets').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(400)
    results=(data??[]).filter((r:any)=>r.member_visible!==false).map((r:any)=>{const searchable=[r.title,r.description,r.ministry,r.topic,r.topic_tags,r.tags,r.scripture_refs,r.scripture_references,r.language_code,r.resource_year,r.year].flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean).join(' ').toLowerCase();let score=0;if(lower(r.title).includes(needle))score+=55;if(lower(r.description).includes(needle))score+=22;if(searchable.includes(needle))score+=12;score+=authorityScore(authority(r))+statusScore(status(r));return {...r,__score:score,__searchable:searchable,__authority:authority(r),__status:status(r)}}).filter((r:any)=>r.__searchable.includes(needle)||lower(r.title).includes(needle)||lower(r.description).includes(needle)).sort((a:any,b:any)=>b.__score-a.__score||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,24)
  }

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • Kingdom Guide Beta</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=en`:'?lang=en'}`}>{t.english}</Link><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=es`:'?lang=es'}`}>{t.spanish}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="guide-hero card"><div><div className="pill">KINGDOM GUIDE • BETA</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="hero-stat"><Sparkles size={24}/><span>{lang==='es'?'Una cosa a la vez':'One thing at a time'}</span></div></section>
    <section className="card guide-search"><form method="get"><input type="hidden" name="lang" value={lang}/><input name="q" defaultValue={q} placeholder={t.placeholder} aria-label={t.search}/><button className="btn"><Search size={14}/> {t.search}</button></form><div className="hint">{t.hint}</div></section>
    <div className="guide-layout"><section className="card guide-panel"><div className="pill">{q?t.results:t.quick}</div><h2>{q?`${t.resultsFor} “${q}”`:t.trying}</h2>{q?<div className="result-list">{results.map((r:any)=>{const title=r.title||(lang==='es'?'Recurso de la iglesia':'Church resource');const auth=r.__authority||'local church';const st=r.__status||'current';return <article className="guide-result" key={r.id}><div className="result-head"><div><h3>{title}</h3><div className="result-tags"><span className={`result-tag ${auth.includes('official')||auth.includes('organization')||auth.includes('assembly')?'official':''}`}>{displayAuthority(auth)}</span><span className={`result-tag ${st==='current'?'current':''}`}>{displayStatus(st)}</span>{r.language_code&&<span className="result-tag">{String(r.language_code).toUpperCase()}</span>}</div></div><Compass size={16}/></div>{r.description&&<p>{r.description}</p>}<Link className="record-link resource-link" href={`/resources?q=${encodeURIComponent(title)}`}>{t.open}</Link></article>})}{!results.length&&<div className="guide-beta">{t.none}</div>}</div>:<div className="quick-grid">{quick.map(({title,body,href,Icon})=><Link className="quick-card" href={withLang(href)} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div>}</section>
      <aside className="card guide-panel"><div className="pill">{t.trust}</div><h2>{t.trustTitle}</h2><p className="small muted">{t.trustBody}</p><div className="guide-trust"><div className="trust-row"><strong>{lang==='es'?'Oficial / Organización':'Official / Organization'}</strong><span>{lang==='es'?'Material oficial de la Asamblea u organización.':'Assembly or organization material.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Distrito':'District'}</strong><span>{lang==='es'?'Documentos y dirección regional.':'Regional documents and direction.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Iglesia Local':'Local Church'}</strong><span>{lang==='es'?'Currículo y recursos aprobados localmente.':'Locally approved curriculum and resources.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Histórico / Referencia':'Legacy / Reference'}</strong><span>{lang==='es'?'Conservado como referencia, no presentado como enseñanza actual.':'Kept for reference, not presented as current teaching.'}</span></div></div><div className="guide-beta"><strong>{t.next}</strong> {t.nextBody}</div></aside></div>
  </main>
}
