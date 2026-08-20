import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,Check,Church,Clock3,Compass,HandHeart,MessageSquareWarning,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './journey.css'

export default async function JourneyPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const es=params.lang==='es'
  const lang=es?'?lang=es':''
  const t=(en:string,sp:string)=>es?sp:en
  const formatDate=(v?:string|null)=>v?new Date(`${v}T12:00:00`).toLocaleDateString(es?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}):''
  const formatDateTime=(v?:string|null)=>v?new Date(v).toLocaleString(es?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):''
  const status=(v?:string|null)=>{
    const key=String(v||'not_recorded').toLowerCase()
    const labels:Record<string,[string,string]>={
      not_recorded:['Not recorded','No registrado'],not_started:['Not started','No iniciado'],in_progress:['In progress','En progreso'],completed:['Completed','Completado'],approved:['Approved','Aprobado'],accepted:['Accepted','Aceptado'],submitted:['Submitted','Enviado'],under_review:['Under review','En revisión'],pending:['Pending','Pendiente'],active:['Active','Activo'],inactive:['Inactive','Inactivo'],member:['Member','Miembro'],leader:['Leader','Líder'],assistant_leader:['Assistant leader','Líder asistente'],friendship_group:['Friendship Group','Grupo de Amistad'],group:['Group','Grupo'],on_time:['On time','A tiempo'],late:['Late','Tarde'],missing:['Missing','Ausente'],answered:['Answered','Contestada'],open:['Open','Abierta']
    }
    const label=labels[key]
    return label?t(label[0],label[1]):key.replaceAll('_',' ')
  }
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const [{data:milestones},{data:enrollments},{data:groupMemberships},{data:applications},{data:assignments},{data:attendanceHistory},{data:prayerHistory}]=await Promise.all([
    supabase.from('member_milestones').select('*').eq('church_id',churchId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_enrollments').select('*').eq('user_id',userId),
    supabase.from('group_memberships').select('group_id,role,joined_at').eq('user_id',userId),
    supabase.from('ministry_applications').select('*').eq('user_id',userId),
    supabase.from('team_assignments').select('id,ministry_id,title,starts_at').eq('assigned_user_id',userId).order('starts_at',{ascending:false}).limit(20),
    supabase.from('group_report_attendance').select('id,group_id,attendance_status,checked_in_at,recorded_at,group_reports(meeting_date),groups(name)').eq('user_id',userId).order('recorded_at',{ascending:false}).limit(24),
    supabase.from('prayer_requests').select('id,body,visibility,share_with_group,status,answered_at,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(30)
  ])
  const courseIds=(enrollments??[]).map((e:any)=>e.course_id),groupIds=(groupMemberships??[]).map((g:any)=>g.group_id),ministryIds=Array.from(new Set([...(applications??[]).map((a:any)=>a.ministry_id),...(assignments??[]).map((a:any)=>a.ministry_id)].filter(Boolean)))
  let courses:any[]=[];let groups:any[]=[];let ministries:any[]=[]
  if(courseIds.length){const r=await supabase.from('courses').select('id,title,pathway_stage,language_code,curriculum_version').in('id',courseIds);courses=r.data??[]}
  if(groupIds.length){const r=await supabase.from('groups').select('id,name,group_type').in('id',groupIds);groups=r.data??[]}
  if(ministryIds.length){const r=await supabase.from('ministries').select('id,name').in('id',ministryIds);ministries=r.data??[]}
  const cm=new Map(courses.map((c:any)=>[c.id,c])),gm=new Map(groups.map((g:any)=>[g.id,g])),mm=new Map(ministries.map((m:any)=>[m.id,m]))
  const m:any=milestones??{}
  const baptized=m.baptized===true
  const holyGhost=m.holy_ghost_received===true
  const foundation=m.first_steps_status==='completed'
  const connection=(groupMemberships??[]).length>0
  const outreach=m.soul_winning_status==='completed'||m.bible_study_teacher_status==='approved'
  const serving=(applications??[]).some((a:any)=>a.status==='accepted')||(assignments??[]).length>0
  const stages=[
    {key:'baptism',title:t('Baptism','Bautismo'),done:baptized},
    {key:'holyghost',title:t('Holy Ghost','Espíritu Santo'),done:holyGhost},
    {key:'foundation',title:t('Foundation','Fundamento'),done:foundation},
    {key:'connection',title:t('Connection','Conexión'),done:connection},
    {key:'outreach',title:t('Reach Others','Alcanzar a Otros'),done:outreach},
    {key:'serving',title:t('Serve','Servir'),done:serving}
  ]
  const firstIncomplete=stages.findIndex(s=>!s.done)
  const stageClass=(index:number,done:boolean)=>done?'complete':index===firstIncomplete?'active':''
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const courseRows=(enrollments??[]).map((e:any)=>({e,c:cm.get(e.course_id)})).filter((x:any)=>x.c)
  const accepted=(applications??[]).filter((a:any)=>a.status==='accepted')
  const nextByKey:any={
    baptism:{title:t('Confirm your baptism record','Confirma tu registro de bautismo'),body:t('If you have been baptized in the name of Jesus Christ but it is not recorded here, add your baptism details in My Profile or ask a church leader to verify the official record.','Si has sido bautizado en el nombre de Jesucristo pero no aparece aquí, agrega los detalles en Mi Perfil o pide a un líder que verifique el registro oficial.'),href:`/profile${lang}`,cta:t('Open My Profile','Abrir Mi Perfil')},
    holyghost:{title:t('Confirm your Holy Ghost record','Confirma tu registro del Espíritu Santo'),body:t('If you have received the Holy Ghost but it is not recorded here, ask a church leader to verify your record.','Si has recibido el Espíritu Santo pero no aparece aquí, pide a un líder de la iglesia que verifique tu registro.'),href:`/help${lang}`,cta:t('Ask for help','Pedir ayuda')},
    foundation:{title:t('Build your foundation','Fortalece tu fundamento'),body:t('Begin or continue First Steps and your discipleship foundation.','Comienza o continúa Primeros Pasos y tu fundamento de discipulado.'),href:`/learning${lang}`,cta:t('Open Learning','Abrir Aprendizaje')},
    connection:{title:t('Get connected','Conéctate'),body:t('Find a Friendship Group or church community where you can grow with others.','Encuentra un Grupo de Amistad o comunidad de la iglesia donde puedas crecer con otros.'),href:`/groups${lang}`,cta:t('Explore Groups','Explorar Grupos')},
    outreach:{title:t('Learn to reach others','Aprende a alcanzar a otros'),body:t('Continue evangelism and Bible-study preparation so you can help disciple someone else.','Continúa tu preparación en evangelismo y estudios bíblicos para ayudar a discipular a alguien más.'),href:`/learning${lang}`,cta:t('See training','Ver entrenamiento')},
    serving:{title:t('Find a place to serve','Encuentra dónde servir'),body:t('Explore ministries and take the next step toward serving with your gifts.','Explora ministerios y da el siguiente paso para servir con tus dones.'),href:`/serve${lang}`,cta:t('Explore Serve','Explorar Servicio')}
  }
  const next=firstIncomplete>=0?nextByKey[stages[firstIncomplete].key]:{title:t('Keep growing and helping others','Sigue creciendo y ayudando a otros'),body:t('Your recorded journey areas are complete. Stay connected, keep learning and help someone else take a next step.','Tus áreas registradas están completas. Mantente conectado, sigue aprendiendo y ayuda a alguien más a dar un próximo paso.'),href:`/guide${lang}`,cta:t('Ask Kingdom Guide','Preguntar a Kingdom Guide')}
  const milestone=(title:string,done:boolean,detail:string)=><div className={`milestone ${done?'done':''}`}><div className="milestone-main"><div className="milestone-icon">{done?<Check size={13}/>:<Compass size={13}/>}</div><div><strong>{title}</strong><span>{detail}</span></div></div><div className="milestone-status">{done?t('Verified / complete','Verificado / completo'):t('Not complete or not recorded','No completo o no registrado')}</div></div>

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('My Journey','Mi Camino')}</div></div><div className="row"><Link className="ghost" href={`/journey${es?'':'?lang=es'}`}>{es?'English':'Español'}</Link><Link className="ghost" href={`/today${lang}`}>{t('My Today','Mi Día')}</Link><Link className="ghost" href={`/feedback${lang}`}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={`/${lang}`}>← {t('Home','Inicio')}</Link></div></header>

    <section className="journey-hero card"><div><div className="pill">{t('MY JOURNEY','MI CAMINO')}</div><h1>{t('Where am I—and what is next?','¿Dónde estoy y qué sigue?')}</h1><p className="muted">{t('Your personal roadmap for spiritual milestones, discipleship, connection, outreach and serving.','Tu mapa personal de hitos espirituales, discipulado, conexión, evangelismo y servicio.')}</p></div><div className="hero-stat"><Sparkles size={23}/><span>{stages.filter(s=>s.done).length} {t('of','de')} {stages.length} {t('areas recorded','áreas registradas')}</span></div></section>

    <section className="card" style={{marginTop:14,padding:22,border:'1px solid rgba(125,211,252,.34)'}}><div className="pill">{t('YOUR NEXT STEP','TU PRÓXIMO PASO')}</div><h2 style={{fontSize:'1.55rem',margin:'9px 0 6px'}}>{next.title}</h2><p className="muted" style={{marginTop:0,lineHeight:1.55,maxWidth:760}}>{next.body}</p><div className="row"><Link className="btn" href={next.href}>{next.cta} →</Link><Link className="ghost" href={`/guide${lang}`}>{t('Ask Kingdom Guide','Preguntar a Kingdom Guide')}</Link></div></section>

    <section style={{marginTop:22}}><div className="pill" style={{marginBottom:12}}>{t('MY PATH','MI CAMINO')}</div><section className="journey-rail">{stages.map((stage,index)=><div className={`card journey-step ${stageClass(index,stage.done)}`} key={stage.key}><div className="step-icon">{stage.done?<Check size={14}/>:index===firstIncomplete?<Compass size={14}/>:<span>{index+1}</span>}</div><strong>{stage.title}</strong><span>{stage.done?t('Recorded / connected','Registrado / conectado'):index===firstIncomplete?t('Current next area','Próxima área actual'):t('Later','Más adelante')}</span></div>)}</section></section>

    <details className="card" style={{padding:20,marginTop:22}}><summary style={{cursor:'pointer',fontWeight:800,fontSize:'1.08rem'}}>{t('View my detailed journey records','Ver mis registros detallados')}</summary><p className="small muted">{t('Open this when you want dates, course progress, group attendance, prayer history, connections and serving records.','Abre esto cuando quieras ver fechas, progreso de cursos, asistencia al grupo, historial de oración, conexiones y registros de servicio.')}</p>
      <section className="journey-grid" style={{marginTop:16}}><article className="card journey-card"><div className="pill">{t('NEW BIRTH','NUEVO NACIMIENTO')}</div><h2>{t('Verified milestones','Hitos verificados')}</h2><div className="milestone-list">{milestone(t('Baptism','Bautismo'),baptized,baptized?`${t('Recorded','Registrado')}${m.baptism_date?` • ${formatDate(m.baptism_date)}`:''}`:t('No verified baptism record yet.','Aún no hay registro de bautismo verificado.'))}{milestone(t('Holy Ghost','Espíritu Santo'),holyGhost,holyGhost?`${t('Recorded','Registrado')}${m.holy_ghost_date?` • ${formatDate(m.holy_ghost_date)}`:''}`:t('No verified Holy Ghost record yet.','Aún no hay registro verificado del Espíritu Santo.'))}</div></article>

      <article className="card journey-card"><div className="pill">{t('FOUNDATION','FUNDAMENTO')}</div><h2>{t('Discipleship','Discipulado')}</h2><div className="milestone-list">{milestone('First Steps',m.first_steps_status==='completed',`${t('Status','Estado')}: ${status(m.first_steps_status)}${m.first_steps_completed_at?` • ${formatDate(m.first_steps_completed_at)}`:''}`)}{milestone(t('Effective Soul Winning','Evangelismo Efectivo'),m.soul_winning_status==='completed',`${t('Status','Estado')}: ${status(m.soul_winning_status)}${m.soul_winning_completed_at?` • ${formatDate(m.soul_winning_completed_at)}`:''}`)}</div></article>

      <article className="card journey-card"><div className="pill">{t('CONNECTION','CONEXIÓN')}</div><h2>{t('Groups','Grupos')}</h2><div className="milestone-list">{(groupMemberships??[]).map((g:any)=>{const group:any=gm.get(g.group_id);return <div className="milestone done" key={g.group_id}><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>{group?.name||t('Church group','Grupo de iglesia')}</strong><span>{status(group?.group_type||'group')} • {status(g.role)}</span></div></div><Link className="record-link" href={`/groups/${g.group_id}${lang}`}>{t('Open','Abrir')}</Link></div>})}{!groupMemberships?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><Users size={13}/></div><div><strong>{t('No group connection recorded yet','Aún no hay conexión con un grupo')}</strong><span>{t('Explore Friendship Groups when you are ready.','Explora Grupos de Amistad cuando estés listo.')}</span></div></div><Link className="record-link" href={`/groups${lang}`}>{t('Explore','Explorar')}</Link></div>}</div></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('FRIENDSHIP GROUP ATTENDANCE','ASISTENCIA AL GRUPO DE AMISTAD')}</div><h2>{t('My meeting history','Mi historial de reuniones')}</h2><div className="milestone-list">{(attendanceHistory??[]).map((row:any)=>{const report:any=Array.isArray(row.group_reports)?row.group_reports[0]:row.group_reports;const group:any=Array.isArray(row.groups)?row.groups[0]:row.groups;const s=String(row.attendance_status||'missing');return <div className={`milestone ${s==='on_time'?'done':''}`} key={row.id}><div className="milestone-main"><div className="milestone-icon"><Clock3 size={13}/></div><div><strong>{group?.name||t('Friendship Group','Grupo de Amistad')}</strong><span>{report?.meeting_date?formatDate(report.meeting_date):formatDateTime(row.recorded_at)}{row.checked_in_at?` • ${t('Checked in','Registrado')} ${formatDateTime(row.checked_in_at)}`:''}</span></div></div><div className="milestone-status">{status(s)}</div></div>})}{!(attendanceHistory??[]).length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><Clock3 size={13}/></div><div><strong>{t('No finalized attendance history yet','Aún no hay historial de asistencia finalizado')}</strong><span>{t('Your On time, Late or Missing status will appear after group reports are submitted.','Tu estado A tiempo, Tarde o Ausente aparecerá después de que se envíen los reportes del grupo.')}</span></div></div></div>}</div></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('MY PRAYER HISTORY','MI HISTORIAL DE ORACIÓN')}</div><h2>{t('Prayer requests I submitted','Peticiones de oración que envié')}</h2><div className="milestone-list">{(prayerHistory??[]).map((p:any)=><div className={`milestone ${p.answered_at?'done':''}`} key={p.id}><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{String(p.body).slice(0,120)}{String(p.body).length>120?'…':''}</strong><span>{formatDateTime(p.created_at)} • {p.visibility==='private'?t('Private','Privada'):t('Public','Pública')}{p.share_with_group?` • ${t('Shared with group','Compartida con el grupo')}`:''}</span></div></div><div className="milestone-status">{p.answered_at?t('Answered','Contestada'):status(p.status||'open')}</div></div>)}{!(prayerHistory??[]).length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{t('No prayer requests submitted yet','Aún no has enviado peticiones de oración')}</strong><span>{t('When you submit one, the date, privacy choice and answered status will stay here for you.','Cuando envíes una, la fecha, privacidad y estado de respuesta permanecerán aquí para ti.')}</span></div></div><Link className="record-link" href={`/prayer${lang}`}>{t('Open Prayer','Abrir Oración')}</Link></div>}</div></article>

      <article className="card journey-card"><div className="pill">{t('PREPARATION','PREPARACIÓN')}</div><h2>{t('Equipping others','Equipando a otros')}</h2><div className="milestone-list">{milestone(t('Bible Study Teacher','Maestro de Estudio Bíblico'),m.bible_study_teacher_status==='approved',`${t('Status','Estado')}: ${status(m.bible_study_teacher_status)}`)}{milestone('Timothys',m.timothys_status==='completed',`${t('Status','Estado')}: ${status(m.timothys_status)}`)}{milestone(t('School of Pastors','Escuela de Pastores'),m.school_pastors_status==='completed',`${t('Status','Estado')}: ${status(m.school_pastors_status)}`)}</div></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('LEARNING','APRENDIZAJE')}</div><h2>{t('Courses','Cursos')}</h2><div className="journey-courses">{courseRows.map(({e,c}:any)=>{const pct=Math.max(0,Math.min(100,Number(e.progress_percent??0)));return <div className="journey-course" key={`${e.course_id}-${e.user_id}`}><strong>{c.title}</strong><span>{pct}%{e.credential_earned?` • ${t('Credential earned','Credencial obtenida')}`:''}</span><div className="course-progress"><i style={{width:`${pct}%`}}/></div></div>})}{!courseRows.length&&<div className="journey-course"><strong>{t('No course enrollment yet','Aún no estás inscrito en un curso')}</strong><span>{t('Courses will appear here when you begin them.','Los cursos aparecerán aquí cuando los comiences.')}</span></div>}</div><Link className="ghost" href={`/learning${lang}`} style={{display:'inline-flex',marginTop:10}}><BookOpen size={14}/> {t('Open Learning','Abrir Aprendizaje')}</Link></article>

      <article className="card journey-card journey-wide"><div className="pill">{t('SERVING','SERVICIO')}</div><h2>{t('Serving records','Registros de servicio')}</h2><div className="milestone-list">{accepted.map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{mm.get(a.ministry_id)||t('Ministry','Ministerio')}</strong><span>{t('Application accepted','Solicitud aceptada')}</span></div></div></div>)}{(assignments??[]).slice(0,6).map((a:any)=><div className="milestone done" key={a.id}><div className="milestone-main"><div className="milestone-icon"><Church size={13}/></div><div><strong>{a.title}</strong><span>{mm.get(a.ministry_id)||t('Church team','Equipo de iglesia')} • {new Date(a.starts_at).toLocaleDateString(es?'es-US':'en-US')}</span></div></div></div>)}{!accepted.length&&!assignments?.length&&<div className="milestone"><div className="milestone-main"><div className="milestone-icon"><HandHeart size={13}/></div><div><strong>{t('No serving connection recorded yet','Aún no hay servicio registrado')}</strong><span>{t('Explore ministries when you are ready.','Explora ministerios cuando estés listo.')}</span></div></div><Link className="record-link" href={`/serve${lang}`}>{t('Explore','Explorar')}</Link></div>}</div></article></section>
    </details>

    <section className="card journey-note"><div className="pill">{t('ABOUT THESE RECORDS','SOBRE ESTOS REGISTROS')}</div><p>{t('A missing item is not a spiritual judgment. It only means Kingdom Network does not currently have that verified or completed record.','Un dato faltante no es un juicio espiritual. Solo significa que Kingdom Network todavía no tiene ese registro verificado o completado.')}</p></section>
  </main>
}
