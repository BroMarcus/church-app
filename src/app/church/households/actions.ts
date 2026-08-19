'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const roles=['adult','spouse','child','dependent','other'] as const

async function requireManager(churchId:string,lang:'en'|'es'){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(lang==='es'?'/login?lang=es':'/login')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership)redirect('/')
  let allowed=['pastor','church_admin'].includes(membership.role)
  if(!allowed){const {data}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_members'});allowed=Boolean(data)}
  if(!allowed)redirect('/')
  return {supabase,userId}
}

const go=(lang:'en'|'es',key?:string,value?:string)=>{
  const params=new URLSearchParams();if(lang==='es')params.set('lang','es');if(key&&value)params.set(key,value);const q=params.toString();return `/church/households${q?`?${q}`:''}`
}

export async function createHousehold(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),name=text(formData,'name')
  if(!churchId||!name)redirect(go(lang,'error',lang==='es'?'Escribe un nombre para el hogar.':'Enter a household name.'))
  const {supabase,userId}=await requireManager(churchId,lang)
  const {error}=await supabase.from('households').insert({church_id:churchId,name,notes:text(formData,'notes')||null,created_by:userId})
  if(error)redirect(go(lang,'error',error.message))
  revalidatePath('/church/households');redirect(go(lang,'created','1'))
}

export async function updateHousehold(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),householdId=text(formData,'household_id'),name=text(formData,'name')
  if(!churchId||!householdId||!name)redirect(go(lang,'error',lang==='es'?'Faltan datos del hogar.':'Household information is missing.'))
  const {supabase}=await requireManager(churchId,lang)
  const {error}=await supabase.from('households').update({name,notes:text(formData,'notes')||null,updated_at:new Date().toISOString()}).eq('id',householdId).eq('church_id',churchId)
  if(error)redirect(go(lang,'error',error.message))
  revalidatePath('/church/households');redirect(go(lang,'saved','1'))
}

export async function addHouseholdMember(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),householdId=text(formData,'household_id'),memberUserId=text(formData,'user_id'),role=text(formData,'relationship_role')
  if(!churchId||!householdId||!memberUserId||!roles.includes(role as any))redirect(go(lang,'error',lang==='es'?'Selecciona un miembro y una relación válidos.':'Choose a valid member and relationship.'))
  const {supabase}=await requireManager(churchId,lang)
  const {data:member}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',memberUserId).eq('status','active').maybeSingle()
  if(!member)redirect(go(lang,'error',lang==='es'?'Ese miembro no está activo en esta iglesia.':'That member is not active in this church.'))
  const {error}=await supabase.from('household_members').insert({household_id:householdId,church_id:churchId,user_id:memberUserId,relationship_role:role,primary_contact:text(formData,'primary_contact')==='on'})
  if(error){const message=error.code==='23505'?(lang==='es'?'Ese miembro ya pertenece a un hogar en esta iglesia.':'That member already belongs to a household in this church.'):error.message;redirect(go(lang,'error',message))}
  revalidatePath('/church/households');revalidatePath(`/church/members/${memberUserId}`);redirect(go(lang,'member_added','1'))
}

export async function updateHouseholdMember(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),householdId=text(formData,'household_id'),memberUserId=text(formData,'user_id'),role=text(formData,'relationship_role')
  if(!churchId||!householdId||!memberUserId||!roles.includes(role as any))redirect(go(lang,'error',lang==='es'?'Actualización de relación inválida.':'Invalid household relationship update.'))
  const {supabase}=await requireManager(churchId,lang)
  const {error}=await supabase.from('household_members').update({relationship_role:role,primary_contact:text(formData,'primary_contact')==='on'}).eq('household_id',householdId).eq('church_id',churchId).eq('user_id',memberUserId)
  if(error)redirect(go(lang,'error',error.message))
  revalidatePath('/church/households');revalidatePath(`/church/members/${memberUserId}`);redirect(go(lang,'member_saved','1'))
}

export async function removeHouseholdMember(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),householdId=text(formData,'household_id'),memberUserId=text(formData,'user_id')
  if(!churchId||!householdId||!memberUserId)redirect(go(lang))
  const {supabase}=await requireManager(churchId,lang)
  const {error}=await supabase.from('household_members').delete().eq('household_id',householdId).eq('church_id',churchId).eq('user_id',memberUserId)
  if(error)redirect(go(lang,'error',error.message))
  revalidatePath('/church/households');revalidatePath(`/church/members/${memberUserId}`);redirect(go(lang,'member_removed','1'))
}

export async function deleteHousehold(formData:FormData){
  const lang=langOf(formData),churchId=text(formData,'church_id'),householdId=text(formData,'household_id')
  if(!churchId||!householdId)redirect(go(lang))
  const {supabase}=await requireManager(churchId,lang)
  const {error}=await supabase.from('households').delete().eq('id',householdId).eq('church_id',churchId)
  if(error)redirect(go(lang,'error',error.message))
  revalidatePath('/church/households');redirect(go(lang,'deleted','1'))
}
