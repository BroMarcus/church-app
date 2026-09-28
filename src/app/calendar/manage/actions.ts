'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>
type Actor={userId:string;churchId:string;role:string;canManageTeams:boolean;canManageCalendar:boolean}
type ScheduleScope={id:string;church_id:string;ministry_id:string|null;group_id:string|null}

const broadRoles=new Set(['ministry_leader','minister','pastor','church_admin'])
const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const checked=(formData:FormData,key:string)=>['on','true','1','yes'].includes(text(formData,key).toLowerCase())
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const manageUrl=(lang:string,extra='')=>`/calendar/manage?lang=${lang}${extra}`
const safe=(lang:string,en:string,es:string)=>lang==='es'?es:en

async function actor(lang:string):Promise<{supabase:SupabaseServerClient;actor:Actor}>{
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [teamPermission,calendarPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_calendar'})
  ])
  return {supabase,actor:{userId,churchId:membership.church_id,role:membership.role,canManageTeams:broadRoles.has(membership.role)||Boolean(teamPermission.data),canManageCalendar:broadRoles.has(membership.role)||Boolean(calendarPermission.data)}}
}

async function canManageScope(supabase:SupabaseServerClient,person:Actor,scope:{ministry_id:string|null;group_id:string|null}){
  if(person.canManageTeams||person.canManageCalendar)return true
  if(scope.ministry_id){
    const {data}=await supabase.from('ministry_team_members').select('id').eq('church_id',person.churchId).eq('ministry_id',scope.ministry_id).eq('user_id',person.userId).eq('member_status','active').eq('is_leader',true).maybeSingle()
    if(data)return true
  }
  if(scope.group_id){
    const [{data:group},{data:groupMembership}]=await Promise.all([
      supabase.from('groups').select('leader_id').eq('id',scope.group_id).eq('church_id',person.churchId).maybeSingle(),
      supabase.from('group_memberships').select('role').eq('group_id',scope.group_id).eq('user_id',person.userId).maybeSingle()
    ])
    if(group?.leader_id===person.userId||['leader','assistant'].includes(groupMembership?.role??''))return true
  }
  return false
}

async function requireSchedule(supabase:SupabaseServerClient,person:Actor,scheduleId:string,lang:string):Promise<ScheduleScope>{
  const {data,error}=await supabase.from('church_schedules').select('id,church_id,ministry_id,group_id').eq('id',scheduleId).eq('church_id',person.churchId).maybeSingle()
  if(error||!data)redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'Schedule not found.','No se encontró el horario.'))))
  const scope=data as ScheduleScope
  if(!await canManageScope(supabase,person,scope))redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'You do not have permission to edit that schedule.','No tienes permiso para editar ese horario.'))))
  return scope
}

async function localToUtc(supabase:SupabaseServerClient,churchId:string,value:string){
  if(!value)return null
  const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value})
  if(error)throw new Error('Invalid local date or time')
  return typeof data==='string'?data:null
}

const localDate=(iso:string,timeZone:string)=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso))
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??''
  return `${get('year')}-${get('month')}-${get('day')}`
}

async function assignmentConflicts(supabase:SupabaseServerClient,churchId:string,userId:string,startsAt:string,excludeId:string|null){
  const {data:church}=await supabase.from('churches').select('timezone').eq('id',churchId).single()
  const timeZone=church?.timezone||'UTC'
  const serviceDate=localDate(startsAt,timeZone)
  const startMs=new Date(startsAt).getTime()
  const windowStart=new Date(startMs-90*60*1000).toISOString(),windowEnd=new Date(startMs+90*60*1000).toISOString()
  let existingQuery=supabase.from('team_assignments').select('id,title,starts_at').eq('church_id',churchId).eq('assigned_user_id',userId).eq('assignment_status','scheduled').gte('starts_at',windowStart).lte('starts_at',windowEnd).order('starts_at').limit(8)
  if(excludeId)existingQuery=existingQuery.neq('id',excludeId)
  const [{data:timeOff},{data:existing}]=await Promise.all([
    supabase.from('member_time_off').select('starts_on,ends_on').eq('church_id',churchId).eq('user_id',userId).eq('status','approved').lte('starts_on',serviceDate).gte('ends_on',serviceDate).limit(1).maybeSingle(),
    existingQuery
  ])
  const conflicts:string[]=[]
  if(timeOff)conflicts.push(`Approved unavailable dates: ${timeOff.starts_on} through ${timeOff.ends_on}`)
  for(const assignment of existing??[])conflicts.push(`Nearby assignment: ${assignment.title}`)
  return conflicts
}

