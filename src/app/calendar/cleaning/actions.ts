'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const url=(lang:string,extra='')=>`/calendar/cleaning?lang=${lang}${extra}`
const safe=(lang:string,en:string,es:string)=>lang==='es'?es:en

async function context(lang:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function claimCleaningTime(formData:FormData){
  const lang=langOf(formData),{supabase,churchId}=await context(lang)
  const cleaningId=text(formData,'cleaning_assignment_id'),local=text(formData,'claimed_for_at')
  if(!cleaningId||!local)redirect(url(lang,'&error='+encodeURIComponent(safe(lang,'Choose a cleaning date and time.','Escoge una fecha y hora de limpieza.'))))
  const {data:utc,error:timeError}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:local})
  if(timeError||!utc)redirect(url(lang,'&error='+encodeURIComponent(safe(lang,'Enter a valid cleaning date and time.','Ingresa una fecha y hora de limpieza válida.'))))
  const {error}=await supabase.rpc('claim_cleaning_assignment',{p_cleaning_assignment_id:cleaningId,p_claimed_for_at:utc})
  if(error){
    console.error('claimCleaningTime failed',{cleaningId,code:error.code,message:error.message})
    redirect(url(lang,'&error='+encodeURIComponent(safe(lang,'We could not claim that cleaning time.','No pudimos reservar esa hora de limpieza.'))))
  }
  revalidatePath('/calendar/cleaning');revalidatePath('/calendar/manage');redirect(url(lang,'&claimed=1'))
}

export async function setCleaningChecklistItem(formData:FormData){
  const lang=langOf(formData),{supabase}=await context(lang)
  const itemId=text(formData,'checklist_item_id'),completed=text(formData,'completed')==='true'
  if(!itemId)redirect(url(lang))
  const {error}=await supabase.rpc('set_cleaning_checklist_item',{p_item_id:itemId,p_completed:completed})
  if(error){
    console.error('setCleaningChecklistItem failed',{itemId,code:error.code,message:error.message})
    redirect(url(lang,'&error='+encodeURIComponent(safe(lang,'We could not update that checklist item.','No pudimos actualizar ese elemento de la lista.'))))
  }
  revalidatePath('/calendar/cleaning');redirect(url(lang))
}

export async function recordCleaningParticipation(formData:FormData){
  const lang=langOf(formData),{supabase}=await context(lang)
  const cleaningId=text(formData,'cleaning_assignment_id')
  if(!cleaningId)redirect(url(lang))
  const {error}=await supabase.rpc('record_cleaning_participation',{p_cleaning_assignment_id:cleaningId})
  if(error){
    console.error('recordCleaningParticipation failed',{cleaningId,code:error.code,message:error.message})
    redirect(url(lang,'&error='+encodeURIComponent(safe(lang,'We could not record your participation.','No pudimos registrar tu participación.'))))
  }
  revalidatePath('/calendar/cleaning');redirect(url(lang,'&participated=1'))
}

export async function completeCleaning(formData:FormData){
  const lang=langOf(formData),{supabase}=await context(lang)
  const cleaningId=text(formData,'cleaning_assignment_id')
  if(!cleaningId)redirect(url(lang))
  const {error}=await supabase.rpc('complete_cleaning_assignment',{p_cleaning_assignment_id:cleaningId,p_notes:text(formData,'completion_notes')||null})
  if(error){
    console.error('completeCleaning failed',{cleaningId,code:error.code,message:error.message})
    redirect(url(lang,'&error='+encodeURIComponent(error.message.includes('required cleaning checklist')?safe(lang,'Finish every required checklist item before completing cleaning.','Completa todos los elementos requeridos antes de terminar la limpieza.'):safe(lang,'We could not complete that cleaning assignment.','No pudimos completar esa asignación de limpieza.'))))
  }
  revalidatePath('/calendar/cleaning');revalidatePath('/calendar/manage');redirect(url(lang,'&completed=1'))
}
