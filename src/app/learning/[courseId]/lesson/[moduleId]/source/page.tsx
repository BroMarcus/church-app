import Link from 'next/link'
import {redirect} from 'next/navigation'
import {ChevronLeft,FileText,ExternalLink} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {ResourceEngagement} from './resource-engagement'
import '../../../../learning.css'

const list=(value:any)=>Array.isArray(value)?value:[]

function safeHttps(raw:string|null|undefined){
  try{const url=new URL(String(raw??'').trim());return url.protocol==='https:'?url:null}catch{return null}
}
function embeddedSource(raw:string|null|undefined){
  const url=safeHttps(raw);if(!url)return null
  const host=url.hostname.toLowerCase()
  if(host==='drive.google.com'){
    const match=url.pathname.match(/\/file\/d\/([^/]+)/i);const id=match?.[1]||url.searchParams.get('id')
    if(id)return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
  }
  if(host==='docs.google.com'){
    const match=url.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([^/]+)/i)
    if(match)return `https://docs.google.com/${match[1]}/d/${encodeURIComponent(match[2])}/preview`
  }
  if(host==='dropbox.com'||host.endsWith('.dropbox.com')){
    url.searchParams.delete('dl');url.searchParams.set('raw','1');return url.toString()
  }
  return url.toString()
}

export default async function CourseSourceViewer({params,searchParams}:{params:Promise<{courseId:string;moduleId:string}>,searchParams:Promise<{resource?:string}>}){
  const {courseId,moduleId}=await params;const q=await searchParams
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:course},{data:module},{data:enrollment}]=await Promise.all([
    supabase.from('courses').select('id,title,church_id,language_code,published,source_url,source_label').eq('id',courseId).eq('published',true).maybeSingle(),
    supabase.from('course_modules').select('id,course_id,title,content,source_url,source_label').eq('id',moduleId).eq('course_id',courseId).maybeSingle(),
    supabase.from('course_enrollments').select('course_id').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
  ])
  if(!course||!module||!enrollment)redirect(`/learning/${courseId}`)
  if(course.church_id){
    const {data:membership}=await supabase.from('church_memberships').select('user_id').eq('church_id',course.church_id).eq('user_id',userId).eq('status','active').maybeSingle()
    if(!membership)redirect('/learning')
  }
  const resources=list(module.content?.resources).filter((item:any)=>item?.audience!=='teacher')
  const requested=Math.max(0,Math.min(resources.length-1,Number(q.resource)||0))
  const resource=resources[requested]??null
  // Learner material must use a resource- or lesson-scoped approved link.
  // Never fall back to the course-level source: a master curriculum file can
  // contain teacher-only material, answer guidance, or later locked lessons.
  const rawSource=resource?.source_url||module.source_url||''
  const embed=embeddedSource(rawSource)
  const source=safeHttps(rawSource)
  const isEs=(course.language_code??'en')==='es',t=(en:string,es:string)=>isEs?es:en
  const pageStart=Number(resource?.page_start||0),pageEnd=Number(resource?.page_end||0)
  const pageText=pageStart>0&&pageEnd>0?(pageStart===pageEnd?t(`Page ${pageStart}`,`Página ${pageStart}`):t(`Pages ${pageStart}–${pageEnd}`,`Páginas ${pageStart}–${pageEnd}`)):''
  const label=String(resource?.label||module.source_label||course.source_label||module.title)

  return <main className="shell">
    <header className="topbar"><div><Link className="brand" href="/">Kingdom <span>Network</span></Link><div className="small muted">{t('Course Viewer','Visor del Curso')} • {module.title}</div></div><Link className="ghost" href={`/learning/${courseId}/lesson/${moduleId}`}><ChevronLeft size={14}/> {t('Back to lesson','Volver a la lección')}</Link></header>
    <section className="card" style={{padding:18,marginBottom:14}}><div className="pill"><FileText size={12}/> {t('ONE KINGDOM VIEWER','VISOR ONE KINGDOM')}</div><h1 style={{margin:'8px 0 4px'}}>{label}</h1>{pageText&&<div className="small muted">{pageText}</div>}<p className="small muted" style={{marginBottom:0}}>{t('Stay here while you work through the assigned material. Return to the lesson when finished.','Permanece aquí mientras revisas el material asignado. Regresa a la lección cuando termines.')}</p></section>
    {embed?<><ResourceEngagement courseId={courseId} moduleId={moduleId} resourceIndex={requested} lang={isEs?'es':'en'}/><section className="card" style={{padding:8,overflow:'hidden'}}><iframe title={label} src={embed} style={{width:'100%',height:'76vh',minHeight:520,border:0,borderRadius:12}} allow="fullscreen" referrerPolicy="no-referrer" /></section></>:<section className="card" style={{padding:20}}><h2>{t('Source not connected yet','La fuente aún no está conectada')}</h2><p className="muted">{t('A church leader still needs to connect a learner-safe link for this lesson or resource before it can open. The master course file is not exposed to learners automatically.','Un líder de la iglesia todavía necesita conectar un enlace seguro para alumnos para esta lección o recurso antes de que pueda abrirse. El archivo maestro del curso no se expone automáticamente a los alumnos.')}</p></section>}
    {source&&<div style={{marginTop:12,textAlign:'center'}}><a className="ghost" href={source.toString()} target="_blank" rel="noreferrer"><ExternalLink size={14}/> {t('Viewer not loading? Open the approved source','¿No carga el visor? Abre la fuente aprobada')}</a></div>}
  </main>
}
