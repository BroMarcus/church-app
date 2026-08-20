import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,Church,Compass,FileUp,GraduationCap,HandHeart,Languages,MessageCircle,MessageSquareWarning,Megaphone,Search,Sparkles,Users,Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './guide.css'

const copy={
  en:{title:'What are you trying to do?',subtitle:'Pick one thing. Kingdom Guide will take you to the right place.',searchTitle:'Search church resources',searchBody:'Looking for a lesson, Scripture topic, policy, form or church resource?',search:'Search',placeholder:'Try: baptism, prayer, First Steps, giving…',hint:'Results come only from member-approved resources already stored by your church. Kingdom Guide does not invent doctrine or silently replace the source.',quick:'COMMON THINGS',leadership:'CHURCH SETUP & LEADERSHIP',results:'TRUSTED RESULTS',resultsFor:'Results for',none:'No matching approved church resource was found. Try a simpler word or open the Resource Library.',open:'Open in Resource Library →',trust:'WHY THIS IS SAFE',trustTitle:'The source stays visible.',trustBody:'Kingdom Network keeps the material source and archive status visible so members and leaders can tell current teaching from reference material.',home:'← Home',english:'English',spanish:'Español',church:'Your Church',feedback:'Something missing or confusing?',feedbackBody:'Send an idea or problem directly to the pilot feedback box.',feedbackCta:'Share feedback →'},
  es:{title:'¿Qué estás tratando de hacer?',subtitle:'Elige una sola cosa. Kingdom Guide te llevará al lugar correcto.',searchTitle:'Buscar recursos de la iglesia',searchBody:'¿Buscas una lección, tema bíblico, política, formulario o recurso de la iglesia?',search:'Buscar',placeholder:'Prueba: bautismo, oración, Primeros Pasos, ofrenda…',hint:'Los resultados vienen solamente de recursos aprobados para miembros que tu iglesia ya guardó. Kingdom Guide no inventa doctrina ni reemplaza la fuente sin avisar.',quick:'COSAS COMUNES',leadership:'CONFIGURACIÓN Y LIDERAZGO',results:'RESULTADOS CONFIABLES',resultsFor:'Resultados para',none:'No encontramos un recurso aprobado de la iglesia que coincida. Prueba una palabra más sencilla o abre la Biblioteca de Recursos.',open:'Abrir en la Biblioteca de Recursos →',trust:'POR QUÉ ES CONFIABLE',trustTitle:'La fuente siempre queda visible.',trustBody:'Kingdom Network mantiene visible la fuente y el estado de archivo del material para distinguir enseñanza actual de material de referencia.',home:'← Inicio',english:'English',spanish:'Español',church:'Tu Iglesia',feedback:'¿Falta algo o algo es confuso?',feedbackBody:'Envía una idea o problema directamente al buzón de comentarios del piloto.',feedbackCta:'Compartir comentario →'}
} as const

const memberQuick={
  en:[
    {title:'What matters today?',body:'See what needs your attention right now.',href:'/today',Icon:Sparkles},
    {title:'What is my next step?',body:'Open My Journey and see what comes next.',href:'/journey',Icon:GraduationCap},
    {title:'When is the next church event?',body:'See services, classes and upcoming events.',href:'/calendar',Icon:CalendarDays},
    {title:'How do I find my group?',body:'See your Friendship Group or browse groups.',href:'/groups',Icon:Users},
    {title:'I need prayer or private help',body:'Share a prayer need or contact pastoral care privately.',href:'/prayer',Icon:HandHeart},
    {title:'How do I contact someone?',body:'Open Messages or find someone in the church directory.',href:'/messages',Icon:MessageCircle}
  ],
  es:[
    {title:'¿Qué importa hoy?',body:'Mira lo que necesita tu atención ahora.',href:'/today',Icon:Sparkles},
    {title:'¿Cuál es mi próximo paso?',body:'Abre Mi Jornada y mira qué sigue.',href:'/journey',Icon:GraduationCap},
    {title:'¿Cuándo es el próximo evento?',body:'Mira servicios, clases y eventos próximos.',href:'/calendar',Icon:CalendarDays},
    {title:'¿Cómo encuentro mi grupo?',body:'Mira tu Grupo de Amistad o busca grupos.',href:'/groups',Icon:Users},
    {title:'Necesito oración o ayuda privada',body:'Comparte una petición o contacta cuidado pastoral en privado.',href:'/prayer',Icon:HandHeart},
    {title:'¿Cómo contacto a alguien?',body:'Abre Mensajes o busca a alguien en el directorio.',href:'/messages',Icon:MessageCircle}
  ]
} as const

