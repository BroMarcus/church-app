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

export async function createPrayerOrTestimony(formData:FormData){
  const {supabase,userId,churchId}=await auth()
  const postType=text(formData,'post_type'),body=text(formData,'body')
  if(!['prayer_request','testimony'].includes(postType))redirect('/prayer?error='+encodeURIComponent('Choose Prayer Request or Testimony.'))
  if(body.length<3||body.length>5000)redirect('/prayer?error='+encodeURIComponent('Please write between 3 and 5,000 characters.'))
  const {error}=await supabase.from('community_posts').insert({church_id:churchId,author_id:userId,body,post_type:postType,visibility:'church'})
  if(error)redirect('/prayer?error='+encodeURIComponent(error.message))
  revalidatePath('/prayer');revalidatePath('/');redirect(`/prayer?created=${postType}`)
}

export async function setPrayerAnswered(formData:FormData){
  const {supabase,userId}=await auth()
  const postId=text(formData,'post_id'),answered=text(formData,'answered')==='1'
  if(!postId)redirect('/prayer')
  const {error}=await supabase.from('community_posts').update({answered_at:answered?new Date().toISOString():null}).eq('id',postId).eq('author_id',userId).eq('post_type','prayer_request')
  if(error)redirect('/prayer?error='+encodeURIComponent(error.message))
  revalidatePath('/prayer');revalidatePath('/');redirect(`/prayer?answered=${answered?'1':'0'}`)
}
