'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function auth(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function startConversation(formData:FormData){
  const {supabase,userId,churchId}=await auth();const target=text(formData,'target_user_id')
  if(!target||target===userId)redirect('/messages?error='+encodeURIComponent('Choose another church member.'))
  const {data:targetMembership}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',target).eq('status','active').maybeSingle()
  if(!targetMembership)redirect('/messages?error='+encodeURIComponent('That member is not available for messaging.'))
  const [userA,userB]=[userId,target].sort()
  const {data:existing}=await supabase.from('direct_conversations').select('id').eq('church_id',churchId).eq('user_a',userA).eq('user_b',userB).maybeSingle()
  if(existing?.id)redirect(`/messages/${existing.id}`)
  const {data:created,error}=await supabase.from('direct_conversations').insert({church_id:churchId,user_a:userA,user_b:userB}).select('id').single()
  if(error){
    if(error.code==='23505'){const {data:race}=await supabase.from('direct_conversations').select('id').eq('church_id',churchId).eq('user_a',userA).eq('user_b',userB).maybeSingle();if(race?.id)redirect(`/messages/${race.id}`)}
    redirect('/messages?error='+encodeURIComponent(error.message))
  }
  redirect(`/messages/${created.id}`)
}

export async function sendDirectMessage(formData:FormData){
  const {supabase,userId}=await auth();const conversationId=text(formData,'conversation_id'),body=text(formData,'body')
  if(!conversationId||!body)redirect(`/messages/${conversationId}?error=`+encodeURIComponent('Write a message first.'))
  if(body.length>5000)redirect(`/messages/${conversationId}?error=`+encodeURIComponent('Messages can be up to 5,000 characters.'))
  const {error}=await supabase.from('direct_messages').insert({conversation_id:conversationId,sender_id:userId,body})
  if(error)redirect(`/messages/${conversationId}?error=`+encodeURIComponent(error.message))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);revalidatePath('/notifications');redirect(`/messages/${conversationId}?sent=1`)
}

export async function blockMember(formData:FormData){
  const {supabase,userId,churchId}=await auth();const target=text(formData,'target_user_id'),conversationId=text(formData,'conversation_id')
  if(!target||target===userId)redirect('/messages?error='+encodeURIComponent('Invalid block request.'))
  const {error}=await supabase.from('member_blocks').insert({church_id:churchId,blocker_id:userId,blocked_id:target})
  if(error&&error.code!=='23505')redirect(`/messages/${conversationId}?error=`+encodeURIComponent(error.message))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);redirect(`/messages/${conversationId}?blocked=1`)
}

export async function unblockMember(formData:FormData){
  const {supabase,userId,churchId}=await auth();const target=text(formData,'target_user_id'),conversationId=text(formData,'conversation_id')
  const {error}=await supabase.from('member_blocks').delete().eq('church_id',churchId).eq('blocker_id',userId).eq('blocked_id',target)
  if(error)redirect(`/messages/${conversationId}?error=`+encodeURIComponent(error.message))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);redirect(`/messages/${conversationId}?unblocked=1`)
}

export async function reportDirectMessage(formData:FormData){
  const {supabase,userId,churchId}=await auth();const messageId=text(formData,'message_id'),conversationId=text(formData,'conversation_id'),reason=text(formData,'reason')
  if(!messageId||reason.length<3)redirect(`/messages/${conversationId}?error=`+encodeURIComponent('Please briefly explain why you are reporting this message.'))
  const {error}=await supabase.from('message_reports').insert({church_id:churchId,reporter_id:userId,message_id:messageId,reason})
  if(error){const msg=error.code==='23505'?'You already reported this message.':error.message;redirect(`/messages/${conversationId}?error=`+encodeURIComponent(msg))}
  revalidatePath(`/messages/${conversationId}`);redirect(`/messages/${conversationId}?reported=1`)
}
