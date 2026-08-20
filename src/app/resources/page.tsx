import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive,BookOpen,FileText,Images,Languages,Search,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ResourceUploader } from './resource-uploader'
import './resources.css'

const label=(v?:string|null)=>String(v??'').replaceAll('_',' ')

const copy={
  en:{library:'Resource Library',title:'Find a church resource.',body:'Search lessons, Bible studies, handouts, sermons and trusted ministry resources your church has made available.',shown:'resources shown',legacy:'older resources',search:'Search resources',placeholder:'Prayer, baptism, First Steps, soul winning…',filters:'More filters',status:'Status',resourceLanguage:'Resource language',type:'Type',allStatuses:'All statuses',allLanguages:'All languages',allTypes:'All types',filter:'Apply filters',open:'Open resource',about:'About this resource',official:'Official',scriptures:'Scriptures',source:'Source',memberVisible:'Member visible',leadershipOnly:'Leadership only',none:'No matching resources yet.',noneBody:'Try a simpler search or remove one of the filters.',leadership:'Leadership Tools',leadershipBody:'Upload and organize church resources without putting those controls in front of members.',media:'Media Library',learning:'Learning',home:'← Home'},
  es:{library:'Biblioteca de Recursos',title:'Encuentra un recurso de la iglesia.',body:'Busca lecciones, estudios bíblicos, hojas de trabajo, sermones y recursos de ministerio que tu iglesia haya puesto a disposición.',shown:'recursos mostrados',legacy:'recursos anteriores',search:'Buscar recursos',placeholder:'Oración, bautismo, Primeros Pasos, evangelismo…',filters:'Más filtros',status:'Estado',resourceLanguage:'Idioma del recurso',type:'Tipo',allStatuses:'Todos los estados',allLanguages:'Todos los idiomas',allTypes:'Todos los tipos',filter:'Aplicar filtros',open:'Abrir recurso',about:'Acerca de este recurso',official:'Oficial',scriptures:'Escrituras',source:'Fuente',memberVisible:'Visible para miembros',leadershipOnly:'Solo liderazgo',none:'No encontramos recursos que coincidan.',noneBody:'Prueba una búsqueda más sencilla o quita uno de los filtros.',leadership:'Herramientas de Liderazgo',leadershipBody:'Sube y organiza recursos de la iglesia sin poner esos controles delante de los miembros.',media:'Biblioteca de Medios',learning:'Aprendizaje',home:'← Inicio'}
} as const

const statusOptions={
  en:[['all','All statuses'],['current','Current'],['legacy','Older / legacy'],['draft','Draft'],['reference_only','Reference only'],['retired','Retired']],
  es:[['all','Todos los estados'],['current','Actual'],['legacy','Anterior / legado'],['draft','Borrador'],['reference_only','Solo referencia'],['retired','Retirado']]
} as const

const typeOptions={
  en:[['all','All types'],['lesson','Lesson'],['bible_study','Bible study'],['teacher_guide','Teacher guide'],['handout','Handout'],['sermon','Sermon'],['policy','Policy / constitution'],['slides','Slides'],['training','Training'],['video','Video'],['audio','Audio'],['other','Other']],
  es:[['all','Todos los tipos'],['lesson','Lección'],['bible_study','Estudio bíblico'],['teacher_guide','Guía del maestro'],['handout','Hoja de trabajo'],['sermon','Sermón'],['policy','Política / constitución'],['slides','Diapositivas'],['training','Capacitación'],['video','Video'],['audio','Audio'],['other','Otro']]
} as const

