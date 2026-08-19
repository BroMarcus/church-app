'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const prayerUrl=(lang:string,extra='')=>`/prayer?lang=${lang}${extra}`

async function auth(lang='en'){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createPrayerOrTestimony(formData:FormData){
  const lang=langOf(formData)
  const {supabase,userId,churchId}=await auth(lang)
  const postType=text(formData,'post_type'),body=text(formData,'body')
  if(!['prayer_request','testimony'].includes(postType))redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Elige Petición de Oración o Testimonio.':'Choose Prayer Request or Testimony.')))
  if(body.length<3||body.length>5000)redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Escribe entre 3 y 5,000 caracteres.':'Please write between 3 and 5,000 characters.')))
  const {error}=await supabase.from('community_posts').insert({church_id:churchId,author_id:userId,body,post_type:postType,visibility:'church'})
  if(error)redirect(prayerUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/prayer');revalidatePath('/');redirect(prayerUrl(lang,`&created=${postType}`))
}

export async function setPrayerAnswered(formData:FormData){
  const lang=langOf(formData)
  const {supabase,userId}=await auth(lang)
  const postId=text(formData,'post_id'),answered=text(formData,'answered')==='1'
  if(!postId)redirect(prayerUrl(lang))
  const {error}=await supabase.from('community_posts').update({answered_at:answered?new Date().toISOString():null}).eq('id',postId).eq('author_id',userId).eq('post_type','prayer_request')
  if(error)redirect(prayerUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/prayer');revalidatePath('/');redirect(prayerUrl(lang,`&answered=${answered?'1':'0'}`))
}