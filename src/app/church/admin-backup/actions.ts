'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const value=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
const message=(lang:'en'|'es',en:string,es:string)=>lang==='es'?es:en

export async function promoteBackupAdmin(formData:FormData){
  const targetMembershipId=value(formData,'membership_id')
  const lang:valueofLang=value(formData,'lang')==='es'?'es':'en'
  const confirmed=value(formData,'confirm_admin')==='yes'
  const back='/church/admin-backup'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(withLang('/login',lang))
  if(!targetMembershipId)redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'Choose a person first.','Selecciona una persona primero.'))}`,lang))
  if(!confirmed)redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'Confirm that you understand this person will receive church-admin access.','Confirma que entiendes que esta persona recibirá acceso de administrador de la iglesia.'))}`,lang))

  const {data:target,error:targetError}=await supabase.from('church_memberships').select('id,church_id,user_id,role,status').eq('id',targetMembershipId).single()
  if(targetError||!target?.church_id){
    console.error('Backup admin lookup failed',{targetMembershipId,error:targetError?.message})
    redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'We could not open that member record. Try again.','No pudimos abrir ese registro de miembro. Inténtalo de nuevo.'))}`,lang))
  }

  const {data:actor,error:actorError}=await supabase.from('church_memberships').select('role,status').eq('church_id',target.church_id).eq('user_id',userId).eq('status','active').single()
  if(actorError)console.error('Backup admin actor lookup failed',{churchId:target.church_id,userId,error:actorError.message})
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  if(target.user_id===userId)redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'Choose someone else as the backup admin.','Elige a otra persona como administrador de respaldo.'))}`,lang))
  if(target.status!=='active')redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'The person must have an active account first.','La persona debe tener una cuenta activa primero.'))}`,lang))
  if(['pastor','church_admin'].includes(target.role))redirect(withLang(`${back}?saved=1`,lang))

  const {error}=await supabase.from('church_memberships').update({role:'church_admin'}).eq('id',targetMembershipId).eq('church_id',target.church_id).eq('status','active')
  if(error){
    console.error('Backup admin promotion failed',{churchId:target.church_id,targetMembershipId,error:error.message})
    redirect(withLang(`${back}?error=${encodeURIComponent(message(lang,'We could not add this backup admin. Nothing was changed. Try again or choose another active member.','No pudimos agregar este administrador de respaldo. No se cambió nada. Inténtalo de nuevo o elige a otro miembro activo.'))}`,lang))
  }

  revalidatePath('/church/admin-backup')
  revalidatePath('/church/launch')
  revalidatePath('/church/readiness')
  revalidatePath('/church')
  redirect(withLang(`${back}?saved=1`,lang))
}

type valueofLang='en'|'es'
