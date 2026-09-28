import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowDown,ArrowUp,BookOpen,CheckCircle2,Compass,Plus,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addPathwayStep,archivePathwayStep,createPathway,movePathwayStep,setDefaultPathway } from './actions'
import '../church.css'

const sourceLabel=(source:string,es:boolean)=>({
  milestone_boolean:es?'Hito verificado':'Verified milestone',
  milestone_status:es?'Estado verificado':'Verified status',
  course:es?'Curso':'Course',
  friendship_group:es?'Grupo de Amistad':'Friendship Group',
  ministry_serving:es?'Servicio':'Serving',
  manual:es?'Seguimiento manual':'Manual follow-up'
} as Record<string,string>)[source]??source

export default async function JourneyPathwayPage({searchParams}:{searchParams:Promise<{lang?:string;pathway?:string;saved?:string;error?:string}>}){
  const q=await searchParams,es=q.lang==='es',lang=es?'es':'en',l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id)redirect('/')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:actor.church_id,p_permission_key:'manage_members'})
  if(!['pastor','church_admin'].includes(actor.role)&&!custom)redirect('/')
  const churchId=actor.church_id
  const [{data:pathways,error:pathError},{data:courses}]=await Promise.all([
    supabase.from('discipleship_pathways').select('id,name,description,is_default,active,created_at').eq('church_id',churchId).eq('active',true).order('is_default',{ascending:false}).order('created_at'),
    supabase.from('courses').select('id,title').eq('church_id',churchId).order('title')
  ])
  if(pathError)throw new Error(pathError.message)
  const selectedId=(pathways??[]).some((p:any)=>p.id===q.pathway)?q.pathway:((pathways??[]).find((p:any)=>p.is_default)?.id??pathways?.[0]?.id)
  const selected=(pathways??[]).find((p:any)=>p.id===selectedId)
  let steps:any[]=[]
  if(selectedId){
    const {data,error}=await supabase.from('discipleship_pathway_steps').select('*').eq('church_id',churchId).eq('pathway_id',selectedId).eq('active',true).order('sort_order').order('id')
    if(error)throw new Error(error.message)
    steps=data??[]
  }
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches
  const saved=q.saved?(
    q.saved==='pathway'?(es?'Camino creado.':'Pathway created.'):
    q.saved==='default'?(es?'Camino predeterminado actualizado.':'Default pathway updated.'):
    q.saved==='step'?(es?'Paso agregado.':'Step added.'):
    es?'Paso archivado.':'Step archived.'
  ):null

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Camino de Discipulado':'Discipleship Pathway'}</div></div><div className="row"><Link className="ghost" href={`/church/journey-pathway?lang=${es?'en':'es'}`}>{es?'English':'Español'}</Link><Link className="ghost" href={l('/church')}>← {es?'Administración':'Church Admin'}</Link></div></header>

    <section className="admin-hero card"><div><div className="pill">{es?'CAMINO CONFIGURABLE':'CONFIGURABLE PATHWAY'}</div><h1>{es?'Define el camino. No dupliques el progreso.':'Define the path. Do not duplicate progress.'}</h1><p className="muted">{es?'Cada paso puede leer el registro que ya existe — bautismo, Espíritu Santo, curso, Grupo de Amistad o servicio — y solo usa seguimiento manual cuando realmente es necesario.':'Each step can read the record that already exists—baptism, Holy Ghost, course, Friendship Group or serving—and uses manual tracking only when it is truly needed.'}</p></div><div className="admin-badge"><Compass size={22}/><div><strong>{steps.length}</strong><span>{es?'pasos activos':'active steps'}</span></div></div></section>
    {saved&&<div className="notice success">{saved}</div>}{q.error&&<div className="notice error">{q.error}</div>}

    <section className="card" style={{padding:20,marginBottom:18}}>
      <div className="pill">{es?'CAMINOS':'PATHWAYS'}</div>
      <div className="row" style={{gap:8,flexWrap:'wrap',marginTop:12}}>{(pathways??[]).map((path:any)=><Link className={path.id===selectedId?'btn':'ghost'} href={l(`/church/journey-pathway?pathway=${path.id}`)} key={path.id}>{path.name}{path.is_default?` • ${es?'Predeterminado':'Default'}`:''}</Link>)}</div>
      <form action={createPathway} style={{display:'grid',gridTemplateColumns:'minmax(180px,1fr) minmax(240px,2fr) auto',gap:10,alignItems:'end',marginTop:16}}>
        <input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="lang" value={lang}/>
        <label className="field"><span>{es?'Nombre del camino':'Pathway name'}</span><input name="name" maxLength={120} required placeholder={es?'Ej. Camino de Nuevos Creyentes':'e.g. New Believer Path'}/></label>
        <label className="field"><span>{es?'Descripción opcional':'Optional description'}</span><input name="description" maxLength={500} placeholder={es?'Para quién es este camino':'Who this pathway is for'}/></label>
        <button className="btn"><Plus size={14}/> {es?'Crear':'Create'}</button>
      </form>
    </section>

    {!selected&&<section className="card empty"><Compass size={28}/><h2>{es?'Crea tu primer camino':'Create your first pathway'}</h2><p className="muted">{es?'No hay una secuencia obligatoria de One Kingdom. Tu iglesia decide el orden.':'One Kingdom does not force one sequence. Your church decides the order.'}</p></section>}

    {selected&&<><section className="card" style={{padding:20,marginBottom:18}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:14,flexWrap:'wrap'}}><div><div className="pill">{selected.is_default?(es?'CAMINO PREDETERMINADO':'DEFAULT PATHWAY'):(es?'CAMINO':'PATHWAY')}</div><h2 style={{margin:'8px 0 4px'}}>{selected.name}</h2><p className="muted" style={{margin:0}}>{selected.description|| (es?'Sin descripción.':'No description.')}</p></div>{!selected.is_default&&<form action={setDefaultPathway}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="pathway_id" value={selected.id}/><input type="hidden" name="lang" value={lang}/><button className="ghost"><CheckCircle2 size={14}/> {es?'Hacer predeterminado':'Make default'}</button></form>}</div>
    </section>

    <section className="card" style={{padding:20,marginBottom:18}}>
      <div className="pill">{es?'AGREGAR PASO':'ADD STEP'}</div><h2>{es?'¿Qué debe hacer la persona después?':'What should the person do next?'}</h2>
      <form action={addPathwayStep} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
        <input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="pathway_id" value={selected.id}/><input type="hidden" name="lang" value={lang}/>
        <label className="field"><span>{es?'Tipo de paso':'Step type'}</span><select name="preset" defaultValue="first_steps">
          <option value="baptism">{es?'Bautismo':'Baptism'}</option><option value="holy_ghost">{es?'Espíritu Santo':'Holy Ghost'}</option><option value="first_steps">First Steps</option><option value="salt">SALT</option><option value="soul_winning">Effective Soul Winning</option><option value="bible_study_teacher">{es?'Maestro de Estudio Bíblico':'Bible Study Teacher'}</option><option value="timothys">Timothys</option><option value="school_pastors">{es?'Escuela de Pastores':'School of Pastors'}</option><option value="friendship_group">{es?'Grupo de Amistad':'Friendship Group'}</option><option value="serving">{es?'Servicio':'Serving'}</option><option value="course">{es?'Curso específico':'Specific course'}</option><option value="manual">{es?'Paso personalizado/manual':'Custom/manual step'}</option>
        </select></label>
        <label className="field"><span>{es?'Curso (solo si eliges Curso específico)':'Course (only for Specific course)'}</span><select name="course_id" defaultValue=""><option value="">{es?'Selecciona si aplica':'Choose if applicable'}</option>{(courses??[]).map((course:any)=><option value={course.id} key={course.id}>{course.title}</option>)}</select></label>
        <label className="field"><span>{es?'Título personalizado (solo para paso manual)':'Custom title (manual step only)'}</span><input name="custom_title" maxLength={120}/></label>
        <label className="field"><span>{es?'Destino opcional (paso manual)':'Optional destination (manual step)'}</span><input name="custom_href" placeholder="/journey"/></label>
        <label className="field" style={{gridColumn:'1 / -1'}}><span>{es?'Explicación para el miembro':'Member-facing explanation'}</span><input name="description" maxLength={500} placeholder={es?'Qué hacer y por qué importa':'What to do and why it matters'}/></label>
        <label className="field"><span>{es?'¿Obligatorio?':'Required?'}</span><select name="required" defaultValue="yes"><option value="yes">{es?'Sí':'Yes'}</option><option value="no">No</option></select></label>
        <div style={{display:'flex',alignItems:'end'}}><button className="btn"><Plus size={14}/> {es?'Agregar paso':'Add step'}</button></div>
      </form>
      <p className="small muted" style={{marginBottom:0}}>{es?'Los tipos verificados leen la fuente canónica. Un líder no puede marcar manualmente First Steps, bautismo, Espíritu Santo u otro paso canónico como completado desde este sistema.':'Verified step types read the canonical source. A leader cannot manually mark First Steps, baptism, Holy Ghost or another canonical step complete from this system.'}</p>
    </section>

    <div className="section-heading"><div><div className="pill">{es?'ORDEN DEL CAMINO':'PATH ORDER'}</div><h2>{selected.name}</h2></div><span className="small muted">{es?'El miembro solo verá lo necesario para avanzar.':'Members see only what helps them move forward.'}</span></div>
    <section className="member-list">{steps.map((step:any,index:number)=><article className="card" style={{padding:16}} key={step.id}><div className="row" style={{justifyContent:'space-between',gap:14,alignItems:'center',flexWrap:'wrap'}}><div className="row" style={{gap:12,alignItems:'center'}}><div className="avatar large">{index+1}</div><div><strong>{step.title}</strong><span className="small muted" style={{display:'block',marginTop:3}}>{sourceLabel(step.completion_source,es)} • {step.required?(es?'Obligatorio':'Required'):(es?'Opcional':'Optional')}</span>{step.description&&<span className="small muted" style={{display:'block',marginTop:5}}>{step.description}</span>}</div></div><div className="row" style={{gap:6}}>
      <form action={movePathwayStep}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="pathway_id" value={selected.id}/><input type="hidden" name="step_id" value={step.id}/><input type="hidden" name="direction" value="up"/><input type="hidden" name="lang" value={lang}/><button className="ghost" disabled={index===0} aria-label={es?'Subir paso':'Move step up'}><ArrowUp size={14}/></button></form>
      <form action={movePathwayStep}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="pathway_id" value={selected.id}/><input type="hidden" name="step_id" value={step.id}/><input type="hidden" name="direction" value="down"/><input type="hidden" name="lang" value={lang}/><button className="ghost" disabled={index===steps.length-1} aria-label={es?'Bajar paso':'Move step down'}><ArrowDown size={14}/></button></form>
      <form action={archivePathwayStep}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="pathway_id" value={selected.id}/><input type="hidden" name="step_id" value={step.id}/><input type="hidden" name="lang" value={lang}/><button className="ghost">{es?'Archivar':'Archive'}</button></form>
    </div></div></article>)}{!steps.length&&<div className="card empty"><BookOpen size={25}/><h3>{es?'Todavía no hay pasos.':'No steps yet.'}</h3><p className="muted">{es?'Agrega solo los pasos que esta iglesia realmente usa.':'Add only the steps this church actually uses.'}</p></div>}</section>
    <section className="card admin-note"><div className="row" style={{gap:10}}><Users size={18}/><div><strong>{es?'Siguiente conexión: responsables y seguimiento':'Next connection: owners and follow-up'}</strong><p className="muted" style={{margin:'5px 0 0'}}>{es?'Los responsables, fechas de seguimiento y alertas de personas estancadas aparecen en Desarrollo de Liderazgo y Salud de la Iglesia.':'Responsible leaders, follow-up dates and stuck-person alerts surface in Leadership Development and Church Health.'}</p></div></div></section></>}
  </main>
}
