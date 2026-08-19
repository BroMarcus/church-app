'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function completeOnboarding(formData:FormData){
  const supabase=await createClient()
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect(`/login?lang=${lang}`)
  const {error}=await supabase.auth.updateUser({data:{...user.user_metadata,onboarding_completed:true,preferred_language:lang}})
  if(error){
    const message=lang==='es'
      ? 'No pudimos guardar ese paso. Inténtalo otra vez.'
      : 'We could not save that step. Please try again.'
    redirect(`/start?lang=${lang}&error=${encodeURIComponent(message)}`)
  }
  redirect(`/${lang==='es'?'?lang=es':''}`)
}
