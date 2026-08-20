'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const back=(lang:string,suffix='')=>`/calendar/my?lang=${lang}${suffix}`

async function memberContext(lang:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createPersonalTask(formData:FormData){
  const lang=langOf(formData),title=text(formData,'title'),notes=text(formData,'notes'),due=text(formData,'due_at'),priority=text(formData,'priority')||'normal'
  if(!title||title.length>160)redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'Escribe un título corto para la tarea.':'Enter a short task title.')}`))
  if(!['low','normal','high'].includes(priority))redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'Prioridad no válida.':'Invalid priority.')}`))
  const {supabase,userId,churchId}=await memberContext(lang)
  const dueAt=due?new Date(due):null
  if(due&&Number.isNaN(dueAt?.getTime()))redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'La fecha de la tarea no es válida.':'Task due date is invalid.')}`))
  const {error}=await supabase.from('member_tasks').insert({church_id:churchId,assigned_to:userId,created_by:userId,title,notes:notes||null,due_at:dueAt?.toISOString()||null,priority,source_type:'personal'})
  if(error){console.error('createPersonalTask failed',{message:error.message});redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'No pudimos crear la tarea. Inténtalo otra vez.':'We could not create the task. Try again.')}`))}
  revalidatePath('/calendar/my');redirect(back(lang,'&task_created=1'))
}

export async function updatePersonalTask(formData:FormData){
  const lang=langOf(formData),id=text(formData,'task_id'),status=text(formData,'status')
  if(!id||!['open','in_progress','completed'].includes(status))redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'No pudimos actualizar esa tarea.':'We could not update that task.')}`))
  const {supabase,userId,churchId}=await memberContext(lang)
  const patch=status==='completed'?{status,completed_at:new Date().toISOString()}:{status,completed_at:null}
  const {data,error}=await supabase.from('member_tasks').update(patch).eq('id',id).eq('church_id',churchId).eq('assigned_to',userId).select('id').maybeSingle()
  if(error||!data){if(error)console.error('updatePersonalTask failed',{message:error.message});redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'No pudimos actualizar esa tarea.':'We could not update that task.')}`))}
  revalidatePath('/calendar/my');redirect(back(lang,'&task_saved=1'))
}

export async function submitTimeOff(formData:FormData){
  const lang=langOf(formData),starts=text(formData,'starts_on'),ends=text(formData,'ends_on'),notes=text(formData,'notes')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(starts)||!/^\d{4}-\d{2}-\d{2}$/.test(ends)||ends<starts)redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'Revisa las fechas no disponibles.':'Check the unavailable dates.')}`))
  const {supabase,userId,churchId}=await memberContext(lang)
  const {error}=await supabase.from('member_time_off').insert({church_id:churchId,user_id:userId,starts_on:starts,ends_on:ends,notes:notes||null,status:'pending'})
  if(error){console.error('submitTimeOff failed',{message:error.message});redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'No pudimos guardar esas fechas.':'We could not save those dates.')}`))}
  revalidatePath('/calendar/my');redirect(back(lang,'&time_off=1'))
}

export async function cancelTimeOff(formData:FormData){
  const lang=langOf(formData),id=text(formData,'time_off_id')
  if(!id)redirect(back(lang))
  const {supabase,userId,churchId}=await memberContext(lang)
  const {error}=await supabase.from('member_time_off').delete().eq('id',id).eq('church_id',churchId).eq('user_id',userId).eq('status','pending')
  if(error){console.error('cancelTimeOff failed',{message:error.message});redirect(back(lang,`&error=${encodeURIComponent(lang==='es'?'No pudimos cancelar esas fechas.':'We could not cancel those dates.')}`))}
  revalidatePath('/calendar/my');redirect(back(lang,'&time_off=1'))
}
