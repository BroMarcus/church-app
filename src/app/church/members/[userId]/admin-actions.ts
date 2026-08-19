'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const roles=['member','group_leader','ministry_leader','minister','pastor','church_admin'] as const
const membershipStatuses=['active','inactive','visitor','pending'] as const
const ministryStatuses=['submitted','qualified','interview','accepted','declined','withdrawn'] as const
const businessStatuses=['active','pending','inactive'] as const

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const lang=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const clean=(v:string,max=180)=>v.slice(0,max)
const emptyNull=(v:string)=>v||null
const num=(v:string,min:number,max:number)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):null}
const back=(userId:string,l:'en'|'es',key:string,value='1')=>`/church/members/${userId}?lang=${l}&${key}=${encodeURIComponent(value)}`

async function requireAdmin(churchId:string,targetUserId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const actorId=claims?.claims?.sub
  if(!actorId)redirect('/login')
  const [{data:actor},{data:target}]=await Promise.all([
    supabase.from('church_memberships').select('id,role,status').eq('church_id',churchId).eq('user_id',actorId).eq('status','active').single(),
    supabase.from('church_memberships').select('id,role,status').eq('church_id',churchId).eq('user_id',targetUserId).single()
  ])
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')
  if(!target)redirect('/church?error='+encodeURIComponent('Member not found in this church.'))
  return {supabase,actorId,actor,target}
}

