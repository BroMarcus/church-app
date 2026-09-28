import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity,BookOpen,HeartHandshake,Languages,Leaf,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addJourneyAttention,resolveJourneyStep,type JourneyStepDefinition,type JourneyStepTracking } from '@/lib/discipleship-pathway'

const categoryMeta=(key:string,es:boolean)=>({people:[Users,es?'Personas':'People'],new_birth:[HeartHandshake,es?'Nuevo Nacimiento':'New Birth'],discipleship:[BookOpen,es?'Discipulado':'Discipleship'],outreach:[Leaf,es?'Evangelismo':'Outreach'],groups:[Users,es?'Grupos':'Groups'],serving:[ShieldCheck,es?'Servicio':'Serving'],leadership:[Activity,es?'Liderazgo':'Leadership']} as Record<string,[any,string]>)[key]||[Activity,key]
const pct=(value:number,denominator:number|null)=>denominator&&denominator>0?Math.round(value/denominator*100):null
const bucket=(rows:any[],key:string)=>{const map=new Map<string,any[]>();for(const row of rows){const id=row[key];const list=map.get(id)??[];list.push(row);map.set(id,list)}return map}

export default async function ChurchHealthPage({searchParams}:{searchParams:Promise<{lang?:string;days?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en'
  const days=Math.min(365,Math.max(7,Number.parseInt(params.days||'30',10)||30))
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const [leadershipPerm,memberPerm]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'view_leadership'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_members'})
  ])
  if(!['pastor','church_admin'].includes(membership.role)&&!leadershipPerm.data&&!memberPerm.data)redirect('/')

  const [
    {data:metrics,error},{data:activeMembers},{data:milestones},{data:journeyTracking},
    {data:pathways},{data:pathAssignments},{data:pathSteps}
  ]=await Promise.all([
    supabase.rpc('church_health_snapshot',{p_church_id:churchId,p_days:days}),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active'),
    supabase.from('member_milestones').select('*').eq('church_id',churchId),
    supabase.from('member_journey_step_tracking').select('step_id,user_id,responsible_leader_id,due_on,manual_status,manual_completed_at,last_activity_at,updated_at').eq('church_id',churchId),
    supabase.from('discipleship_pathways').select('id,name,is_default').eq('church_id',churchId).eq('active',true),
    supabase.from('member_journey_pathway_assignments').select('user_id,pathway_id').eq('church_id',churchId).eq('active',true),
    supabase.from('discipleship_pathway_steps').select('id,pathway_id,step_key,title,description,completion_source,completion_key,completion_value,suggested_href,sort_order,required').eq('church_id',churchId).eq('active',true).order('sort_order').order('id')
  ])
  if(error)throw new Error(error.message)

  const ids=(activeMembers??[]).map((row:any)=>row.user_id)
  let enrollments:any[]=[],groupMemberships:any[]=[],applications:any[]=[],assignments:any[]=[]
  if(ids.length){
    const [e,g,a,s]=await Promise.all([
      supabase.from('course_enrollments').select('user_id,course_id,credential_earned,progress_percent,completed_at,updated_at').in('user_id',ids),
      supabase.from('group_memberships').select('user_id,group_id,groups!inner(church_id,group_type)').in('user_id',ids).eq('groups.church_id',churchId).eq('groups.group_type','friendship'),
      supabase.from('ministry_applications').select('user_id,status').in('user_id',ids).eq('status','accepted'),
      supabase.from('team_assignments').select('assigned_user_id').eq('church_id',churchId).in('assigned_user_id',ids)
    ])
    enrollments=e.data??[];groupMemberships=g.data??[];applications=a.data??[];assignments=s.data??[]
  }

  const milestoneMap=new Map((milestones??[]).map((row:any)=>[row.user_id,row]))
  const defaultPath=(pathways??[]).find((row:any)=>row.is_default)
  const assignedPath=new Map((pathAssignments??[]).map((row:any)=>[row.user_id,row.pathway_id]))
  const stepsByPath=bucket(pathSteps??[],'pathway_id'),trackingByUser=bucket(journeyTracking??[],'user_id')
  const enrollmentByUser=bucket(enrollments,'user_id'),groupByUser=bucket(groupMemberships,'user_id'),applicationByUser=bucket(applications,'user_id'),assignmentByUser=bucket(assignments,'assigned_user_id')
  let configuredPeople=0,journeyDue=0,journeyUnassigned=0,journeyInactive=0,journeyNextUnstarted=0
  for(const member of activeMembers??[]){
    const memberId=(member as any).user_id,activePathId=assignedPath.get(memberId)??defaultPath?.id
    if(!activePathId)continue
    const definitions=stepsByPath.get(activePathId)??[]
    if(!definitions.length)continue
    configuredPeople++
    const trackingRows=trackingByUser.get(memberId)??[],trackingMap=new Map<string,JourneyStepTracking>(trackingRows.map((row:any)=>[row.step_id,row]))
    const resolved=addJourneyAttention(definitions.map((step:any)=>resolveJourneyStep(step as JourneyStepDefinition,{
      milestones:milestoneMap.get(memberId)??{},
      enrollments:enrollmentByUser.get(memberId)??[],
      groupCount:(groupByUser.get(memberId)??[]).length,
      ministryApplicationCount:(applicationByUser.get(memberId)??[]).length,
      ministryAssignmentCount:(assignmentByUser.get(memberId)??[]).length,
      trackingByStep:trackingMap
    })))
    const current=resolved.find(step=>step.required&&!step.completed)??resolved.find(step=>!step.completed)
    if(!current)continue
    if(current.attention.includes('overdue'))journeyDue++
    if(current.attention.includes('leader_missing'))journeyUnassigned++
    if(current.attention.includes('inactive'))journeyInactive++
    if(current.attention.includes('next_step_unstarted'))journeyNextUnstarted++
  }

  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const grouped=new Map<string,any[]>();for(const row of metrics??[]){const list=grouped.get(row.category)??[];list.push(row);grouped.set(row.category,list)}
  const order=['people','new_birth','discipleship','outreach','groups','serving','leadership']
  const byKey=new Map((metrics??[]).map((m:any)=>[m.metric_key,m]))
  const members=Number((byKey.get('formal_members') as any)?.value||0),guests=Number((byKey.get('guest_accounts') as any)?.value||0),attendees=Number((byKey.get('regular_attendees') as any)?.value||0),overdue=Number((byKey.get('overdue_followup') as any)?.value||0),firstSteps=Number((byKey.get('first_steps_complete') as any)?.value||0),newBirth=Number((byKey.get('new_birth_complete') as any)?.value||0)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Salud de la Iglesia':'Church Health'}</div></div><div className="row"><Languages size={14}/><Link className="ghost" href={`/church/health?days=${days}&lang=en`}>English</Link><Link className="ghost" href={`/church/health?days=${days}&lang=es`}>Español</Link><Link className="ghost" href={l('/church/group-growth')}>{es?'Crecimiento de Grupos':'Group Growth'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>

    <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">{es?'UNA SOLA FUENTE DE VERDAD':'ONE SOURCE OF TRUTH'}</div><h1>{es?'¿Estamos alcanzando, discipulando y desarrollando personas?':'Are we reaching, discipling and developing people?'}</h1><p className="muted">{es?'Este tablero separa acceso a la aplicación de membresía formal y usa las mismas definiciones para todos los números principales.':'This dashboard separates app access from formal membership and uses the same definitions for every core number.'}</p><div className="row" style={{gap:10,flexWrap:'wrap',marginTop:14}}><span className="pill">{members} {es?'MIEMBROS':'MEMBERS'}</span><span className="pill">{attendees} {es?'ASISTENTES':'ATTENDEES'}</span><span className="pill">{guests} {es?'INVITADOS CON CUENTA':'GUEST ACCOUNTS'}</span><span className={`pill ${overdue?'urgent':''}`}>{overdue} {es?'SEGUIMIENTOS VENCIDOS':'OVERDUE FOLLOW-UPS'}</span></div></section>

    <form className="card" style={{padding:14,marginBottom:18}}><div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}><label className="field"><span>{es?'Ventana para actividad reciente':'Recent activity window'}</span><select name="days" defaultValue={String(days)}><option value="30">30 {es?'días':'days'}</option><option value="60">60 {es?'días':'days'}</option><option value="90">90 {es?'días':'days'}</option><option value="180">180 {es?'días':'days'}</option><option value="365">365 {es?'días':'days'}</option></select></label>{es&&<input type="hidden" name="lang" value="es"/>}<button className="ghost">{es?'Actualizar':'Update'}</button></div></form>

    <section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{es?'LECTURA RÁPIDA':'QUICK READ'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:12}}><div><strong style={{fontSize:30}}>{pct(newBirth,members)??0}%</strong><div className="small muted">{es?'de miembros con bautismo + Espíritu Santo verificados':'of Members with baptism + Holy Ghost verified'}</div></div><div><strong style={{fontSize:30}}>{pct(firstSteps,members)??0}%</strong><div className="small muted">{es?'de miembros con First Steps completo':'of Members with First Steps complete'}</div></div><div><strong style={{fontSize:30}}>{guests+attendees}</strong><div className="small muted">{es?'personas conectadas a la aplicación que todavía no son Miembros formales':'people using the app who are not yet formal Members'}</div></div><div><strong style={{fontSize:30}}>{overdue}</strong><div className="small muted">{es?'personas que necesitan seguimiento ahora':'people needing follow-up now'}</div></div></div></section>

    <section className="card" style={{padding:20,marginBottom:18}}><div className="pill">{es?'ATENCIÓN DE MI CAMINO':'MY JOURNEY ATTENTION'}</div><h2>{es?'¿Dónde se están quedando las personas?':'Where are people getting stuck?'}</h2>{configuredPeople>0?<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:12}}><div><strong style={{fontSize:30}}>{journeyDue}</strong><div className="small muted">{es?'próximos pasos vencidos':'current steps overdue'}</div></div><div><strong style={{fontSize:30}}>{journeyUnassigned}</strong><div className="small muted">{es?'sin líder responsable':'without a responsible leader'}</div></div><div><strong style={{fontSize:30}}>{journeyInactive}</strong><div className="small muted">{es?'iniciados pero inactivos':'started but inactive'}</div></div><div><strong style={{fontSize:30}}>{journeyNextUnstarted}</strong><div className="small muted">{es?'completaron un paso pero no iniciaron el siguiente':'finished a step but did not start the next'}</div></div></div><div className="row" style={{marginTop:14,gap:8,flexWrap:'wrap'}}><Link className="btn" href={l('/church/leadership')}>{es?'Abrir desarrollo':'Open development'} →</Link><Link className="ghost" href={l('/church/journey-pathway')}>{es?'Configurar camino':'Configure pathway'} →</Link></div></>:<div className="notice" style={{marginTop:12}}>{es?'Todavía no hay un camino predeterminado con pasos activos. Configura uno para activar la detección de personas estancadas.':'There is not yet a default pathway with active steps. Configure one to turn on stuck-person detection.'} <Link href={l('/church/journey-pathway')}>{es?'Configurar →':'Configure →'}</Link></div>}</section>

    <section style={{display:'grid',gap:18}}>{order.map(category=>{const rows=grouped.get(category)??[];if(!rows.length)return null;const [Icon,title]=categoryMeta(category,es);return <section className="card" style={{padding:20}} key={category}><div className="row" style={{gap:9,alignItems:'center',marginBottom:12}}><Icon size={20}/><div><div className="pill">{title.toUpperCase()}</div></div></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(205px,1fr))',gap:12}}>{rows.map((m:any)=>{const percentage=pct(Number(m.value||0),m.denominator==null?null:Number(m.denominator));return <div key={m.metric_key} style={{padding:14,border:'1px solid var(--line)',borderRadius:13}}><div className="small muted">{m.label}</div><strong style={{fontSize:30,display:'block',margin:'4px 0'}}>{m.value}{percentage!=null?<span style={{fontSize:14,fontWeight:600}}>{` • ${percentage}%`}</span>:''}</strong><div className="small muted">{m.detail}</div></div>})}</div></section>})}</section>

    <section className="card" style={{padding:18,marginTop:18}}><div className="pill">{es?'NO SOLO UN PUNTAJE':'NOT JUST ONE SCORE'}</div><p className="muted" style={{marginBottom:0}}>{es?'Kingdom Network no intenta reducir la salud de la iglesia a un número mágico. Mira las señales por separado: alcance, nuevo nacimiento, discipulado, grupos, servicio y desarrollo de liderazgo.':'Kingdom Network does not reduce church health to one magic score. Read the signals separately: outreach, new birth, discipleship, groups, serving and leadership development.'}</p></section>
  </main>
}
