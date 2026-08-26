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
    console.error('complete onboarding failed',{message:error.message})
    redirect(`/start?lang=${lang}&error_code=save_failed`)
  }
  redirect(`/${lang==='es'?'?lang=es':''}`)
}