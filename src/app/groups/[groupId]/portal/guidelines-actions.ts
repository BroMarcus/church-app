'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const language=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const portalUrl=(groupId:string,lang:string,extra:string)=>`/groups/${groupId}/portal?tab=overview&lang=${lang}&${extra}`

export async function saveGroupGuidelines(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const groupId=text(formData,'group_id'),body=text(formData,'body'),lang=language(formData)
  if(!uuid.test(groupId))redirect('/groups')
  if(body.length>5000)redirect(portalUrl(groupId,lang,'error_code=guidelines_too_long'))

  const {data:group}=await supabase.from('groups').select('id,church_id,leader_id,active').eq('id',groupId).maybeSingle()
  if(!group?.active)redirect('/groups')
  const [{data:churchMembership},{data:groupMembership}]=await Promise.all([
    supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  ])
  const canManage=churchMembership?.status==='active'&&(
    ['pastor','church_admin'].includes(churchMembership.role)||group.leader_id===userId||groupMembership?.role==='leader'
  )
  if(!canManage)redirect(portalUrl(groupId,lang,'error_code=guidelines_access'))

  const {error}=await supabase.from('group_guidelines').upsert({group_id:groupId,body,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'})
  if(error){
    console.error('saveGroupGuidelines failed',{groupId,code:error.code})
    redirect(portalUrl(groupId,lang,'error_code=guidelines_save'))
  }

  revalidatePath(`/groups/${groupId}/portal`)
  redirect(portalUrl(groupId,lang,'guidelines_saved=1'))
}
