export type JourneyStatus='not_started'|'in_progress'|'completed'|'waived'

export type JourneyStepDefinition={
  id:string
  step_key:string
  title:string
  description?:string|null
  completion_source:'milestone_boolean'|'milestone_status'|'course'|'friendship_group'|'ministry_serving'|'manual'
  completion_key?:string|null
  completion_value?:string|null
  suggested_href?:string|null
  sort_order:number
  required:boolean
}

export type JourneyStepTracking={
  step_id:string
  responsible_leader_id?:string|null
  due_at?:string|null
  manual_status?:JourneyStatus|null
  manual_completed_at?:string|null
  last_activity_at?:string|null
  updated_at?:string|null
}

export type JourneyResolutionContext={
  milestones:Record<string,unknown>
  enrollments:Array<Record<string,unknown>>
  groupCount:number
  ministryApplicationCount:number
  ministryAssignmentCount:number
  trackingByStep:Map<string,JourneyStepTracking>
}

export type ResolvedJourneyStep=JourneyStepDefinition&{
  status:JourneyStatus
  completed:boolean
  started:boolean
  lastActivityAt:string|null
  responsibleLeaderId:string|null
  dueAt:string|null
  attention:Array<'inactive'|'overdue'|'leader_missing'|'next_step_unstarted'>
}

const COMPLETE_VALUES=new Set(['completed','approved','accepted','current','verified','yes','true'])
const STARTED_VALUES=new Set(['in_progress','started','submitted','under_review','training','active'])

const asString=(value:unknown)=>String(value??'').toLowerCase()

export function resolveJourneyStep(step:JourneyStepDefinition,ctx:JourneyResolutionContext):ResolvedJourneyStep{
  const tracking=ctx.trackingByStep.get(step.id)
  let status:JourneyStatus='not_started'
  let lastActivityAt=tracking?.last_activity_at??tracking?.updated_at??null

  if(step.completion_source==='milestone_boolean'){
    const value=Boolean(step.completion_key&&ctx.milestones[step.completion_key]===true)
    status=value?'completed':'not_started'
  }else if(step.completion_source==='milestone_status'){
    const value=asString(step.completion_key?ctx.milestones[step.completion_key]:null)
    const expected=asString(step.completion_value)||'completed'
    status=value===expected||(!step.completion_value&&COMPLETE_VALUES.has(value))
      ?'completed'
      :STARTED_VALUES.has(value)?'in_progress':'not_started'
  }else if(step.completion_source==='course'){
    const enrollment=ctx.enrollments.find((row)=>String(row.course_id??'')===String(step.completion_key??''))
    if(enrollment){
      const earned=enrollment.credential_earned===true
      const progress=Number(enrollment.progress_percent??0)
      status=earned||progress>=100?'completed':'in_progress'
      lastActivityAt=String(enrollment.updated_at??enrollment.completed_at??lastActivityAt??'')||null
    }
  }else if(step.completion_source==='friendship_group'){
    status=ctx.groupCount>0?'completed':'not_started'
  }else if(step.completion_source==='ministry_serving'){
    status=(ctx.ministryApplicationCount+ctx.ministryAssignmentCount)>0?'completed':'not_started'
  }else if(step.completion_source==='manual'){
    status=tracking?.manual_status??'not_started'
    if(status==='completed'&&tracking?.manual_completed_at)lastActivityAt=tracking.manual_completed_at
  }

  const completed=status==='completed'||status==='waived'
  const dueAt=tracking?.due_at??null
  const now=Date.now()
  const overdue=Boolean(dueAt&&new Date(dueAt).getTime()<now&&!completed)
  const inactive=Boolean(status==='in_progress'&&lastActivityAt&&now-new Date(lastActivityAt).getTime()>30*24*60*60*1000)

  return {
    ...step,
    status,
    completed,
    started:status!=='not_started',
    lastActivityAt,
    responsibleLeaderId:tracking?.responsible_leader_id??null,
    dueAt,
    attention:[
      ...(inactive?['inactive' as const]:[]),
      ...(overdue?['overdue' as const]:[])
    ]
  }
}

export function addJourneyAttention(steps:ResolvedJourneyStep[]):ResolvedJourneyStep[]{
  const firstIncomplete=steps.findIndex(step=>step.required&&!step.completed)
  return steps.map((step,index)=>{
    if(index!==firstIncomplete)return step
    const leaderMissing=!step.responsibleLeaderId
    const priorComplete=index>0&&steps.slice(0,index).some(previous=>previous.completed)
    const nextStepUnstarted=priorComplete&&step.status==='not_started'
    return {
      ...step,
      attention:[
        ...step.attention,
        ...(leaderMissing?['leader_missing' as const]:[]),
        ...(nextStepUnstarted?['next_step_unstarted' as const]:[])
      ]
    }
  })
}

export function journeyAttentionSummary(steps:ResolvedJourneyStep[]){
  return {
    inactive:steps.filter(step=>step.attention.includes('inactive')).length,
    overdue:steps.filter(step=>step.attention.includes('overdue')).length,
    leaderMissing:steps.filter(step=>step.attention.includes('leader_missing')).length,
    nextStepUnstarted:steps.filter(step=>step.attention.includes('next_step_unstarted')).length
  }
}
