'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function togglePraying(formData:FormData){
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const url=(params:Record<string,string>={})=>`/prayer?${new URLSearchParams({lang,...params}).toString()}`
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(membershipError)console.error('prayer reaction membership lookup failed',{message:membershipError.message})
  if(!membership?.church_id)redirect('/')
  const postId=String(formData.get('post_id')??'').trim()
  if(!postId||postId.length>100)redirect(url({error_code:'prayer_failed'}))
  const {data:post,error:postError}=await supabase.from('community_posts').select('id,church_id,post_type').eq('id',postId).eq('church_id',membership.church_id).eq('post_type','prayer_request').maybeSingle()
  if(postError)console.error('prayer reaction post lookup failed',{message:postError.message})
  if(!post)redirect(url({error_code:'prayer_failed'}))
  const {data:existing,error:existingError}=await supabase.from('post_reactions').select('reaction_type').eq('post_id',postId).eq('user_id',userId).maybeSingle()
  if(existingError){console.error('prayer reaction lookup failed',{message:existingError.message});redirect(url({error_code:'prayer_failed'}))}
  if(existing?.reaction_type==='praying'){
    const {error}=await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',userId)
    if(error){console.error('remove prayer reaction failed',{message:error.message});redirect(url({error_code:'prayer_failed'}))}
  }else{
    const {error}=await supabase.from('post_reactions').upsert({post_id:postId,user_id:userId,reaction_type:'praying'},{onConflict:'post_id,user_id'})
    if(error){console.error('save prayer reaction failed',{message:error.message});redirect(url({error_code:'prayer_failed'}))}
  }
  revalidatePath('/prayer');revalidatePath('/')
}
