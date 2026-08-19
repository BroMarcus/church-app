import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,Church,Compass,GraduationCap,HandHeart,Languages,MessageCircle,Megaphone,Search,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './guide.css'

const copy={
  en:{
    title:'Find the right next place to go.',subtitle:'Navigate Kingdom Network and search trusted church resources with source authority kept visible.',search:'Search trusted resources',placeholder:'Search a topic, Scripture, lesson, policy or resource…',hint:'Guide Beta searches resources already stored in your church library. It does not generate doctrinal answers or search the open internet.',quick:'QUICK GUIDE',results:'TRUSTED RESULTS',trying:'What are you trying to do?',resultsFor:'Results for',none:'No member-visible church resource matched that search yet. Try a broader word, or open the Resource Library to browse what has been uploaded.',open:'Open in Resource Library →',trust:'SOURCE TRUST',trustTitle:'Guide knows sources are not equal.',trustBody:'The resource layer preserves where material came from and whether it is current, legacy or reference-only.',next:'What comes next:',nextBody:'once an AI provider/security boundary is chosen, Kingdom Guide can use this same approved-source layer for cited answers, course recommendations and personalized discipleship help. Until then, Beta stays navigation/search only.',home:'← Home',english:'English',spanish:'Español',church:'Your Church'
  },
  es:{
    title:'Encuentra el siguiente lugar correcto.',subtitle:'Navega Kingdom Network y busca recursos confiables de tu iglesia, mostrando claramente la autoridad de cada fuente.',search:'Buscar recursos confiables',placeholder:'Busca un tema, Escritura, lección, política o recurso…',hint:'Kingdom Guide Beta busca recursos que ya están guardados en la biblioteca de tu iglesia. No genera respuestas doctrinales ni busca en internet abierto.',quick:'GUÍA RÁPIDA',results:'RESULTADOS CONFIABLES',trying:'¿Qué estás tratando de hacer?',resultsFor:'Resultados para',none:'No encontramos un recurso visible para miembros con esa búsqueda. Prueba una palabra más general o abre la Biblioteca de Recursos.',open:'Abrir en la Biblioteca de Recursos →',trust:'CONFIANZA DE FUENTES',trustTitle:'Kingdom Guide sabe que no todas las fuentes son iguales.',trustBody:'La biblioteca conserva de dónde vino cada material y si es actual, histórico o solo de referencia.',next:'Próximamente:',nextBody:'cuando se elija un proveedor de IA y los límites de seguridad, Kingdom Guide podrá usar estas mismas fuentes aprobadas para respuestas con citas, recomendaciones de cursos y ayuda personalizada de discipulado. Por ahora, Beta se mantiene como navegación y búsqueda.',home:'← Inicio',english:'English',spanish:'Español',church:'Tu Iglesia'
  }
} as const

