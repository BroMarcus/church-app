'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}
const cleanUrl=(value:string)=>{if(!value)return null;if(!/^https?:\/\//i.test(value))throw new Error('Registration link must begin with http:// or https://.');return value}
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path

export async function createEvent(formData:FormData){
  const {supabase,userId}=await auth();const lang=text(formData,'lang');const churchId=text(formData,'church_id'),title=text(formData,'title'),starts=text(formData,'starts_at'),ends=text(formData,'ends_at')
  if(!churchId||!title||!starts)redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'Se requiere el título y la hora de inicio.':'Title and start time are required.'),lang))
  const {data:startUtc,error:startError}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:starts})
  if(startError||!startUtc)redirect(withLang('/calendar?error='+encodeURIComponent(startError?.message||(lang==='es'?'Hora de inicio inválida.':'Invalid start time.')),lang))
  let endUtc:string|null=null
  if(ends){const result=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:ends});if(result.error)redirect(withLang('/calendar?error='+encodeURIComponent(result.error.message),lang));endUtc=result.data as string|null}
  if(endUtc&&new Date(endUtc).getTime()<new Date(startUtc as string).getTime())redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'La hora de fin debe ser después de la hora de inicio.':'End time must be after the start time.'),lang))
  let registrationUrl:string|null=null;try{registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(e:any){redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'El enlace de registro debe comenzar con http:// o https://.':e.message),lang))}
  const {error}=await supabase.from('events').insert({church_id:churchId,created_by:userId,title,description:text(formData,'description')||null,starts_at:startUtc,ends_at:endUtc,location:text(formData,'location')||null,event_type:text(formData,'event_type')||'church',featured:text(formData,'featured')==='on',audience_label:text(formData,'audience_label')||null,registration_url:registrationUrl})
  if(error)redirect(withLang('/calendar?error='+encodeURIComponent(error.message),lang))
  revalidatePath('/calendar');revalidatePath('/');redirect(withLang('/calendar?created=1',lang))
}

export async function updateEventDiscovery(formData:FormData){
  const {supabase}=await auth();const lang=text(formData,'lang');const eventId=text(formData,'event_id')
  if(!eventId)redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'Evento no encontrado.':'Event not found.'),lang))
  let registrationUrl:string|null=null;try{registrationUrl=cleanUrl(text(formData,'registration_url'))}catch(e:any){redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'El enlace de registro debe comenzar con http:// o https://.':e.message),lang))}
  const {error}=await supabase.from('events').update({featured:text(formData,'featured')==='on',audience_label:text(formData,'audience_label')||null,registration_url:registrationUrl}).eq('id',eventId)
  if(error)redirect(withLang('/calendar?error='+encodeURIComponent(error.message),lang))
  revalidatePath('/calendar');revalidatePath('/');redirect(withLang('/calendar?saved=1',lang))
}

export async function setRsvp(formData:FormData){
  const {supabase,userId}=await auth();const lang=text(formData,'lang');const eventId=text(formData,'event_id'),response=text(formData,'response')
  if(!['interested','going','not_going'].includes(response))redirect(withLang('/calendar?error='+encodeURIComponent(lang==='es'?'Respuesta inválida.':'Invalid RSVP.'),lang))
  const {error}=await supabase.from('event_rsvps').upsert({event_id:eventId,user_id:userId,response,updated_at:new Date().toISOString()},{onConflict:'event_id,user_id'})
  if(error)redirect(withLang('/calendar?error='+encodeURIComponent(error.message),lang))
  revalidatePath('/calendar');revalidatePath('/calendar/my');revalidatePath('/');redirect(withLang('/calendar?rsvp=1',lang))
}

export async function createMemberTask(formData:FormData){
  const {supabase,userId}=await auth();const lang=text(formData,'lang'),churchId=text(formData,'church_id'),title=text(formData,'title'),assignedTo=text(formData,'assigned_to')||userId,dueLocal=text(formData,'due_at'),priority=text(formData,'priority')||'normal'
  const back=text(formData,'back')||'/calendar/my'
  if(!churchId||!title||!['low','normal','high'].includes(priority))redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'Tarea inválida.':'Invalid task.')}`,lang))
  let dueAt:string|null=null
  if(dueLocal){const result=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:dueLocal});if(result.error||!result.data)redirect(withLang(`${back}?error=${encodeURIComponent(result.error?.message||(lang==='es'?'Fecha inválida.':'Invalid due date.'))}`,lang));dueAt=result.data as string}
  const {error}=await supabase.from('member_tasks').insert({church_id:churchId,assigned_to:assignedTo,created_by:userId,title,notes:text(formData,'notes')||null,due_at:dueAt,priority})
  if(error)redirect(withLang(`${back}?error=${encodeURIComponent(error.message)}`,lang))
  revalidatePath('/calendar/my');revalidatePath('/calendar/manage');revalidatePath('/today');revalidatePath('/prophet');redirect(withLang(`${back}?task_created=1`,lang))
}

export async function setMemberTaskStatus(formData:FormData){
  const {supabase}=await auth();const lang=text(formData,'lang'),taskId=text(formData,'task_id'),status=text(formData,'status'),back=text(formData,'back')||'/calendar/my'
  if(!taskId||!['open','in_progress','completed','cancelled'].includes(status))redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'Estado de tarea inválido.':'Invalid task status.')}`,lang))
  const {error}=await supabase.from('member_tasks').update({status}).eq('id',taskId)
  if(error)redirect(withLang(`${back}?error=${encodeURIComponent(error.message)}`,lang))
  revalidatePath('/calendar/my');revalidatePath('/calendar/manage');revalidatePath('/today');revalidatePath('/prophet');redirect(withLang(`${back}?task_saved=1`,lang))
}

export async function submitTimeOff(formData:FormData){
  const {supabase,userId}=await auth();const lang=text(formData,'lang'),churchId=text(formData,'church_id'),starts=text(formData,'starts_on'),ends=text(formData,'ends_on'),back=text(formData,'back')||'/calendar/my'
  if(!churchId||!starts||!ends||ends<starts)redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'Rango de fechas inválido.':'Invalid date range.')}`,lang))
  const {error}=await supabase.from('member_time_off').insert({church_id:churchId,user_id:userId,starts_on:starts,ends_on:ends,notes:text(formData,'notes')||null})
  if(error)redirect(withLang(`${back}?error=${encodeURIComponent(error.message)}`,lang))
  revalidatePath('/calendar/my');revalidatePath('/calendar/manage');redirect(withLang(`${back}?time_off=1`,lang))
}

export async function reviewTimeOff(formData:FormData){
  const {supabase}=await auth();const lang=text(formData,'lang'),requestId=text(formData,'request_id'),status=text(formData,'status')
  if(!requestId||!['approved','declined'].includes(status))redirect(withLang('/calendar/manage?error='+encodeURIComponent(lang==='es'?'Revisión inválida.':'Invalid review.'),lang))
  const {error}=await supabase.from('member_time_off').update({status}).eq('id',requestId)
  if(error)redirect(withLang('/calendar/manage?error='+encodeURIComponent(error.message),lang))
  revalidatePath('/calendar/manage');revalidatePath('/calendar/my');redirect(withLang('/calendar/manage?reviewed=1',lang))
}