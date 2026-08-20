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
  const {error}=await supabase.from('schedule_items').update({title:title.slice(0,160),starts_at:startsAt,ends_at:endsAt,location:text(formData,'location')||null,notes:text(formData,'notes')||null,status,updated_at:new Date().toISOString()}).eq('id',itemId).eq('schedule_id',scheduleId).eq('church_id',person.churchId)
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
  const {error}=await supabase.from('team_assignments').insert({church_id:person.churchId,ministry_id:scope.ministry_id,assigned_user_id:assignedUserId,created_by:person.userId,title:roleLabel.slice(0,120),role_label:roleLabel.slice(0,80),starts_at:item.starts_at,call_time:callTime,confirmation_required:true,notes:text(formData,'notes')||null,schedule_item_id:itemId,assignment_status:'scheduled',schedule_override:conflicts.length>0&&override,schedule_override_reason:conflicts.length>0&&override?overrideReason:null,schedule_conflict_summary:conflicts.length?conflicts.join(' • '):null})
  if(error){
    console.error('createScheduleAssignment failed',{scheduleId,itemId,assignedUserId,code:error.code,message:error.message})
    redirect(manageUrl(lang,`&schedule=${scheduleId}&error=`+encodeURIComponent(safe(lang,'We could not assign that person.','No pudimos asignar a esa persona.'))))
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