function refresh(){
  revalidatePath('/calendar/manage');revalidatePath('/calendar/my');revalidatePath('/calendar');revalidatePath('/teams');revalidatePath('/teams/manage');revalidatePath('/today')
}

export async function createSchedule(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const name=text(formData,'name'),scheduleType=text(formData,'schedule_type')||'ministry',ministryId=text(formData,'ministry_id')||null,groupId=text(formData,'group_id')||null
  if(name.length<2||name.length>120||ministryId&&groupId)redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'Enter a valid schedule name and choose only one team or group.','Ingresa un nombre válido y escoge solo un equipo o grupo.'))))
  if(!await canManageScope(supabase,person,{ministry_id:ministryId,group_id:groupId}))redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'You do not have permission to create that schedule.','No tienes permiso para crear ese horario.'))))
  const {data,error}=await supabase.from('church_schedules').insert({church_id:person.churchId,name,schedule_type:scheduleType.slice(0,60),description:text(formData,'description')||null,ministry_id:ministryId,group_id:groupId,active:true,created_by:person.userId}).select('id').single()
  if(error||!data){
    console.error('createSchedule failed',{churchId:person.churchId,code:error?.code,message:error?.message})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'We could not create that schedule.','No pudimos crear ese horario.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule_created=1&schedule=${data.id}`))
}