export default async function ResourcesPage({searchParams}:{searchParams:Promise<{status?:string;lang?:string;resource_lang?:string;type?:string;q?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(lang==='es'?'/login?lang=es':'/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect(lang==='es'?'/?lang=es':'/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const canManage=['group_leader','ministry_leader','minister','pastor','church_admin'].includes(membership.role)
  const canApproveOfficial=['pastor','church_admin'].includes(membership.role)

  let query=supabase.from('media_assets').select('*').eq('church_id',membership.church_id).eq('library_kind','knowledge').order('source_year',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
  if(!canManage)query=query.eq('approved_for_members',true)
  if(params.status&&params.status!=='all')query=query.eq('archive_status',params.status)
  if(params.resource_lang&&params.resource_lang!=='all')query=query.eq('language_code',params.resource_lang)
  if(params.type&&params.type!=='all')query=query.eq('resource_type',params.type)
  if(params.q?.trim())query=query.ilike('title',`%${params.q.trim()}%`)
  const {data:assets}=await query

  const rows=await Promise.all((assets??[]).map(async(asset:any)=>{const signed=await supabase.storage.from('resource-library').createSignedUrl(asset.storage_path,60*10);return {...asset,url:signed.data?.signedUrl??null}}))
  const legacy=rows.filter((r:any)=>r.archive_status==='legacy').length
  const withLang=(href:string)=>lang==='es'?`${href}${href.includes('?')?'&':'?'}lang=es`:href
  const languageHref=(next:'en'|'es')=>{const q=new URLSearchParams();q.set('lang',next);if(params.q?.trim())q.set('q',params.q.trim());if(params.status&&params.status!=='all')q.set('status',params.status);if(params.resource_lang&&params.resource_lang!=='all')q.set('resource_lang',params.resource_lang);if(params.type&&params.type!=='all')q.set('type',params.type);return `/resources?${q.toString()}`}

  return <main className="shell"><header className="topbar"><div><Link href={withLang('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??(lang==='es'?'Tu Iglesia':'Your Church')} • {t.library}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={languageHref('en')}>English</Link><Link className="ghost" href={languageHref('es')}>Español</Link><Link className="ghost" href={withLang('/media')}><Images size={13}/> {t.media}</Link><Link className="ghost" href={withLang('/learning')}>{t.learning}</Link><Link className="ghost" href={withLang('/')}>{t.home}</Link></div></header>

    <section className="card resources-hero"><div><div className="pill">{t.library.toUpperCase()}</div><h1>{t.title}</h1><p className="muted">{t.body}</p></div><div className="resource-counter"><strong>{rows.length}</strong><span>{t.shown}{canManage?` • ${legacy} ${t.legacy}`:''}</span></div></section>

    <form className="card" style={{padding:14,marginBottom:14}} action="/resources" method="get"><input type="hidden" name="lang" value={lang}/><label><span>{t.search}</span><div className="row" style={{gap:8,marginTop:6}}><input name="q" defaultValue={params.q??''} placeholder={t.placeholder} style={{flex:1}}/><button className="btn"><Search size={13}/> {t.search}</button></div></label><details style={{marginTop:12}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.filters}</summary><div className="resource-form-grid" style={{marginTop:12}}><label><span>{t.status}</span><select name="status" defaultValue={params.status??'all'}>{statusOptions[lang].map(([value,text])=><option value={value} key={value}>{text}</option>)}</select></label><label><span>{t.resourceLanguage}</span><select name="resource_lang" defaultValue={params.resource_lang??'all'}><option value="all">{t.allLanguages}</option><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>{t.type}</span><select name="type" defaultValue={params.type??'all'}>{typeOptions[lang].map(([value,text])=><option value={value} key={value}>{text}</option>)}</select></label></div><button className="ghost" style={{marginTop:9}}><Search size={13}/> {t.filter}</button></details></form>

    <section className="resource-grid-live">{rows.map((r:any)=><article className="card resource-card" key={r.id}><div className="resource-card-top"><div>{r.resource_type==='bible_study'?<BookOpen/>:r.archive_status==='legacy'?<Archive/>:<FileText/>}</div>{r.official_source&&<span className="resource-status current"><ShieldCheck size={10}/> {t.official}</span>}</div><div><h3>{r.title}</h3>{r.description&&<p>{r.description}</p>}</div><div className="resource-meta"><span>{label(r.resource_type)}</span><span><Languages size={9}/> {r.language_code==='es'?'Español':r.language_code==='bilingual'?'Bilingual':'English'}</span>{r.ministry_area&&<span>{r.ministry_area}</span>}</div><div className="resource-actions">{r.url&&<a className="btn" href={r.url} target="_blank" rel="noreferrer">{t.open}</a>}</div><details style={{marginTop:10}}><summary className="small" style={{cursor:'pointer',fontWeight:800}}>{t.about}</summary><div className="small muted" style={{display:'grid',gap:6,marginTop:8}}><span>{t.status}: {label(r.archive_status)}</span><span>{lang==='es'?'Origen':'Source scope'}: {label(r.source_scope)}</span>{r.source_year&&<span>{lang==='es'?'Año':'Year'}: {r.source_year}</span>}{r.topic_tags?.length>0&&<span>{lang==='es'?'Temas':'Topics'}: {r.topic_tags.join(' • ')}</span>}{r.scripture_refs?.length>0&&<span>{t.scriptures}: {r.scripture_refs.join(' • ')}</span>}{r.source_label&&<span>{t.source}: {r.source_label}</span>}{canManage&&<span>{r.approved_for_members?t.memberVisible:t.leadershipOnly}</span>}</div></details></article>)}{!rows.length&&<div className="card resource-empty"><h3>{t.none}</h3><p className="muted">{t.noneBody}</p></div>}</section>

    {canManage&&<details className="card" style={{marginTop:18,padding:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t.leadership}</summary><p className="small muted">{t.leadershipBody}</p><ResourceUploader churchId={membership.church_id} userId={userId} canApproveOfficial={canApproveOfficial} lang={lang}/></details>}
  </main>
}
