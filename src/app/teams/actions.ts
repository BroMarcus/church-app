'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const checked=(f:FormData,k:string)=>['on','true','1','yes'].includes(text(f,k).toLowerCase())
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const teamsUrl=(lang:string,extra='')=>`/teams?lang=${lang}${extra}`
async function auth(lang='en'){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect(`/login?lang=${lang}`);return{supabase,userId}}
async function localToUtc(supabase:any,churchId:string,value:string){if(!value)return null;const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value});if(error)throw new Error(error.message);return data as string|null}
const localDate=(iso:string,timeZone:string)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';return `${get('year')}-${get('month')}-${get('day')}`}

export async function createAssignment(formData:FormData){
  const lang=langOf(formData),{supabase,userId}=await auth(lang),churchId=text(formData,'church_id'),assigned=text(formData,'assigned_user_id'),title=text(formData,'title'),starts=text(formData,'starts_at'),call=text(formData,'call_time'),override=checked(formData,'schedule_override'),overrideReason=text(formData,'schedule_override_reason')
  if(!churchId||!assigned||!title||!starts)redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Se requieren persona, asignación y hora de inicio.':'Person, assignment and start time are required.')))
  let startsUtc:string|null=null,callUtc:string|null=null
  try{startsUtc=await localToUtc(supabase,churchId,starts);callUtc=await localToUtc(supabase,churchId,call)}catch(e:any){redirect(teamsUrl(lang,'&error='+encodeURIComponent(e.message||(lang==='es'?'Hora de equipo inválida.':'Invalid team schedule time.'))))}
  if(!startsUtc)redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Se requiere la hora de inicio.':'Start time is required.')))
  if(callUtc&&new Date(callUtc).getTime()>new Date(startsUtc).getTime())redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'La hora de llegada debe ser antes o igual a la hora de inicio.':'Call time must be before or equal to the assignment start time.')))

  const [{data:member},{data:church}]=await Promise.all([
    supabase.from('church_memberships').select('status').eq('church_id',churchId).eq('user_id',assigned).maybeSingle(),
    supabase.from('churches').select('timezone').eq('id',churchId).single()
  ])
  if(member?.status!=='active')redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Solo puedes programar a un miembro activo de esta iglesia.':'Only an active member of this church can be scheduled.')))
  const timeZone=church?.timezone||'UTC',serviceDate=localDate(startsUtc,timeZone),startMs=new Date(startsUtc).getTime(),windowStart=new Date(startMs-90*60*1000).toISOString(),windowEnd=new Date(startMs+90*60*1000).toISOString()
  const [{data:timeOff},{data:existing}]=await Promise.all([
    supabase.from('member_time_off').select('starts_on,ends_on,notes').eq('church_id',churchId).eq('user_id',assigned).eq('status','approved').lte('starts_on',serviceDate).gte('ends_on',serviceDate).limit(1).maybeSingle(),
    supabase.from('team_assignments').select('id,title,starts_at').eq('church_id',churchId).eq('assigned_user_id',assigned).gte('starts_at',windowStart).lte('starts_at',windowEnd).order('starts_at').limit(5)
  ])
  const conflicts:string[]=[]
  if(timeOff)conflicts.push(lang==='es'?`No disponible aprobado: ${timeOff.starts_on} a ${timeOff.ends_on}`:`Approved unavailable dates: ${timeOff.starts_on} through ${timeOff.ends_on}`)
  for(const a of existing??[])conflicts.push(lang==='es'?`Otra asignación cercana: ${a.title}`:`Nearby existing assignment: ${a.title}`)
  if(conflicts.length&&!override)redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?`Conflicto de horario: ${conflicts.join(' • ')}. Si liderazgo decide continuar de todos modos, usa la anulación de horario y documenta la razón.`:`Schedule conflict: ${conflicts.join(' • ')}. If leadership intentionally proceeds, use the schedule override and document why.`)))
  if(conflicts.length&&override&&overrideReason.length<5)redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Explica la razón de la anulación de horario con al menos 5 caracteres.':'Document the schedule override reason with at least 5 characters.')))
  const usingOverride=conflicts.length>0&&override
  const {error}=await supabase.from('team_assignments').insert({church_id:churchId,ministry_id:text(formData,'ministry_id')||null,assigned_user_id:assigned,created_by:userId,title,starts_at:startsUtc,call_time:callUtc,confirmation_required:true,notes:text(formData,'notes')||null,schedule_override:usingOverride,schedule_override_reason:usingOverride?overrideReason:null,schedule_conflict_summary:conflicts.length?conflicts.join(' • '):null})
  if(error)redirect(teamsUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/teams');revalidatePath('/calendar/my');revalidatePath('/calendar/manage');redirect(teamsUrl(lang,'&created=1'))
}

export async function respondToAssignment(formData:FormData){
  const lang=langOf(formData),{supabase,userId}=await auth(lang),assignmentId=text(formData,'assignment_id'),response=text(formData,'response')
  if(!['confirmed','declined'].includes(response))redirect(teamsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Respuesta inválida.':'Invalid response.')))
  const {error}=await supabase.from('team_assignment_responses').upsert({assignment_id:assignmentId,user_id:userId,response,note:text(formData,'note')||null,responded_at:new Date().toISOString()},{onConflict:'assignment_id,user_id'})
  if(error)redirect(teamsUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/teams');revalidatePath('/calendar/my');redirect(teamsUrl(lang,'&responded=1'))
}