export async function updateMemberAccessFromRecord(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),membershipId=text(formData,'membership_id'),l=lang(formData)
  const role=text(formData,'role'),status=text(formData,'status')
  if(!churchId||!targetUserId||!membershipId||!roles.includes(role as any)||!membershipStatuses.includes(status as any))redirect(back(targetUserId,l,'error',l==='es'?'Cambio de acceso inválido.':'Invalid access change.'))
  const {supabase,actorId,actor,target}=await requireAdmin(churchId,targetUserId)
  if(target.id!==membershipId)redirect(back(targetUserId,l,'error',l==='es'?'Registro de membresía inválido.':'Invalid membership record.'))
  if(actor.role!=='pastor'&&(target.role==='pastor'||role==='pastor'))redirect(back(targetUserId,l,'error',l==='es'?'Solo un pastor puede asignar o cambiar el rol de pastor.':'Only a pastor can assign or change the Pastor role.'))
  const removingAuthority=status!=='active'||!['pastor','church_admin'].includes(role)
  if(targetUserId===actorId&&removingAuthority)redirect(back(targetUserId,l,'error',l==='es'?'No puedes quitar tu propio acceso administrativo.':'You cannot remove your own admin access.'))
  if(['pastor','church_admin'].includes(target.role)&&target.status==='active'&&removingAuthority){
    const {count}=await supabase.from('church_memberships').select('id',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin']).neq('id',membershipId)
    if((count??0)<1)redirect(back(targetUserId,l,'error',l==='es'?'La iglesia debe conservar al menos un pastor o administrador activo.':'The church must keep at least one active Pastor or Church Admin.'))
  }
  const {error}=await supabase.from('church_memberships').update({role,status}).eq('id',membershipId)
  if(error)redirect(back(targetUserId,l,'error',error.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/church');revalidatePath('/');
  redirect(back(targetUserId,l,'access'))
}

export async function updateMemberProfileFromRecord(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),l=lang(formData)
  if(!churchId||!targetUserId)redirect('/church')
  const {supabase}=await requireAdmin(churchId,targetUserId)
  const firstName=clean(text(formData,'first_name'),80),lastName=clean(text(formData,'last_name'),80)
  const displayName=clean(text(formData,'display_name')||[firstName,lastName].filter(Boolean).join(' '),120)
  const bio=clean(text(formData,'bio'),500)
  const {error:profileError}=await supabase.from('profiles').update({first_name:firstName||null,last_name:lastName||null,display_name:displayName||null,bio:bio||null}).eq('id',targetUserId)
  if(profileError)redirect(back(targetUserId,l,'error',profileError.message))
  const privatePayload={
    user_id:targetUserId,
    email:emptyNull(clean(text(formData,'email'),180).toLowerCase()),
    phone:emptyNull(clean(text(formData,'phone'),40)),
    address_line1:emptyNull(clean(text(formData,'address_line1'),180)),
    address_line2:emptyNull(clean(text(formData,'address_line2'),180)),
    city:emptyNull(clean(text(formData,'city'),100)),
    state:emptyNull(clean(text(formData,'state'),60)),
    postal_code:emptyNull(clean(text(formData,'postal_code'),20)),
    birthday:emptyNull(text(formData,'birthday')),
    marriage_anniversary:emptyNull(text(formData,'marriage_anniversary'))
  }
  const {error:detailsError}=await supabase.from('member_private_details').upsert(privatePayload,{onConflict:'user_id'})
  if(detailsError)redirect(back(targetUserId,l,'error',detailsError.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/church');revalidatePath('/directory');
  redirect(back(targetUserId,l,'profile'))
}

export async function overrideCourseEnrollment(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),courseId=text(formData,'course_id'),l=lang(formData)
  if(!churchId||!targetUserId||!courseId)redirect(back(targetUserId,l,'error',l==='es'?'Falta el curso o miembro.':'Missing course or member.'))
  const {supabase,actorId}=await requireAdmin(churchId,targetUserId)
  const {data:course}=await supabase.from('courses').select('id,title,church_id').eq('id',courseId).eq('church_id',churchId).single()
  if(!course)redirect(back(targetUserId,l,'error',l==='es'?'El curso no pertenece a esta iglesia.':'Course does not belong to this church.'))
  const reason=clean(text(formData,'override_reason'),500)
  if(reason.length<3)redirect(back(targetUserId,l,'error',l==='es'?'Escribe una razón para la corrección manual.':'Enter a reason for the manual correction.'))
  const earned=text(formData,'credential_earned')==='yes'
  const progress=earned?100:(num(text(formData,'progress'),0,100)??0)
  const scoreRaw=text(formData,'final_score'),finalScore=scoreRaw===''?null:num(scoreRaw,0,100)
  const completedDate=text(formData,'completed_at')
  const now=new Date().toISOString()
  const completedAt=earned?(completedDate?`${completedDate}T12:00:00.000Z`:now):null
  const payload={course_id:courseId,user_id:targetUserId,progress,final_score:finalScore,credential_earned:earned,completed_at:completedAt,updated_at:now,admin_override_by:actorId,admin_override_at:now,admin_override_reason:reason}
  const {error}=await supabase.from('course_enrollments').upsert(payload,{onConflict:'course_id,user_id'})
  if(error)redirect(back(targetUserId,l,'error',error.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/learning');revalidatePath('/journey');
  redirect(back(targetUserId,l,'course'))
}

export async function updateMemberMinistryApplication(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),applicationId=text(formData,'application_id'),l=lang(formData),status=text(formData,'status')
  if(!churchId||!targetUserId||!applicationId||!ministryStatuses.includes(status as any))redirect(back(targetUserId,l,'error',l==='es'?'Cambio de ministerio inválido.':'Invalid ministry change.'))
  const {supabase,actorId}=await requireAdmin(churchId,targetUserId)
  const {data:application}=await supabase.from('ministry_applications').select('id,user_id,ministry_id,ministries!inner(church_id)').eq('id',applicationId).eq('user_id',targetUserId).single()
  const ministry:any=Array.isArray((application as any)?.ministries)?(application as any).ministries[0]:(application as any)?.ministries
  if(!application||ministry?.church_id!==churchId)redirect(back(targetUserId,l,'error',l==='es'?'Solicitud de ministerio no encontrada.':'Ministry application not found.'))
  const note=clean(text(formData,'review_note'),500)
  const {error}=await supabase.from('ministry_applications').update({status,review_note:note||null,reviewed_by:actorId,reviewed_at:new Date().toISOString()}).eq('id',applicationId)
  if(error)redirect(back(targetUserId,l,'error',error.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/serve');revalidatePath('/teams');
  redirect(back(targetUserId,l,'service'))
}

export async function updateMemberBusinessFromRecord(formData:FormData){
  const churchId=text(formData,'church_id'),targetUserId=text(formData,'user_id'),businessId=text(formData,'business_id'),l=lang(formData),status=text(formData,'status')
  if(!churchId||!targetUserId||!businessId||!businessStatuses.includes(status as any))redirect(back(targetUserId,l,'error',l==='es'?'Cambio de negocio inválido.':'Invalid business change.'))
  const {supabase}=await requireAdmin(churchId,targetUserId)
  const {data:listing}=await supabase.from('business_listings').select('id,church_id,owner_user_id,is_member_business').eq('id',businessId).single()
  if(!listing||listing.church_id!==churchId||listing.owner_user_id!==targetUserId)redirect(back(targetUserId,l,'error',l==='es'?'Negocio no encontrado para este miembro.':'Business not found for this member.'))
  const verified=text(formData,'is_verified')==='yes'
  const {error}=await supabase.from('business_listings').update({status,is_verified:verified,is_sponsored:false,updated_at:new Date().toISOString()}).eq('id',businessId)
  if(error)redirect(back(targetUserId,l,'error',error.message))
  revalidatePath(`/church/members/${targetUserId}`);revalidatePath('/business');
  redirect(back(targetUserId,l,'business'))
}
