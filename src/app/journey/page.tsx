import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,Check,Church,Compass,HandHeart,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './journey.css'

const date=(v?:string|null)=>v?new Date(`${v}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):''
const nice=(v?:string|null)=>String(v||'not recorded').replaceAll('_',' ')

export default async function JourneyPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const es=params.lang==='es'
  const lang=es?'?lang=es':''
  const t=(en:string,sp:string)=>es?sp:en
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const [{data:milestones},{data:enrollments},{data:groupMemberships},{data:applications},{data:assignments}]=await Promise.all([
    supabase.from('member_milestones').select('*').eq('church_id',churchId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_enrollments').select('*').eq('user_id',userId),
    supabase.from('group_memberships').select('group_id,role,joined_at').eq('user_id',userId),
    supabase.from('ministry_applications').select('*').eq('user_id',userId),
    supabase.from('team_assignments').select('id,ministry_id,title,starts_at').eq('assigned_user_id',userId).order('starts_at',{ascending:false}).limit(20)
  ])
  const courseIds=(enrollments??[]).map((e:any)=>e.course_id),groupIds=(groupMemberships??[]).map((g:any)=>g.group_id),ministryIds=Array.from(new Set([...(applications??[]).map((a:any)=>a.ministry_id),...(assignments??[]).map((a:any)=>a.ministry_id)].filter(Boolean)))
  let courses:any[]=[];let groups:any[]=[];let ministries:any[]=[]
  if(courseIds.length){const r=await supabase.from('courses').select('id,title,pathway_stage,language_code,curriculum_version').in('id',courseIds);courses=r.data??[]}
  if(groupIds.length){const r=await supabase.from('groups').select('id,name,group_type').in('id',groupIds);groups=r.data??[]}
  if(ministryIds.length){const r=await supabase.from('ministries').select('id,name').in('id',ministryIds);ministries=r.data??[]}
  const cm=new Map(courses.map((c:any)=>[c.id,c])),gm=new Map(groups.map((g:any)=>[g.id,g])),mm=new Map(ministries.map((m:any)=>[m.id,m]))
  const m:any=milestones??{}
  const newBirth=Boolean(m.baptized&&m.holy_ghost_received)
  const foundation=m.first_steps_status==='completed'
  const connection=(groupMemberships??[]).length>0
  const outreach=m.soul_winning_status==='completed'||m.bible_study_teacher_status==='approved'
  const serving=(applications??[]).some((a:any)=>a.status==='accepted')||(assignments??[]).length>0
  const stages=[
    {key:'newbirth',title:t('New Birth','Nuevo Nacimiento'),done:newBirth},
    {key:'foundation',title:t('Foundation','Fundamento'),done:foundation},
    {key:'connection',title:t('Connection','Conexión'),done:connection},
    {key:'outreach',title:t('Outreach / Teaching','Evangelismo / Enseñanza'),done:outreach},
    {key:'serving',title:t('Serving','Servicio'),done:serving}
  ]
  const firstIncomplete=stages.findIndex(s=>!s.done)
  const stageClass=(index:number,done:boolean)=>done?'complete':index===firstIncomplete?'active':''
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const courseRows=(enrollments??[]).map((e:any)=>({e,c:cm.get(e.course_id)})).filter((x:any)=>x.c)
  const accepted=(applications??[]).filter((a:any)=>a.status==='accepted')

  const nextByKey:any={
    newbirth:{title:t('Talk with a church leader','Habla con un líder de la iglesia'),body:t('If your baptism or Holy Ghost record is missing, leadership can verify and update it.','Si falta tu registro de bautismo o del Espíritu Santo, liderazgo puede verificarlo y actualizarlo.'),href:`/help${lang}`,cta:t('Ask for help','Pedir ayuda')},
    foundation:{title:t('Build your foundation','Fortalece tu fundamento'),body:t('Your next step is to begin or complete First Steps and your discipleship foundation.','Tu próximo paso es comenzar o completar Primeros Pasos y tu fundamento de discipulado.'),href:`/learning${lang}`,cta:t('Open Learning','Abrir Aprendizaje')},
    connection:{title:t('Get connected','Conéctate'),body:t('Find a Friendship Group or church community where you can build relationships and grow.','Encuentra un Grupo de Amistad o comunidad de la iglesia donde puedas crecer y crear relaciones.'),href:`/groups${lang}`,cta:t('Explore Groups','Explorar Grupos')},
    outreach:{title:t('Learn to reach and teach others','Aprende a alcanzar y enseñar a otros'),body:t('Continue soul-winning and Bible-study preparation so you can help disciple others.','Continúa tu preparación en evangelismo y estudios bíblicos para ayudar a discipular a otros.'),href:`/learning${lang}`,cta:t('See training','Ver entrenamiento')},
    serving:{title:t('Find a place to serve','Encuentra dónde servir'),body:t('Explore ministries and take the next step toward serving with your gifts.','Explora ministerios y da el siguiente paso para servir con tus dones.'),href:`/serve${lang}`,cta:t('Explore Serve','Explorar Servicio')}
  }
  const next=firstIncomplete>=0?nextByKey[stages[firstIncomplete].key]:{title:t('Keep growing and helping others','Sigue creciendo y ayudando a otros'),body:t('Your recorded journey areas are complete. Stay connected, keep learning and help someone else take their next step.','Tus áreas registradas están completas. Mantente conectado, sigue aprendiendo y ayuda a alguien más a dar su próximo paso.'),href:`/guide${lang}`,cta:t('Ask Kingdom Guide','Preguntar a Kingdom Guide')}

  const milestone=(title:string,done:boolean,detail:string)=><div className={`milestone ${done?'done':''}`}><div className="milestone-main"><div className="milestone-icon">{done?<Check size={13}/>:<Compass size={13}/>}</div><div><strong>{title}</strong><span>{detail}</span></div></div><div className="milestone-status">{done?t('Verified / complete','Verificado / completo'):t('Not complete or not recorded','No completo o no registrado')}</div></div>

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('My Journey','Mi Camino')}</div></div><div className="row"><Link className="ghost" href={`/journey${es?'':'?lang=es'}`}>{es?'English':'Español'}</Link><Link className="ghost" href={`/learning${lang}`}>{t('Learning','Aprendizaje')}</Link><Link className="ghost" href={`/profile${lang}`}>{t('My profile','Mi perfil')}</Link><Link className="ghost" href="/">← {t('Home','Inicio')}</Link></div></header>
    <section className="journey-hero card"><div><div className="pill">{t('MY JOURNEY','MI CAMINO')}</div><h1>{t('See where you are—and what to do next.','Mira dónde estás y cuál es tu próximo paso.')}</h1><p className="muted">{t('Verified spiritual milestones, discipleship progress, connection, preparation and serving—without turning spiritual life into a score.','Hitos espirituales verificados, progreso de discipulado, conexión, preparación y servicio—sin convertir la vida espiritual en una puntuación.')}</p></div><div className="hero-stat"><Sparkles size={23}/><span>{stages.filter(s=>s.done).length} {t('of','de')} {stages.length} {t('journey areas active/complete','áreas activas/completas')}</span></div></section>

    <section className="card" style={{marginTop:14,padding:20,border:'1px solid rgba(125,211,252,.28)'}}><div className="pill">{t('YOUR NEXT STEP','TU PRÓXIMO PASO')}</div><h2 style={{marginBottom:6}}>{next.title}</h2><p className="muted" style={{marginTop:0}}>{next.body}</p><div className="row"><Link className="btn" href={next.href}>{next.cta} →</Link><Link className="ghost" href={`/guide${lang}`}>{t('Ask Kingdom Guide','Preguntar a Kingdom Guide')}</Link></div></section>

    <section className="journey-rail">{stages.map((stage,index)=><div className={`card journey-step ${stageClass(index,stage.done)}`} key={stage.key}><div className="step-icon">{stage.done?<Check size={14}/>:index===firstIncomplete?<Compass size={14}/>:<span>{index+1}</span>}</div><strong>{stage.title}</strong><span>{stage.done?t('Recorded / connected','Registrado / conectado'):index===firstIncomplete?t('Current growth area','Área actual de crecimiento'):t('Ahead','Más adelante')}</span></div>)}</section>

    <section className="journey-grid"><article className="card journey-card"><div className="pill">{t('NEW BIRTH','NUEVO NACIMIENTO')}</div><h2>{t('Leadership-verified milestones','Hitos verificados por liderazgo')}</h2><div className="milestone-list">{milestone(t('Baptism','Bautismo'),m.baptized===true,m.baptized?`${t('Recorded','Registrado')}${m.baptism_date?` • ${date(m.baptism_date)}`:''}`:t('No verified baptism record yet.','Aún no hay un registro de bautismo verificado.'))}{milestone(t('Holy Ghost','Espíritu Santo'),m.holy_ghost_received===true,m.holy_ghost_received?`${t('Recorded','Registrado')}${m.holy_ghost_date?` • ${date(m.holy_ghost_date)}`:''}`:t('No verified Holy Ghost record yet.','Aún no hay un registro verificado del Espíritu Santo.'))}</div><p className="small muted">{t('These are verified church records. Members do not self-award them, and they do not produce Learning XP.','Estos son registros verificados por la iglesia. Los miembros no se los otorgan a sí mismos y no producen XP de aprendizaje.')}</p></article>

      <article className="card journey-card"><div className="pill">{t('FOUNDATION','FUNDAMENTO')}</div><h2>{t('Discipleship foundation','Fundamento de discipulado')}</h2><div className="milestone-list">{milestone('First Steps',m.first_steps_status==='completed',`${t('Status','Estado')}: ${nice(m.first_steps_status)}${m.first_steps_completed_at?` • ${date(m.first_steps_completed_at)}`:''}`)}{milestone(t('Effective Soul Winning','Evangelismo Efectivo'),m.soul_winning_status==='completed',`${t('Status','Estado')}: ${nice(m.soul_winning_status)}${m.soul_winning_completed_at?` • ${date(m.soul_winning_completed_at)}`:''}`)}</div></article>

      <article className="card journey-card"><div className="pill">{t('CONNECTION','CONEXIÓN')}</div><h2>{t('Groups & relationships','Grupos y relaciones')}</h2><div className="milestone-list">{(groupMemberships??[]).map((g:any)=>{const group:any=gm.get(g.group_id);return <div className="milestone done" key={g.group_id}><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>{group?.name||t('Church group','Grupo de iglesia')}</strong><span>{String(group?.group_type||'group').replaceAll('_',' ')} • {String(g.role).replaceAll('_',' ')}</span></div></div><Link className="record-link" href={`/groups/${g.group_id}${lang}`}>{t('Open','Abrir')}</Link></div>})}{!groupMemberships?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>{t('No active group connection recorded','No hay conexión activa con un grupo')}</strong><span>{t('Explore Friendship Groups and other church communities.','Explora Grupos de Amistad y otras comunidades de la iglesia.')}</span></div></div><Link className="record-link" href={`/groups${lang}`}>{t('Explore','Explorar')}</Link></div>}</div></article>

      <article className="card journey-card"><div className="pill">{t('TEACHING & PREPARATION','ENSEÑANZA Y PREPARACIÓN')}</div><h2>{t('Equipping others','Equipando a otros')}</h2><div className="milestone-list">{milestone(t('Bible Study Teacher','Maestro de Estudio Bíblico'),m.bible_study_teacher_status==='approved',`${t('Status','Estado')}: ${nice(m.bible_study_teacher_status)}`)}{milestone('Timothys',m.timothys_status==='completed',`${t('Status','Estado')}: ${nice(m.timothys_status)}${m.timothys_completed_at?` • ${date(m.timothys_completed_at)}`:''}`)}{milestone(t('School of Pastors','Escuela de Pastores'),m.school_pastors_status==='completed',`${t('Status','Estado')}: ${nice(m.school_pastors_status)}${m.school_pastors_completed_at?` • ${date(m.school_pastors_completed_at)}`:''}`)}</div></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('LEARNING','APRENDIZAJE')}</div><h2>{t('Courses in your account','Cursos en tu cuenta')}</h2><div className="journey-courses">{courseRows.map(({e,c}:any)=>{const pct=Math.max(0,Math.min(100,Number(e.progress_percent??0)));return <div className="journey-course" key={`${e.course_id}-${e.user_id}`}><strong>{c.title}</strong><span>{String(c.pathway_stage||'learning').replaceAll('_',' ')} • {String(c.language_code||'').toUpperCase()} • {pct}%{e.credential_earned?` • ${t('Credential earned','Credencial obtenida')}`:''}</span><div className="course-progress"><i style={{width:`${pct}%`}}/></div></div>})}{!courseRows.length&&<div className="journey-course"><strong>{t('No course enrollment yet','Aún no estás inscrito en un curso')}</strong><span>{t('Your Learning Center courses will appear here as you begin them.','Tus cursos del Centro de Aprendizaje aparecerán aquí cuando los comiences.')}</span></div>}</div><Link className="ghost" href={`/learning${lang}`} style={{display:'inline-block',marginTop:10}}><BookOpen size={12}/> {t('Open Learning Center','Abrir Centro de Aprendizaje')}</Link></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('SERVING','SERVICIO')}</div><h2>{t('Where you are serving or approved to serve','Dónde estás sirviendo o aprobado para servir')}</h2><div className="milestone-list">{accepted.map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{mm.get(a.ministry_id)||t('Ministry','Ministerio')}</strong><span>{t('Application accepted','Solicitud aceptada')}</span></div></div><div className="milestone-status">{t('Accepted','Aceptado')}</div></div>)}{(assignments??[]).slice(0,8).map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><Church size={13}/></div><div><strong>{a.title}</strong><span>{mm.get(a.ministry_id)||t('Church team','Equipo de iglesia')} • {new Date(a.starts_at).toLocaleDateString()}</span></div></div><div className="milestone-status">{t('Assignment','Asignación')}</div></div>)}{!accepted.length&&!assignments?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{t('No serving connection recorded yet','Aún no hay servicio registrado')}</strong><span>{t('Explore ministries when you are ready.','Explora ministerios cuando estés listo.')}</span></div></div><Link className="record-link" href={`/serve${lang}`}>{t('Explore','Explorar')}</Link></div>}</div></article>
    </section>

    <section className="card journey-note"><div className="pill">{t('IMPORTANT','IMPORTANTE')}</div><p>{t('My Journey reflects records currently stored in Kingdom Network. A missing item does not make a spiritual judgment about you; it means the system does not yet have that verified/completed record. Leadership can update verified milestones, while Learning, Groups and Serve update from your actual activity.','Mi Camino refleja los registros actualmente guardados en Kingdom Network. Un dato faltante no es un juicio espiritual sobre ti; significa que el sistema todavía no tiene ese registro verificado o completado. Liderazgo puede actualizar los hitos verificados, mientras Aprendizaje, Grupos y Servicio se actualizan según tu actividad real.')}</p></section>
  </main>
}
