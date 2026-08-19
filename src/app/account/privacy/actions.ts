'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function savePrivacySettings(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en',url=(extra='')=>`/account/privacy?lang=${lang}${extra}`
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const messaging=text(formData,'messaging_preference')
  if(!['church','leaders_only','none'].includes(messaging))redirect(url('&error='+encodeURIComponent(lang==='es'?'Preferencia de mensajes inválida.':'Invalid messaging preference.')))
  const {error}=await supabase.from('profiles').update({directory_visible:formData.get('directory_visible')==='on',messaging_preference:messaging,show_contact_email:formData.get('show_contact_email')==='on',show_verified_credentials:formData.get('show_verified_credentials')==='on',show_learning_trophies:formData.get('show_learning_trophies')==='on'}).eq('id',userId)
  if(error)redirect(url('&error='+encodeURIComponent(error.message)))
  revalidatePath('/account/privacy');revalidatePath('/directory');revalidatePath('/profile');revalidatePath('/messages');redirect(url('&saved=1'))
}