export async function updateSchedule(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id')
  if(!scheduleId)redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const name=text(formData,'name'),scheduleType=text(formData,'schedule_type')||'ministry'
  if(name.length<2||name.length>120)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Schedule name is required.','Se requiere el nombre del horario.'))))
  const {error}=await supabase.from('church_schedules').update({name,schedule_type:scheduleType.slice(0,60),description:text(formData,'description')||null,active:checked(formData,'active'),updated_at:new Date().toISOString()}).eq('id',scheduleId).eq('church_id',person.churchId)
  if(error){
    console.error('updateSchedule failed',{scheduleId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not save the schedule settings.','No pudimos guardar la configuración del horario.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule_saved=1&schedule=${scheduleId}`))
}

export async function createScheduleItem(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id'),title=text(formData,'title')
  if(!scheduleId||title.length<2)redirect(manageUrl(lang,'&error='+encodeURIComponent(safe(lang,'Schedule item title is required.','Se requiere el título del elemento del horario.'))))
  await requireSchedule(supabase,person,scheduleId,lang)
  let startsAt:string|null=null,endsAt:string|null=null
  try{startsAt=await localToUtc(supabase,person.churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,person.churchId,text(formData,'ends_at'))}catch(error:unknown){console.error('createScheduleItem time conversion failed',{scheduleId,error});redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Enter a valid date and time.','Ingresa una fecha y hora válidas.'))))}
  if(!startsAt||endsAt&&new Date(endsAt)<new Date(startsAt))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'End time must be after the start time.','La hora final debe ser después de la hora inicial.'))))
  const {error}=await supabase.from('schedule_items').insert({schedule_id:scheduleId,church_id:person.churchId,title:title.slice(0,160),starts_at:startsAt,ends_at:endsAt,location:text(formData,'location')||null,notes:text(formData,'notes')||null,status:'scheduled',created_by:person.userId})
  if(error){
    console.error('createScheduleItem failed',{scheduleId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not add that date to the schedule.','No pudimos agregar esa fecha al horario.'))))
  }
  refresh();redirect(manageUrl(lang,`&item_created=1&schedule=${scheduleId}`))
}

export async function updateScheduleItem(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id'),itemId=text(formData,'schedule_item_id'),title=text(formData,'title'),status=text(formData,'status')
  if(!scheduleId||!itemId||title.length<2||!['scheduled','cancelled'].includes(status))redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  let startsAt:string|null=null,endsAt:string|null=null
  try{startsAt=await localToUtc(supabase,person.churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,person.churchId,text(formData,'ends_at'))}catch(error:unknown){console.error('updateScheduleItem time conversion failed',{itemId,error});redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Enter a valid date and time.','Ingresa una fecha y hora válidas.'))))}
  if(!startsAt||endsAt&&new Date(endsAt)<new Date(startsAt))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'End time must be after the start time.','La hora final debe ser después de la hora inicial.'))))
  const {error}=await supabase.from('schedule_items').update({title:title.slice(0,160),starts_at:startsAt,ends_at:endsAt,location:text(formData,'location')||null,notes:text(formData,'notes')||null,status,series_detached:true,updated_at:new Date().toISOString()}).eq('id',itemId).eq('schedule_id',scheduleId).eq('church_id',person.churchId)
  if(error){
    console.error('updateScheduleItem failed',{itemId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not save that schedule item.','No pudimos guardar ese elemento del horario.'))))
  }
  refresh();redirect(manageUrl(lang,`&item_saved=1&schedule=${scheduleId}`))
}

export async function createScheduleAssignment(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id'),itemId=text(formData,'schedule_item_id'),assignedUserId=text(formData,'assigned_user_id'),roleLabel=text(formData,'role_label')
  if(!scheduleId||!itemId||!assignedUserId||roleLabel.length<1)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose a person and role.','Escoge una persona y una función.'))))
  const scope=await requireSchedule(supabase,person,scheduleId,lang)
  const [{data:item},{data:member}]=await Promise.all([
    supabase.from('schedule_items').select('id,starts_at').eq('id',itemId).eq('schedule_id',scheduleId).eq('church_id',person.churchId).maybeSingle(),
    supabase.from('church_memberships').select('user_id').eq('church_id',person.churchId).eq('user_id',assignedUserId).eq('status','active').maybeSingle()
  ])
  if(!item||!member)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'That schedule date or member is not available.','Esa fecha o miembro no está disponible.'))))
  let callTime:string|null=null
  try{callTime=await localToUtc(supabase,person.churchId,text(formData,'call_time'))}catch(error:unknown){console.error('createScheduleAssignment call time failed',{itemId,error});redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Enter a valid call time.','Ingresa una hora de llegada válida.'))))}
  if(callTime&&new Date(callTime)>new Date(item.starts_at))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Call time must be before the schedule start.','La hora de llegada debe ser antes del inicio.'))))
  const conflicts=await assignmentConflicts(supabase,person.churchId,assignedUserId,item.starts_at,null)
  const override=checked(formData,'schedule_override'),overrideReason=text(formData,'schedule_override_reason')
  if(conflicts.length&&!override)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,`Schedule conflict: ${conflicts.join(' • ')}. Use the override only if leadership intends to proceed.`,`Conflicto de horario: ${conflicts.join(' • ')}. Usa la anulación solo si liderazgo desea continuar.`))))
  if(conflicts.length&&override&&overrideReason.length<5)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Explain the schedule override with at least 5 characters.','Explica la anulación del horario con al menos 5 caracteres.'))))
  const {data:createdAssignment,error}=await supabase.from('team_assignments').insert({church_id:person.churchId,ministry_id:scope.ministry_id,assigned_user_id:assignedUserId,created_by:person.userId,title:roleLabel.slice(0,120),role_label:roleLabel.slice(0,80),starts_at:item.starts_at,call_time:callTime,confirmation_required:true,notes:text(formData,'notes')||null,schedule_item_id:itemId,assignment_status:'scheduled',schedule_override:conflicts.length>0&&override,schedule_override_reason:conflicts.length>0&&override?overrideReason:null,schedule_conflict_summary:conflicts.length?conflicts.join(' • '):null}).select('id').single()
  if(error||!createdAssignment){
    console.error('createScheduleAssignment failed',{scheduleId,itemId,assignedUserId,code:error?.code,message:error?.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not assign that person.','No pudimos asignar a esa persona.'))))
  }
  if(roleLabel.trim().toLowerCase()==='5 spot'){
    const {data:request}=await supabase.from('five_spot_requests').select('id').eq('church_id',person.churchId).eq('requester_user_id',assignedUserId).eq('status','approved').order('created_at').limit(1).maybeSingle()
    if(request){
      const {error:linkError}=await supabase.from('five_spot_requests').update({status:'scheduled',scheduled_assignment_id:createdAssignment.id,updated_at:new Date().toISOString()}).eq('id',request.id).eq('church_id',person.churchId)
      if(linkError)console.error('linkFiveSpotAssignment failed',{requestId:request.id,assignmentId:createdAssignment.id,code:linkError.code,message:linkError.message})
    }
  }
  refresh();redirect(manageUrl(lang,`&assignment_created=1&schedule=${scheduleId}`))
}

export async function updateScheduleAssignment(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id'),assignmentId=text(formData,'assignment_id'),assignedUserId=text(formData,'assigned_user_id'),roleLabel=text(formData,'role_label')
  if(!scheduleId||!assignmentId||!assignedUserId||!roleLabel)redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {data:assignment}=await supabase.from('team_assignments').select('id,schedule_item_id,starts_at').eq('id',assignmentId).eq('church_id',person.churchId).maybeSingle()
  if(!assignment?.schedule_item_id)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Assignment not found on this shared schedule.','No se encontró la asignación en este horario compartido.'))))
  let callTime:string|null=null
  try{callTime=await localToUtc(supabase,person.churchId,text(formData,'call_time'))}catch(error:unknown){console.error('updateScheduleAssignment call time failed',{assignmentId,error});redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Enter a valid call time.','Ingresa una hora de llegada válida.'))))}
  if(callTime&&new Date(callTime)>new Date(assignment.starts_at))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Call time must be before the schedule start.','La hora de llegada debe ser antes del inicio.'))))
  const conflicts=await assignmentConflicts(supabase,person.churchId,assignedUserId,assignment.starts_at,assignmentId)
  const override=checked(formData,'schedule_override'),overrideReason=text(formData,'schedule_override_reason')
  if(conflicts.length&&!override)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,`Schedule conflict: ${conflicts.join(' • ')}`,`Conflicto de horario: ${conflicts.join(' • ')}`))))
  if(conflicts.length&&override&&overrideReason.length<5)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Explain the schedule override with at least 5 characters.','Explica la anulación del horario con al menos 5 caracteres.'))))
  const {error}=await supabase.from('team_assignments').update({assigned_user_id:assignedUserId,title:roleLabel.slice(0,120),role_label:roleLabel.slice(0,80),call_time:callTime,notes:text(formData,'notes')||null,assignment_status:'scheduled',schedule_override:conflicts.length>0&&override,schedule_override_reason:conflicts.length>0&&override?overrideReason:null,schedule_conflict_summary:conflicts.length?conflicts.join(' • '):null}).eq('id',assignmentId).eq('church_id',person.churchId)
  if(error){
    console.error('updateScheduleAssignment failed',{assignmentId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not save that assignment.','No pudimos guardar esa asignación.'))))
  }
  refresh();redirect(manageUrl(lang,`&assignment_saved=1&schedule=${scheduleId}`))
}

export async function archiveScheduleAssignment(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang),scheduleId=text(formData,'schedule_id'),assignmentId=text(formData,'assignment_id')
  if(!scheduleId||!assignmentId)redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {error}=await supabase.from('team_assignments').update({assignment_status:'removed'}).eq('id',assignmentId).eq('church_id',person.churchId)
  if(error){
    console.error('archiveScheduleAssignment failed',{assignmentId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not unassign that person.','No pudimos quitar esa asignación.'))))
  }
  refresh();redirect(manageUrl(lang,`&assignment_saved=1&schedule=${scheduleId}`))
}


export async function saveScheduleMonthPlan(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),monthStart=text(formData,'month_start')
  if(!scheduleId||!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(monthStart))redirect(manageUrl(lang))
  const scope=await requireSchedule(supabase,person,scheduleId,lang)
  const {data:schedule}=await supabase.from('church_schedules').select('schedule_type').eq('id',scope.id).eq('church_id',person.churchId).maybeSingle()
  if(schedule?.schedule_type!=='preaching')redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Year Plan is only available for preaching schedules.','El Plan Anual solo está disponible para horarios de predicación.'))))
  const payload={schedule_id:scheduleId,church_id:person.churchId,month_start:monthStart,theme:text(formData,'theme')||null,scripture:text(formData,'scripture')||null,notes:text(formData,'plan_notes')||null,created_by:person.userId,updated_at:new Date().toISOString()}
  const {error}=await supabase.from('schedule_month_plans').upsert(payload,{onConflict:'schedule_id,month_start'})
  if(error){
    console.error('saveScheduleMonthPlan failed',{scheduleId,monthStart,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not save that month plan.','No pudimos guardar el plan de ese mes.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule=${scheduleId}&month_plan_saved=1`))
}

export async function reviewFiveSpotRequest(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),requestId=text(formData,'request_id'),status=text(formData,'status')
  if(!scheduleId||!requestId||!['submitted','coaching','ready_for_review','approved','completed'].includes(status))redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {data:request}=await supabase.from('five_spot_requests').select('status,scheduled_assignment_id').eq('id',requestId).eq('church_id',person.churchId).maybeSingle()
  if(!request)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'5 Spot request not found.','No se encontró la solicitud de 5 Spot.'))))
  const allowed:Record<string,string[]>={submitted:['submitted','coaching'],coaching:['coaching','ready_for_review'],ready_for_review:['coaching','ready_for_review','approved'],approved:['coaching','ready_for_review','approved'],scheduled:['completed'],completed:['completed']}
  if(!allowed[request.status]?.includes(status))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'That 5 Spot status change is not allowed.','Ese cambio de estado de 5 Spot no está permitido.'))))
  const mentor=text(formData,'mentor_user_id')||null
  if(mentor){
    const {data:member}=await supabase.from('church_memberships').select('user_id').eq('church_id',person.churchId).eq('user_id',mentor).eq('status','active').maybeSingle()
    if(!member)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose an active church member as mentor.','Escoge un miembro activo como mentor.'))))
  }
  const updates:{status:string;mentor_user_id:string|null;leader_feedback:string|null;updated_at:string;scheduled_assignment_id?:null}={status,mentor_user_id:mentor,leader_feedback:text(formData,'leader_feedback')||null,updated_at:new Date().toISOString()}
  if(!['scheduled','completed'].includes(status))updates.scheduled_assignment_id=null
  const {error}=await supabase.from('five_spot_requests').update(updates).eq('id',requestId).eq('church_id',person.churchId)
  if(error){
    console.error('reviewFiveSpotRequest failed',{requestId,status,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not update that 5 Spot request.','No pudimos actualizar esa solicitud de 5 Spot.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule=${scheduleId}&five_spot_saved=1`))
}


export async function assignCleaningGroup(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),itemId=text(formData,'schedule_item_id'),groupId=text(formData,'group_id')
  if(!scheduleId||!itemId||!groupId)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose a Friendship Group.','Escoge un Grupo de Amistad.'))))
  await requireSchedule(supabase,person,scheduleId,lang)
  const [{data:schedule},{data:item},{data:group},{data:existing}]=await Promise.all([
    supabase.from('church_schedules').select('schedule_type').eq('id',scheduleId).eq('church_id',person.churchId).maybeSingle(),
    supabase.from('schedule_items').select('id').eq('id',itemId).eq('schedule_id',scheduleId).eq('church_id',person.churchId).maybeSingle(),
    supabase.from('groups').select('id').eq('id',groupId).eq('church_id',person.churchId).eq('group_type','friendship').eq('active',true).maybeSingle(),
    supabase.from('cleaning_assignments').select('id,group_id').eq('schedule_item_id',itemId).eq('church_id',person.churchId).maybeSingle()
  ])
  if(schedule?.schedule_type!=='cleaning'||!item||!group)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Cleaning assignments require an active Friendship Group and cleaning schedule date.','Las asignaciones de limpieza requieren un Grupo de Amistad activo y una fecha de limpieza.'))))

  let cleaningId=existing?.id??null
  if(existing){
    const groupChanged=existing.group_id!==groupId
    const {error}=await supabase.from('cleaning_assignments').update({
      group_id:groupId,
      ...(groupChanged?{status:'assigned',claimed_for_at:null,claimed_by:null,claimed_at:null,completed_by:null,completed_at:null,completion_notes:null}:{}),
      updated_at:new Date().toISOString()
    }).eq('id',existing.id).eq('church_id',person.churchId)
    if(error){
      console.error('assignCleaningGroup update failed',{itemId,groupId,code:error.code,message:error.message})
      redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not update that cleaning rotation.','No pudimos actualizar esa rotación de limpieza.'))))
    }
    if(groupChanged)await supabase.from('cleaning_checklist_items').update({completed_by:null,completed_at:null,updated_at:new Date().toISOString()}).eq('cleaning_assignment_id',existing.id).eq('church_id',person.churchId)
  }else{
    const {data:created,error}=await supabase.from('cleaning_assignments').insert({schedule_item_id:itemId,church_id:person.churchId,group_id:groupId,status:'assigned',created_by:person.userId}).select('id').single()
    if(error||!created){
      console.error('assignCleaningGroup insert failed',{itemId,groupId,code:error?.code,message:error?.message})
      redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not assign that Friendship Group.','No pudimos asignar ese Grupo de Amistad.'))))
    }
    cleaningId=created.id
  }

  if(cleaningId){
    const {count}=await supabase.from('cleaning_checklist_items').select('id',{count:'exact',head:true}).eq('cleaning_assignment_id',cleaningId)
    if((count??0)===0){
      const labels=['Sanctuary / main room','Lobby / entry','Restrooms','Floors','Trash & supplies']
      const {error}=await supabase.from('cleaning_checklist_items').insert(labels.map((label,index)=>({cleaning_assignment_id:cleaningId,church_id:person.churchId,label,sort_order:index+1,required:true,created_by:person.userId})))
      if(error)console.error('seedCleaningChecklist failed',{cleaningId,code:error.code,message:error.message})
    }
  }

  refresh();revalidatePath('/calendar/cleaning');redirect(manageUrl(lang,`&schedule=${scheduleId}&cleaning_saved=1`))
}

export async function addCleaningChecklistItem(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),cleaningId=text(formData,'cleaning_assignment_id'),label=text(formData,'label')
  if(!scheduleId||!cleaningId||!label)redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {data:cleaning}=await supabase.from('cleaning_assignments').select('id,schedule_item_id').eq('id',cleaningId).eq('church_id',person.churchId).maybeSingle()
  if(!cleaning)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Cleaning assignment not found.','No se encontró la asignación de limpieza.'))))
  const {count}=await supabase.from('cleaning_checklist_items').select('id',{count:'exact',head:true}).eq('cleaning_assignment_id',cleaningId)
  const {error}=await supabase.from('cleaning_checklist_items').insert({cleaning_assignment_id:cleaningId,church_id:person.churchId,label:label.slice(0,180),sort_order:(count??0)+1,required:checked(formData,'required'),created_by:person.userId})
  if(error){
    console.error('addCleaningChecklistItem failed',{cleaningId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not add that checklist item.','No pudimos agregar ese elemento a la lista.'))))
  }
  refresh();revalidatePath('/calendar/cleaning');redirect(manageUrl(lang,`&schedule=${scheduleId}&cleaning_saved=1`))
}


export async function createScheduleSeries(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),frequency=text(formData,'frequency'),title=text(formData,'title'),startDate=text(formData,'start_date'),endDate=text(formData,'end_date'),localStart=text(formData,'local_start_time')
  if(!scheduleId||!title||!startDate||!localStart||!['weekly','monthly'].includes(frequency))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Complete the recurring schedule fields.','Completa los campos del horario recurrente.'))))
  await requireSchedule(supabase,person,scheduleId,lang)

  const intervalCount=Math.max(1,Math.min(12,Number(text(formData,'interval_count')||'1')||1))
  const weekdayRaw=text(formData,'weekday'),monthDayRaw=text(formData,'month_day')
  const weekday=frequency==='weekly'&&weekdayRaw!==''?Number(weekdayRaw):null
  const monthDay=frequency==='monthly'&&monthDayRaw!==''?Number(monthDayRaw):null
  if(frequency==='weekly'&&(weekday===null||!Number.isInteger(weekday)||weekday<0||weekday>6))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose a valid weekday.','Escoge un día de la semana válido.'))))
  if(frequency==='monthly'&&(monthDay===null||!Number.isInteger(monthDay)||monthDay<1||monthDay>31))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose a valid day of month.','Escoge un día del mes válido.'))))
  if(endDate&&endDate<startDate)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Recurring end date must be after the start date.','La fecha final recurrente debe ser después de la fecha inicial.'))))

  const durationRaw=Number(text(formData,'duration_minutes')||'0')
  const duration=Number.isFinite(durationRaw)&&durationRaw>0?Math.min(1440,Math.round(durationRaw)):null
  const {data:series,error}=await supabase.from('schedule_series').insert({
    schedule_id:scheduleId,church_id:person.churchId,title:title.slice(0,160),frequency,interval_count:intervalCount,
    weekday,month_day:monthDay,start_date:startDate,end_date:endDate||null,local_start_time:localStart,
    duration_minutes:duration,location:text(formData,'location')||null,notes:text(formData,'notes')||null,active:true,created_by:person.userId
  }).select('id').single()
  if(error||!series){
    console.error('createScheduleSeries failed',{scheduleId,code:error?.code,message:error?.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not create that recurring schedule.','No pudimos crear ese horario recurrente.'))))
  }

  const start=new Date(`${startDate}T12:00:00Z`)
  const defaultThrough=new Date(Date.UTC(start.getUTCFullYear()+1,start.getUTCMonth(),start.getUTCDate()))
  const through=endDate||defaultThrough.toISOString().slice(0,10)
  const {error:generateError}=await supabase.rpc('generate_schedule_series',{p_series_id:series.id,p_through_date:through})
  if(generateError){
    console.error('generateScheduleSeries failed',{seriesId:series.id,code:generateError.code,message:generateError.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'The recurring rule was saved, but its dates could not be generated.','La regla recurrente se guardó, pero no se pudieron generar sus fechas.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule=${scheduleId}&series_saved=1`))
}

