import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,BookOpen,Clock,FileText,Gamepad2,Languages,LockKeyhole,MessageSquareWarning,Settings2,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLearningResumeState } from '@/lib/learning-resume'
import { startCourse } from './actions'
import './learning.css'

const audienceLabel=(v?:string|null)=>({new_convert:'New Convert',member:'Member',teacher_training:'Teacher Training',leadership:'Leadership',general:'General'} as Record<string,string>)[v??'general']??String(v??'general').replaceAll('_',' ')
const awardTier=(score?:number|null)=>score===100?'Platinum':score!=null&&score>=90?'Gold':score!=null&&score>=80?'Silver':null
const stages=[
  {key:'new_convert',en:'New Convert',es:'Nuevo Convertido',descEn:'Bible basics and preparation for the next biblical response.',descEs:'Fundamentos bíblicos y preparación para el próximo paso bíblico.'},
  {key:'foundation',en:'Foundation',es:'Fundamento',descEn:'Build the habits and understanding every growing member needs.',descEs:'Desarrolla los hábitos y la comprensión que todo miembro necesita.'},
  {key:'outreach',en:'Outreach',es:'Evangelismo',descEn:'Learn to share faith and intentionally reach people.',descEs:'Aprende a compartir la fe y alcanzar a otros intencionalmente.'},
  {key:'teaching',en:'Teaching',es:'Enseñanza',descEn:'Prepare to guide others through Scripture responsibly.',descEs:'Prepárate para guiar a otros por las Escrituras responsablemente.'},
  {key:'leadership',en:'Leadership',es:'Liderazgo',descEn:'Develop ministry knowledge, accountability and leadership readiness.',descEs:'Desarrolla conocimiento ministerial, responsabilidad y preparación para liderar.'}
] as const

