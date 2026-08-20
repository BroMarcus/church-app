import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Church,Compass,FileUp,GraduationCap,HandHeart,Languages,MessageSquareWarning,Megaphone,Search,Sparkles,Users,Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { commonHelp,searchHelp } from '@/lib/help-knowledge'
import './guide.css'

const copy={
  en:{title:'What are you trying to do?',subtitle:'Ask a question in normal words. Kingdom Guide will explain it and take you to the right place.',searchTitle:'Ask Kingdom Guide',searchBody:'Ask how to use the app, where something is, or search for a church lesson, form, policy or resource.',search:'Ask / Search',placeholder:'Try: I forgot my password, where is my group, baptism…',hint:'Help answers come from Kingdom Network’s navigation knowledge base. Church-resource results come only from member-approved material stored by your church.',quick:'COMMON THINGS',leadership:'CHURCH SETUP & LEADERSHIP',answers:'HELP ANSWERS',resourceResults:'TRUSTED CHURCH RESOURCES',resultsFor:'Results for',none:'No matching approved church resource was found. The help answer above can still guide you.',open:'Open in Resource Library →',trust:'WHY THIS IS SAFE',trustTitle:'Help and church teaching stay separate.',trustBody:'Kingdom Guide can explain how to use Kingdom Network without inventing church teaching. When it searches teaching material, the source and archive status remain visible.',home:'← Home',english:'English',spanish:'Español',church:'Your Church',feedback:'Something missing or confusing?',feedbackBody:'Send an idea or problem directly to the pilot feedback box.',feedbackCta:'Share feedback →',openAnswer:'Open this section →'},
  es:{title:'¿Qué estás tratando de hacer?',subtitle:'Haz tu pregunta con palabras normales. Kingdom Guide te explicará y te llevará al lugar correcto.',searchTitle:'Pregúntale a Kingdom Guide',searchBody:'Pregunta cómo usar la aplicación, dónde encontrar algo o busca una lección, formulario, política o recurso.',search:'Preguntar / Buscar',placeholder:'Prueba: olvidé mi contraseña, dónde está mi grupo, bautismo…',hint:'Las respuestas de ayuda vienen de la base de navegación de Kingdom Network. Los recursos de iglesia vienen solamente de material aprobado para miembros.',quick:'COSAS COMUNES',leadership:'CONFIGURACIÓN Y LIDERAZGO',answers:'RESPUESTAS DE AYUDA',resourceResults:'RECURSOS CONFIABLES DE LA IGLESIA',resultsFor:'Resultados para',none:'No encontramos un recurso aprobado que coincida. La respuesta de ayuda arriba todavía puede orientarte.',open:'Abrir en la Biblioteca de Recursos →',trust:'POR QUÉ ES CONFIABLE',trustTitle:'La ayuda y la enseñanza de la iglesia se mantienen separadas.',trustBody:'Kingdom Guide puede explicar cómo usar Kingdom Network sin inventar enseñanza. Cuando busca material de iglesia, la fuente y el estado de archivo siguen visibles.',home:'← Inicio',english:'English',spanish:'Español',church:'Tu Iglesia',feedback:'¿Falta algo o algo es confuso?',feedbackBody:'Envía una idea o problema directamente al buzón de comentarios del piloto.',feedbackCta:'Compartir comentario →',openAnswer:'Abrir esta sección →'}
} as const

