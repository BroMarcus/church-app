'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()

export async function createOwnFriendshipGroup(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:allowed}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'lead_own_group'})
  if(!allowed)redirect('/groups?error='+encodeURIComponent('Friendship Group Leader authorization is required to create your own group.'))

  const name=text(formData,'name'),meetingDay=text(formData,'meeting_day')||null,meetingTime=text(formData,'meeting_time')||null,meetingFrequency=text(formData,'meeting_frequency')||'weekly'
  const {data:groupId,error}=await supabase.rpc('create_own_friendship_group',{
    p_church_id:membership.church_id,
    p_name:name,
    p_meeting_day:meetingDay,
    p_meeting_time:meetingTime,
    p_meeting_frequency:meetingFrequency,
    p_description:text(formData,'description')||null,
    p_meeting_address:text(formData,'meeting_address')||null
  })
  if(error||!groupId){
    console.error('createOwnFriendshipGroup failed',{code:error?.code,message:error?.message})
    const message=error?.message?.includes('Already connected')?'You are already connected to an active Friendship Group.':error?.message?.includes('permission')?'Friendship Group Leader authorization is required.':'We could not create your Friendship Group. Check the details and try again.'
    redirect('/groups?error='+encodeURIComponent(message))
  }

  revalidatePath('/groups')
  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/portal`)
  redirect(`/groups/${groupId}/portal`)
}
