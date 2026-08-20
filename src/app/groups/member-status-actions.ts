'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function updateGroupMemberStatus(formData:FormData){
  const supabase=await createClient(),{data}=await supabase.auth.getClaims(),actor=data?.claims?.sub
  if(!actor)redirect('/login')
  const groupId=text(formData,'group_id'),userId=text(formData,'user_id'),groupRole=text(formData,'group_role')||'member'
  if(!groupId||!userId||!['member','assistant','leader'].includes(groupRole))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a valid member and group role.'))
  const {error}=await supabase.rpc('update_group_member_status',{
    p_group_id:groupId,
    p_user_id:userId,
    p_group_role:groupRole,
    p_member_title:text(formData,'member_title')||null,
    p_mark_baptized:formData.get('mark_baptized')==='on',
    p_mark_holy_ghost:formData.get('mark_holy_ghost')==='on'
  })
  if(error){console.error('updateGroupMemberStatus failed',{message:error.message});redirect(`/groups/${groupId}?error=`+encodeURIComponent('We could not update that member. Only authorized group or church leadership can make this change.'))}
  revalidatePath(`/groups/${groupId}`);revalidatePath(`/directory/${userId}`);revalidatePath(`/journey`)
  redirect(`/groups/${groupId}?member_status=1`)
}