const memberQuick={
  en:[
    {title:'Today',body:'See what needs your attention right now.',href:'/today',Icon:Sparkles},
    {title:'Grow',body:'Open My Journey and see your next discipleship step.',href:'/journey',Icon:GraduationCap},
    {title:'Connect',body:'Find your Friendship Group and church connections.',href:'/groups',Icon:Users},
    {title:'Pray',body:'Share a prayer need or ask for private pastoral help.',href:'/prayer',Icon:HandHeart},
    {title:'Serve',body:'See ministry opportunities and where you can help.',href:'/serve',Icon:Church},
    {title:'Find a resource',body:'Search church lessons, Bible studies, forms and trusted material.',href:'/resources',Icon:Search}
  ],
  es:[
    {title:'Hoy',body:'Mira lo que necesita tu atención ahora.',href:'/today',Icon:Sparkles},
    {title:'Crecer',body:'Abre Mi Camino y mira tu próximo paso de discipulado.',href:'/journey',Icon:GraduationCap},
    {title:'Conectar',body:'Encuentra tu Grupo de Amistad y conexiones de la iglesia.',href:'/groups',Icon:Users},
    {title:'Orar',body:'Comparte una petición o pide ayuda pastoral en privado.',href:'/prayer',Icon:HandHeart},
    {title:'Servir',body:'Mira oportunidades de ministerio y dónde puedes ayudar.',href:'/serve',Icon:Church},
    {title:'Encontrar un recurso',body:'Busca lecciones, estudios bíblicos, formularios y material confiable.',href:'/resources',Icon:Search}
  ]
} as const
const adminQuick={
  en:[{title:'What should I set up next?',body:'Church Builder shows the next pilot-essential setup step.',href:'/church/launch',Icon:Wrench},{title:'Add or invite people',body:'Invite leaders or members and review pilot access.',href:'/church/invites',Icon:Church},{title:'Upload church materials',body:'Put manuals, forms, curriculum and files into Setup Inbox.',href:'/church/setup-inbox',Icon:FileUp},{title:'Who needs leadership attention?',body:'Open the Leadership Today queue.',href:'/church/leadership',Icon:HandHeart},{title:'Who needs follow-up?',body:'Open guest and Bible-study follow-up.',href:'/outreach',Icon:Megaphone}],
  es:[{title:'¿Qué debo configurar después?',body:'Church Builder muestra el siguiente paso esencial del piloto.',href:'/church/launch',Icon:Wrench},{title:'Agregar o invitar personas',body:'Invita líderes o miembros y revisa el acceso del piloto.',href:'/church/invites',Icon:Church},{title:'Subir materiales de la iglesia',body:'Pon manuales, formularios, currículo y archivos en la Bandeja de Configuración.',href:'/church/setup-inbox',Icon:FileUp},{title:'¿Quién necesita atención del liderazgo?',body:'Abre la lista de Liderazgo Hoy.',href:'/church/leadership',Icon:HandHeart},{title:'¿Quién necesita seguimiento?',body:'Abre seguimiento de visitas y estudios bíblicos.',href:'/outreach',Icon:Megaphone}]
} as const

