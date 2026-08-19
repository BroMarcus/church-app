'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function togglePraying(formData:FormData){
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const url=(extra='')=>`/prayer?lang=${lang}${extra}`
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const postId=String(formData.get('post_id')??'').trim()
  if(!postId)redirect(url())
  const {data:post}=await supabase.from('community_posts').select('id,church_id,post_type').eq('id',postId).eq('post_type','prayer_request').maybeSingle()
  if(!post)redirect(url('&error='+encodeURIComponent(lang==='es'?'No encontramos esa petición de oración.':'Prayer request not found.')))
  const {data:existing}=await supabase.from('post_reactions').select('reaction_type').eq('post_id',postId).eq('user_id',userId).maybeSingle()
  if(existing?.reaction_type==='praying'){
    const {error}=await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',userId)
    if(error)redirect(url('&error='+encodeURIComponent(error.message)))
  }else{
    const {error}=await supabase.from('post_reactions').upsert({post_id:postId,user_id:userId,reaction_type:'praying'},{onConflict:'post_id,user_id'})
    if(error)redirect(url('&error='+encodeURIComponent(error.message)))
  }
  revalidatePath('/prayer');revalidatePath('/')
}