export async function extendScheduleSeries(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),seriesId=text(formData,'series_id'),through=text(formData,'through_date')
  if(!scheduleId||!seriesId||!/^\d{4}-\d{2}-\d{2}$/.test(through))redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {data:series}=await supabase.from('schedule_series').select('id,start_date,end_date').eq('id',seriesId).eq('schedule_id',scheduleId).eq('church_id',person.churchId).eq('active',true).maybeSingle()
  if(!series)redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Recurring series not found.','No se encontró la serie recurrente.'))))
  if(through<series.start_date||(series.end_date&&through>series.end_date))redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'Choose a date inside the recurring series range.','Escoge una fecha dentro del rango de la serie recurrente.'))))
  const {error}=await supabase.rpc('generate_schedule_series',{p_series_id:seriesId,p_through_date:through})
  if(error){
    console.error('extendScheduleSeries failed',{seriesId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not extend that recurring schedule.','No pudimos extender ese horario recurrente.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule=${scheduleId}&series_saved=1`))
}

export async function deactivateScheduleSeries(formData:FormData){
  const lang=langOf(formData),{supabase,actor:person}=await actor(lang)
  const scheduleId=text(formData,'schedule_id'),seriesId=text(formData,'series_id')
  if(!scheduleId||!seriesId)redirect(manageUrl(lang))
  await requireSchedule(supabase,person,scheduleId,lang)
  const {error}=await supabase.from('schedule_series').update({active:false,updated_at:new Date().toISOString()}).eq('id',seriesId).eq('schedule_id',scheduleId).eq('church_id',person.churchId)
  if(error){
    console.error('deactivateScheduleSeries failed',{seriesId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not stop that recurring series.','No pudimos detener esa serie recurrente.'))))
  }
  refresh();redirect(manageUrl(lang,`&schedule=${scheduleId}&series_saved=1`))
}
