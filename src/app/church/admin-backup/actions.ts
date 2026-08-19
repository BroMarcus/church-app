'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const value=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path

export async function promoteBackupAdmin(formData:FormData){
  const targetMembershipId=value(formData,'membership_id')
  const lang=value(formData,'lang')==='es'?'es':'en'
  const back='/church/admin-backup'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(withLang('/login',lang))
  if(!targetMembershipId)redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'Selecciona una persona primero.':'Choose a person first.')}`,lang))

  const {data:target}=await supabase.from('church_memberships').select('id,church_id,user_id,role,status').eq('id',targetMembershipId).single()
  if(!target?.church_id)redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'No se encontró esa membresía.':'That membership could not be found.')}`,lang))

  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',target.church_id).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  if(target.user_id===userId)redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'Elige a otra persona como administrador de respaldo.':'Choose someone else as the backup admin.')}`,lang))
  if(target.status!=='active')redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?'La persona debe tener una cuenta activa primero.':'The person must have an active account first.')}`,lang))
  if(['pastor','church_admin'].includes(target.role))redirect(withLang(`${back}?saved=1`,lang))

  const {error}=await supabase.from('church_memberships').update({role:'church_admin'}).eq('id',targetMembershipId).eq('church_id',target.church_id)
  if(error)redirect(withLang(`${back}?error=${encodeURIComponent(error.message)}`,lang))

  revalidatePath('/church/admin-backup')
  revalidatePath('/church/launch')
  revalidatePath('/church/readiness')
  revalidatePath('/church')
  redirect(withLang(`${back}?saved=1`,lang))
}
