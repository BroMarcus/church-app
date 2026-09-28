import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,Circle,Clock3,Compass,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addJourneyAttention,journeyAttentionSummary,resolveJourneyStep,type JourneyStepDefinition,type JourneyStepTracking } from '@/lib/discipleship-pathway'
import { saveJourneyFollowup,saveLeadershipReview } from './actions'
import '../church.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Unnamed member'
const passed=(v:any)=>v==='completed'||v==='waived'||v===true
const addToMap=(map:Map<string,any[]>,key:string,row:any)=>{const list=map.get(key)??[];list.push(row);map.set(key,list)}

export default async function LeadershipDevelopmentPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id

  const [
    {data:members},{data:milestones},{data:reviews},{count:timothyCourses},
    {data:journeyTracking},{data:pathways},{data:pathAssignments},{data:pathSteps}
  ]=await Promise.all([
    supabase.from('church_memberships').select('user_id,role,status').eq('church_id',churchId).eq('status','active'),
    supabase.from('member_milestones').select('*').eq('church_id',churchId),
    supabase.from('leadership_development_reviews').select('*').eq('church_id',churchId).eq('leadership_track','friendship_group'),
    supabase.from('courses').select('*',{count:'exact',head:true}).eq('church_id',churchId).or('title.ilike.%timothy%,slug.ilike.%timothy%'),
    supabase.from('member_journey_step_tracking').select('step_id,user_id,responsible_leader_id,due_on,manual_status,manual_completed_at,last_activity_at,updated_at').eq('church_id',churchId),
    supabase.from('discipleship_pathways').select('id,name,is_default').eq('church_id',churchId).eq('active',true),
    supabase.from('member_journey_pathway_assignments').select('user_id,pathway_id').eq('church_id',churchId).eq('active',true),
    supabase.from('discipleship_pathway_steps').select('id,pathway_id,step_key,title,description,completion_source,completion_key,completion_value,suggested_href,sort_order,required').eq('church_id',churchId).eq('active',true).order('sort_order').order('id')
  ])

  const ids=(members??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[],enrollments:any[]=[],groupMemberships:any[]=[],applications:any[]=[],assignments:any[]=[]
  if(ids.length){
    const [profileRows,enrollmentRows,groupRows,applicationRows,assignmentRows]=await Promise.all([
      supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids),
      supabase.from('course_enrollments').select('user_id,course_id,progress_percent,credential_earned,completed_at,updated_at').in('user_id',ids),
      supabase.from('group_memberships').select('user_id,group_id').in('user_id',ids),
      supabase.from('ministry_applications').select('id,user_id,status').in('user_id',ids).eq('status','accepted'),
      supabase.from('team_assignments').select('id,assigned_user_id').eq('church_id',churchId).in('assigned_user_id',ids)
    ])
    profiles=profileRows.data??[];enrollments=enrollmentRows.data??[];groupMemberships=groupRows.data??[];applications=applicationRows.data??[];assignments=assignmentRows.data??[]
  }

  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const mm=new Map((milestones??[]).map((m:any)=>[m.user_id,m]))
  const rm=new Map((reviews??[]).map((r:any)=>[r.user_id,r]))
  const defaultPath=(pathways??[]).find((path:any)=>path.is_default)
  const assignedPath=new Map((pathAssignments??[]).map((row:any)=>[row.user_id,row.pathway_id]))
  const pathName=new Map((pathways??[]).map((path:any)=>[path.id,path.name]))

  const stepsByPath=new Map<string,any[]>()
  for(const step of pathSteps??[])addToMap(stepsByPath,(step as any).pathway_id,step)
  const trackingByUser=new Map<string,any[]>()
  for(const item of journeyTracking??[])addToMap(trackingByUser,(item as any).user_id,item)
  const enrollmentsByUser=new Map<string,any[]>()
  for(const item of enrollments)addToMap(enrollmentsByUser,item.user_id,item)
  const groupsByUser=new Map<string,any[]>()
  for(const item of groupMemberships)addToMap(groupsByUser,item.user_id,item)
  const applicationsByUser=new Map<string,any[]>()
  for(const item of applications)addToMap(applicationsByUser,item.user_id,item)
  const assignmentsByUser=new Map<string,any[]>()
  for(const item of assignments)addToMap(assignmentsByUser,item.assigned_user_id,item)

  const leaderOptions=(members??[])
    .filter((member:any)=>['group_leader','ministry_leader','minister','pastor','church_admin'].includes(member.role))
    .map((member:any)=>({id:member.user_id,name:personName(pm.get(member.user_id)),role:member.role}))
    .sort((a,b)=>a.name.localeCompare(b.name))

  const rows=(members??[]).map((member:any)=>{
    const m:any=mm.get(member.user_id)??{}
    const review:any=rm.get(member.user_id)??{}
    const objectiveGates=[
      ['Active member',member.status==='active'],
      ['Baptized',m.baptized===true],
      ['Holy Ghost',m.holy_ghost_received===true],
      ['First Steps',passed(m.first_steps_status)],
      ['Effective Soul Winning',passed(m.soul_winning_status)],
      ['Timothys',passed(m.timothys_status)],
      ['Covenant current',m.covenant_current===true]
    ] as const
    const pastoralGates=[
      ['Faithfulness reviewed',review.faithfulness_status==='faithful'],
      ['Pastoral approval',review.pastoral_approval_status==='approved']
    ] as const
    const gates=[...objectiveGates,...pastoralGates] as const
    const objective=objectiveGates.filter(([,ok])=>ok).length
    const objectiveComplete=objective===objectiveGates.length
    const ready=objectiveComplete&&pastoralGates.every(([,ok])=>ok)
    const missingObjective=objectiveGates.filter(([,ok])=>!ok).map(([label])=>label)
    const recommendation=missingObjective.length
      ? `Next measurable requirement: ${missingObjective[0]}.`
      : review.faithfulness_status!=='faithful'
        ? 'Objective requirements are complete. Next step: pastoral faithfulness review.'
        : review.pastoral_approval_status!=='approved'
          ? 'Objective requirements and faithfulness review are complete. Ready for pastoral approval decision.'
          : 'All configured requirements are complete. Leadership assignment remains a pastoral decision.'

    const activePathId=assignedPath.get(member.user_id)??defaultPath?.id
    const memberTracking=trackingByUser.get(member.user_id)??[]
    const trackingMap=new Map<string,JourneyStepTracking>(memberTracking.map((track:any)=>[track.step_id,track]))
    const resolved=activePathId?addJourneyAttention((stepsByPath.get(activePathId)??[]).map((step:any)=>resolveJourneyStep(step as JourneyStepDefinition,{
      milestones:m,
      enrollments:enrollmentsByUser.get(member.user_id)??[],
      groupCount:(groupsByUser.get(member.user_id)??[]).length,
      ministryApplicationCount:(applicationsByUser.get(member.user_id)??[]).length,
      ministryAssignmentCount:(assignmentsByUser.get(member.user_id)??[]).length,
      trackingByStep:trackingMap
    }))):[]
    const currentJourney=resolved.find(step=>step.required&&!step.completed)??resolved.find(step=>!step.completed)??null
    const currentTracking=currentJourney?trackingMap.get(currentJourney.id):undefined
    const journeyAttention=journeyAttentionSummary(resolved)
    return {
      member,m,review,gates,objective,objectiveComplete,ready,missingObjective,recommendation,
      name:personName(pm.get(member.user_id)),activePathId,pathwayName:activePathId?pathName.get(activePathId):null,
      currentJourney,currentTracking,journeyAttention
    }
  }).sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(b.objectiveComplete)-Number(a.objectiveComplete)||b.objective-a.objective||a.name.localeCompare(b.name))

  const readyCount=rows.filter(r=>r.ready).length
  const inTimothys=rows.filter(r=>r.m.timothys_status==='in_progress').length
  const needsReview=rows.filter(r=>r.objectiveComplete&&!r.ready).length
  const journeyDueCount=rows.filter(row=>row.currentJourney?.attention.includes('overdue')).length
  const journeyUnassignedCount=rows.filter(row=>row.currentJourney?.attention.includes('leader_missing')).length
  const journeyInactiveCount=rows.filter(row=>row.currentJourney?.attention.includes('inactive')).length
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches
  const savedMessage=query.saved==='journey'?'Journey follow-up saved.':query.saved?'Leadership review saved.':null

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Leadership Development</div></div><div className="row"><Link className="ghost" href="/church/journey-pathway"><Compass size={14}/> Pathway Setup</Link><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>

    <section className="admin-hero card"><div><div className="pill">LEADERSHIP + DISCIPLESHIP PIPELINE</div><h1>Know who is moving—and who needs help.</h1><p className="muted">Objective records come from the same baptism, Holy Ghost, learning, Friendship Group and serving records used elsewhere. Leaders add responsibility and follow-up; they do not create duplicate completion records.</p></div><div className="admin-badge"><Users size={22}/><div><strong>{rows.length}</strong><span>people in view</span></div></div></section>
    {savedMessage&&<div className="notice success">{savedMessage}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="stat-grid"><div className="card stat-card"><CheckCircle2/><div><strong>{readyCount}</strong><span>Configured gates complete</span></div></div><div className="card stat-card"><Users/><div><strong>{inTimothys}</strong><span>Timothys in progress</span></div></div><div className="card stat-card"><ShieldCheck/><div><strong>{needsReview}</strong><span>Ready for pastoral review</span></div></div><div className="card stat-card"><Circle/><div><strong>{rows.filter(r=>!r.objectiveComplete).length}</strong><span>Objective steps remaining</span></div></div><div className="card stat-card"><Clock3/><div><strong>{journeyDueCount}</strong><span>Current steps overdue</span></div></div><div className="card stat-card"><Users/><div><strong>{journeyUnassignedCount}</strong><span>Current steps without leader</span></div></div><div className="card stat-card"><Circle/><div><strong>{journeyInactiveCount}</strong><span>Started but inactive</span></div></div></section>

    <section className="card admin-note"><div className="pill">FRIENDSHIP GROUP LEADER PATH</div><h3>Current readiness standard</h3><p className="muted">Active membership, baptism, Holy Ghost, First Steps, Effective Soul Winning, Timothys, current covenant, faithfulness review, and pastoral approval. The software only reports whether these configured gates are satisfied; it does not determine calling or appoint leadership.</p>{(timothyCourses??0)===0&&<div className="notice" style={{marginBottom:0}}><strong>Timothys curriculum source still needs to be connected.</strong> The member milestone exists, but there is currently no Timothy course in the Learning Center. Do not treat this status field as proof of course completion until leadership identifies and approves the official source curriculum.</div>}</section>

    <div className="section-heading"><div><div className="pill">PEOPLE</div><h2>Discipleship + leadership development</h2></div><span className="small muted">Next step + responsible leader + pastoral review</span></div>
    <section className="member-list">{rows.map(r=><article className="card" key={r.member.user_id} style={{padding:18}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:18,flexWrap:'wrap'}}>
        <div style={{minWidth:250,flex:'1 1 300px'}}>
          <div className="row"><div className="avatar large">{r.name.slice(0,1).toUpperCase()}</div><div><h3 style={{margin:'0 0 4px'}}>{r.name}</h3><span className="small muted">{r.member.role.replaceAll('_',' ')}</span></div></div>
          <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:7}}>{r.gates.map(([label,ok])=><span key={label} style={{fontSize:11,padding:'6px 8px',borderRadius:999,border:'1px solid var(--line)',background:ok?'#173324':'#211730',color:ok?'#c9f5d7':'#d8cce2'}}>{ok?'✓':'○'} {label}</span>)}</div>
          <div className={r.ready?'notice success':'notice'} style={{margin:'12px 0 0'}}><strong>{r.ready?'Configured readiness gates complete.':'Leadership development'}</strong><div className="small" style={{marginTop:4}}>{r.recommendation}</div>{r.missingObjective.length>1&&<div className="small muted" style={{marginTop:4}}>Other measurable requirements still open: {r.missingObjective.slice(1).join(' • ')}</div>}</div>
        </div>

        <div style={{flex:'1 1 380px',display:'grid',gap:10}}>
          <section style={{padding:14,border:'1px solid var(--line)',borderRadius:13}}>
            <div className="pill">MY JOURNEY FOLLOW-UP</div>
            {r.currentJourney?<><h3 style={{margin:'9px 0 3px'}}>{r.currentJourney.title}</h3><div className="small muted">{r.pathwayName||'Configured pathway'} • {r.currentJourney.status.replaceAll('_',' ')}</div>
              <div className="row" style={{gap:6,flexWrap:'wrap',marginTop:9}}>
                {r.currentJourney.attention.includes('overdue')&&<span className="mini-pill">OVERDUE</span>}
                {r.currentJourney.attention.includes('inactive')&&<span className="mini-pill">INACTIVE</span>}
                {r.currentJourney.attention.includes('leader_missing')&&<span className="mini-pill">LEADER NEEDED</span>}
                {r.currentJourney.attention.includes('next_step_unstarted')&&<span className="mini-pill">NEXT STEP NOT STARTED</span>}
              </div>
              <form action={saveJourneyFollowup} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'end',marginTop:12}}>
                <input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="user_id" value={r.member.user_id}/><input type="hidden" name="step_id" value={r.currentJourney.id}/>
                <label className="field" style={{margin:0}}><span>Responsible leader</span><select name="responsible_leader_id" defaultValue={r.currentTracking?.responsible_leader_id??''}><option value="">Not assigned</option>{leaderOptions.map(option=><option value={option.id} key={option.id}>{option.name} — {option.role.replaceAll('_',' ')}</option>)}</select></label>
                <label className="field" style={{margin:0}}><span>Follow-up date</span><input type="date" name="due_on" defaultValue={r.currentTracking?.due_on??''}/></label>
                <button className="ghost">Save follow-up</button>
              </form>
            </>:r.activePathId?<div className="notice success" style={{margin:'10px 0 0'}}>Configured pathway complete. Keep developing the person without inventing another required step.</div>:<div className="notice" style={{margin:'10px 0 0'}}>No active pathway is assigned and this church does not yet have a default pathway. <Link href="/church/journey-pathway">Set up a pathway →</Link></div>}
          </section>

          <form action={saveLeadershipReview} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="user_id" value={r.member.user_id}/><input type="hidden" name="leadership_track" value="friendship_group"/>
            <label className="field" style={{margin:0}}><span>Faithfulness review</span><select name="faithfulness_status" defaultValue={r.review.faithfulness_status??'not_reviewed'}><option value="not_reviewed">Not reviewed</option><option value="developing">Developing</option><option value="faithful">Faithful</option><option value="concern">Concern / needs conversation</option></select></label>
            <label className="field" style={{margin:0}}><span>Pastoral approval</span><select name="pastoral_approval_status" defaultValue={r.review.pastoral_approval_status??'not_reviewed'}><option value="not_reviewed">Not reviewed</option><option value="approved">Approved</option><option value="hold">Hold / not ready</option></select></label>
            <label className="field" style={{gridColumn:'1 / -1',margin:0}}><span>Leadership development notes</span><textarea name="notes" rows={2} defaultValue={r.review.notes??''} placeholder="Mentoring needs, strengths, next steps…"/></label>
            <div className="row" style={{gridColumn:'1 / -1',justifyContent:'space-between'}}><Link className="ghost" href={`/church/members/${r.member.user_id}`}>Open member record</Link><button className="btn">Save review</button></div>
          </form>
        </div>
      </div>
    </article>)}{!rows.length&&<div className="card empty"><h3>No active members yet.</h3></div>}</section>
  </main>
}
