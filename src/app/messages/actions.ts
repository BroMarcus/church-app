'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const inbox=(lang:string,extra='')=>`/messages?lang=${lang}${extra}`
const thread=(id:string,lang:string,extra='')=>`/messages/${id}?lang=${lang}${extra}`

async function auth(lang='en'){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function startConversation(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),target=text(formData,'target_user_id')
  if(!target||target===userId)redirect(inbox(lang,'&error='+encodeURIComponent(lang==='es'?'Elige otro miembro de la iglesia.':'Choose another church member.')))
  const {data:targetMembership}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',target).eq('status','active').maybeSingle()
  if(!targetMembership)redirect(inbox(lang,'&error='+encodeURIComponent(lang==='es'?'Ese miembro no está disponible para mensajes.':'That member is not available for messaging.')))
  const [userA,userB]=[userId,target].sort()
  const {data:existing}=await supabase.from('direct_conversations').select('id').eq('church_id',churchId).eq('user_a',userA).eq('user_b',userB).maybeSingle()
  if(existing?.id)redirect(thread(existing.id,lang))
  const {data:created,error}=await supabase.from('direct_conversations').insert({church_id:churchId,user_a:userA,user_b:userB}).select('id').single()
  if(error){
    if(error.code==='23505'){const {data:race}=await supabase.from('direct_conversations').select('id').eq('church_id',churchId).eq('user_a',userA).eq('user_b',userB).maybeSingle();if(race?.id)redirect(thread(race.id,lang))}
    redirect(inbox(lang,'&error='+encodeURIComponent(error.message)))
  }
  redirect(thread(created.id,lang))
}

export async function sendDirectMessage(formData:FormData){
  const lang=langOf(formData),{supabase,userId}=await auth(lang),conversationId=text(formData,'conversation_id'),body=text(formData,'body')
  if(!conversationId||!body)redirect(thread(conversationId,lang,'&error='+encodeURIComponent(lang==='es'?'Escribe un mensaje primero.':'Write a message first.')))
  if(body.length>5000)redirect(thread(conversationId,lang,'&error='+encodeURIComponent(lang==='es'?'Los mensajes pueden tener hasta 5,000 caracteres.':'Messages can be up to 5,000 characters.')))
  const {error}=await supabase.from('direct_messages').insert({conversation_id:conversationId,sender_id:userId,body})
  if(error)redirect(thread(conversationId,lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);revalidatePath('/notifications');redirect(thread(conversationId,lang,'&sent=1'))
}

export async function blockMember(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),target=text(formData,'target_user_id'),conversationId=text(formData,'conversation_id')
  if(!target||target===userId)redirect(inbox(lang,'&error='+encodeURIComponent(lang==='es'?'Solicitud de bloqueo inválida.':'Invalid block request.')))
  const {error}=await supabase.from('member_blocks').insert({church_id:churchId,blocker_id:userId,blocked_id:target})
  if(error&&error.code!=='23505')redirect(thread(conversationId,lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);redirect(thread(conversationId,lang,'&blocked=1'))
}

export async function unblockMember(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),target=text(formData,'target_user_id'),conversationId=text(formData,'conversation_id')
  const {error}=await supabase.from('member_blocks').delete().eq('church_id',churchId).eq('blocker_id',userId).eq('blocked_id',target)
  if(error)redirect(thread(conversationId,lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/messages');revalidatePath(`/messages/${conversationId}`);redirect(thread(conversationId,lang,'&unblocked=1'))
}

export async function reportDirectMessage(formData:FormData){
  const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),messageId=text(formData,'message_id'),conversationId=text(formData,'conversation_id'),reason=text(formData,'reason')
  if(!messageId||reason.length<3)redirect(thread(conversationId,lang,'&error='+encodeURIComponent(lang==='es'?'Explica brevemente por qué estás reportando este mensaje.':'Please briefly explain why you are reporting this message.')))
  const {error}=await supabase.from('message_reports').insert({church_id:churchId,reporter_id:userId,message_id:messageId,reason})
  if(error){const msg=error.code==='23505'?(lang==='es'?'Ya reportaste este mensaje.':'You already reported this message.'):error.message;redirect(thread(conversationId,lang,'&error='+encodeURIComponent(msg)))}
  revalidatePath(`/messages/${conversationId}`);redirect(thread(conversationId,lang,'&reported=1'))
}