const adminQuick={
  en:[
    {title:'What should I set up next?',body:'Church Builder shows the next pilot-essential setup step.',href:'/church/launch',Icon:Wrench},
    {title:'Add or invite people',body:'Invite leaders or members and review pilot access.',href:'/church/invites',Icon:Church},
    {title:'Upload church materials',body:'Put manuals, forms, curriculum and files into Setup Inbox.',href:'/church/setup-inbox',Icon:FileUp},
    {title:'Who needs leadership attention?',body:'Open the Leadership Today queue.',href:'/church/leadership',Icon:HandHeart},
    {title:'Who needs follow-up?',body:'Open guest and Bible-study follow-up.',href:'/outreach',Icon:Megaphone}
  ],
  es:[
    {title:'¿Qué debo configurar después?',body:'Church Builder muestra el siguiente paso esencial del piloto.',href:'/church/launch',Icon:Wrench},
    {title:'Agregar o invitar personas',body:'Invita líderes o miembros y revisa el acceso del piloto.',href:'/church/invites',Icon:Church},
    {title:'Subir materiales de la iglesia',body:'Pon manuales, formularios, currículo y archivos en la Bandeja de Configuración.',href:'/church/setup-inbox',Icon:FileUp},
    {title:'¿Quién necesita atención del liderazgo?',body:'Abre la lista de Liderazgo Hoy.',href:'/church/leadership',Icon:HandHeart},
    {title:'¿Quién necesita seguimiento?',body:'Abre seguimiento de visitas y estudios bíblicos.',href:'/outreach',Icon:Megaphone}
  ]
} as const