export default async function LearningPage({searchParams}:{searchParams:Promise<{error?:string;lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':params.lang==='all'?'all':'en'
  const es=lang==='es',rewardLang=es?'es':'en',t=(en:string,sp:string)=>es?sp:en
  const suffix=es?'?lang=es':''
  const courseHref=(course:any)=>`/learning/${course.id}${(course.language_code??'en')==='es'?'?lang=es':''}`
  const resumeHref=(href:string)=>{if(!es)return href;const [base,hash]=href.split('#');return `${base}?lang=es${hash?`#${hash}`:''}`}
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [{data:allCourses},{data:enrollments},{data:xpEvents},{data:badgeRows},{data:prerequisites},{data:milestones}]=await Promise.all([
    supabase.from('courses').select('*').eq('published',true).order('pathway_order').order('created_at'),
    supabase.from('course_enrollments').select('course_id,progress,final_score,completed_at,credential_earned,curriculum_version').eq('user_id',userId),
    supabase.from('learning_xp_events').select('points').eq('user_id',userId),
    supabase.from('member_badges').select('badge_id,badges(category)').eq('user_id',userId),
    supabase.from('course_prerequisites').select('course_id,prerequisite_type,required_course_id,milestone_key,required_value,allowed_roles,display_text,hard_block'),
    supabase.from('member_milestones').select('*').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle()
  ])
  const courses=(allCourses??[]).filter((c:any)=>lang==='all'||(c.language_code??'en')===lang)
  const em=new Map((enrollments??[]).map((e:any)=>[e.course_id,e]))
  const prereqBy=new Map<string,any[]>();for(const r of prerequisites??[]){const list=prereqBy.get(r.course_id)??[];list.push(r);prereqBy.set(r.course_id,list)}
  const missingFor=(courseId:string)=>{const reqs=prereqBy.get(courseId)??[];return reqs.filter((r:any)=>{if(!r.hard_block)return false;if(r.prerequisite_type==='course')return !em.get(r.required_course_id)?.credential_earned;if(r.prerequisite_type==='role')return !(r.allowed_roles??[]).includes(membership.role);if(r.prerequisite_type==='milestone')return String((milestones as any)?.[r.milestone_key]??'')!==String(r.required_value??'');return false})}
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const completed=(enrollments??[]).filter((e:any)=>e.credential_earned).length
  const xp=(xpEvents??[]).reduce((sum:number,e:any)=>sum+Number(e.points??0),0)
  const trophies=(badgeRows??[]).filter((r:any)=>{const b=Array.isArray(r.badges)?r.badges[0]:r.badges;return b?.category==='learning'}).length
  const canManage=['minister','pastor','church_admin'].includes(membership.role)
  const visibleCourseIds=new Set(courses.map((c:any)=>c.id))
  const visibleEnrollments=(enrollments??[]).filter((e:any)=>visibleCourseIds.has(e.course_id))
  const inProgress=visibleEnrollments.filter((e:any)=>!e.credential_earned)
  const completedVisible=visibleEnrollments.filter((e:any)=>e.credential_earned).length
  const availableCount=courses.filter((c:any)=>!em.has(c.id)&&missingFor(c.id).length===0).length
  const currentEnrollment:any=inProgress[0]??null
  const currentCourse:any=currentEnrollment?courses.find((c:any)=>c.id===currentEnrollment.course_id):null
  const currentResume=currentCourse?await getLearningResumeState(supabase,userId,currentCourse):null
  const currentResumeLabel=currentResume?.kind==='lesson'
    ?`${t('Continue','Continuar')}: ${currentResume.moduleTitle??t('Next lesson','Próxima lección')}`
    :currentResume?.kind==='final'
      ?t('Take final exam','Tomar examen final')
      :t('Open completed course','Abrir curso completado')
  const schoolCourses=courses.filter((c:any)=>c.category==='School of Discipleship').sort((a:any,b:any)=>(a.pathway_order??0)-(b.pathway_order??0))
  const dydCourses=courses.filter((c:any)=>c.category==='Disciple Your Disciplers').sort((a:any,b:any)=>(a.pathway_order??0)-(b.pathway_order??0))
  const standardCourses=courses.filter((c:any)=>c.category!=='School of Discipleship'&&c.category!=='Disciple Your Disciplers')

  const card=(course:any)=>{const enrollment:any=em.get(course.id);const progress=enrollment?.progress??0;const finalScore=enrollment?.final_score==null?null:Number(enrollment.final_score);const tier=awardTier(finalScore);const isEs=(course.language_code??'en')==='es';const missing=missingFor(course.id);const locked=!enrollment&&missing.length>0;return <article className="card course-card" key={course.id}><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.category||t('COURSE','CURSO')}</div><div className="pill">{isEs?'ESPAÑOL':'ENGLISH'}</div>{locked&&<div className="pill"><LockKeyhole size={10}/> {t('LOCKED','BLOQUEADO')}</div>}</div><h2>{course.title}</h2>{course.description&&<p>{course.description}</p>}<div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hrs':t('Self paced','A tu ritmo')}</span><span><Award size={13}/> {course.badge_name||t('Completion','Finalización')}</span></div>{locked&&<div className="notice" style={{margin:'12px 0 0'}}><strong>{isEs?'Requisito pendiente':'Prerequisite needed'}:</strong> {missing.map((r:any)=>r.display_text).join(' • ')}</div>}<div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% {t('complete','completo')}</span><span>{enrollment?.credential_earned?(tier&&finalScore!=null?`${tier} • ${finalScore}%`:t('Completed','Completado')):enrollment?t('In progress','En progreso'):locked?t('Locked','Bloqueado'):t('Not started','No comenzado')}</span></div>{enrollment?<Link className="btn" href={courseHref(course)} style={{marginTop:14}}>{progress?t('Continue course','Continuar curso'):t('Open course','Abrir curso')}</Link>:locked?<button className="ghost" style={{marginTop:14}} disabled><LockKeyhole size={14}/> {isEs?'Completa el requisito primero':'Complete prerequisite first'}</button>:<form action={startCourse}><input type="hidden" name="course_id" value={course.id}/><button className="btn" style={{marginTop:14}}><BookOpen size={15}/> {isEs?'Comenzar curso':'Start course'}</button></form>}</article>}

  return <main className="shell">
    <header className="topbar"><div><Link href={es?'/?lang=es':'/'} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • {t('Learning','Aprendizaje')}</div></div><div className="row"><Link className="ghost" href={`/today${suffix}`}>{t('My Today','Mi Día')}</Link><Link className="ghost" href={`/feedback${suffix}`}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={es?'/?lang=es':'/'}>← {t('Home','Inicio')}</Link></div></header>

    <section className="learning-hero card"><div><div className="pill">{t('LEARNING CENTER','CENTRO DE APRENDIZAJE')}</div><h1>{t('Keep growing.','Sigue creciendo.')}</h1><p className="muted">{t('Continue what you started, or choose the next course when you are ready.','Continúa lo que empezaste o elige el próximo curso cuando estés listo.')}</p></div><div className="learning-stat"><strong>{completed}</strong><span>{t('credentials earned','credenciales obtenidas')}</span></div></section>

    {currentCourse&&currentResume&&<section className="card" style={{padding:22,marginBottom:18,border:'1px solid rgba(125,211,252,.34)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div style={{maxWidth:760}}><div className="pill">{t('CONTINUE LEARNING','CONTINUAR APRENDIENDO')}</div><h2 style={{fontSize:'1.55rem',margin:'9px 0 6px'}}>{currentCourse.title}</h2><div className="progress-track" style={{marginTop:10}}><div className="progress-fill" style={{width:`${Number(currentEnrollment.progress??0)}%`}}/></div><p className="small muted">{Number(currentEnrollment.progress??0)}% {t('complete','completo')}</p><strong>{currentResumeLabel}</strong></div><Link className="btn" href={resumeHref(currentResume.href)}>{currentResume.kind==='lesson'?t('Resume lesson','Continuar lección'):currentResume.kind==='final'?t('Take final exam','Tomar examen final'):t('Open course','Abrir curso')} →</Link></section>}

    {!currentCourse&&availableCount>0&&<section className="card" style={{padding:20,marginBottom:18}}><div className="pill">{t('READY WHEN YOU ARE','LISTO CUANDO TÚ ESTÉS')}</div><h2>{t('Choose a course below to begin.','Elige un curso abajo para comenzar.')}</h2><p className="muted">{t('You do not need to take everything at once. Start with the course that matches your next step.','No necesitas tomar todo a la vez. Comienza con el curso que corresponde a tu próximo paso.')}</p></section>}

    <div className="row" style={{gap:8,marginBottom:16,flexWrap:'wrap'}}><Languages size={16}/><Link className={lang==='en'?'btn':'ghost'} href="/learning?lang=en">English</Link><Link className={lang==='es'?'btn':'ghost'} href="/learning?lang=es">Español</Link><Link className={lang==='all'?'btn':'ghost'} href="/learning?lang=all">{t('All','Todos')}</Link></div>
    {params.error&&<div className="notice error">{params.error}</div>}

    {schoolCourses.length>0&&<section className="pathway-section" style={{marginBottom:22}}><div className="pathway-head"><div className="pathway-number">4</div><div><div className="pill">SCHOOL OF DISCIPLESHIP</div><h2>{t('One path. Four levels.','Una ruta. Cuatro niveles.')}</h2><p>{t('Start with New Birth and move through Grow, Mature and Multiply in order.','Comienza con Nuevo Nacimiento y avanza en orden por Crecer, Madurar y Multiplicar.')}</p></div></div><div className="course-grid">{schoolCourses.map(card)}</div></section>}

    {standardCourses.length>0&&<section style={{marginBottom:22}}><div className="pill" style={{marginBottom:12}}>{t('MORE COURSES','MÁS CURSOS')}</div><div className="pathway-sections">{stages.map(stage=>{const stageCourses=standardCourses.filter((c:any)=>(c.pathway_stage??'foundation')===stage.key);if(!stageCourses.length)return null;return <details className="card" style={{padding:18,marginBottom:12}} key={stage.key}><summary style={{fontWeight:800,cursor:'pointer'}}>{lang==='es'?stage.es:stage.en} • {stageCourses.length}</summary><p className="small muted">{lang==='es'?stage.descEs:stage.descEn}</p><div className="course-grid" style={{marginTop:14}}>{stageCourses.map(card)}</div></details>})}</div></section>}

    {dydCourses.length>0&&<details className="card" style={{padding:18,marginBottom:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Advanced leadership development','Desarrollo avanzado de líderes')} • {dydCourses.length}</summary><p className="small muted">{t('Disciple Your Disciplers leadership courses. Open this section when leadership training is your next step.','Cursos de liderazgo Disciple Your Disciplers. Abre esta sección cuando la capacitación de liderazgo sea tu próximo paso.')}</p><div className="course-grid" style={{marginTop:14}}>{dydCourses.map(card)}</div></details>}

    <details className="card" style={{padding:18,marginBottom:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('My progress & more learning tools','Mi progreso y más herramientas')}</summary><div style={{display:'grid',gap:14,marginTop:14}}><div className="row" style={{gap:10,flexWrap:'wrap'}}><div className="card" style={{padding:'12px 16px'}}><strong style={{fontSize:22}}>{inProgress.length}</strong><div className="small muted">{t('In progress','En progreso')}</div></div><div className="card" style={{padding:'12px 16px'}}><strong style={{fontSize:22}}>{completedVisible}</strong><div className="small muted">{t('Completed','Completados')}</div></div><div className="card" style={{padding:'12px 16px'}}><strong style={{fontSize:22}}>{availableCount}</strong><div className="small muted">{t('Available now','Disponibles ahora')}</div></div></div><div className="row" style={{flexWrap:'wrap'}}><Link className="ghost" href={`/learning/transcript${suffix}`}><Award size={14}/> {t('My Transcript','Mi historial')}</Link><Link className="ghost" href={`/learning/rewards?lang=${rewardLang}`}><Gamepad2 size={14}/> {t('Rewards & Games','Premios y juegos')} • {trophies} / {xp} XP</Link><Link className="ghost" href={`/resources${suffix}`}><FileText size={14}/> {t('Resource Library','Biblioteca de recursos')}</Link>{canManage&&<Link className="ghost" href={`/learning/admin/first-steps${suffix}`}><BookOpen size={14}/> First Steps Roster</Link>}{canManage&&<Link className="ghost" href={`/learning/admin${suffix}`}><Settings2 size={14}/> Learning Studio</Link>}</div><div className="notice"><strong>{t('Course tests','Pruebas de curso')}:</strong> {t('80% is the normal minimum. A course or test may require a higher score. • 80–89 Silver • 90–99 Gold • 100 Platinum.','80% es el mínimo normal. Un curso o prueba puede exigir un puntaje mayor. • 80–89 Plata • 90–99 Oro • 100 Platino.')}</div></div></details>

    {!courses.length&&<div className="card empty"><h3>{es?'Todavía no hay cursos publicados en español.':'No published courses in this view yet.'}</h3><p className="muted">{es?'Los cursos en español aparecerán aquí cuando el liderazgo los publique.':'Training added by church leadership will appear here.'}</p></div>}
  </main>
}