'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const allowedRoles=['member','group_leader','ministry_leader','minister','pastor','church_admin'] as const
const allowedStatuses=['active','inactive','visitor','pending'] as const

export async function updateMembership(formData:FormData){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const membershipId=String(formData.get('membership_id')??'')
  const role=String(formData.get('role')??'')
  const status=String(formData.get('status')??'')

  if(!membershipId||!allowedRoles.includes(role as (typeof allowedRoles)[number])||!allowedStatuses.includes(status as (typeof allowedStatuses)[number])){
    redirect('/church?error='+encodeURIComponent('Invalid member update.'))
  }

  const {data:target}=await supabase.from('church_memberships').select('id,church_id,user_id,role,status').eq('id',membershipId).single()
  if(!target)redirect('/church?error='+encodeURIComponent('Member not found.'))

  const {data:actor}=await supabase.from('church_memberships').select('role,status').eq('church_id',target.church_id).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['pastor','church_admin'].includes(actor.role))redirect('/')

  if(target.user_id===userId&&(status!=='active'||!['pastor','church_admin'].includes(role))){
    redirect('/church?error='+encodeURIComponent('You cannot remove your own admin access.'))
  }

  const {error}=await supabase.from('church_memberships').update({role,status}).eq('id',membershipId)
  if(error)redirect('/church?error='+encodeURIComponent(error.message))

  revalidatePath('/church')
  revalidatePath('/')
  redirect('/church?saved=1')
}
