import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,BookOpen,BriefcaseBusiness,CalendarDays,Church,FileText,Globe2,GraduationCap,HandHeart,HeartHandshake,Images,MessageCircle,MessageSquareWarning,Megaphone,ShieldCheck,Store,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CommunityFeed } from '@/components/community-feed'
import { NotificationBell } from '@/components/notification-bell'
import { OfficialUpdates } from '@/components/official-updates'
import { UpcomingSnapshot } from '@/components/upcoming-snapshot'
import { FeaturedEvents } from '@/components/featured-events'
import { getNextStep } from '@/lib/journey'
import { getLearningResumeState } from '@/lib/learning-resume'

export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en',t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>{if(!es)return path;const [base,hash]=path.split('#');return `${base}${base.includes('?')?'&':'?'}lang=es${hash?`#${hash}`:''}`}
  const everyday=[
    {title:t('Learning','Aprendizaje'),desc:t('Classes & progress','Clases y progreso'),Icon:GraduationCap,href:'/learning'},
    {title:t('Groups','Grupos'),desc:t('Friendship Group & community','Grupo de Amistad y comunidad'),Icon:Users,href:'/groups'},
    {title:t('Calendar','Calendario'),desc:t('Services, classes & events','Servicios, clases y eventos'),Icon:CalendarDays,href:'/calendar'},
    {title:t('Prayer & Testimony','Oración y Testimonio'),desc:t('Prayer needs & victories','Necesidades y victorias'),Icon:HandHeart,href:'/prayer'}
  ] as const
  const explore=[
    {title:t('Kingdom Guide','Guía Kingdom'),desc:t('Help finding anything','Ayuda para encontrar lo que necesitas'),Icon:BookOpen,href:'/guide'},
    {title:t('Messages','Mensajes'),desc:t('Private conversations','Conversaciones privadas'),Icon:MessageCircle,href:'/messages'},
    {title:t('Serve','Servir'),desc:t('Ministries & opportunities','Ministerios y oportunidades'),Icon:HandHeart,href:'/serve'},
    {title:t('Teams','Equipos'),desc:t('Schedules & assignments','Horarios y asignaciones'),Icon:BriefcaseBusiness,href:'/teams'},
    {title:t('Documents','Documentos'),desc:t('Certificates & records','Certificados y registros'),Icon:FileText,href:'/documents'},
    {title:t('Media Library','Biblioteca de Medios'),desc:t('Flyers, photos & graphics','Volantes, fotos y gráficos'),Icon:Images,href:'/media'},
    {title:t('Business Partners','Negocios de Miembros'),desc:t('Support member businesses','Apoya negocios de miembros'),Icon:Store,href:'/business'},
    {title:t('Fundraising','Recaudación'),desc:t('Campaigns & goals','Campañas y metas'),Icon:HeartHandshake,href:'/fundraising'},
    {title:t('Network','Red'),desc:t('District & organization','Distrito y organización'),Icon:Globe2,href:'/network'},
    {title:t('Church Directory','Directorio de la Iglesia'),desc:t('Find church family','Encuentra a tu familia de iglesia'),Icon:Church,href:'/directory'},
    {title:t('Private Care','Cuidado Privado'),desc:t('Private prayer & pastoral help','Oración privada y ayuda pastoral'),Icon:HandHeart,href:'/help'}
  ] as const

  const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;if(!userId)redirect(l('/login'))
  const [{data:profile,error:profileError},{data:membership,error:membershipError}]=await Promise.all([supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle(),supabase.from('church_memberships').select('church_id,role,churches(name,city,state,logo_path,brand_color,welcome_message)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()])
  if(profileError)console.error('Home profile read failed',{code:profileError.code})
  if(membershipError){console.error('Home membership read failed',{code:membershipError.code});return <main className="shell"><div className="card" role="alert" style={{padding:24}}><div className="pill">{t('CONNECTION CHECK','REVISIÓN DE CONEXIÓN')}</div><h1>{t("We couldn't load your church connection.",'No pudimos cargar tu conexión con la iglesia.')}</h1><p>{t('Nothing was changed. This can happen with a temporary connection problem. Try again before creating another account or asking for a new invitation.','No se cambió nada. Esto puede pasar por un problema temporal de conexión. Inténtalo otra vez antes de crear otra cuenta o pedir una invitación nueva.')}</p><div className="row"><Link className="btn" href={l('/')}>{t('Check connection again','Revisar conexión otra vez')}</Link><Link className="ghost" href={l('/feedback')}>{t('Get help','Obtener ayuda')}</Link><form action="/auth/signout" method="post"><button className="ghost">{t('Sign out','Cerrar sesión')}</button></form></div></div></main>}
  if(!membership?.church_id)return <main className="shell"><div className="card" style={{padding:24}}><div className="pill">{t('ONE MORE STEP','UN PASO MÁS')}</div><h1>{t('Connect this account to your church.','Conecta esta cuenta con tu iglesia.')}</h1><p>{t('Keep this account—do not create another one. Ask your church leader for the newest invitation or join link, open that link while signed in with this account, then come back here and check again.','Conserva esta cuenta; no crees otra. Pídele a tu líder de iglesia la invitación o enlace más reciente, abre ese enlace mientras estás conectado con esta cuenta y luego vuelve aquí para revisar otra vez.')}</p><div className="row"><Link className="btn" href={l('/')}>{t('Check connection again','Revisar conexión otra vez')}</Link><Link className="ghost" href={l('/feedback')}>{t('I need help','Necesito ayuda')}</Link><form action="/auth/signout" method="post"><button className="ghost">{t('Sign out','Cerrar sesión')}</button></form></div></div></main>
  const isAdmin=['pastor','church_admin'].includes(membership.role),isGroupLeader=isAdmin||membership.role==='group_leader',nowIso=new Date().toISOString()
  const [milestonesResult,groupResult,teamResult,acceptedResult,newConvertResult,activeLearningResult]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('*',{count:'exact',head:true}).eq('assigned_user_id',userId),
    supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted'),
    supabase.from('courses').select('id').eq('church_id',membership.church_id).eq('published',true).eq('pathway_stage','new_convert'),
    supabase.from('course_enrollments').select('course_id,progress,updated_at').eq('user_id',userId).eq('credential_earned',false).order('updated_at',{ascending:false}).limit(1)
  ])
  const {data:milestones,error:milestonesError}=milestonesResult,{count:groupCount,error:groupCountError}=groupResult,{count:teamCount,error:teamCountError}=teamResult,{count:acceptedCount,error:acceptedCountError}=acceptedResult,{data:newConvertCourses,error:newConvertCoursesError}=newConvertResult,{data:activeLearning,error:activeLearningError}=activeLearningResult
  const homeSummaryErrors=[['milestones',milestonesError],['groups',groupCountError],['teams',teamCountError],['ministry',acceptedCountError],['new-convert-courses',newConvertCoursesError],['active-learning',activeLearningError]] as const
  for(const [area,error] of homeSummaryErrors){if(error)console.error('Home summary read failed',{area,code:error.code})}
  let guidanceReadFailed=Boolean(milestonesError||groupCountError||teamCountError||acceptedCountError||newConvertCoursesError)
  const groupMembershipKnown=!groupCountError

  let leadershipNeeds=0,leadershipReadFailed=false
  if(isAdmin){
    const leadershipResults=await Promise.all([
      supabase.from('care_requests').select('*',{count:'exact',head:true}).eq('church_id',membership.church_id).in('status',['new','in_review']),
      supabase.from('message_reports').select('*',{count:'exact',head:true}).eq('church_id',membership.church_id).eq('status','open'),
      supabase.from('outreach_contacts').select('*',{count:'exact',head:true}).eq('church_id',membership.church_id).lt('follow_up_due_at',nowIso).not('stage','in','("inactive","serving")'),
      supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',membership.church_id).eq('verification_status','pending'),
      supabase.from('ministry_applications').select('id,ministries!inner(church_id)',{count:'exact',head:true}).eq('ministries.church_id',membership.church_id).in('status',['submitted','under_review'])
    ])
    const leadershipLabels=['care','reports','outreach','documents','applications']
    leadershipResults.forEach((result,index)=>{if(result.error){leadershipReadFailed=true;console.error('Home leadership summary read failed',{area:leadershipLabels[index],code:result.error.code})}})
    if(!leadershipReadFailed)leadershipNeeds=leadershipResults.reduce((sum,result)=>sum+(result.count??0),0)
  }

  const newConvertIds=(newConvertCourses??[]).map((c:any)=>c.id)
  let newConvertCompleted=false
  if(!newConvertCoursesError&&newConvertIds.length){
    const {data:completedRows,error:completedError}=await supabase.from('course_enrollments').select('course_id').eq('user_id',userId).eq('credential_earned',true).in('course_id',newConvertIds).limit(1)
    if(completedError){guidanceReadFailed=true;console.error('Home summary read failed',{area:'new-convert-completion',code:completedError.code})}
    else newConvertCompleted=Boolean(completedRows?.length)
  }

  let learningResume:any=null
  if(!activeLearningError&&activeLearning?.[0]?.course_id){
    const {data:activeCourse,error:activeCourseError}=await supabase.from('courses').select('id,title,passing_score,language_code').eq('id',activeLearning[0].course_id).eq('published',true).maybeSingle()
    if(activeCourseError)console.error('Home learning resume read failed',{area:'course',code:activeCourseError.code})
    else if(activeCourse){
      try{learningResume=await getLearningResumeState(supabase,userId,activeCourse)}catch(error){console.error('Home learning resume failed',{name:error instanceof Error?error.name:'unknown'})}
    }
  }
  const learningResumeDesc=learningResume?.kind==='lesson'?`${t('Continue','Continuar')}: ${learningResume.moduleTitle??t('Next lesson','Próxima lección')}`:learningResume?.kind==='final'?t('Final exam ready','Examen final listo'):learningResume?.kind==='complete'?t('Course ready to finish','Curso listo para terminar'):null
  const m:any=milestones??{},nextStep=guidanceReadFailed?null:getNextStep({holyGhost:m.holy_ghost_received,baptized:m.baptized,newConvertAvailable:newConvertIds.length>0,newConvertCompleted,firstSteps:m.first_steps_status,soulWinning:m.soul_winning_status,bibleStudyTeacher:m.bible_study_teacher_status,groupCount:groupCount??0,serveCount:(teamCount??0)+(acceptedCount??0)},lang),church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as any,name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Member','Miembro'),churchLogo=church?.logo_path?supabase.storage.from('church-branding').getPublicUrl(church.logo_path).data.publicUrl:null,accent=church?.brand_color||'#5a3a7d'

  return <main className="shell"><header className="topbar"><div><div className="brand">Kingdom <span>Network</span></div><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')}</div></div><div className="row"><Link className="ghost" href="/?lang=en">English</Link><Link className="ghost" href="/?lang=es">Español</Link><NotificationBell userId={userId}/>{isAdmin&&<Link className="ghost" href={l('/church/leadership')}>{t('Leadership','Liderazgo')}</Link>}{isAdmin&&<Link className="ghost" href={l('/church')}>{t('Admin','Admin')}</Link>}<Link className="ghost" href={l('/start')}>{t('Start Here','Empieza Aquí')}</Link><Link className="ghost" href={l('/feedback')}>{t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/profile')}>{t('Profile','Perfil')}</Link><form action="/auth/signout" method="post"><button className="ghost">{t('Sign out','Cerrar sesión')}</button></form></div></header>

  <section className="hero card" style={{borderColor:accent}}><div style={{display:'flex',alignItems:'center',gap:14}}>{churchLogo&&<img src={churchLogo} alt={`${church?.name??t('Church','Iglesia')} logo`} style={{width:64,height:64,borderRadius:16,objectFit:'contain',background:'#100c14',padding:6,border:'1px solid #3b3043'}}/>}<div><div className="pill">{t('WELCOME BACK','BIENVENIDO')}</div><h1>{name}</h1><p>{church?.welcome_message||t('One place to grow, connect, serve and walk with God.','Un lugar para crecer, conectarte, servir y caminar con Dios.')}</p></div></div><div className="hero-stat"><strong>{church?.name??'Kingdom Network'}</strong><span>{[church?.city,church?.state].filter(Boolean).join(', ')||t('Church community','Comunidad de iglesia')}</span></div></section>

  <section className="simple-stack" aria-label={t('Kingdom Network essentials','Elementos esenciales de Kingdom Network')}>
    <Link className="card stack-card" href={l('/groups')}><span className="stack-icon"><Users size={24}/></span><span className="stack-copy"><strong>{!groupMembershipKnown?t('Friendship Groups','Grupos de Amistad'):groupCount?t('My Friendship Group','Mi Grupo de Amistad'):t('Join a Friendship Group','Únete a un Grupo de Amistad')}</strong><span>{!groupMembershipKnown?t('Open Groups to check your current connection.','Abre Grupos para revisar tu conexión actual.'):groupCount?t('See your group, meeting details and people.','Ve tu grupo, reunión y personas.'):t('Find the group where you can connect and grow.','Encuentra el grupo donde puedes conectarte y crecer.')}</span></span><ArrowRight className="stack-arrow"/></Link>
    {isGroupLeader&&<Link className="card stack-card" href={l('/groups')}><span className="stack-icon"><ShieldCheck size={24}/></span><span className="stack-copy"><strong>{t('Leader Hub','Centro del Líder')}</strong><span>{t('Manage your roster, guests, follow-up and weekly report.','Administra tu lista, invitados, seguimiento e informe semanal.')}</span></span><ArrowRight className="stack-arrow"/></Link>}
    <Link className="card stack-card" href={l('/journey')}><span className="stack-icon"><GraduationCap size={24}/></span><span className="stack-copy"><strong>{t('My Journey','Mi Camino')}</strong><span>{t('See your next spiritual step without the clutter.','Ve tu próximo paso espiritual sin distracciones.')}</span></span><ArrowRight className="stack-arrow"/></Link>
  </section>

  {isAdmin&&<section className="card" style={{padding:18,marginBottom:16,borderColor:accent,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>{leadershipReadFailed?<><div style={{display:'flex',gap:12}}><ShieldCheck size={26}/><div><div className="pill">{t('LEADERSHIP','LIDERAZGO')}</div><h2 style={{margin:'6px 0'}}>{t("We couldn't check the leadership queue.",'No pudimos revisar la lista de liderazgo.')}</h2><p className="muted" style={{margin:0}}>{t('Nothing was marked clear. Open Leadership to review it directly or try Home again.','No se marcó nada como resuelto. Abre Liderazgo para revisarlo directamente o intenta Inicio otra vez.')}</p></div></div><div className="row"><Link className="btn" href={l('/church/leadership')}>{t('Open leadership','Abrir liderazgo')} <ArrowRight size={15}/></Link><Link className="ghost" href={l('/')}>{t('Try again','Intentar otra vez')}</Link></div></>:<><div style={{display:'flex',gap:12}}><ShieldCheck size={26}/><div><div className="pill">{t('LEADERSHIP','LIDERAZGO')}</div><h2 style={{margin:'6px 0'}}>{leadershipNeeds>0?t(`${leadershipNeeds} item${leadershipNeeds===1?'':'s'} need attention`,`${leadershipNeeds} asunto${leadershipNeeds===1?'':'s'} necesita${leadershipNeeds===1?'':'n'} atención`):t('Leadership queue is clear','No hay asuntos urgentes de liderazgo')}</h2><p className="muted" style={{margin:0}}>{leadershipNeeds>0?t('Start with the most important leadership item.','Comienza con el asunto de liderazgo más importante.'):t('Nothing urgent is waiting right now.','No hay nada urgente esperando ahora.')}</p></div></div><Link className="btn" href={l('/church/leadership')}>{leadershipNeeds>0?t('Do this first','Haz esto primero'):t('Open leadership','Abrir liderazgo')} <ArrowRight size={15}/></Link></>}</section>}

  <section className="card" style={{padding:20,marginBottom:16,border:'1px solid rgba(125,211,252,.34)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div><div className="pill">{t('TODAY','HOY')}</div><h2 style={{margin:'7px 0'}}>{t('What needs my attention?','¿Qué necesita mi atención?')}</h2><p className="muted" style={{margin:0}}>{t('Assignments, classes, notifications and your next step—all in one simple daily view.','Asignaciones, clases, notificaciones y tu próximo paso, todo en una vista sencilla.')}</p></div><Link className="btn" href={l('/today')}>{t('Open My Today','Abrir Mi Día')} <ArrowRight size={15}/></Link></section>

  {nextStep?<section className="card" style={{padding:18,marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div><div className="pill">{t('MY NEXT STEP','MI PRÓXIMO PASO')}</div><h2 style={{margin:'7px 0'}}>{nextStep.title}</h2><p className="muted" style={{margin:0}}>{nextStep.body}</p></div><div className="row"><Link className="btn secondary" href={l(nextStep.href)}>{nextStep.action}</Link><Link className="ghost" href={l('/journey')}>{t('View My Journey','Ver Mi Camino')}</Link></div></section>:<section className="card" role="status" style={{padding:18,marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div><div className="pill">{t('MY NEXT STEP','MI PRÓXIMO PASO')}</div><h2 style={{margin:'7px 0'}}>{t("We couldn't safely choose your next step.",'No pudimos elegir tu próximo paso con seguridad.')}</h2><p className="muted" style={{margin:0}}>{t('Your progress was not changed. Try again, or open My Journey to see your records directly.','Tu progreso no cambió. Inténtalo otra vez o abre Mi Camino para ver tus registros directamente.')}</p></div><div className="row"><Link className="btn secondary" href={l('/')}>{t('Try again','Intentar otra vez')}</Link><Link className="ghost" href={l('/journey')}>{t('View My Journey','Ver Mi Camino')}</Link></div></section>}

  <UpcomingSnapshot churchId={membership.church_id} userId={userId} lang={lang}/><FeaturedEvents churchId={membership.church_id} lang={lang}/>

  <section style={{margin:'22px 0'}}><div className="pill" style={{marginBottom:12}}>{t('EVERYDAY','DÍA A DÍA')}</div><section className="module-grid">{everyday.map(({title,desc,Icon,href})=>{const smartLearning=href==='/learning'&&learningResume;const target=smartLearning?learningResume.href:href;const smartDesc=smartLearning&&learningResumeDesc?learningResumeDesc:desc;return <Link className="module card module-link" href={l(target)} key={href}><Icon size={22}/><strong>{title}</strong><span>{smartDesc}</span><small>{smartLearning?t('Resume','Continuar'):t('Open','Abrir')}</small></Link>})}</section></section>

  <details className="card" style={{padding:18,marginBottom:22}}><summary style={{cursor:'pointer',fontWeight:700,fontSize:'1.05rem'}}>{t('Explore more Kingdom Network tools','Explora más herramientas de Kingdom Network')}</summary><p className="small muted">{t('These are here when you need them. You do not need to learn everything at once.','Están aquí cuando las necesites. No tienes que aprender todo a la vez.')}</p><section className="module-grid" style={{marginTop:14}}>{explore.map(({title,desc,Icon,href})=><Link className="module card module-link" href={l(href)} key={href}><Icon size={22}/><strong>{title}</strong><span>{desc}</span><small>{t('Open','Abrir')}</small></Link>)}{isAdmin&&<Link className="module card module-link" href={l('/outreach')}><Megaphone size={22}/><strong>{t('Outreach','Evangelismo')}</strong><span>{t('Guests, Bible studies & follow-up','Invitados, estudios bíblicos y seguimiento')}</span><small>{t('Open','Abrir')}</small></Link>}</section></details>

  <section className="card" style={{padding:18,marginBottom:22,display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}><div style={{display:'flex',gap:12,alignItems:'center'}}><MessageSquareWarning size={22}/><div><strong>{t('Help us improve Kingdom Network','Ayúdanos a mejorar Kingdom Network')}</strong><div className="small muted">{t('Something confusing, broken, useful or missing? Tell us.','¿Algo es confuso, no funciona, te ayuda o hace falta? Dinos.')}</div></div></div><Link className="ghost" href={l('/feedback')}>{t('Share feedback →','Compartir comentarios →')}</Link></section>

  <OfficialUpdates churchId={membership.church_id} lang={lang}/><div className="content-grid"><CommunityFeed churchId={membership.church_id} userId={userId} lang={lang}/><aside><div className="card side"><div className="pill">{t('NEED HELP?','¿NECESITAS AYUDA?')}</div><h3>{t('Not sure where something is?','¿No sabes dónde encontrar algo?')}</h3><p className="muted">{t('Start with My Today for what matters now, or use Kingdom Guide to find the right place.','Comienza con Mi Día para ver lo importante ahora, o usa la Guía Kingdom para encontrar el lugar correcto.')}</p><div style={{display:'grid',gap:8}}><Link className="btn" href={l('/today')}>{t('Open My Today','Abrir Mi Día')}</Link><Link className="ghost" href={l('/guide')}>{t('Open Kingdom Guide','Abrir Guía Kingdom')}</Link></div></div></aside></div></main>
}