const lower=(v:any)=>String(v??'').toLowerCase()
const authority=(r:any)=>r.official_source?'official organization':lower(r.source_scope||'local_church')
const status=(r:any)=>lower(r.archive_status||'current')
const authorityScore=(v:string)=>v.includes('official')||v.includes('organization')?35:v.includes('district')?28:v.includes('local')||v.includes('church')?20:v.includes('ministry')?12:v.includes('group')?8:5
const statusScore=(v:string)=>v==='current'?25:v.includes('reference')?16:v==='legacy'?4:v==='draft'?-15:v==='retired'?-30:8
const display=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function GuidePage({searchParams}:{searchParams:Promise<{q?:string;lang?:string}>}){
  const query=await searchParams,lang=query.lang==='es'?'es':'en',t=copy[lang],q=String(query.q??'').trim(),needle=q.toLowerCase()
  const withLang=(href:string)=>{const join=href.includes('?')?'&':'?';return lang==='es'?`${href}${join}lang=es`:href}
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches,isAdmin=['pastor','church_admin'].includes(membership.role)
  const helpResults=q?searchHelp(q,lang):commonHelp(lang).slice(0,6)
  let results:any[]=[]
  if(q){
    const {data,error}=await supabase.from('media_assets').select('id,title,description,asset_type,resource_type,language_code,source_year,ministry_area,topic_tags,scripture_refs,archive_status,source_label,source_scope,official_source,approved_for_members,library_kind,organization_status,created_at').eq('church_id',membership.church_id).eq('approved_for_members',true).not('archive_status','in','(draft,retired)').order('created_at',{ascending:false}).limit(400)
    if(error)console.error('Kingdom Guide resource search failed',{message:error.message})
    results=(data??[]).map((r:any)=>{const searchable=[r.title,r.description,r.asset_type,r.resource_type,r.language_code,r.source_year,r.ministry_area,r.topic_tags,r.scripture_refs,r.source_label,r.source_scope,r.library_kind,r.organization_status].flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean).join(' ').toLowerCase();let score=0;if(lower(r.title).includes(needle))score+=55;if(lower(r.description).includes(needle))score+=22;if(searchable.includes(needle))score+=12;score+=authorityScore(authority(r))+statusScore(status(r));return {...r,__score:score,__searchable:searchable,__authority:authority(r),__status:status(r)}}).filter((r:any)=>r.__searchable.includes(needle)||lower(r.title).includes(needle)||lower(r.description).includes(needle)).sort((a:any,b:any)=>b.__score-a.__score||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,24)
  }

  return <main className="shell"><header className="topbar"><div><Link href={withLang('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • Kingdom Guide</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=en`:'?lang=en'}`}>{t.english}</Link><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=es`:'?lang=es'}`}>{t.spanish}</Link><Link className="ghost" href={withLang('/')}>{t.home}</Link></div></header>
    <section className="guide-hero card"><div><div className="pill">KINGDOM GUIDE</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="hero-stat"><Sparkles size={24}/><span>{lang==='es'?'Pregunta con tus propias palabras':'Ask in your own words'}</span></div></section>

    {!q&&<section className="card guide-panel" style={{marginBottom:16}}><div className="pill">{t.quick}</div><div className="quick-grid" style={{marginTop:14}}>{memberQuick[lang].map(({title,body,href,Icon})=><Link className="quick-card" href={withLang(href)} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></section>}
    {isAdmin&&!q&&<details className="card guide-panel" style={{marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.leadership}</summary><div className="quick-grid" style={{marginTop:14}}>{adminQuick[lang].map(({title,body,href,Icon})=><Link className="quick-card" href={withLang(href)} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div></details>}

    <section className="card guide-search"><div style={{marginBottom:12}}><div className="pill">{t.searchTitle.toUpperCase()}</div><h2 style={{margin:'8px 0 4px'}}>{t.searchTitle}</h2><p className="small muted" style={{margin:0}}>{t.searchBody}</p></div><form method="get"><input type="hidden" name="lang" value={lang}/><input name="q" defaultValue={q} placeholder={t.placeholder} aria-label={t.searchTitle}/><button className="btn"><Search size={14}/> {t.search}</button></form><div className="hint">{t.hint}</div></section>

    <section className="card guide-panel" style={{marginTop:16}}><div className="pill">{t.answers}</div>{q&&<h2>{t.resultsFor} “{q}”</h2>}<div className="result-list">{helpResults.map(answer=><article className="guide-result" key={answer.id}><h3>{answer.question}</h3><p>{answer.answer}</p><Link className="record-link resource-link" href={withLang(answer.href)}>{answer.cta} →</Link></article>)}</div></section>

    {q&&<section className="card guide-panel" style={{marginTop:16}}><div className="pill">{t.resourceResults}</div><h2>{t.resultsFor} “{q}”</h2><div className="result-list">{results.map((r:any)=>{const title=r.title||(lang==='es'?'Recurso de la iglesia':'Church resource');return <article className="guide-result" key={r.id}><div className="result-head"><div><h3>{title}</h3><div className="result-tags"><span className={`result-tag ${r.__authority.includes('official')||r.__authority.includes('organization')?'official':''}`}>{display(r.__authority)}</span><span className={`result-tag ${r.__status==='current'?'current':''}`}>{display(r.__status)}</span>{r.language_code&&<span className="result-tag">{String(r.language_code).toUpperCase()}</span>}</div></div><Compass size={16}/></div>{r.description&&<p>{r.description}</p>}<Link className="record-link resource-link" href={withLang(`/resources?q=${encodeURIComponent(title)}`)}>{t.open}</Link></article>})}{!results.length&&<div className="guide-beta">{t.none}</div>}</div></section>}

    <div className="guide-layout" style={{marginTop:16}}><section className="card guide-panel"><div className="pill">{t.trust}</div><h2>{t.trustTitle}</h2><p className="small muted">{t.trustBody}</p></section><aside className="card guide-panel"><MessageSquareWarning size={20}/><h2>{t.feedback}</h2><p className="small muted">{t.feedbackBody}</p><Link className="ghost" href={withLang('/feedback')}>{t.feedbackCta}</Link></aside></div>
  </main>
}
