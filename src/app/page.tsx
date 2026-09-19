import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Church,
  Crown,
  GraduationCap,
  HandHeart,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/notification-bell'
import { UpcomingSnapshot } from '@/components/upcoming-snapshot'
import { FeaturedEvents } from '@/components/featured-events'
import { getNextStep } from '@/lib/journey'
import { getLearningResumeState } from '@/lib/learning-resume'
import styles from './home-v2.module.css'

const roleNames:Record<string,string>={
  pastor:'Pastor',
  church_admin:'Church Admin',
  minister:'Minister',
  group_leader:'Group Leader',
  ministry_leader:'Ministry Leader',
  member:'Member',
}

export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const es=params.lang==='es'
  const lang=es?'es':'en'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>{
    if(!es)return path
    const [base,hash]=path.split('#')
    return `${base}${base.includes('?')?'&':'?'}lang=es${hash?`#${hash}`:''}`
  }

  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect(l('/login'))

  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name,city,state,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).single(),
  ])

  if(!membership?.church_id){
    return <main className={styles.page}><div className={styles.shell}><div className={styles.emptyState}><section className={styles.emptyCard}><div className={styles.identity}><div className={styles.mark}><Crown/></div><div className={styles.brand}><strong>ONE KINGDOM</strong><span>Church OS</span></div></div><h1>{t('Your account is ready.','Tu cuenta está lista.')}</h1><p className={styles.muted}>{t('You are not connected to an active church yet. A church administrator can finish your connection without recreating your account.','Todavía no estás conectado a una iglesia activa. Un administrador puede completar tu conexión sin volver a crear tu cuenta.')}</p><div className={styles.actionRow}><Link className={styles.primaryButton} href={l('/feedback')}>{t('Get help','Obtener ayuda')} <ArrowRight/></Link><Link className={styles.secondaryButton} href={l('/profile')}>{t('Open profile','Abrir perfil')}</Link></div></section></div></div></main>
  }

  const churchId=membership.church_id
  const role=String(membership.role??'member')
  const isAdmin=['pastor','church_admin'].includes(role)
  const isLeader=isAdmin||['minister','group_leader','ministry_leader'].includes(role)
  const nowIso=new Date().toISOString()

  const [{data:milestones},{count:groupCount},{count:teamCount},{count:acceptedCount},{data:newConvertCourses},{data:activeLearning}]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',churchId).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('*',{count:'exact',head:true}).eq('assigned_user_id',userId),
    supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted'),
    supabase.from('courses').select('id').eq('church_id',churchId).eq('published',true).eq('pathway_stage','new_convert'),
    supabase.from('course_enrollments').select('course_id,progress,updated_at').eq('user_id',userId).eq('credential_earned',false).order('updated_at',{ascending:false}).limit(1),
  ])

  let leadershipNeeds=0
  if(isAdmin){
    const [{count:care},{count:reports},{count:outreach},{count:docs},{count:applications}]=await Promise.all([
      supabase.from('care_requests').select('*',{count:'exact',head:true}).eq('church_id',churchId).in('status',['new','in_review']),
      supabase.from('message_reports').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','open'),
      supabase.from('outreach_contacts').select('*',{count:'exact',head:true}).eq('church_id',churchId).lt('follow_up_due_at',nowIso).not('stage','in','("inactive","serving")'),
      supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('verification_status','pending'),
      supabase.from('ministry_applications').select('id,ministries!inner(church_id)',{count:'exact',head:true}).eq('ministries.church_id',churchId).in('status',['submitted','under_review']),
    ])
    leadershipNeeds=(care??0)+(reports??0)+(outreach??0)+(docs??0)+(applications??0)
  }

  const newConvertIds=(newConvertCourses??[]).map((course:any)=>course.id)
  let newConvertCompleted=false
  if(newConvertIds.length){
    const {data:completedRows}=await supabase.from('course_enrollments').select('course_id').eq('user_id',userId).eq('credential_earned',true).in('course_id',newConvertIds).limit(1)
    newConvertCompleted=Boolean(completedRows?.length)
  }

  let learningResume:any=null
  if(activeLearning?.[0]?.course_id){
    const {data:activeCourse}=await supabase.from('courses').select('id,title,passing_score,language_code').eq('id',activeLearning[0].course_id).eq('published',true).maybeSingle()
    if(activeCourse)learningResume=await getLearningResumeState(supabase,userId,activeCourse)
  }

  const m:any=milestones??{}
  const nextStep=getNextStep({
    holyGhost:m.holy_ghost_received,
    baptized:m.baptized,
    newConvertAvailable:newConvertIds.length>0,
    newConvertCompleted,
    firstSteps:m.first_steps_status,
    soulWinning:m.soul_winning_status,
    bibleStudyTeacher:m.bible_study_teacher_status,
    groupCount:groupCount??0,
    serveCount:(teamCount??0)+(acceptedCount??0),
  },lang)

  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as any
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Member','Miembro')
  const firstName=name.split(' ')[0]
  const churchLogo=church?.logo_path?supabase.storage.from('church-branding').getPublicUrl(church.logo_path).data.publicUrl:null
  const accent=church?.brand_color||'#1E5BFF'
  const roleName=roleNames[role]??role.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())
  const learningTarget=learningResume?.href??'/learning'
  const learningDescription=learningResume?.kind==='lesson'?t('Continue where you left off','Continúa donde te quedaste'):learningResume?.kind==='final'?t('Your final exam is ready','Tu examen final está listo'):t('Classes, training and progress','Clases, capacitación y progreso')

  const coreTools=[
    {title:t('Learning','Aprendizaje'),desc:learningDescription,href:learningTarget,Icon:GraduationCap},
    {title:t('Friendship Groups','Grupos de Amistad'),desc:t('Connect, belong and grow','Conéctate, pertenece y crece'),href:'/groups',Icon:Users},
    {title:t('Calendar','Calendario'),desc:t('Services, events and schedules','Servicios, eventos y horarios'),href:'/calendar',Icon:CalendarDays},
    {title:t('Prayer & Care','Oración y Cuidado'),desc:t('Prayer, testimony and pastoral care','Oración, testimonio y cuidado pastoral'),href:'/prayer',Icon:HandHeart},
    {title:t('Serve','Servir'),desc:t('Ministries, teams and opportunities','Ministerios, equipos y oportunidades'),href:'/serve',Icon:BriefcaseBusiness},
    {title:t('Church Directory','Directorio'),desc:t('Stay connected to your church family','Mantente conectado con tu familia de iglesia'),href:'/directory',Icon:Church},
  ]

  return <main className={styles.page} style={{'--church-accent':accent} as CSSProperties}>
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.identity}>
          <div className={styles.mark}><Crown/></div>
          <div className={styles.brand}><strong>ONE KINGDOM</strong><span>{t('Church OS','Sistema para Iglesias')}</span></div>
        </div>
        <div className={styles.topActions}>
          <Link className={styles.iconLink} href={es?'/?lang=en':'/?lang=es'}><span>{es?'English':'Español'}</span></Link>
          <div className={styles.iconLink}><NotificationBell userId={userId}/></div>
          <Link className={styles.profileLink} href={l('/profile')}><UserRound/><span>{t('Profile','Perfil')}</span></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.eyebrow}><Sparkles/> {t('YOUR CHURCH. CLEARLY CONNECTED.','TU IGLESIA. CLARAMENTE CONECTADA.')}</div>
          <h1>{t(`Welcome back, ${firstName}.`,`Bienvenido, ${firstName}.`)}</h1>
          <p>{t('One place to know what matters today, see your next step, stay connected, and serve with purpose.','Un solo lugar para saber qué importa hoy, ver tu próximo paso, mantenerte conectado y servir con propósito.')}</p>
          <div className={styles.promise}><span/>{t('Know every person.','Conoce a cada persona.')}<span/>{t('Clarify every next step.','Aclara cada próximo paso.')}<span/>{t('Let nobody be forgotten.','Que nadie sea olvidado.')}</div>
        </div>
        <aside className={styles.churchCard}>
          <div>
            <div className={styles.churchTop}>
              {churchLogo?<img className={styles.churchLogo} src={churchLogo} alt={`${church?.name??t('Church','Iglesia')} logo`}/>:<div className={styles.churchFallback}><Church/></div>}
              <div><div className={styles.churchName}>{church?.name??t('Your Church','Tu Iglesia')}</div><div className={styles.location}>{[church?.city,church?.state].filter(Boolean).join(', ')||t('Church community','Comunidad de iglesia')}</div></div>
            </div>
            <p className={styles.churchMessage}>{church?.welcome_message||t('Grow, connect, serve and walk with God together.','Crece, conéctate, sirve y camina con Dios junto a tu iglesia.')}</p>
          </div>
          <div className={styles.rolePill}><ShieldCheck/> {roleName}</div>
        </aside>
      </section>

      <section className={styles.priorityGrid}>
        <article className={`${styles.priority} ${styles.priorityBlue}`}>
          <div className={styles.priorityHead}><div><div className={styles.label}>{t('MY TODAY','MI DÍA')}</div></div><div className={styles.priorityIcon}><Bell/></div></div>
          <h2>{t('What needs my attention?','¿Qué necesita mi atención?')}</h2>
          <p>{t('See today’s assignments, classes, alerts, follow-ups and upcoming responsibilities in one focused view.','Mira las asignaciones, clases, alertas, seguimientos y responsabilidades de hoy en una sola vista.')}</p>
          <div className={styles.actionRow}><Link className={styles.primaryButton} href={l('/today')}>{t('Open My Today','Abrir Mi Día')} <ArrowRight/></Link></div>
        </article>

        <article className={`${styles.priority} ${styles.priorityGold}`}>
          <div className={styles.priorityHead}><div><div className={styles.label}>{t('MY NEXT STEP','MI PRÓXIMO PASO')}</div></div><div className={styles.priorityIcon}><Sparkles/></div></div>
          <h2>{nextStep.title}</h2>
          <p>{nextStep.body}</p>
          <div className={styles.actionRow}><Link className={styles.primaryButton} href={l(nextStep.href)}>{nextStep.action} <ArrowRight/></Link><Link className={styles.secondaryButton} href={l('/journey')}>{t('My Journey','Mi Camino')}</Link></div>
        </article>
      </section>

      {isAdmin&&<section className={styles.leadership}>
        <div className={styles.leadershipHead}>
          <div className={styles.leadershipTitle}><div className={styles.leadershipBadge}><Crown/></div><div><h2>{leadershipNeeds>0?t(`${leadershipNeeds} leadership item${leadershipNeeds===1?'':'s'} need attention`,`${leadershipNeeds} asunto${leadershipNeeds===1?'':'s'} de liderazgo necesita${leadershipNeeds===1?'':'n'} atención`):t('Leadership queue is clear','La cola de liderazgo está al día')}</h2><p>{t('Care, follow-up, approvals and people who may need a leader’s attention.','Cuidado, seguimiento, aprobaciones y personas que pueden necesitar atención de liderazgo.')}</p></div></div>
          <div className={styles.leadershipLinks}><Link className={styles.darkLink} href={l('/church/leadership')}><ShieldCheck/> {t('Leadership','Liderazgo')}</Link><Link className={styles.darkLink} href={l('/church')}><Church/> {t('Admin Center','Centro Admin')}</Link></div>
        </div>
      </section>}

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>{t('Your One Kingdom','Tu One Kingdom')}</h2><p>{t('The tools you use most, organized around church life instead of software menus.','Las herramientas que más usas, organizadas alrededor de la vida de la iglesia.')}</p></div><Link className={styles.textLink} href={l('/guide')}>{t('Find anything','Encontrar algo')} →</Link></div>
        <div className={styles.toolGrid}>{coreTools.map(({title,desc,href,Icon})=><Link className={styles.tool} href={l(href)} key={href}><div className={styles.toolIcon}><Icon/></div><strong>{title}</strong><span>{desc}</span><div className={styles.toolArrow}><ArrowRight/></div></Link>)}</div>
      </section>

      <UpcomingSnapshot churchId={churchId} userId={userId} lang={lang}/>
      <FeaturedEvents churchId={churchId} lang={lang}/>

      {isLeader&&<section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>{t('Leader workspace','Espacio de liderazgo')}</h2><p>{t('Lead people and ministries without losing sight of follow-through.','Lidera personas y ministerios sin perder de vista el seguimiento.')}</p></div></div>
        <div className={styles.toolGrid}>
          <Link className={styles.tool} href={l('/rosters')}><div className={styles.toolIcon}><Users/></div><strong>{t('Leader Rosters','Listas de Líder')}</strong><span>{t('People you are responsible for','Personas bajo tu responsabilidad')}</span><div className={styles.toolArrow}><ArrowRight/></div></Link>
          <Link className={styles.tool} href={l('/calendar/shared')}><div className={styles.toolIcon}><CalendarDays/></div><strong>{t('Shared Schedules','Horarios Compartidos')}</strong><span>{t('Coordinate teams and service','Coordina equipos y servicio')}</span><div className={styles.toolArrow}><ArrowRight/></div></Link>
          <Link className={styles.tool} href={l('/outreach')}><div className={styles.toolIcon}><Megaphone/></div><strong>{t('Outreach','Evangelismo')}</strong><span>{t('Guests, Bible studies and follow-up','Invitados, estudios bíblicos y seguimiento')}</span><div className={styles.toolArrow}><ArrowRight/></div></Link>
          <Link className={styles.tool} href={l('/learning')}><div className={styles.toolIcon}><BookOpen/></div><strong>{t('Training','Capacitación')}</strong><span>{t('Learning and verified progress','Aprendizaje y progreso verificado')}</span><div className={styles.toolArrow}><ArrowRight/></div></Link>
        </div>
      </section>}
    </div>
  </main>
}
