import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,Bell,BookOpen,CalendarDays,CheckCircle2,Clock3,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNextStep } from '@/lib/journey'
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
  const now=new Date(),nowIso=now.toISOString(),weekIso=new Date(now.getTime()+7*86400000).toISOString()
  const [{data:milestones},{count:groupCount},{data:assignments},{data:enrollments},{data:newConvertCourses},{count:unread}]=await Promise.all([
    supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,soul_winning_status,bible_study_teacher_status').eq('church_id',membership.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
    supabase.from('team_assignments').select('id,title,starts_at,call_time,confirmation_required,ministries(name)').eq('church_id',membership.church_id).eq('assigned_user_id',userId).gte('starts_at',nowIso).lte('starts_at',weekIso).order('starts_at').limit(12),
    supabase.from('course_enrollments').select('course_id,credential_earned').eq('user_id',userId),
    supabase.from('courses').select('id').eq('church_id',membership.church_id).eq('published',true).eq('pathway_stage','new_convert'),
    supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null)
  ])
  const assignmentIds=(assignments??[]).map((a:any)=>a.id),courseIds=(enrollments??[]).filter((e:any)=>!e.credential_earned).map((e:any)=>e.course_id)
  const [{data:responses},{data:sessions}]=await Promise.all([
    assignmentIds.length?supabase.from('team_assignment_responses').select('assignment_id,response').eq('user_id',userId).in('assignment_id',assignmentIds):Promise.resolve({data:[] as any[]}),
    courseIds.length?supabase.from('course_sessions').select('id,course_id,title,session_date,starts_at,courses(title)').eq('church_id',membership.church_id).in('course_id',courseIds).gte('session_date',nowIso.slice(0,10)).lte('session_date',weekIso.slice(0,10)).eq('status','scheduled').order('session_date').limit(12):Promise.resolve({data:[] as any[]})
  ])
  const responded=new Set((responses??[]).map((r:any)=>r.assignment_id)),pending=(assignments??[]).filter((a:any)=>a.confirmation_required&&!responded.has(a.id))
  const newConvertIds=(newConvertCourses??[]).map((c:any)=>c.id),newConvertCompleted=(enrollments??[]).some((e:any)=>newConvertIds.includes(e.course_id)&&e.credential_earned)
  const accepted=await supabase.from('ministry_applications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','accepted')
  const m:any=milestones??{},nextStep=getNextStep({holyGhost:m.holy_ghost_received,baptized:m.baptized,newConvertAvailable:newConvertIds.length>0,newConvertCompleted,firstSteps:m.first_steps_status,soulWinning:m.soul_winning_status,bibleStudyTeacher:m.bible_study_teacher_status,groupCount:groupCount??0,serveCount:(assignments??[]).length+(accepted.count??0)})
  const name=profile?.display_name||profile?.first_name|| (es?'Miembro':'Member')
  const clear=pending.length===0&&(sessions??[]).length===0&&(unread??0)===0
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Mi Día':'My Today'}</div></div><div className="row"><Link className="ghost" href="/today?lang=en">English</Link><Link className="ghost" href="/today?lang=es">Español</Link><Link className="ghost" href={l('/prophet')}>{es?'El Profeta':'The Prophet'}</Link><Link className="ghost" href="/">{es?'Inicio':'Home'}</Link></div></header>
    <section className="hero card"><div><div className="pill">{es?'MI DÍA':'MY TODAY'}</div><h1>{es?`Hola, ${name}. Esto es lo que importa ahora.`:`Hi, ${name}. Here’s what matters now.`}</h1><p>{es?'Un lugar sencillo para ver responsabilidades, aprendizaje y el siguiente paso sin buscar por toda la plataforma.':'One simple place to see responsibilities, learning and your next step without hunting through the platform.'}</p></div><div className="hero-stat"><Sparkles size={22}/><span>{clear?(es?'Todo al día':'All caught up'):(es?'Enfócate en esto primero':'Focus here first')}</span></div></section>

    {pending.length>0&&<section className="card" style={{padding:18,marginBottom:16}}><div className="pill">{es?'NECESITA RESPUESTA':'NEEDS A RESPONSE'}</div><h2>{es?'Confirma tus asignaciones':'Confirm your assignments'}</h2>{pending.map((a:any)=><div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',gap:14,alignItems:'center'}}><div><strong>{a.title}</strong><div className="small muted"><Clock3 size={12} style={{verticalAlign:'middle'}}/> {formatChurchDay(a.starts_at,timeZone)} • {formatChurchTime(a.call_time||a.starts_at,timeZone)}</div></div><Link className="btn" href={l('/teams')}>{es?'Responder':'Respond'} <ArrowRight size={13}/></Link></div>)}</section>}

    <section className="card" style={{padding:18,marginBottom:16}}><div className="pill">{es?'SIGUIENTE PASO':'NEXT STEP'}</div><h2>{nextStep.title}</h2><p className="muted">{nextStep.body}</p><Link className="btn" href={l(nextStep.href)}>{nextStep.action} <ArrowRight size={13}/></Link></section>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
      <section className="card" style={{padding:18}}><CalendarDays size={20}/><h3>{es?'Esta semana':'This week'}</h3>{(assignments??[]).length?assignments.map((a:any)=><div key={a.id} style={{padding:'9px 0',borderBottom:'1px solid var(--line)'}}><strong>{a.title}</strong><div className="small muted">{formatChurchDay(a.starts_at,timeZone)} • {formatChurchTime(a.call_time||a.starts_at,timeZone)}</div></div>):<p className="small muted">{es?'No tienes asignaciones de equipo esta semana.':'No team assignments this week.'}</p>}<Link className="record-link" href={l('/calendar/my')}>{es?'Abrir Mi Horario →':'Open My Schedule →'}</Link></section>
      <section className="card" style={{padding:18}}><BookOpen size={20}/><h3>{es?'Clases próximas':'Upcoming classes'}</h3>{(sessions??[]).length?sessions.map((s:any)=><div key={s.id} style={{padding:'9px 0',borderBottom:'1px solid var(--line)'}}><strong>{s.title}</strong><div className="small muted">{s.session_date}{s.starts_at?` • ${String(s.starts_at).slice(0,5)}`:''}</div></div>):<p className="small muted">{es?'No hay sesiones de tus cursos programadas esta semana.':'No sessions from your active courses are scheduled this week.'}</p>}<Link className="record-link" href={l('/learning')}>{es?'Abrir Aprendizaje →':'Open Learning →'}</Link></section>
      <section className="card" style={{padding:18}}><Bell size={20}/><h3>{es?'Notificaciones':'Notifications'}</h3><strong style={{fontSize:28}}>{unread??0}</strong><p className="small muted">{es?'notificaciones sin leer':'unread notifications'}</p><Link className="record-link" href={l('/notifications')}>{es?'Revisar notificaciones →':'Review notifications →'}</Link></section>
    </div>

    {clear&&<section className="card" style={{padding:18,marginTop:16,textAlign:'center'}}><CheckCircle2 size={28}/><h2>{es?'Estás al día.':'You’re caught up.'}</h2><p className="muted">{es?'No hay respuestas urgentes ni clases programadas para esta semana. Puedes enfocarte en tu siguiente paso de crecimiento.':'No urgent responses or scheduled classes are waiting this week. You can focus on your next growth step.'}</p></section>}
  </main>
}
