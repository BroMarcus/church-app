import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,Clock3,Compass,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { resolveJourneyStep,type JourneyStepDefinition,type JourneyStepTracking } from '@/lib/discipleship-pathway'
import { recordJourneyFollowup } from './actions'

export default async function JourneyFollowupPage({searchParams}:{searchParams:Promise<{lang?:string;saved?:string;error?:string}>}){
  const q=await searchParams,es=q.lang==='es',lang=es?'es':'en',l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const {data:trackingRows,error}=await supabase.from('member_journey_step_tracking')
    .select('id,user_id,step_id,responsible_leader_id,due_on,manual_status,manual_completed_at,last_activity_at,updated_at,discipleship_pathway_steps(id,step_key,title,description,completion_source,completion_key,completion_value,suggested_href,sort_order,required)')
    .eq('church_id',churchId).eq('responsible_leader_id',userId).order('due_on',{ascending:true,nullsFirst:false})
  if(error)throw new Error(error.message)

  const targetIds=Array.from(new Set((trackingRows??[]).map((row:any)=>row.user_id))) as string[]
  let profiles:any[]=[],milestones:any[]=[],enrollments:any[]=[],groups:any[]=[],applications:any[]=[],assignments:any[]=[]
  if(targetIds.length){
    const [p,m,e,g,a,s]=await Promise.all([
      supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',targetIds),
      supabase.from('member_milestones').select('*').eq('church_id',churchId).in('user_id',targetIds),
      supabase.from('course_enrollments').select('user_id,course_id,credential_earned,progress_percent,completed_at,updated_at').in('user_id',targetIds),
      supabase.from('group_memberships').select('user_id,group_id,groups!inner(church_id,group_type)').in('user_id',targetIds).eq('groups.church_id',churchId).eq('groups.group_type','friendship'),
      supabase.from('ministry_applications').select('user_id,status').in('user_id',targetIds).eq('status','accepted'),
      supabase.from('team_assignments').select('assigned_user_id').eq('church_id',churchId).in('assigned_user_id',targetIds)
    ])
    profiles=p.data??[];milestones=m.data??[];enrollments=e.data??[];groups=g.data??[];applications=a.data??[];assignments=s.data??[]
  }
  const byUser=(rows:any[],key:string)=>{const map=new Map<string,any[]>();for(const row of rows){const id=row[key];const list=map.get(id)??[];list.push(row);map.set(id,list)}return map}
  const profileMap=new Map(profiles.map((row:any)=>[row.id,row]))
  const milestoneMap=new Map(milestones.map((row:any)=>[row.user_id,row]))
  const enrollmentMap=byUser(enrollments,'user_id'),groupMap=byUser(groups,'user_id'),applicationMap=byUser(applications,'user_id'),assignmentMap=byUser(assignments,'assigned_user_id')
  const now=Date.now()
  const rows=(trackingRows??[]).map((track:any)=>{
    const rawStep:any=Array.isArray(track.discipleship_pathway_steps)?track.discipleship_pathway_steps[0]:track.discipleship_pathway_steps
    if(!rawStep)return null
    const step=resolveJourneyStep(rawStep as JourneyStepDefinition,{
      milestones:milestoneMap.get(track.user_id)??{},
      enrollments:enrollmentMap.get(track.user_id)??[],
      groupCount:(groupMap.get(track.user_id)??[]).length,
      ministryApplicationCount:(applicationMap.get(track.user_id)??[]).length,
      ministryAssignmentCount:(assignmentMap.get(track.user_id)??[]).length,
      trackingByStep:new Map<string,JourneyStepTracking>([[track.step_id,track]])
    })
    if(step.completed)return null
    const p=profileMap.get(track.user_id)
    const name=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||(es?'Miembro':'Member')
    const overdue=Boolean(track.due_on&&new Date(`${track.due_on}T23:59:59Z`).getTime()<now)
    return {track,step,name,overdue}
  }).filter(Boolean) as any[]
  rows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||String(a.track.due_on||'9999').localeCompare(String(b.track.due_on||'9999'))||a.name.localeCompare(b.name))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Seguimiento de Mi Camino':'Journey Follow-Up'}</div></div><div className="row"><Link className="ghost" href={`/journey/follow-up?lang=${es?'en':'es'}`}>{es?'English':'Español'}</Link><Link className="ghost" href={l('/today')}>← {es?'Mi Día':'My Today'}</Link></div></header>
    <section className="hero card"><div><div className="pill">{es?'PERSONAS ASIGNADAS A TI':'PEOPLE ASSIGNED TO YOU'}</div><h1>{es?'Ayuda a cada persona a dar su próximo paso.':'Help each person take the next step.'}</h1><p className="muted">{es?'Solo ves los seguimientos de discipulado que fueron asignados directamente a ti. Completar el paso todavía viene de su registro oficial, no de este seguimiento.':'You only see discipleship follow-ups assigned directly to you. Step completion still comes from the official record, not from this follow-up screen.'}</p></div><div className="hero-stat"><Compass size={22}/><span>{rows.length} {es?'pendientes':'open'}</span></div></section>
    {q.saved&&<div className="notice success">{es?'Seguimiento actualizado.':'Follow-up updated.'}</div>}{q.error&&<div className="notice error">{q.error}</div>}
    <section className="member-list">{rows.map(({track,step,name,overdue}:any)=><article className="card" style={{padding:18}} key={track.id}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:18,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 280px'}}><div className="row"><div className="avatar large"><UserRound size={20}/></div><div><h3 style={{margin:'0 0 4px'}}>{name}</h3><span className="small muted">{step.title}</span></div></div>{step.description&&<p className="muted" style={{marginBottom:0}}>{step.description}</p>}</div>
        <form action={recordJourneyFollowup} style={{flex:'1 1 300px',display:'grid',gridTemplateColumns:'1fr auto',gap:9,alignItems:'end'}}>
          <input type="hidden" name="tracking_id" value={track.id}/><input type="hidden" name="lang" value={lang}/>
          <label className="field" style={{margin:0}}><span>{es?'Próxima fecha de seguimiento':'Next follow-up date'}</span><input type="date" name="next_due_on" defaultValue={track.due_on??''}/></label>
          {step.completion_source==='manual'&&<label className="field" style={{margin:0}}><span>{es?'Estado del paso manual':'Manual step status'}</span><select name="manual_status" defaultValue={track.manual_status??'not_started'}><option value="not_started">{es?'No iniciado':'Not started'}</option><option value="in_progress">{es?'En progreso':'In progress'}</option><option value="completed">{es?'Completado':'Completed'}</option><option value="waived">{es?'Exento':'Waived'}</option></select></label>}
          <button className="btn"><CheckCircle2 size={14}/> {es?'Registrar seguimiento':'Record follow-up'}</button>
          <div className="small muted" style={{gridColumn:'1 / -1'}}>{track.due_on?<><Clock3 size={12} style={{verticalAlign:'middle'}}/> {overdue?(es?'Atrasado':'Overdue'):(es?'Vence':'Due')} {track.due_on}</>:(es?'Sin fecha establecida.':'No due date set.')}</div>
        </form>
      </div>
    </article>)}{!rows.length&&<section className="card empty"><CheckCircle2 size={28}/><h2>{es?'No tienes seguimientos de Mi Camino pendientes.':'No Journey follow-ups are waiting on you.'}</h2><p className="muted">{es?'Cuando liderazgo te asigne una persona y un paso, aparecerá aquí.':'When leadership assigns you a person and step, it will appear here.'}</p></section>}</section>
  </main>
}
