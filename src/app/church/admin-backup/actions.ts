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
  const fail=(en:string,es:string)=>redirect(withLang(`${back}?error=${encodeURIComponent(lang==='es'?es:en)}`,lang))
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(withLang('/login',lang))
  if(!targetMembershipId)fail('Choose a person first.','Selecciona una persona primero.')

  const {data:target}=await supabase.from('church_memberships').select('id,church_id,user_id,role,status,relationship_status').eq('id',targetMembershipId).single()
  if(!target?.church_id){
    fail('That membership could not be found.','No se encontró esa membresía.')
    return
  }

  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',target.church_id).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect(lang==='es'?'/?lang=es':'/')
  if(target.user_id===userId)fail('Choose someone else as the backup admin.','Elige a otra persona como administrador de respaldo.')
  if(target.status!=='active')fail('The person must have an active account first.','La persona debe tener una cuenta activa primero.')
  if(target.relationship_status!=='member')fail('Only a verified church member can become a backup admin.','Solo un miembro verificado de la iglesia puede ser administrador de respaldo.')
  if(['pastor','church_admin'].includes(target.role))redirect(withLang(`${back}?saved=1`,lang))

  const {error}=await supabase.from('church_memberships').update({role:'church_admin'}).eq('id',targetMembershipId).eq('church_id',target.church_id).eq('status','active').eq('relationship_status','member')
  if(error){
    console.error('backup admin promotion failed',{membershipId:targetMembershipId,churchId:target.church_id,code:error.code})
    fail('We could not add the backup admin. Try again.','No pudimos agregar al administrador de respaldo. Inténtalo de nuevo.')
  }

  revalidatePath('/church/admin-backup')
  revalidatePath('/church/launch')
  revalidatePath('/church/readiness')
  revalidatePath('/church')
  redirect(withLang(`${back}?saved=1`,lang))
}
