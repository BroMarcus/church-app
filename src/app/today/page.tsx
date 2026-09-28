import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,Bell,BookOpen,CalendarDays,CheckCircle2,Clock3,MessageSquareWarning,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNextStep } from '@/lib/journey'
import { addJourneyAttention,resolveJourneyStep,type JourneyStepDefinition,type JourneyStepTracking } from '@/lib/discipleship-pathway'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'

export default async function MyTodayPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  ])
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches,timeZone=church?.timezone||'UTC'
  const now=new Date(),nowIso=now.toISOString(),todayIso=nowIso.slice(0,10),weekIso=new Date(now.getTime()+7*86400000).toISOString()
  const [{data:milestones},{count:groupCount},{data:assignments},{data:enrollments},{data:newConvertCourses},{count:unread},{data:ledGroups},{data:groupRoles},{data:overdueOutreach},{data:assignedOutreach},{data:journeyFollowups}]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('id,title,starts_at,call_time,confirmation_required,ministries(name)').eq('church_id',membership.church_id).eq('assigned_user_id',userId).gte('starts_at',nowIso).lte('starts_at',weekIso).order('starts_at').limit(8),
    supabase.from('course_enrollments').select('course_id,credential_earned,progress_percent,completed_at,updated_at').eq('user_id',userId),
    supabase.from('courses').select('id').eq('church_id',membership.church_id).eq('published',true).eq('pathway_stage','new_convert'),
    supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null),
    supabase.from('groups').select('id,name,active').eq('church_id',membership.church_id).eq('leader_id',userId).eq('active',true),
    supabase.from('group_memberships').select('group_id,role,groups(id,name,active)').eq('user_id',userId).in('role',['leader','assistant']),
    supabase.from('outreach_contacts').select('id,first_name,last_name,stage,follow_up_due_at').eq('church_id',membership.church_id).eq('assigned_to',userId).lt('follow_up_due_at',nowIso).not('stage','in','("inactive","serving")').order('follow_up_due_at').limit(5),
    supabase.from('outreach_contacts').select('id').eq('church_id',membership.church_id).eq('assigned_to',userId).not('stage','in','("inactive","serving")').limit(100),
    supabase.from('member_journey_step_tracking').select('id,user_id,step_id,due_on,discipleship_pathway_steps(title)').eq('church_id',membership.church_id).eq('responsible_leader_id',userId).not('due_on','is',null).lte('due_on',todayIso).order('due_on').limit(8)
  ])
  const assignmentRows=assignments??[],outreachRows=overdueOutreach??[],assignedContactIds=(assignedOutreach??[]).map((x:any)=>x.id)
  const assignmentIds=assignmentRows.map((a:any)=>a.id),courseIds=(enrollments??[]).filter((e:any)=>!e.credential_earned).map((e:any)=>e.course_id)
  const [{data:responses},{data:sessions},{data:communicationIssues}]=await Promise.all([
    assignmentIds.length?supabase.from('team_assignment_responses').select('assignment_id,response').eq('user_id',userId).in('assignment_id',assignmentIds):Promise.resolve({data:[] as any[]}),
    courseIds.length?supabase.from('course_sessions').select('id,course_id,title,session_date,starts_at,courses(title)').eq('church_id',membership.church_id).in('course_id',courseIds).gte('session_date',nowIso.slice(0,10)).lte('session_date',weekIso.slice(0,10)).eq('status','scheduled').order('session_date').limit(8):Promise.resolve({data:[] as any[]}),
    assignedContactIds.length?supabase.from('communication_outbox').select('id,status,contact_id,channel,template_key,error_message,outreach_contacts(first_name,last_name)').in('contact_id',assignedContactIds).in('status',['suppressed','failed']).order('due_at').limit(5):Promise.resolve({data:[] as any[]})
  ])
  const sessionRows=sessions??[],communicationRows=communicationIssues??[],journeyRows=journeyFollowups??[]
  const journeyTargetIds=Array.from(new Set(journeyRows.map((row:any)=>row.user_id).filter(Boolean))) as string[]
  let journeyTargetNames=new Map<string,string>()
  if(journeyTargetIds.length){
    const {data:targets}=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',journeyTargetIds)
    journeyTargetNames=new Map((targets??[]).map((target:any)=>[target.id,target.display_name||[target.first_name,target.last_name].filter(Boolean).join(' ')||(es?'Miembro':'Member')]))
  }
  const responded=new Set((responses??[]).map((r:any)=>r.assignment_id)),pending=assignmentRows.filter((a:any)=>a.confirmation_required&&!responded.has(a.id))
  const leaderGroupMap=new Map<string,any>();for(const g of ledGroups??[])leaderGroupMap.set((g as any).id,g);for(const row of groupRoles??[]){const g:any=Array.isArray((row as any).groups)?(row as any).groups[0]:(row as any).groups;if(g?.active)leaderGroupMap.set(g.id,g)}
  const leaderGroups=Array.from(leaderGroupMap.values()),leaderGroupIds=leaderGroups.map((g:any)=>g.id)
  let reports:any[]=[];if(leaderGroupIds.length){const r=await supabase.from('group_reports').select('group_id,meeting_date').in('group_id',leaderGroupIds).order('meeting_date',{ascending:false});reports=r.data??[]}
  const lastReportBy=new Map<string,string>();for(const r of reports){if(!lastReportBy.has(r.group_id))lastReportBy.set(r.group_id,r.meeting_date)}
  const overdueGroups=leaderGroups.filter((g:any)=>{const last=lastReportBy.get(g.id);return !last||Date.now()-new Date(`${last}T12:00:00`).getTime()>8*86400000})
  const newConvertIds=(newConvertCourses??[]).map((c:any)=>c.id),newConvertCompleted=(enrollments??[]).some((e:any)=>newConvertIds.includes(e.course_id)&&e.credential_earned)
  const [{count:acceptedCount},{count:serveAssignmentCount},{data:pathAssignment}]=await Promise.all([
    supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted'),
    supabase.from('team_assignments').select('*',{count:'exact',head:true}).eq('church_id',membership.church_id).eq('assigned_user_id',userId),
    supabase.from('member_journey_pathway_assignments').select('pathway_id').eq('church_id',membership.church_id).eq('user_id',userId).eq('active',true).maybeSingle()
  ])
  const m:any=milestones??{},fallbackNextStep=getNextStep({holyGhost:m.holy_ghost_received,baptized:m.baptized,newConvertAvailable:newConvertIds.length>0,newConvertCompleted,firstSteps:m.first_steps_status,soulWinning:m.soul_winning_status,bibleStudyTeacher:m.bible_study_teacher_status,groupCount:groupCount??0,serveCount:(serveAssignmentCount??0)+(acceptedCount??0)},es?'es':'en')
  let activePathId=pathAssignment?.pathway_id??null,pathwayName:string|null=null,configuredNext:any=null
  if(!activePathId){
    const {data:defaultPath}=await supabase.from('discipleship_pathways').select('id,name').eq('church_id',membership.church_id).eq('active',true).eq('is_default',true).limit(1).maybeSingle()
    if(defaultPath?.id){activePathId=defaultPath.id;pathwayName=defaultPath.name}
  }
  if(activePathId){
    const [{data:path},{data:pathSteps},{data:trackingRows}]=await Promise.all([
      supabase.from('discipleship_pathways').select('id,name').eq('church_id',membership.church_id).eq('id',activePathId).maybeSingle(),
      supabase.from('discipleship_pathway_steps').select('id,step_key,title,description,completion_source,completion_key,completion_value,suggested_href,sort_order,required').eq('church_id',membership.church_id).eq('pathway_id',activePathId).eq('active',true).order('sort_order').order('id'),
      supabase.from('member_journey_step_tracking').select('step_id,responsible_leader_id,due_on,manual_status,manual_completed_at,last_activity_at,updated_at').eq('church_id',membership.church_id).eq('user_id',userId)
    ])
    pathwayName=path?.name??pathwayName
    const tracking=new Map<string,JourneyStepTracking>((trackingRows??[]).map((row:any)=>[row.step_id,row]))
    const resolved=addJourneyAttention((pathSteps??[]).map((step:any)=>resolveJourneyStep(step as JourneyStepDefinition,{
      milestones:m,enrollments:enrollments??[],groupCount:groupCount??0,
      ministryApplicationCount:acceptedCount??0,ministryAssignmentCount:serveAssignmentCount??0,trackingByStep:tracking
    })))
    configuredNext=resolved.find(step=>step.required&&!step.completed)??resolved.find(step=>!step.completed)??null
  }
  const nextStep=configuredNext?{
    title:configuredNext.title,
    body:configuredNext.description||(es?'Este es tu próximo paso en el camino de tu iglesia.':'This is your next step in your church pathway.'),
    action:es?'Abrir próximo paso':'Open next step',
    href:configuredNext.suggested_href||'/journey',
    reason:pathwayName||(es?'Mi Camino':'My Journey')
  }:activePathId?{
    title:es?'Sigue creciendo y ayudando a otros':'Keep growing and helping others',
    body:es?'Has completado el camino configurado actualmente.':'You have completed the currently configured pathway.',
    action:es?'Ver Mi Camino':'View My Journey',href:'/journey',reason:pathwayName||(es?'Mi Camino':'My Journey')
  }:fallbackNextStep
  const name=profile?.display_name||profile?.first_name||(es?'Miembro':'Member')
  const firstPending=pending[0],firstGroup=overdueGroups[0],firstOutreach=outreachRows[0],firstCommunication:any=communicationRows[0],firstJourney:any=journeyRows[0]
  const commContact:any=firstCommunication?(Array.isArray(firstCommunication.outreach_contacts)?firstCommunication.outreach_contacts[0]:firstCommunication.outreach_contacts):null
  const communicationName=commContact?[commContact.first_name,commContact.last_name].filter(Boolean).join(' '):(es?'Invitado':'Guest')
  const priority=firstPending?{pill:es?'RESPONDE AHORA':'RESPOND NOW',title:firstPending.title,body:es?'Confirma si puedes cumplir esta asignación.':'Confirm whether you can serve this assignment.',href:l('/teams'),action:es?'Responder':'Respond'}:
    firstGroup?{pill:es?'REPORTE PENDIENTE':'REPORT DUE',title:firstGroup.name,body:es?'Termina el reporte de tu grupo para mantener el seguimiento al día.':'Finish your group report so follow-up stays current.',href:l(`/groups/${firstGroup.id}`),action:es?'Hacer reporte':'Report meeting'}:
    firstOutreach?{pill:es?'SEGUIMIENTO':'FOLLOW-UP',title:[firstOutreach.first_name,firstOutreach.last_name].filter(Boolean).join(' '),body:es?'Esta persona ya pasó su fecha de seguimiento.':'This person is past their follow-up time.',href:l('/outreach'),action:es?'Dar seguimiento':'Follow up'}:
    firstJourney?{pill:es?'SEGUIMIENTO DE DISCIPULADO':'DISCIPLESHIP FOLLOW-UP',title:journeyTargetNames.get(firstJourney.user_id)||firstJourney.discipleship_pathway_steps?.title||(es?'Próximo paso':'Next step'),body:es?'Tienes un seguimiento de Mi Camino que vence hoy o ya está atrasado.':'A My Journey follow-up assigned to you is due today or overdue.',href:l('/church/leadership'),action:es?'Abrir seguimiento':'Open follow-up'}:
    firstCommunication?{pill:es?'COMUNICACIÓN NECESITA ATENCIÓN':'COMMUNICATION NEEDS ATTENTION',title:communicationName,body:firstCommunication.status==='failed'?(es?'Un mensaje de seguimiento falló. Revisa el estado y corrige el problema.':'A follow-up message failed. Review the status and correct the problem.'):(es?'Un mensaje automático fue suprimido porque falta permiso o información de contacto.':'An automatic message was suppressed because permission or contact information is missing.'),href:l('/outreach/communications'),action:es?'Revisar comunicación':'Review communication'}:
    {pill:es?'SIGUIENTE PASO':'NEXT STEP',title:nextStep.title,body:nextStep.body,href:l(nextStep.href),action:nextStep.action}
  const urgentCount=pending.length+overdueGroups.length+outreachRows.length+journeyRows.length+communicationRows.length
  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Mi Día':'My Today'}</div></div><div className="row"><Link className="ghost" href="/today?lang=en">English</Link><Link className="ghost" href="/today?lang=es">Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {es?'Comentarios':'Feedback'}</Link><Link className="ghost" href={l('/')}>{es?'Inicio':'Home'}</Link></div></header>

    <section className="hero card"><div><div className="pill">{es?'MI DÍA':'MY TODAY'}</div><h1>{es?`Hola, ${name}.`:`Hi, ${name}.`}</h1><p>{es?'Mira primero lo que necesita tu atención. Lo demás puede esperar.':'See what needs your attention first. Everything else can wait.'}</p></div><div className="hero-stat"><Sparkles size={22}/><span>{urgentCount>0?(es?`${urgentCount} pendiente${urgentCount===1?'':'s'}`:`${urgentCount} item${urgentCount===1?'':'s'} waiting`):(es?'Todo al día':'All caught up')}</span></div></section>

    <section className="card" style={{padding:22,marginBottom:18,border:'1px solid rgba(125,211,252,.34)'}}><div className="pill">{priority.pill}</div><h2 style={{fontSize:'1.55rem',margin:'10px 0 6px'}}>{priority.title}</h2><p className="muted" style={{fontSize:'1rem',lineHeight:1.55,maxWidth:760}}>{priority.body}</p><Link className="btn" href={priority.href} style={{display:'inline-flex',alignItems:'center',gap:7,minHeight:44}}>{priority.action}<ArrowRight size={15}/></Link></section>

    <section style={{marginBottom:18}}><div className="pill" style={{marginBottom:10}}>{es?'LO QUE VIENE':'COMING UP'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:14}}>
      <article className="card" style={{padding:18}}><CalendarDays size={22}/><h3>{es?'Asignaciones esta semana':'Assignments this week'}</h3>{assignmentRows.length?assignmentRows.slice(0,4).map((a:any)=><div key={a.id} style={{padding:'11px 0',borderBottom:'1px solid var(--line)'}}><strong>{a.title}</strong><div className="small muted"><Clock3 size={12} style={{verticalAlign:'middle'}}/> {formatChurchDay(a.starts_at,timeZone)} • {formatChurchTime(a.call_time||a.starts_at,timeZone)}</div></div>):<p className="small muted">{es?'No tienes asignaciones esta semana.':'No assignments this week.'}</p>}<Link className="record-link" href={l('/calendar/my')}>{es?'Ver mi horario →':'View my schedule →'}</Link></article>
      <article className="card" style={{padding:18}}><BookOpen size={22}/><h3>{es?'Clases próximas':'Upcoming classes'}</h3>{sessionRows.length?sessionRows.slice(0,4).map((s:any)=><div key={s.id} style={{padding:'11px 0',borderBottom:'1px solid var(--line)'}}><strong>{s.title}</strong><div className="small muted">{s.session_date}{s.starts_at?` • ${String(s.starts_at).slice(0,5)}`:''}</div></div>):<p className="small muted">{es?'No hay clases tuyas programadas esta semana.':'No classes are scheduled for you this week.'}</p>}<Link className="record-link" href={l('/learning')}>{es?'Abrir Aprendizaje →':'Open Learning →'}</Link></article>
      <article className="card" style={{padding:18}}><Bell size={22}/><h3>{es?'Notificaciones':'Notifications'}</h3><strong style={{fontSize:34}}>{unread??0}</strong><p className="small muted">{es?'sin leer':'unread'}</p><Link className="record-link" href={l('/notifications')}>{es?'Revisar →':'Review →'}</Link></article>
    </div></section>

    {(urgentCount>0)&&<section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{es?'DESPUÉS DE LO PRIMERO':'AFTER THE FIRST THING'}</div><p className="muted" style={{marginBottom:8}}>{es?'Cuando termines la prioridad de arriba, puedes volver aquí para ver lo demás pendiente.':'When you finish the priority above, come back here for anything else still waiting.'}</p><div className="row" style={{flexWrap:'wrap'}}>{pending.length>1&&<Link className="ghost" href={l('/teams')}>{pending.length-1} {es?'asignación(es) más':'more assignment(s)'}</Link>}{overdueGroups.length>1&&<Link className="ghost" href={l('/groups')}>{overdueGroups.length-1} {es?'reporte(s) más':'more group report(s)'}</Link>}{outreachRows.length>1&&<Link className="ghost" href={l('/outreach')}>{outreachRows.length-1} {es?'seguimiento(s) más':'more follow-up(s)'}</Link>}{journeyRows.length>1&&<Link className="ghost" href={l('/church/leadership')}>{journeyRows.length-1} {es?'seguimiento(s) de discipulado más':'more discipleship follow-up(s)'}</Link>}{communicationRows.length>1&&<Link className="ghost" href={l('/outreach/communications')}>{communicationRows.length-1} {es?'problema(s) de comunicación más':'more communication issue(s)'}</Link>}</div></section>}

    <section className="card" style={{padding:18,marginBottom:16}}><div className="pill">{es?'MI CRECIMIENTO':'MY GROWTH'}</div><h2>{nextStep.title}</h2><p className="muted">{nextStep.body}</p><div className="row" style={{flexWrap:'wrap'}}><Link className="btn secondary" href={l(nextStep.href)}>{nextStep.action} <ArrowRight size={13}/></Link><Link className="ghost" href={l('/journey')}>{es?'Ver Mi Camino':'View My Journey'}</Link></div></section>

    {urgentCount===0&&sessionRows.length===0&&assignmentRows.length===0&&(unread??0)===0&&<section className="card" style={{padding:20,textAlign:'center'}}><CheckCircle2 size={30}/><h2>{es?'Estás al día.':'You’re caught up.'}</h2><p className="muted">{es?'No hay nada urgente esperando. Puedes enfocarte en crecer, conectarte y servir.':'Nothing urgent is waiting. You can focus on growing, connecting and serving.'}</p></section>}
  </main>
}