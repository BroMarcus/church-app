'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function saveGroupGuidelines(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const groupId=text(formData,'group_id'),body=text(formData,'body')
  if(!uuid.test(groupId))redirect('/groups')
  if(body.length>5000)redirect(`/groups/${groupId}/portal?tab=overview&error=`+encodeURIComponent('Group guidelines must be 5,000 characters or fewer.'))

  const {data:group}=await supabase.from('groups').select('id,church_id,leader_id,active').eq('id',groupId).maybeSingle()
  if(!group?.active)redirect('/groups')
  const [{data:churchMembership},{data:groupMembership}]=await Promise.all([
    supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  ])
  const canManage=churchMembership?.status==='active'&&(
    ['pastor','church_admin'].includes(churchMembership.role)||group.leader_id===userId||groupMembership?.role==='leader'
  )
  if(!canManage)redirect(`/groups/${groupId}/portal?tab=overview&error=`+encodeURIComponent('Group leader access is required to edit these guidelines.'))

  const {error}=await supabase.from('group_guidelines').upsert({group_id:groupId,body,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'})
  if(error){
    console.error('saveGroupGuidelines failed',{groupId,code:error.code,message:error.message})
    redirect(`/groups/${groupId}/portal?tab=overview&error=`+encodeURIComponent('We could not save the group guidelines. Please try again.'))
  }

  revalidatePath(`/groups/${groupId}/portal`)
  redirect(`/groups/${groupId}/portal?tab=overview&guidelines_saved=1`)
}