const lower=(v:any)=>String(v??'').toLowerCase()
const authority=(r:any)=>r.official_source?'official organization':lower(r.source_scope||'local_church')
const status=(r:any)=>lower(r.archive_status||'current')
const authorityScore=(v:string)=>v.includes('official')||v.includes('organization')?35:v.includes('district')?28:v.includes('local')||v.includes('church')?20:v.includes('ministry')?12:v.includes('group')?8:5
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
  let results:any[]=[]
  if(q){
    const {data,error}=await supabase.from('media_assets').select('id,title,description,asset_type,resource_type,language_code,source_year,ministry_area,topic_tags,scripture_refs,archive_status,source_label,source_scope,official_source,approved_for_members,library_kind,organization_status,created_at').eq('church_id',membership.church_id).eq('approved_for_members',true).not('archive_status','in','(draft,retired)').order('created_at',{ascending:false}).limit(400)
    if(error)console.error('Kingdom Guide resource search failed',{message:error.message})
    results=(data??[]).map((r:any)=>{const searchable=[r.title,r.description,r.asset_type,r.resource_type,r.language_code,r.source_year,r.ministry_area,r.topic_tags,r.scripture_refs,r.source_label,r.source_scope,r.library_kind,r.organization_status].flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean).join(' ').toLowerCase();let score=0;if(lower(r.title).includes(needle))score+=55;if(lower(r.description).includes(needle))score+=22;if(searchable.includes(needle))score+=12;score+=authorityScore(authority(r))+statusScore(status(r));return {...r,__score:score,__searchable:searchable,__authority:authority(r),__status:status(r)}}).filter((r:any)=>r.__searchable.includes(needle)||lower(r.title).includes(needle)||lower(r.description).includes(needle)).sort((a:any,b:any)=>b.__score-a.__score||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,24)
  }

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • Kingdom Guide</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=en`:'?lang=en'}`}>{t.english}</Link><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=es`:'?lang=es'}`}>{t.spanish}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="guide-hero card"><div><div className="pill">KINGDOM GUIDE</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="hero-stat"><Sparkles size={24}/><span>{lang==='es'?'Una cosa a la vez':'One thing at a time'}</span></div></section>

    {!q&&<section className="card guide-panel" style={{marginBottom:16}}><div className="pill">{t.quick}</div><div className="quick-grid" style={{marginTop:14}}>{memberQuick[lang].map(({title,body,href,Icon})=><Link className="quick-card" href={withLang(href)} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></section>}

    {isAdmin&&!q&&<details className="card guide-panel" style={{marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.leadership}</summary><div className="quick-grid" style={{marginTop:14}}>{adminQuick[lang].map(({title,body,href,Icon})=><Link className="quick-card" href={withLang(href)} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></details>}

    <section className="card guide-search"><div style={{marginBottom:12}}><div className="pill">{t.searchTitle.toUpperCase()}</div><h2 style={{margin:'8px 0 4px'}}>{t.searchTitle}</h2><p className="small muted" style={{margin:0}}>{t.searchBody}</p></div><form method="get"><input type="hidden" name="lang" value={lang}/><input name="q" defaultValue={q} placeholder={t.placeholder} aria-label={t.searchTitle}/><button className="btn"><Search size={14}/> {t.search}</button></form><div className="hint">{t.hint}</div></section>

    {q&&<section className="card guide-panel" style={{marginTop:16}}><div className="pill">{t.results}</div><h2>{t.resultsFor} “{q}”</h2><div className="result-list">{results.map((r:any)=>{const title=r.title||(lang==='es'?'Recurso de la iglesia':'Church resource');const auth=r.__authority||'local_church';const st=r.__status||'current';return <article className="guide-result" key={r.id}><div className="result-head"><div><h3>{title}</h3><div className="result-tags"><span className={`result-tag ${auth.includes('official')||auth.includes('organization')?'official':''}`}>{displayAuthority(auth)}</span><span className={`result-tag ${st==='current'?'current':''}`}>{displayStatus(st)}</span>{r.language_code&&<span className="result-tag">{String(r.language_code).toUpperCase()}</span>}</div></div><Compass size={16}/></div>{r.description&&<p>{r.description}</p>}<Link className="record-link resource-link" href={`/resources?q=${encodeURIComponent(title)}`}>{t.open}</Link></article>})}{!results.length&&<div className="guide-beta">{t.none}</div>}</div></section>}

    <div className="guide-layout" style={{marginTop:16}}><section className="card guide-panel"><div className="pill">{t.trust}</div><h2>{t.trustTitle}</h2><p className="small muted">{t.trustBody}</p><div className="guide-trust"><div className="trust-row"><strong>{lang==='es'?'Oficial / Organización':'Official / Organization'}</strong><span>{lang==='es'?'Material oficial de la Asamblea u organización.':'Assembly or organization material.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Distrito':'District'}</strong><span>{lang==='es'?'Documentos y dirección regional.':'Regional documents and direction.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Iglesia Local':'Local Church'}</strong><span>{lang==='es'?'Currículo y recursos aprobados localmente.':'Locally approved curriculum and resources.'}</span></div></div></section><aside className="card guide-panel"><MessageSquareWarning size={20}/><h2>{t.feedback}</h2><p className="small muted">{t.feedbackBody}</p><Link className="ghost" href={withLang('/feedback')}>{t.feedbackCta}</Link></aside></div>
  </main>
}