const quick={
  en:[
    {title:'Find my next learning step',body:'Open courses, pathways, badges and current progress.',href:'/learning',Icon:GraduationCap},
    {title:'Find a Friendship Group',body:'Browse groups by area, schedule, language and availability.',href:'/groups',Icon:Users},
    {title:'See what’s happening',body:'Church, ministry, special and district events.',href:'/calendar',Icon:CalendarDays},
    {title:'Reach or follow up with someone',body:'Open the Outreach pipeline and follow-up history.',href:'/outreach',Icon:Megaphone},
    {title:'Ask for pastoral care',body:'Send a private prayer or pastoral-care request.',href:'/help',Icon:HandHeart},
    {title:'Message a church member',body:'Open private one-to-one member conversations.',href:'/messages',Icon:MessageCircle},
    {title:'Browse trusted resources',body:'Search the full current and legacy Resource Library.',href:'/resources',Icon:BookOpen},
    {title:'See my church family',body:'Open the member directory and church-visible profiles.',href:'/directory',Icon:Church}
  ],
  es:[
    {title:'Encontrar mi próximo paso de aprendizaje',body:'Abre cursos, caminos y tu progreso actual.',href:'/learning',Icon:GraduationCap},
    {title:'Encontrar un Grupo de Amistad',body:'Busca grupos por área, horario, idioma y disponibilidad.',href:'/groups',Icon:Users},
    {title:'Ver lo que está pasando',body:'Eventos de la iglesia, ministerios y distrito.',href:'/calendar',Icon:CalendarDays},
    {title:'Dar seguimiento a alguien',body:'Abre el proceso de alcance y el historial de seguimiento.',href:'/outreach',Icon:Megaphone},
    {title:'Pedir cuidado pastoral',body:'Envía una solicitud privada de oración o cuidado pastoral.',href:'/help',Icon:HandHeart},
    {title:'Enviar mensaje a un miembro',body:'Abre conversaciones privadas con miembros de la iglesia.',href:'/messages',Icon:MessageCircle},
    {title:'Buscar recursos confiables',body:'Busca en la Biblioteca de Recursos actual e histórica.',href:'/resources',Icon:BookOpen},
    {title:'Ver mi familia de la iglesia',body:'Abre el directorio y los perfiles visibles de miembros.',href:'/directory',Icon:Church}
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
  const q=String(query.q??'').trim()
  const needle=q.toLowerCase()
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  let results:any[]=[]
  if(q){
    const {data}=await supabase.from('media_assets').select('*').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(400)
    results=(data??[]).filter((r:any)=>r.member_visible!==false).map((r:any)=>{
      const searchable=[r.title,r.description,r.ministry,r.topic,r.topic_tags,r.tags,r.scripture_refs,r.scripture_references,r.language_code,r.resource_year,r.year].flatMap(v=>Array.isArray(v)?v:[v]).filter(Boolean).join(' ').toLowerCase()
      let score=0
      if(lower(r.title).includes(needle))score+=55
      if(lower(r.description).includes(needle))score+=22
      if(searchable.includes(needle))score+=12
      score+=authorityScore(authority(r))+statusScore(status(r))
      return {...r,__score:score,__searchable:searchable,__authority:authority(r),__status:status(r)}
    }).filter((r:any)=>r.__searchable.includes(needle)||lower(r.title).includes(needle)||lower(r.description).includes(needle)).sort((a:any,b:any)=>b.__score-a.__score||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,24)
  }

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • Kingdom Guide Beta</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=en`:'?lang=en'}`}>{t.english}</Link><Link className="ghost" href={`/guide${q?`?q=${encodeURIComponent(q)}&lang=es`:'?lang=es'}`}>{t.spanish}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="guide-hero card"><div><div className="pill">KINGDOM GUIDE • BETA</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="hero-stat"><Sparkles size={24}/><span>{lang==='es'?'Fuentes confiables primero':'Trusted-source groundwork'}</span></div></section>

    <section className="card guide-search"><form method="get"><input type="hidden" name="lang" value={lang}/><input name="q" defaultValue={q} placeholder={t.placeholder} aria-label={t.search}/><button className="btn"><Search size={14}/> {t.search}</button></form><div className="hint">{t.hint}</div></section>

    <div className="guide-layout"><section className="card guide-panel"><div className="pill">{q?t.results:t.quick}</div><h2>{q?`${t.resultsFor} “${q}”`:t.trying}</h2>{q?<div className="result-list">{results.map((r:any)=>{const title=r.title||(lang==='es'?'Recurso de la iglesia':'Church resource');const auth=r.__authority||'local church';const st=r.__status||'current';return <article className="guide-result" key={r.id}><div className="result-head"><div><h3>{title}</h3><div className="result-tags"><span className={`result-tag ${auth.includes('official')||auth.includes('organization')||auth.includes('assembly')?'official':''}`}>{displayAuthority(auth)}</span><span className={`result-tag ${st==='current'?'current':''}`}>{displayStatus(st)}</span>{r.language_code&&<span className="result-tag">{String(r.language_code).toUpperCase()}</span>}</div></div><Compass size={16}/></div>{r.description&&<p>{r.description}</p>}<Link className="record-link resource-link" href={`/resources?q=${encodeURIComponent(title)}`}>{t.open}</Link></article>})}{!results.length&&<div className="guide-beta">{t.none}</div>}</div>:<div className="quick-grid">{quick[lang].map(({title,body,href,Icon})=><Link className="quick-card" href={href} key={href}><div className="quick-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{body}</span></div></Link>)}</div>}</section>

      <aside className="card guide-panel"><div className="pill">{t.trust}</div><h2>{t.trustTitle}</h2><p className="small muted">{t.trustBody}</p><div className="guide-trust"><div className="trust-row"><strong>{lang==='es'?'Oficial / Organización':'Official / Organization'}</strong><span>{lang==='es'?'Material oficial de la Asamblea u organización con mayor autoridad.':'Highest-authority Assembly or organization material.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Distrito':'District'}</strong><span>{lang==='es'?'Documentos, entrenamiento o dirección regional.':'Regional documents, training or direction.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Aprobado por la Iglesia Local':'Local Church Approved'}</strong><span>{lang==='es'?'Currículo y recursos actuales aprobados por la iglesia local.':'Current curriculum and resources approved for the local church.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Recurso de Ministerio / Líder':'Ministry / Leader Resource'}</strong><span>{lang==='es'?'Material útil de ministerio con su fuente identificada.':'Useful ministry material with its source still identified.'}</span></div><div className="trust-row"><strong>{lang==='es'?'Histórico / Referencia':'Legacy / Reference'}</strong><span>{lang==='es'?'Conservado para investigación e ideas, no presentado como enseñanza actual.':'Preserved for research and lesson ideas, not silently presented as current teaching.'}</span></div></div><div className="guide-beta"><strong>{t.next}</strong> {t.nextBody}</div></aside>
    </div>
  </main>
}
