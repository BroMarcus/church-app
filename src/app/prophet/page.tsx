import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight,Bell,BookOpen,CalendarDays,ClipboardList,HandHeart,Megaphone,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProphetCommandBox } from '../guide/prophet-command-box'

export default async function ProphetPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const query=await searchParams
  const lang: 'en'|'es'=query.lang==='es'?'es':'en',es=lang==='es'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(es?'/login?lang=es':'/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:manageMembers}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_members'})
  const canManageMembers=['pastor','church_admin'].includes(membership.role)||Boolean(manageMembers)
  const nowIso=new Date().toISOString(),weekIso=new Date(Date.now()+7*86400000).toISOString()
  const [{data:assignments},{count:unread},{data:ledGroups},{data:groupRoles},{data:activeEnrollment}]=await Promise.all([
    supabase.from('team_assignments').select('id,title,confirmation_required').eq('church_id',membership.church_id).eq('assigned_user_id',userId).gte('starts_at',nowIso).lte('starts_at',weekIso).order('starts_at').limit(10),
    supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null),
    supabase.from('groups').select('id,name,active').eq('church_id',membership.church_id).eq('leader_id',userId).eq('active',true),
    supabase.from('group_memberships').select('group_id,role,groups(id,name,active)').eq('user_id',userId).in('role',['leader','assistant']),
    supabase.from('course_enrollments').select('course_id,progress,updated_at').eq('user_id',userId).eq('credential_earned',false).order('updated_at',{ascending:false}).limit(1).maybeSingle()
  ])
  let resumeCourse:{id:string;title:string}|null=null
  if(activeEnrollment?.course_id){
    const {data}=await supabase.from('courses').select('id,title').eq('id',activeEnrollment.course_id).eq('church_id',membership.church_id).eq('published',true).maybeSingle()
    if(data)resumeCourse=data
  }
  const assignmentIds=(assignments??[]).map((a:any)=>a.id)
  let responses:any[]=[];if(assignmentIds.length){const r=await supabase.from('team_assignment_responses').select('assignment_id').eq('user_id',userId).in('assignment_id',assignmentIds);responses=r.data??[]}
  const responded=new Set(responses.map((r:any)=>r.assignment_id)),pendingAssignments=(assignments??[]).filter((a:any)=>a.confirmation_required&&!responded.has(a.id))
  const groupMap=new Map<string,any>();for(const g of ledGroups??[])groupMap.set((g as any).id,g);for(const row of groupRoles??[]){const g:any=Array.isArray((row as any).groups)?(row as any).groups[0]:(row as any).groups;if(g?.active)groupMap.set(g.id,g)}
  const leaderGroups=Array.from(groupMap.values()),groupIds=leaderGroups.map((g:any)=>g.id)
  let reports:any[]=[];if(groupIds.length){const r=await supabase.from('group_reports').select('group_id,meeting_date').in('group_id',groupIds).order('meeting_date',{ascending:false});reports=r.data??[]}
  const lastReport=new Map<string,string>();for(const r of reports){if(!lastReport.has(r.group_id))lastReport.set(r.group_id,r.meeting_date)}
  const overdueGroups=leaderGroups.filter((g:any)=>{const d=lastReport.get(g.id);return !d||Date.now()-new Date(`${d}T12:00:00`).getTime()>8*86400000})
  const links:any[]=[
    [es?'Mi Horario':'My Schedule',es?'Mis asignaciones, clases y grupo.':'Assignments, classes and group.', '/calendar/my',CalendarDays],
    [es?'Reporte de Grupo':'Group Report',es?'Abrir mi Grupo de Amistad y reportar la reunión.':'Open Friendship Groups and report the meeting.','/groups',Users],
    [es?'Evangelismo':'Evangelism',es?'Agregar visita o dar seguimiento.':'Add a guest or follow up.','/outreach',Megaphone],
    [resumeCourse?(es?`Continuar ${resumeCourse.title}`:`Continue ${resumeCourse.title}`):(es?'Aprendizaje':'Learning'),resumeCourse?(es?'Retoma tu curso activo donde lo dejaste.':'Resume your active course where you left off.'):(es?'Continuar una clase o ver el siguiente paso.':'Continue a course or see the next step.'),resumeCourse?`/learning/${resumeCourse.id}`:'/learning',BookOpen],
    [es?'Oración y Cuidado':'Prayer & Care',es?'Guardar una necesidad de oración o pedir ayuda.':'Record a prayer need or request help.','/help',HandHeart]
  ]
  if(canManageMembers)links.unshift([es?'Registros de Miembros':'Member Records',es?'Buscar personas, contacto y hitos verificados.':'Search people, contact information and verified milestones.','/church/member-records',ClipboardList])
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const nudges=[
    pendingAssignments.length?{title:es?'Tienes una asignación esperando respuesta.':'You have an assignment waiting for a response.',body:es?'Confirma si puedes servir para que tu líder no tenga que perseguir la respuesta.':'Confirm whether you can serve so your leader does not have to chase the response.',href:'/teams',action:es?'Responder ahora':'Respond now'}:null,
    resumeCourse?{title:es?`Tu curso ${resumeCourse.title} está listo para continuar.`:`Your ${resumeCourse.title} course is ready to continue.`,body:es?`Tu progreso registrado es ${activeEnrollment?.progress??0}%. Puedes retomar ese curso ahora.`:`Your recorded progress is ${activeEnrollment?.progress??0}%. You can jump straight back into that course now.`,href:`/learning/${resumeCourse.id}`,action:es?'Continuar curso':'Resume course'}:null,
    overdueGroups.length?{title:es?'Tu reporte de Grupo de Amistad necesita atención.':'Your Friendship Group report needs attention.',body:es?`${overdueGroups[0].name} está listo para que registres asistencia, invitados y seguimiento.`:`${overdueGroups[0].name} is ready for you to record attendance, guests and follow-up.`,href:`/groups/${overdueGroups[0].id}`,action:es?'Hacer reporte':'Report meeting'}:null,
    (unread??0)>0?{title:es?`Tienes ${unread} notificación${unread===1?'':'es'} sin leer.`:`You have ${unread} unread notification${unread===1?'':'s'}.`,body:es?'Revísalas para no perder una asignación, clase o actualización importante.':'Review them so you do not miss an assignment, class or important update.',href:'/notifications',action:es?'Revisar':'Review'}:null
  ].filter(Boolean) as {title:string;body:string;href:string;action:string}[]
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'El Profeta':'The Prophet'} • Beta</div></div><div className="row"><Link className="ghost" href="/prophet?lang=en">English</Link><Link className="ghost" href="/prophet?lang=es">Español</Link><Link className="ghost" href="/guide">{es?'Recursos confiables':'Trusted Resources'}</Link><Link className="ghost" href="/">{es?'Inicio':'Home'}</Link></div></header>
    <section className="hero card"><div><div className="pill">{es?'EL PROFETA • AYUDANTE DEL REINO':'THE PROPHET • KINGDOM HELPER'}</div><h1>{es?'Escribe lo que necesitas. Yo te ayudo a avanzar.':'Type what you need. I’ll help you move forward.'}</h1><p>{es?'El Profeta está diseñado para ayudarte a encontrar el siguiente paso, usar las herramientas correctas, aprender, servir y mantenerte conectado. No pretende recibir revelación de Dios; usa la Escritura, recursos aprobados y datos que tienes permiso de ver.':'The Prophet is designed to help you find the next step, use the right tools, learn, serve and stay connected. It does not claim revelation from God; it uses Scripture, approved resources and data you are permitted to see.'}</p></div><div className="hero-stat"><Sparkles size={22}/><span>{es?'Texto primero • voz opcional':'Text first • voice optional'}</span></div></section>
    {nudges.length>0&&<section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{es?'EL PROFETA NOTÓ ESTO':'THE PROPHET NOTICED THIS'}</div><h2>{es?'Antes de que preguntes…':'Before you ask…'}</h2>{nudges.map((n,i)=><div key={`${n.href}-${i}`} style={{padding:'12px 0',borderBottom:i<nudges.length-1?'1px solid var(--line)':'0',display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><strong>{n.title}</strong><div className="small muted" style={{marginTop:4}}>{n.body}</div></div><Link className="btn" href={l(n.href)}>{n.action} <ArrowRight size={13}/></Link></div>)}</section>}
    {nudges.length===0&&<section className="card" style={{padding:16,marginBottom:18}}><div className="row"><Bell size={18}/><div><strong>{es?'No veo nada urgente ahora mismo.':'I don’t see anything urgent right now.'}</strong><div className="small muted">{es?'Puedes preguntarme por tu siguiente paso, una clase, tu horario, evangelismo o recursos bíblicos.':'Ask me about your next step, a class, your schedule, evangelism or Bible resources.'}</div></div></div></section>}
    <ProphetCommandBox lang={lang} resumeCourse={resumeCourse}/>
    <section className="card" style={{padding:18}}><div className="pill">{es?'ACCIONES RÁPIDAS':'QUICK ACTIONS'}</div><h2>{es?'O toca una acción y sigue adelante.':'Or tap an action and keep moving.'}</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10,marginTop:12}}>{links.map(([title,body,href,Icon])=><Link key={href} href={l(href)} className="card" style={{padding:14,textDecoration:'none'}}><Icon size={18}/><strong style={{display:'block',marginTop:8}}>{title}</strong><span className="small muted">{body}</span></Link>)}</div></section>
  </main>
}
